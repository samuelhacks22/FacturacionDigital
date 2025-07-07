// Sistema de almacenamiento local para facturas
class InvoiceStorage {
  constructor() {
    this.storageKey = 'invoices_db';
    this.userKey = 'current_user';
    this.init();
  }

  init() {
    // Inicializar almacenamiento si no existe
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify([]));
    }
  }

  // Generar ID único para facturas
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Guardar factura
  saveInvoice(invoiceData) {
    try {
      const invoices = this.getAllInvoices();
      const newInvoice = {
        id: this.generateId(),
        ...invoiceData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      invoices.push(newInvoice);
      localStorage.setItem(this.storageKey, JSON.stringify(invoices));
      
      return { success: true, invoice: newInvoice };
    } catch (error) {
      console.error('Error saving invoice:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener todas las facturas
  getAllInvoices() {
    try {
      const invoices = localStorage.getItem(this.storageKey);
      return invoices ? JSON.parse(invoices) : [];
    } catch (error) {
      console.error('Error getting invoices:', error);
      return [];
    }
  }

  // Obtener factura por ID
  getInvoiceById(id) {
    try {
      const invoices = this.getAllInvoices();
      return invoices.find(invoice => invoice.id === id);
    } catch (error) {
      console.error('Error getting invoice by ID:', error);
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
  deleteInvoice(id) {
    try {
      const invoices = this.getAllInvoices();
      const filteredInvoices = invoices.filter(invoice => invoice.id !== id);
      
      localStorage.setItem(this.storageKey, JSON.stringify(filteredInvoices));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return { success: false, error: error.message };
    }
  }

  // Buscar facturas
  searchInvoices(query) {
    try {
      const invoices = this.getAllInvoices();
      const searchTerm = query.toLowerCase();
      
      return invoices.filter(invoice => 
        invoice.cliente.toLowerCase().includes(searchTerm) ||
        invoice.proyecto.toLowerCase().includes(searchTerm) ||
        invoice.email.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching invoices:', error);
      return [];
    }
  }

  // Obtener estadísticas
  getStats() {
    try {
      const invoices = this.getAllInvoices();
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
