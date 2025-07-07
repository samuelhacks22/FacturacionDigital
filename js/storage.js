// Sistema de almacenamiento con base de datos PostgreSQL
class InvoiceStorage {
  constructor() {
    this.apiBase = '/api';
    this.userKey = 'current_user';
    this.init();
  }

  init() {
    // Verificar conexión con la API
    this.checkConnection();
  }

  // Verificar conexión con la API
  async checkConnection() {
    try {
      const response = await fetch(`${this.apiBase}/stats`);
      if (!response.ok) {
        console.warn('API connection not available, using local storage fallback');
        this.useFallback = true;
      }
    } catch (error) {
      console.warn('API connection failed, using local storage fallback');
      this.useFallback = true;
    }
  }

  // Generar ID único para facturas
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Guardar factura
  async saveInvoice(invoiceData) {
    try {
      if (this.useFallback) {
        return this.saveInvoiceLocal(invoiceData);
      }

      const response = await fetch(`${this.apiBase}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error saving invoice');
      }

      return result;
    } catch (error) {
      console.error('Error saving invoice:', error);
      // Fallback a almacenamiento local si falla la API
      return this.saveInvoiceLocal(invoiceData);
    }
  }

  // Fallback para almacenamiento local
  saveInvoiceLocal(invoiceData) {
    try {
      const invoices = this.getAllInvoicesLocal();
      const newInvoice = {
        id: this.generateId(),
        ...invoiceData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      invoices.push(newInvoice);
      localStorage.setItem('invoices_db', JSON.stringify(invoices));
      
      return { success: true, invoice: newInvoice };
    } catch (error) {
      console.error('Error saving invoice locally:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener todas las facturas
  async getAllInvoices() {
    try {
      if (this.useFallback) {
        return this.getAllInvoicesLocal();
      }

      const response = await fetch(`${this.apiBase}/invoices`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting invoices:', error);
      // Fallback a almacenamiento local
      return this.getAllInvoicesLocal();
    }
  }

  // Fallback para obtener facturas locales
  getAllInvoicesLocal() {
    try {
      const invoices = localStorage.getItem('invoices_db');
      return invoices ? JSON.parse(invoices) : [];
    } catch (error) {
      console.error('Error getting local invoices:', error);
      return [];
    }
  }

  // Obtener factura por ID
  async getInvoiceById(id) {
    try {
      if (this.useFallback) {
        return this.getInvoiceByIdLocal(id);
      }

      const response = await fetch(`${this.apiBase}/invoices/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch invoice');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting invoice by ID:', error);
      return this.getInvoiceByIdLocal(id);
    }
  }

  // Fallback local para obtener factura por ID
  getInvoiceByIdLocal(id) {
    try {
      const invoices = this.getAllInvoicesLocal();
      return invoices.find(invoice => invoice.id === id) || null;
    } catch (error) {
      console.error('Error getting local invoice by ID:', error);
      return null;
    }
  }

  // Actualizar factura
  updateInvoice(id, updateData) {
    try {
      const invoices = this.getAllInvoices();
      const index = invoices.findIndex(invoice => invoice.id === id);
      
      if (index === -1) {
        return { success: false, error: 'Factura no encontrada' };
      }
      
      invoices[index] = {
        ...invoices[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(invoices));
      
      return { success: true, invoice: invoices[index] };
    } catch (error) {
      console.error('Error updating invoice:', error);
      return { success: false, error: error.message };
    }
  }

  // Eliminar factura
  async deleteInvoice(id) {
    try {
      if (this.useFallback) {
        return this.deleteInvoiceLocal(id);
      }

      const response = await fetch(`${this.apiBase}/invoices/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error deleting invoice');
      }

      return result;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return this.deleteInvoiceLocal(id);
    }
  }

  // Fallback local para eliminar factura
  deleteInvoiceLocal(id) {
    try {
      const invoices = this.getAllInvoicesLocal();
      const filteredInvoices = invoices.filter(invoice => invoice.id !== id);
      
      localStorage.setItem('invoices_db', JSON.stringify(filteredInvoices));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting local invoice:', error);
      return { success: false, error: error.message };
    }
  }

  // Buscar facturas
  async searchInvoices(query) {
    try {
      if (this.useFallback) {
        return this.searchInvoicesLocal(query);
      }

      const response = await fetch(`${this.apiBase}/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Failed to search invoices');
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching invoices:', error);
      return this.searchInvoicesLocal(query);
    }
  }

  // Fallback local para buscar facturas
  async searchInvoicesLocal(query) {
    try {
      const invoices = await this.getAllInvoicesLocal();
      const searchTerm = query.toLowerCase();
      
      return invoices.filter(invoice => 
        invoice.cliente.toLowerCase().includes(searchTerm) ||
        invoice.proyecto.toLowerCase().includes(searchTerm) ||
        invoice.email.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching local invoices:', error);
      return [];
    }
  }

  // Obtener estadísticas
  async getStats() {
    try {
      if (this.useFallback) {
        return this.getStatsLocal();
      }

      const response = await fetch(`${this.apiBase}/stats`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting stats:', error);
      return this.getStatsLocal();
    }
  }

  // Fallback local para estadísticas
  async getStatsLocal() {
    try {
      const invoices = await this.getAllInvoicesLocal();
      const totalInvoices = invoices.length;
      const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
      const avgAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;
      
      return {
        totalInvoices,
        totalAmount,
        avgAmount
      };
    } catch (error) {
      console.error('Error getting local stats:', error);
      return { totalInvoices: 0, totalAmount: 0, avgAmount: 0 };
    }
  }

  // Exportar datos
  exportData() {
    try {
      const invoices = this.getAllInvoices();
      const data = {
        invoices,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }

  // Importar datos
  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.invoices || !Array.isArray(data.invoices)) {
        throw new Error('Formato de datos inválido');
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(data.invoices));
      
      return { success: true, imported: data.invoices.length };
    } catch (error) {
      console.error('Error importing data:', error);
      return { success: false, error: error.message };
    }
  }

  // Limpiar almacenamiento
  clearStorage() {
    try {
      localStorage.removeItem(this.storageKey);
      this.init();
      return { success: true };
    } catch (error) {
      console.error('Error clearing storage:', error);
      return { success: false, error: error.message };
    }
  }
}

// Instancia global del almacenamiento
const invoiceStorage = new InvoiceStorage();
