import { createServer } from 'http';
import { parse } from 'url';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Importar el sistema de almacenamiento de la base de datos
let storage;
try {
  // Usar dynamic import para TypeScript modules
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  
  // Transpile TypeScript on the fly usando esbuild
  const esbuild = require('esbuild');
  const { build } = esbuild;
  
  // Build the TypeScript files
  await build({
    entryPoints: ['./server/storage.ts'],
    outdir: './dist',
    format: 'esm',
    target: 'node18',
    platform: 'node',
    bundle: true,
    external: ['@neondatabase/serverless', 'drizzle-orm', 'ws']
  });
  
  const storageModule = await import('../dist/storage.js');
  storage = storageModule.storage;
} catch (error) {
  console.error('Error importing storage:', error);
  console.log('Falling back to simplified storage...');
  
  // Fallback simple storage implementation
  storage = {
    async saveInvoice(data) {
      return { success: true, invoice: { id: Date.now().toString(), ...data } };
    },
    async getAllInvoices() {
      return [];
    },
    async getInvoiceById(id) {
      return null;
    },
    async updateInvoice(id, data) {
      return { success: true, invoice: { id, ...data } };
    },
    async deleteInvoice(id) {
      return { success: true };
    },
    async searchInvoices(query) {
      return [];
    },
    async getStats() {
      return { totalInvoices: 0, totalAmount: 0, avgAmount: 0 };
    }
  };
}

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
        // Obtener todas las facturas
        const invoices = await storage.getAllInvoices();
        res.writeHead(200);
        res.end(JSON.stringify(invoices));

      } else if (pathname === '/api/invoices' && method === 'POST') {
        // Crear nueva factura
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
        // Obtener factura por ID
        const id = pathname.split('/')[3];
        const invoice = await storage.getInvoiceById(id);
        
        if (invoice) {
          res.writeHead(200);
          res.end(JSON.stringify(invoice));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Invoice not found' }));
        }

      } else if (pathname.startsWith('/api/invoices/') && method === 'PUT') {
        // Actualizar factura
        const id = pathname.split('/')[3];
        handleJsonRequest(req, async (data, error) => {
          if (error) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
            return;
          }

          const result = await storage.updateInvoice(id, data);
          res.writeHead(result.success ? 200 : 400);
          res.end(JSON.stringify(result));
        });

      } else if (pathname.startsWith('/api/invoices/') && method === 'DELETE') {
        // Eliminar factura
        const id = pathname.split('/')[3];
        const result = await storage.deleteInvoice(id);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));

      } else if (pathname === '/api/search' && method === 'GET') {
        // Buscar facturas
        const query = parsedUrl.query.q || '';
        const invoices = await storage.searchInvoices(query);
        res.writeHead(200);
        res.end(JSON.stringify(invoices));

      } else if (pathname === '/api/stats' && method === 'GET') {
        // Obtener estadísticas
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
        filePath = join(rootDir, 'index.html');
      } else {
        filePath = join(rootDir, pathname);
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
});

export default server;