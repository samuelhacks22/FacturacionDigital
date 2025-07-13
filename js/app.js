// Aplicación principal del sistema de facturación
class InvoiceApp {
  constructor() {
    this.currentInvoice = null;
    this.services = [];
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateCurrentDate();
    this.setupForm();
    this.loadInvoices();
    this.setupSearch();
    // Inicializar sistemas
    authSystem.setupAuthEvents();
    this.updateDesignsDetailTable(); // Inicializa la tabla al cargar
  }

  // Configurar eventos
  setupEventListeners() {
    // Formulario principal
    const invoiceForm = document.getElementById('invoiceForm');
    if (invoiceForm) {
      invoiceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveInvoice();
      });
    }

    // Botones de servicios
    const addServiceBtn = document.getElementById('add-service');
    const removeServiceBtn = document.getElementById('remove-service');
    
    if (addServiceBtn) {
      addServiceBtn.addEventListener('click', () => {
        this.addService();
      });
    }

    if (removeServiceBtn) {
      removeServiceBtn.addEventListener('click', () => {
        this.removeService();
      });
    }

    // Eventos de cambio en servicios
    this.setupServiceEvents();
  }

  // Configurar eventos de servicios
  setupServiceEvents() {
    const servicesContainer = document.getElementById('services-container');
    if (servicesContainer) {
      servicesContainer.addEventListener('input', (e) => {
        if (
          e.target.classList.contains('service-area') ||
          e.target.classList.contains('service-price') ||
          e.target.classList.contains('service-type') ||
          e.target.classList.contains('service-level')
        ) {
          this.calculateTotal();
          this.updateDesignsDetailTable();
        }
      });
    }
  }

  // Actualizar fecha actual
  updateCurrentDate() {
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
      const now = new Date();
      currentDateElement.textContent = now.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  // Configurar formulario
  setupForm() {
    // Establecer fecha de emisión como hoy
    const fechaEmision = document.getElementById('fecha_emision');
    if (fechaEmision) {
      fechaEmision.value = new Date().toISOString().split('T')[0];
    }

    // Establecer fecha de vencimiento (30 días desde hoy)
    const fechaVencimiento = document.getElementById('fecha_vencimiento');
    if (fechaVencimiento) {
      const vencimiento = new Date();
      vencimiento.setDate(vencimiento.getDate() + 30);
      fechaVencimiento.value = vencimiento.toISOString().split('T')[0];
    }

    // Calcular total inicial
    this.calculateTotal();
    this.updateDesignsDetailTable();
  }

  // Añadir servicio
  addService() {
    const servicesContainer = document.getElementById('services-container');
    if (!servicesContainer) return;

    const serviceDiv = document.createElement('div');
    serviceDiv.className = 'service-item fade-in';
    serviceDiv.innerHTML = `
      <div class="row">
        <div class="col-md-4">
          <label class="form-label">Tipo de Servicio</label>
          <select class="form-select service-type" autocomplete="off">
            <option value="pluvial">Diseño Pluvial</option>
            <option value="vial">Diseño Vial</option>
            <option value="estructural">Diseño Estructural</option>
            <option value="sanitario">Diseño Sanitario</option>
            <option value="electrico">Diseño Eléctrico</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">Nivel</label>
          <select class="form-select service-level" autocomplete="off">
            <option value="1">Primer Nivel</option>
            <option value="2">Segundo Nivel</option>
            <option value="3">Tercer Nivel</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label">Área (m²)</label>
          <input type="number" class="form-control service-area" placeholder="m²" 
                 min="0" step="0.01" value="0.00" autocomplete="off">
        </div>
        <div class="col-md-3">
          <label class="form-label">Precio Unitario (RD$)</label>
          <input type="number" class="form-control service-price" placeholder="RD$" 
                 min="0" step="0.01" value="50.00" autocomplete="off">
        </div>
      </div>
    `;

    servicesContainer.appendChild(serviceDiv);
    this.calculateTotal();
    this.updateDesignsDetailTable();
  }

  // Remover servicio
  removeService() {
    const servicesContainer = document.getElementById('services-container');
    if (!servicesContainer) return;

    const serviceItems = servicesContainer.querySelectorAll('.service-item');
    if (serviceItems.length > 1) {
      serviceItems[serviceItems.length - 1].remove();
      this.calculateTotal();
      this.updateDesignsDetailTable();
    } else {
      this.showMessage('Debe mantener al menos un servicio', 'warning');
    }
  }

  // Calcular total
  calculateTotal() {
    const serviceItems = document.querySelectorAll('.service-item');
    let total = 0;

    serviceItems.forEach(item => {
      const area = parseFloat(item.querySelector('.service-area').value) || 0;
      const price = parseFloat(item.querySelector('.service-price').value) || 0;
      total += area * price;
    });

    const totalElement = document.getElementById('total-amount');
    if (totalElement) {
      totalElement.textContent = total.toFixed(2);
    }
    this.updateDesignsDetailTable();
  }

  // NUEVA FUNCIÓN: Actualiza la tabla de detalle de diseños
  updateDesignsDetailTable() {
    const tbody = document.getElementById('designs-detail-body');
    if (!tbody) return;

    const serviceItems = document.querySelectorAll('.service-item');
    if (serviceItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center">No hay servicios agregados</td></tr>`;
      return;
    }

    tbody.innerHTML = Array.from(serviceItems).map(item => {
      const tipo = item.querySelector('.service-type').selectedOptions[0].textContent;
      const nivel = item.querySelector('.service-level').selectedOptions[0].textContent;
      const area = parseFloat(item.querySelector('.service-area').value) || 0;
      const precio = parseFloat(item.querySelector('.service-price').value) || 0;
      const total = area * precio;

      return `
        <tr>
          <td>${tipo}</td>
          <td>${nivel}</td>
          <td>${area.toFixed(2)}</td>
          <td>RD$ ${precio.toFixed(2)}</td>
          <td>RD$ ${total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');
  }

  // Configurar formulario
  setupForm() {
    // Establecer fecha de emisión como hoy
    const fechaEmision = document.getElementById('fecha_emision');
    if (fechaEmision) {
      fechaEmision.value = new Date().toISOString().split('T')[0];
    }

    // Establecer fecha de vencimiento (30 días desde hoy)
    const fechaVencimiento = document.getElementById('fecha_vencimiento');
    if (fechaVencimiento) {
      const vencimiento = new Date();
      vencimiento.setDate(vencimiento.getDate() + 30);
      fechaVencimiento.value = vencimiento.toISOString().split('T')[0];
    }

    // Calcular total inicial
    this.calculateTotal();
  }

  // Añadir servicio
  addService() {
    const servicesContainer = document.getElementById('services-container');
    if (!servicesContainer) return;

    const serviceDiv = document.createElement('div');
    serviceDiv.className = 'service-item fade-in';
    serviceDiv.innerHTML = `
      <div class="row">
        <div class="col-md-4">
          <label class="form-label">Tipo de Servicio</label>
          <select class="form-select service-type" autocomplete="off">
            <option value="sanitario">Diseño Sanitario</option>
            <option value="electrico">Diseño Eléctrico</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">Nivel</label>
          <select class="form-select service-level" autocomplete="off">
            <option value="1">Primer Nivel</option>
            <option value="2">Segundo Nivel</option>
            <option value="3">Tercer Nivel</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label">Área (m²)</label>
          <input type="number" class="form-control service-area" placeholder="m²" 
                 min="0" step="0.01" value="0.00" autocomplete="off">
        </div>
        <div class="col-md-3">
          <label class="form-label">Precio Unitario (RD$)</label>
          <input type="number" class="form-control service-price" placeholder="RD$" 
                 min="0" step="0.01" value="50.00" autocomplete="off">
        </div>
      </div>
    `;

    servicesContainer.appendChild(serviceDiv);
    this.calculateTotal();
  }

  // Remover servicio
  removeService() {
    const servicesContainer = document.getElementById('services-container');
    if (!servicesContainer) return;

    const serviceItems = servicesContainer.querySelectorAll('.service-item');
    if (serviceItems.length > 1) {
      serviceItems[serviceItems.length - 1].remove();
      this.calculateTotal();
    } else {
      this.showMessage('Debe mantener al menos un servicio', 'warning');
    }
  }

  // Calcular total
  calculateTotal() {
    const serviceItems = document.querySelectorAll('.service-item');
    let total = 0;

    serviceItems.forEach(item => {
      const area = parseFloat(item.querySelector('.service-area').value) || 0;
      const price = parseFloat(item.querySelector('.service-price').value) || 0;
      total += area * price;
    });

    const totalElement = document.getElementById('total-amount');
    if (totalElement) {
      totalElement.textContent = total.toFixed(2);
    }
  }

  // Guardar factura
  saveInvoice() {
    try {
      // Validar formulario
      const formData = this.getFormData();
      if (!this.validateForm(formData)) {
        return;
      }

      // Guardar en almacenamiento
      const result = invoiceStorage.saveInvoice(formData);
      
      if (result.success) {
        this.showMessage('Factura guardada correctamente', 'success');
        this.clearForm();
        this.loadInvoices();
      } else {
        this.showMessage('Error al guardar la factura: ' + result.error, 'danger');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      this.showMessage('Error interno al guardar la factura', 'danger');
    }
  }

  // Obtener datos del formulario
  getFormData() {
    const serviceItems = document.querySelectorAll('.service-item');
    const servicios = [];

    serviceItems.forEach(item => {
      const tipo = item.querySelector('.service-type').value;
      const nivel = item.querySelector('.service-level').value;
      const area = parseFloat(item.querySelector('.service-area').value) || 0;
      const precio = parseFloat(item.querySelector('.service-price').value) || 0;

      servicios.push({
        tipo: tipo === 'sanitario' ? 'Diseño Sanitario' : 'Diseño Eléctrico',
        nivel: parseInt(nivel),
        area: area,
        precio: precio
      });
    });

    const total = servicios.reduce((sum, servicio) => sum + (servicio.area * servicio.precio), 0);

    return {
      cliente: document.getElementById('nombre').value,
      email: document.getElementById('email').value,
      proyecto: document.getElementById('proyecto').value,
      niveles: parseInt(document.getElementById('niveles').value),
      fechaEmision: document.getElementById('fecha_emision').value,
      fechaVencimiento: document.getElementById('fecha_vencimiento').value,
      servicios: servicios,
      total: total,
      documentosRequeridos: document.getElementById('requirements').value,
      documentosEntregar: document.getElementById('deliverables').value,
      notas: document.getElementById('notes').value
    };
  }

  // Validar formulario
  validateForm(formData) {
    const errors = [];

    if (!formData.cliente.trim()) {
      errors.push('El nombre del cliente es requerido');
    }

    if (!formData.email.trim()) {
      errors.push('El email es requerido');
    } else if (!this.isValidEmail(formData.email)) {
      errors.push('El email no es válido');
    }

    if (!formData.proyecto.trim()) {
      errors.push('El nombre del proyecto es requerido');
    }

    if (!formData.fechaVencimiento) {
      errors.push('La fecha de vencimiento es requerida');
    }

    if (formData.servicios.length === 0) {
      errors.push('Debe agregar al menos un servicio');
    }

    formData.servicios.forEach((servicio, index) => {
      if (servicio.area <= 0) {
        errors.push(`El área del servicio ${index + 1} debe ser mayor a 0`);
      }
      if (servicio.precio <= 0) {
        errors.push(`El precio del servicio ${index + 1} debe ser mayor a 0`);
      }
    });

    if (errors.length > 0) {
      this.showMessage(errors.join('<br>'), 'danger');
      return false;
    }

    return true;
  }

  // Validar email
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Limpiar formulario
  clearForm() {
    document.getElementById('invoiceForm').reset();
    
    // Restaurar servicios a uno solo
    const servicesContainer = document.getElementById('services-container');
    if (servicesContainer) {
      servicesContainer.innerHTML = `
        <div class="service-item">
          <div class="row">
            <div class="col-md-4">
              <label class="form-label">Tipo de Servicio</label>
              <select class="form-select service-type" autocomplete="off">
                <option value="sanitario">Diseño Sanitario</option>
                <option value="electrico">Diseño Eléctrico</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Nivel</label>
              <select class="form-select service-level" autocomplete="off">
                <option value="1">Primer Nivel</option>
                <option value="2">Segundo Nivel</option>
                <option value="3">Tercer Nivel</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label">Área (m²)</label>
              <input type="number" class="form-control service-area" placeholder="m²" 
                     min="0" step="0.01" value="434.00" autocomplete="off">
            </div>
            <div class="col-md-3">
              <label class="form-label">Precio Unitario (RD$)</label>
              <input type="number" class="form-control service-price" placeholder="RD$" 
                     min="0" step="0.01" value="50.00" autocomplete="off">
            </div>
          </div>
        </div>
      `;
    }

    this.setupForm();
  }

  // Cargar facturas
  loadInvoices() {
    const invoices = invoiceStorage.getAllInvoices();
    this.displayInvoices(invoices);
  }

  // Mostrar facturas
  displayInvoices(invoices) {
    const tbody = document.getElementById('invoice-table-body');
    if (!tbody) return;

    if (invoices.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-4">
            <i class="fas fa-inbox fa-2x mb-3 text-muted"></i>
            <p>No hay facturas guardadas</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = invoices.map(invoice => `
      <tr>
        <td>${invoice.cliente}</td>
        <td>${invoice.proyecto}</td>
        <td>RD$ ${invoice.total.toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="app.viewInvoice('${invoice.id}')">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-success me-1" onclick="exportSystem.exportInvoiceToPDF('${invoice.id}')">
            <i class="fas fa-file-pdf"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="app.deleteInvoice('${invoice.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Ver factura
  viewInvoice(id) {
    const invoice = invoiceStorage.getInvoiceById(id);
    if (!invoice) {
      this.showMessage('Factura no encontrada', 'danger');
      return;
    }

    // Llenar formulario con datos de la factura
    document.getElementById('nombre').value = invoice.cliente;
    document.getElementById('email').value = invoice.email;
    document.getElementById('proyecto').value = invoice.proyecto;
    document.getElementById('niveles').value = invoice.niveles;
    document.getElementById('fecha_emision').value = invoice.fechaEmision;
    document.getElementById('fecha_vencimiento').value = invoice.fechaVencimiento;
    document.getElementById('requirements').value = invoice.documentosRequeridos;
    document.getElementById('deliverables').value = invoice.documentosEntregar;
    document.getElementById('notes').value = invoice.notas;

    // Recrear servicios
    const servicesContainer = document.getElementById('services-container');
    if (servicesContainer) {
      servicesContainer.innerHTML = '';
      
      invoice.servicios.forEach(servicio => {
        const serviceDiv = document.createElement('div');
        serviceDiv.className = 'service-item';
        serviceDiv.innerHTML = `
          <div class="row">
            <div class="col-md-4">
              <label class="form-label">Tipo de Servicio</label>
              <select class="form-select service-type" autocomplete="off">
                <option value="sanitario" ${servicio.tipo === 'Diseño Sanitario' ? 'selected' : ''}>Diseño Sanitario</option>
                <option value="electrico" ${servicio.tipo === 'Diseño Eléctrico' ? 'selected' : ''}>Diseño Eléctrico</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Nivel</label>
              <select class="form-select service-level" autocomplete="off">
                <option value="1" ${servicio.nivel === 1 ? 'selected' : ''}>Primer Nivel</option>
                <option value="2" ${servicio.nivel === 2 ? 'selected' : ''}>Segundo Nivel</option>
                <option value="3" ${servicio.nivel === 3 ? 'selected' : ''}>Tercer Nivel</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label">Área (m²)</label>
              <input type="number" class="form-control service-area" placeholder="m²" 
                     min="0" step="0.01" value="${servicio.area}" autocomplete="off">
            </div>
            <div class="col-md-3">
              <label class="form-label">Precio Unitario (RD$)</label>
              <input type="number" class="form-control service-price" placeholder="RD$" 
                     min="0" step="0.01" value="${servicio.precio}" autocomplete="off">
            </div>
          </div>
        `;
        servicesContainer.appendChild(serviceDiv);
      });
    }

    this.calculateTotal();
    this.showMessage('Factura cargada para edición', 'info');
  }

  // Eliminar factura
  deleteInvoice(id) {
    if (confirm('¿Está seguro de que desea eliminar esta factura?')) {
      const result = invoiceStorage.deleteInvoice(id);
      
      if (result.success) {
        this.showMessage('Factura eliminada correctamente', 'success');
        this.loadInvoices();
      } else {
        this.showMessage('Error al eliminar la factura: ' + result.error, 'danger');
      }
    }
  }

  // Configurar búsqueda
  setupSearch() {
    const searchInput = document.getElementById('search-invoices');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        if (query.length === 0) {
          this.loadInvoices();
        } else {
          const filteredInvoices = invoiceStorage.searchInvoices(query);
          this.displayInvoices(filteredInvoices);
        }
      });
    }
  }

  // Mostrar mensajes
  showMessage(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.parentNode.removeChild(alertDiv);
      }
    }, 5000);
  }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.app = new InvoiceApp();
});
