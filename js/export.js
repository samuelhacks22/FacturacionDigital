// Sistema de exportación de facturas
class ExportSystem {
  constructor() {
    this.logoDataUrl = null;
    this.init();
  }

  init() {
    this.setupExportEvents();
    this.loadLogo();
  }

  // Cargar logo como base64
  async loadLogo() {
    try {
      const response = await fetch('assets/logo.svg');
      const svgText = await response.text();
      
      // Convertir SVG a base64
      const base64 = btoa(svgText);
      this.logoDataUrl = `data:image/svg+xml;base64,${base64}`;
    } catch (error) {
      console.error('Error loading logo:', error);
      this.logoDataUrl = null;
    }
  }

  // Configurar eventos de exportación
  setupExportEvents() {
    const exportExcelBtn = document.getElementById('export-excel');
    const exportPdfBtn = document.getElementById('export-pdf');

    if (exportExcelBtn) {
      exportExcelBtn.addEventListener('click', () => {
        this.exportToExcel();
      });
    }

    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', () => {
        this.exportToPDF();
      });
    }
  }

  // Exportar a Excel
  exportToExcel() {
    try {
      const invoices = invoiceStorage.getAllInvoices();
      
      if (invoices.length === 0) {
        this.showMessage('No hay facturas para exportar', 'warning');
        return;
      }

      // Preparar datos para Excel con información de encabezado
      const headerData = [
        ['Sistema de Facturación Profesional'],
        ['Diseño Sanitario y Eléctrico'],
        [`Fecha de generación: ${new Date().toLocaleDateString()}`],
        [`Total de facturas: ${invoices.length}`],
        [''], // Fila vacía
        ['ID', 'Cliente', 'Email', 'Proyecto', 'Niveles', 'Fecha Emisión', 'Fecha Vencimiento', 'Total (RD$)', 'Servicios', 'Documentos Requeridos', 'Documentos a Entregar', 'Notas', 'Fecha Creación']
      ];

      // Preparar datos de facturas
      const invoiceData = invoices.map(invoice => [
        invoice.id,
        invoice.cliente,
        invoice.email,
        invoice.proyecto,
        invoice.niveles,
        new Date(invoice.fechaEmision).toLocaleDateString(),
        new Date(invoice.fechaVencimiento).toLocaleDateString(),
        invoice.total.toFixed(2),
        invoice.servicios.map(s => `${s.tipo} - Nivel ${s.nivel} - ${s.area}m² - RD$${s.precio}`).join('; '),
        invoice.documentosRequeridos,
        invoice.documentosEntregar,
        invoice.notas,
        new Date(invoice.createdAt).toLocaleDateString()
      ]);

      // Combinar datos
      const allData = [...headerData, ...invoiceData];

      // Crear libro de Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(allData);

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 15 }, // ID
        { wch: 25 }, // Cliente
        { wch: 30 }, // Email
        { wch: 25 }, // Proyecto
        { wch: 10 }, // Niveles
        { wch: 15 }, // Fecha Emisión
        { wch: 15 }, // Fecha Vencimiento
        { wch: 15 }, // Total
        { wch: 50 }, // Servicios
        { wch: 30 }, // Documentos Requeridos
        { wch: 30 }, // Documentos a Entregar
        { wch: 30 }, // Notas
        { wch: 15 }  // Fecha Creación
      ];
      ws['!cols'] = colWidths;

      // Estilo para el encabezado
      if (ws['A1']) {
        ws['A1'].s = {
          font: { bold: true, sz: 16, color: { rgb: "333333" } },
          fill: { fgColor: { rgb: "667eea" } }
        };
      }
      if (ws['A2']) {
        ws['A2'].s = {
          font: { bold: true, sz: 12, color: { rgb: "666666" } }
        };
      }
      
      // Estilo para los encabezados de columnas (fila 6)
      const headerRow = 6;
      for (let col = 0; col < 13; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: headerRow - 1, c: col });
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "667eea" } }
          };
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Facturas');

      // Generar archivo
      const fileName = `facturas_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      this.showMessage('Archivo Excel exportado correctamente', 'success');
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      this.showMessage('Error al exportar a Excel', 'danger');
    }
  }

  // Exportar a PDF
  exportToPDF() {
    try {
      const invoices = invoiceStorage.getAllInvoices();
      
      if (invoices.length === 0) {
        this.showMessage('No hay facturas para exportar', 'warning');
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Configurar fuente
      doc.setFont('helvetica', 'normal');

      // Agregar logo si está disponible
      if (this.logoDataUrl) {
        try {
          doc.addImage(this.logoDataUrl, 'SVG', 15, 10, 30, 20);
        } catch (error) {
          console.error('Error adding logo to PDF:', error);
        }
      }

      // Título
      doc.setFontSize(20);
      doc.text('Sistema de Facturación Profesional', 50, 20);
      
      doc.setFontSize(12);
      doc.text('Reporte de Facturas', 50, 30);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 50, 40);
      doc.text(`Total de facturas: ${invoices.length}`, 50, 50);

      // Preparar datos para la tabla
      const tableData = invoices.map(invoice => [
        invoice.id.substring(0, 8) + '...',
        invoice.cliente,
        invoice.proyecto,
        invoice.niveles,
        new Date(invoice.fechaEmision).toLocaleDateString(),
        `RD$ ${invoice.total.toFixed(2)}`
      ]);

      // Crear tabla
      doc.autoTable({
        head: [['ID', 'Cliente', 'Proyecto', 'Niveles', 'Fecha', 'Total']],
        body: tableData,
        startY: 60,
        styles: {
          fontSize: 10,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [102, 126, 234],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        }
      });

      // Agregar detalles de cada factura
      let yPosition = doc.lastAutoTable.finalY + 20;
      
      invoices.forEach((invoice, index) => {
        // Verificar si necesitamos una nueva página
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text(`Factura ${index + 1}: ${invoice.cliente}`, 20, yPosition);
        
        yPosition += 10;
        doc.setFontSize(10);
        
        const details = [
          `Proyecto: ${invoice.proyecto}`,
          `Email: ${invoice.email}`,
          `Niveles: ${invoice.niveles}`,
          `Fecha Emisión: ${new Date(invoice.fechaEmision).toLocaleDateString()}`,
          `Fecha Vencimiento: ${new Date(invoice.fechaVencimiento).toLocaleDateString()}`,
          `Total: RD$ ${invoice.total.toFixed(2)}`
        ];

        details.forEach(detail => {
          doc.text(detail, 25, yPosition);
          yPosition += 6;
        });

        // Servicios
        doc.text('Servicios:', 25, yPosition);
        yPosition += 6;
        
        invoice.servicios.forEach(servicio => {
          doc.text(`- ${servicio.tipo} - Nivel ${servicio.nivel} - ${servicio.area}m² - RD$${servicio.precio}`, 30, yPosition);
          yPosition += 6;
        });

        yPosition += 10;
      });

      // Guardar PDF
      const fileName = `facturas_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      this.showMessage('Archivo PDF exportado correctamente', 'success');
      
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      this.showMessage('Error al exportar a PDF', 'danger');
    }
  }

  // Exportar factura individual a PDF
  exportInvoiceToPDF(invoiceId) {
    try {
      const invoice = invoiceStorage.getInvoiceById(invoiceId);
      
      if (!invoice) {
        this.showMessage('Factura no encontrada', 'danger');
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Configurar fuente
      doc.setFont('helvetica', 'normal');

      // Agregar logo si está disponible
      if (this.logoDataUrl) {
        try {
          doc.addImage(this.logoDataUrl, 'SVG', 15, 10, 30, 20);
        } catch (error) {
          console.error('Error adding logo to individual PDF:', error);
        }
      }

      // Header
      doc.setFontSize(20);
      doc.text('COTIZACIÓN', 50, 20);
      
      doc.setFontSize(12);
      doc.text('Sistema de Facturación Profesional', 50, 30);
      doc.text('Diseño Sanitario y Eléctrico', 50, 40);

      // Información del cliente
      doc.setFontSize(14);
      doc.text('INFORMACIÓN DEL CLIENTE', 20, 60);
      
      doc.setFontSize(10);
      doc.text(`Cliente: ${invoice.cliente}`, 20, 70);
      doc.text(`Email: ${invoice.email}`, 20, 80);
      doc.text(`Proyecto: ${invoice.proyecto}`, 20, 90);
      doc.text(`Niveles: ${invoice.niveles}`, 20, 100);
      doc.text(`Fecha de Emisión: ${new Date(invoice.fechaEmision).toLocaleDateString()}`, 20, 110);
      doc.text(`Fecha de Vencimiento: ${new Date(invoice.fechaVencimiento).toLocaleDateString()}`, 20, 120);

      // Servicios
      doc.setFontSize(14);
      doc.text('SERVICIOS', 20, 140);

      const servicesData = invoice.servicios.map(servicio => [
        servicio.tipo,
        `Nivel ${servicio.nivel}`,
        `${servicio.area} m²`,
        `RD$ ${servicio.precio.toFixed(2)}`,
        `RD$ ${(servicio.area * servicio.precio).toFixed(2)}`
      ]);

      doc.autoTable({
        head: [['Tipo', 'Nivel', 'Área', 'Precio Unit.', 'Subtotal']],
        body: servicesData,
        startY: 150,
        styles: {
          fontSize: 10,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [102, 126, 234],
          textColor: 255,
          fontStyle: 'bold'
        }
      });

      // Total
      let yPos = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text(`TOTAL: RD$ ${invoice.total.toFixed(2)}`, 20, yPos);

      // Documentación
      yPos += 20;
      doc.setFontSize(12);
      doc.text('DOCUMENTOS REQUERIDOS:', 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      const reqLines = doc.splitTextToSize(invoice.documentosRequeridos, 170);
      doc.text(reqLines, 20, yPos);
      yPos += reqLines.length * 6;

      yPos += 10;
      doc.setFontSize(12);
      doc.text('DOCUMENTOS A ENTREGAR:', 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      const delLines = doc.splitTextToSize(invoice.documentosEntregar, 170);
      doc.text(delLines, 20, yPos);
      yPos += delLines.length * 6;

      // Notas
      yPos += 10;
      doc.setFontSize(12);
      doc.text('TÉRMINOS Y CONDICIONES:', 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      const notesLines = doc.splitTextToSize(invoice.notas, 170);
      doc.text(notesLines, 20, yPos);

      // Guardar PDF
      const fileName = `factura_${invoice.cliente.replace(/\s+/g, '_')}_${invoice.id}.pdf`;
      doc.save(fileName);

      this.showMessage('Factura exportada a PDF correctamente', 'success');
      
    } catch (error) {
      console.error('Error exporting invoice to PDF:', error);
      this.showMessage('Error al exportar la factura', 'danger');
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

// Instancia global del sistema de exportación
const exportSystem = new ExportSystem();
