const { createServer } = require('http');
const { parse } = require('url');
const { readFileSync } = require('fs');
const { join } = require('path');
const __dirname = __dirname;

// Configurar Neon
neonConfig.webSocketConstructor = ws;

// Configurar base de datos
let db;
try {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool });
  }
} catch (error) {
  console.error('Database connection error:', error);
}

// Esquemas simplificados
const invoicesTable = 'invoices';
const servicesTable = 'services';

// MIME types para archivos estáticos
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

// Función para servir archivos estáticos
function serveStaticFile(res, filePath) {
  try {
    const content = readFileSync(filePath);
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
}

// Función para manejar requests JSON
function handleJsonRequest(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    try {
      const data = body ? JSON.parse(body) : {};
      callback(data);
    } catch (error) {
      callback(null, error);
    }
  });
}

// Generar ID único
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Almacenamiento simple con fallback a localStorage
const storage = {
  invoices: [],
  
  async saveInvoice(invoiceData) {
    try {
      const newInvoice = {
        id: generateId(),
        ...invoiceData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (db) {
        // Intentar guardar en base de datos
        try {
          await db.execute(`
            INSERT INTO ${invoicesTable} (external_id, cliente, email, proyecto, niveles, fecha_emision, fecha_vencimiento, total, documentos_requeridos, documentos_entregar, notas, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            newInvoice.id,
            invoiceData.cliente,
            invoiceData.email,
            invoiceData.proyecto,
            invoiceData.niveles,
            new Date(invoiceData.fechaEmision),
            new Date(invoiceData.fechaVencimiento),
            invoiceData.total,
            invoiceData.documentosRequeridos,
            invoiceData.documentosEntregar,
            invoiceData.notas,
            new Date(),
            new Date()
          ]);

          // Insertar servicios si existen
          if (invoiceData.servicios && invoiceData.servicios.length > 0) {
            for (const servicio of invoiceData.servicios) {
              await db.execute(`
                INSERT INTO ${servicesTable} (invoice_id, tipo, nivel, area, precio, created_at)
                SELECT id, $1, $2, $3, $4, $5 FROM ${invoicesTable} WHERE external_id = $6
              `, [
                servicio.tipo,
                servicio.nivel,
                servicio.area,
                servicio.precio,
                new Date(),
                newInvoice.id
              ]);
            }
          }
        } catch (dbError) {
          console.error('Database save error:', dbError);
          // Fallback a memoria
          this.invoices.push(newInvoice);
        }
      } else {
        // Fallback a memoria
        this.invoices.push(newInvoice);
      }

      return { success: true, invoice: newInvoice };
    } catch (error) {
      console.error('Error saving invoice:', error);
      return { success: false, error: error.message };
    }
  },

  async getAllInvoices() {
    try {
      if (db) {
        try {
          const result = await db.execute(`
            SELECT i.*, 
                   array_agg(json_build_object(
                     'tipo', s.tipo,
                     'nivel', s.nivel,
                     'area', s.area::float,
                     'precio', s.precio::float
                   )) FILTER (WHERE s.id IS NOT NULL) as servicios
            FROM ${invoicesTable} i
            LEFT JOIN ${servicesTable} s ON i.id = s.invoice_id
            GROUP BY i.id
            ORDER BY i.created_at DESC
          `);

          return result.rows.map(row => ({
            id: row.external_id,
            cliente: row.cliente,
            email: row.email,
            proyecto: row.proyecto,
            niveles: row.niveles,
            fechaEmision: row.fecha_emision.toISOString().split('T')[0],
            fechaVencimiento: row.fecha_vencimiento.toISOString().split('T')[0],
            total: parseFloat(row.total),
            documentosRequeridos: row.documentos_requeridos,
            documentosEntregar: row.documentos_entregar,
            notas: row.notas,
            createdAt: row.created_at?.toISOString(),
            updatedAt: row.updated_at?.toISOString(),
            servicios: row.servicios || []
          }));
        } catch (dbError) {
          console.error('Database get error:', dbError);
          return this.invoices;
        }
      }
      return this.invoices;
    } catch (error) {
      console.error('Error getting invoices:', error);
      return [];
    }
  },

  async getInvoiceById(id) {
    try {
      if (db) {
        try {
          const result = await db.execute(`
            SELECT i.*, 
                   array_agg(json_build_object(
                     'tipo', s.tipo,
                     'nivel', s.nivel,
                     'area', s.area::float,
                     'precio', s.precio::float
                   )) FILTER (WHERE s.id IS NOT NULL) as servicios
            FROM ${invoicesTable} i
            LEFT JOIN ${servicesTable} s ON i.id = s.invoice_id
            WHERE i.external_id = $1
            GROUP BY i.id
          `, [id]);

          if (result.rows.length === 0) return null;

          const row = result.rows[0];
          return {
            id: row.external_id,
            cliente: row.cliente,
            email: row.email,
            proyecto: row.proyecto,
            niveles: row.niveles,
            fechaEmision: row.fecha_emision.toISOString().split('T')[0],
            fechaVencimiento: row.fecha_vencimiento.toISOString().split('T')[0],
            total: parseFloat(row.total),
            documentosRequeridos: row.documentos_requeridos,
            documentosEntregar: row.documentos_entregar,
            notas: row.notas,
            createdAt: row.created_at?.toISOString(),
            updatedAt: row.updated_at?.toISOString(),
            servicios: row.servicios || []
          };
        } catch (dbError) {
          console.error('Database get by ID error:', dbError);
          return this.invoices.find(inv => inv.id === id) || null;
        }
      }
      return this.invoices.find(inv => inv.id === id) || null;
    } catch (error) {
      console.error('Error getting invoice by ID:', error);
      return null;
    }
  },

  async deleteInvoice(id) {
    try {
      if (db) {
        try {
          const result = await db.execute(`DELETE FROM ${invoicesTable} WHERE external_id = $1`, [id]);
          if (result.rowCount === 0) {
            return { success: false, error: 'Factura no encontrada' };
          }
        } catch (dbError) {
          console.error('Database delete error:', dbError);
          // Fallback a memoria
          this.invoices = this.invoices.filter(inv => inv.id !== id);
        }
      } else {
        this.invoices = this.invoices.filter(inv => inv.id !== id);
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return { success: false, error: error.message };
    }
  },

  async searchInvoices(query) {
    try {
      const searchTerm = query.toLowerCase();
      
      if (db) {
        try {
          const result = await db.execute(`
            SELECT i.*, 
                   array_agg(json_build_object(
                     'tipo', s.tipo,
                     'nivel', s.nivel,
                     'area', s.area::float,
                     'precio', s.precio::float
                   )) FILTER (WHERE s.id IS NOT NULL) as servicios
            FROM ${invoicesTable} i
            LEFT JOIN ${servicesTable} s ON i.id = s.invoice_id
            WHERE LOWER(i.cliente) LIKE $1 OR LOWER(i.proyecto) LIKE $1 OR LOWER(i.email) LIKE $1
            GROUP BY i.id
            ORDER BY i.created_at DESC
          `, [`%${searchTerm}%`]);

          return result.rows.map(row => ({
            id: row.external_id,
            cliente: row.cliente,
            email: row.email,
            proyecto: row.proyecto,
            niveles: row.niveles,
            fechaEmision: row.fecha_emision.toISOString().split('T')[0],
            fechaVencimiento: row.fecha_vencimiento.toISOString().split('T')[0],
            total: parseFloat(row.total),
            documentosRequeridos: row.documentos_requeridos,
            documentosEntregar: row.documentos_entregar,
            notas: row.notas,
            createdAt: row.created_at?.toISOString(),
            updatedAt: row.updated_at?.toISOString(),
            servicios: row.servicios || []
          }));
        } catch (dbError) {
          console.error('Database search error:', dbError);
          return this.invoices.filter(invoice => 
            invoice.cliente.toLowerCase().includes(searchTerm) ||
            invoice.proyecto.toLowerCase().includes(searchTerm) ||
            invoice.email.toLowerCase().includes(searchTerm)
          );
        }
      }
      
      return this.invoices.filter(invoice => 
        invoice.cliente.toLowerCase().includes(searchTerm) ||
        invoice.proyecto.toLowerCase().includes(searchTerm) ||
        invoice.email.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching invoices:', error);
      return [];
    }
  },

  async getStats() {
    try {
      const invoices = await this.getAllInvoices();
      const totalInvoices = invoices.length;
      const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
      const avgAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;

      return {
        totalInvoices,
        totalAmount,
        avgAmount
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { totalInvoices: 0, totalAmount: 0, avgAmount: 0 };
    }
  }
};

// Crear servidor HTTP
const server = createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  const { pathname } = parsedUrl;
  const method = req.method;

  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // API endpoints
    if (pathname.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json');

      if (pathname === '/api/invoices' && method === 'GET') {
        const invoices = await storage.getAllInvoices();
        res.writeHead(200);
        res.end(JSON.stringify(invoices));

      } else if (pathname === '/api/invoices' && method === 'POST') {
        handleJsonRequest(req, async (data, error) => {
          if (error) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
            return;
          }

          const result = await storage.saveInvoice(data);
          res.writeHead(result.success ? 201 : 400);
          res.end(JSON.stringify(result));
        });

      } else if (pathname.startsWith('/api/invoices/') && method === 'GET') {
        const id = pathname.split('/')[3];
        const invoice = await storage.getInvoiceById(id);
        
        if (invoice) {
          res.writeHead(200);
          res.end(JSON.stringify(invoice));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Invoice not found' }));
        }

      } else if (pathname.startsWith('/api/invoices/') && method === 'DELETE') {
        const id = pathname.split('/')[3];
        const result = await storage.deleteInvoice(id);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));

      } else if (pathname === '/api/search' && method === 'GET') {
        const query = parsedUrl.query.q || '';
        const invoices = await storage.searchInvoices(query);
        res.writeHead(200);
        res.end(JSON.stringify(invoices));

      } else if (pathname === '/api/stats' && method === 'GET') {
        const stats = await storage.getStats();
        res.writeHead(200);
        res.end(JSON.stringify(stats));

      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
      }

    } else {
      // Servir archivos estáticos
      let filePath;
      
      if (pathname === '/' || pathname === '') {
        filePath = join(__dirname, 'index.html');
      } else {
        filePath = join(__dirname, pathname);
      }

      serveStaticFile(res, filePath);
    }

  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database connected: ${!!db}`);
});

export default server;