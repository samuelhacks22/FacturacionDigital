const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

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
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
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

// Almacenamiento simple en memoria para demo
const storage = {
  invoices: [],
  
  saveInvoice(invoiceData) {
    const newInvoice = {
      id: generateId(),
      ...invoiceData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.invoices.push(newInvoice);
    return { success: true, invoice: newInvoice };
  },

  getAllInvoices() {
    return this.invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  getInvoiceById(id) {
    return this.invoices.find(inv => inv.id === id) || null;
  },

  deleteInvoice(id) {
    const initialLength = this.invoices.length;
    this.invoices = this.invoices.filter(inv => inv.id !== id);
    
    if (this.invoices.length < initialLength) {
      return { success: true };
    } else {
      return { success: false, error: 'Factura no encontrada' };
    }
  },

  searchInvoices(query) {
    const searchTerm = query.toLowerCase();
    return this.invoices.filter(invoice => 
      invoice.cliente.toLowerCase().includes(searchTerm) ||
      invoice.proyecto.toLowerCase().includes(searchTerm) ||
      invoice.email.toLowerCase().includes(searchTerm)
    );
  },

  getStats() {
    const totalInvoices = this.invoices.length;
    const totalAmount = this.invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const avgAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;

    return {
      totalInvoices,
      totalAmount,
      avgAmount
    };
  }
};

// Crear servidor HTTP
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
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
        const invoices = storage.getAllInvoices();
        res.writeHead(200);
        res.end(JSON.stringify(invoices));

      } else if (pathname === '/api/invoices' && method === 'POST') {
        handleJsonRequest(req, (data, error) => {
          if (error) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
            return;
          }

          const result = storage.saveInvoice(data);
          res.writeHead(result.success ? 201 : 400);
          res.end(JSON.stringify(result));
        });

      } else if (pathname.startsWith('/api/invoices/') && method === 'GET') {
        const id = pathname.split('/')[3];
        const invoice = storage.getInvoiceById(id);
        
        if (invoice) {
          res.writeHead(200);
          res.end(JSON.stringify(invoice));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Invoice not found' }));
        }

      } else if (pathname.startsWith('/api/invoices/') && method === 'DELETE') {
        const id = pathname.split('/')[3];
        const result = storage.deleteInvoice(id);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));

      } else if (pathname === '/api/search' && method === 'GET') {
        const query = parsedUrl.query.q || '';
        const invoices = storage.searchInvoices(query);
        res.writeHead(200);
        res.end(JSON.stringify(invoices));

      } else if (pathname === '/api/stats' && method === 'GET') {
        const stats = storage.getStats();
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
        filePath = path.join(__dirname, 'index.html');
      } else {
        filePath = path.join(__dirname, pathname);
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
  console.log('Using in-memory storage for demo');
});

module.exports = server;