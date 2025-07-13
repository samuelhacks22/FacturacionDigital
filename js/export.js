// Sistema de exportación de facturas
class ExportSystem {
  constructor() {
    this.init();
  }

  init() {
    this.setupExportEvents();
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

      // Preparar datos para Excel con detalles completos
      const excelData = invoices.flatMap(invoice => {
        // Filas para cada servicio
        const serviceRows = invoice.servicios.map(servicio => ({
          'ID Factura': invoice.id,
          'Cliente': invoice.cliente,
          'Email': invoice.email,
          'Proyecto': invoice.proyecto,
          'Niveles': invoice.niveles,
          'Fecha Emisión': new Date(invoice.fechaEmision).toLocaleDateString(),
          'Fecha Vencimiento': new Date(invoice.fechaVencimiento).toLocaleDateString(),
          'Tipo Servicio': servicio.tipo,
          'Nivel Servicio': servicio.nivel,
          'Área (m²)': servicio.area,
          'Precio Unitario (RD$)': servicio.precio.toFixed(2),
          'Subtotal Servicio (RD$)': (servicio.area * servicio.precio).toFixed(2),
          'Descripción Ajuste': '',
          'Monto Ajuste (RD$)': '',
          'Total Factura (RD$)': '',
          'Documentos Requeridos': '',
          'Documentos a Entregar': '',
          'Notas': '',
          'Fecha Creación': new Date(invoice.createdAt).toLocaleDateString()
        }));

        // Fila para el ajuste si existe
        const adjustmentRow = invoice.ajuste !== 0 ? {
          'ID Factura': invoice.id,
          'Cliente': '',
          'Email': '',
          'Proyecto': '',
          'Niveles': '',
          'Fecha Emisión': '',
          'Fecha Vencimiento': '',
          'Tipo Servicio': 'AJUSTE',
          'Nivel Servicio': '',
          'Área (m²)': '',
          'Precio Unitario (RD$)': '',
          'Subtotal Servicio (RD$)': '',
          'Descripción Ajuste': invoice.ajusteDescripcion || 'Ajuste de pago',
          'Monto Ajuste (RD$)': invoice.ajuste.toFixed(2),
          'Total Factura (RD$)': '',
          'Documentos Requeridos': '',
          'Documentos a Entregar': '',
          'Notas': '',
          'Fecha Creación': ''
        } : null;

        // Fila para el total
        const totalRow = {
          'ID Factura': invoice.id,
          'Cliente': '',
          'Email': '',
          'Proyecto': '',
          'Niveles': '',
          'Fecha Emisión': '',
          'Fecha Vencimiento': '',
          'Tipo Servicio': 'TOTAL',
          'Nivel Servicio': '',
          'Área (m²)': '',
          'Precio Unitario (RD$)': '',
          'Subtotal Servicio (RD$)': '',
          'Descripción Ajuste': '',
          'Monto Ajuste (RD$)': '',
          'Total Factura (RD$)': invoice.total.toFixed(2),
          'Documentos Requeridos': invoice.documentosRequeridos,
          'Documentos a Entregar': invoice.documentosEntregar,
          'Notas': invoice.notas,
          'Fecha Creación': ''
        };

        // Combinar todas las filas
        return [...serviceRows, ...(adjustmentRow ? [adjustmentRow] : []), totalRow];
      });

      // Crear libro de Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 15 }, // ID Factura
        { wch: 25 }, // Cliente
        { wch: 30 }, // Email
        { wch: 25 }, // Proyecto
        { wch: 10 }, // Niveles
        { wch: 15 }, // Fecha Emisión
        { wch: 15 }, // Fecha Vencimiento
        { wch: 20 }, // Tipo Servicio
        { wch: 15 }, // Nivel Servicio
        { wch: 10 }, // Área (m²)
        { wch: 15 }, // Precio Unitario
        { wch: 15 }, // Subtotal Servicio
        { wch: 25 }, // Descripción Ajuste
        { wch: 15 }, // Monto Ajuste
        { wch: 15 }, // Total Factura
        { wch: 30 }, // Documentos Requeridos
        { wch: 30 }, // Documentos a Entregar
        { wch: 30 }, // Notas
        { wch: 15 }  // Fecha Creación
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Facturas');

      // Generar archivo
      const fileName = `facturas_detalladas_${new Date().toISOString().split('T')[0]}.xlsx`;
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

      // Título
      doc.setFontSize(20);
      doc.text('Sistema de Facturación Profesional', 20, 20);
      
      doc.setFontSize(12);
      doc.text('Reporte Detallado de Facturas', 20, 30);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
      doc.text(`Total de facturas: ${invoices.length}`, 20, 50);

      // Preparar datos para la tabla
      const tableData = invoices.map(invoice => [
        invoice.id.substring(0, 8) + '...',
        invoice.cliente,
        invoice.proyecto,
        invoice.niveles,
        new Date(invoice.fechaEmision).toLocaleDateString(),
        `RD$ ${invoice.total.toFixed(2)}`
      ]);

      // Crear tabla resumen
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
        
        // Información básica
        doc.setFontSize(10);
        doc.text(`Proyecto: ${invoice.proyecto}`, 20, yPosition);
        doc.text(`Niveles: ${invoice.niveles}`, 100, yPosition);
        yPosition += 8;
        
        doc.text(`Fecha Emisión: ${new Date(invoice.fechaEmision).toLocaleDateString()}`, 20, yPosition);
        doc.text(`Fecha Vencimiento: ${new Date(invoice.fechaVencimiento).toLocaleDateString()}`, 100, yPosition);
        yPosition += 8;
        
        doc.text(`Email: ${invoice.email}`, 20, yPosition);
        yPosition += 10;

        // Tabla de servicios
        const servicesData = invoice.servicios.map(servicio => [
          servicio.tipo,
          `Nivel ${servicio.nivel}`,
          `${servicio.area.toFixed(2)} m²`,
          `RD$ ${servicio.precio.toFixed(2)}`,
          `RD$ ${(servicio.area * servicio.precio).toFixed(2)}`
        ]);

        // Agregar ajuste si existe
        if (invoice.ajuste !== 0) {
          servicesData.push([
            'AJUSTE',
            invoice.ajusteDescripcion || 'Ajuste de pago',
            '',
            '',
            `RD$ ${invoice.ajuste.toFixed(2)}`
          ]);
        }

        // Agregar fila de total
        servicesData.push([
          'TOTAL',
          '',
          '',
          '',
          `RD$ ${invoice.total.toFixed(2)}`
        ]);

        doc.autoTable({
          head: [['Tipo', 'Nivel', 'Área (m²)', 'Precio Unit.', 'Subtotal']],
          body: servicesData,
          startY: yPosition,
          styles: {
            fontSize: 8,
            cellPadding: 2
          },
          headStyles: {
            fillColor: [102, 126, 234],
            textColor: 255,
            fontStyle: 'bold'
          },
          willDrawCell: (data) => {
            // Resaltar filas de ajuste y total
            if (data.row.index === servicesData.length - 1 || 
                data.row.index === servicesData.length - 2) {
              doc.setFillColor(230, 230, 250);
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
              doc.setTextColor(0, 0, 128);
            }
          }
        });

        yPosition = doc.lastAutoTable.finalY + 10;

        // Documentación
        doc.setFontSize(10);
        doc.text('Documentos Requeridos:', 20, yPosition);
        yPosition += 5;
        const reqLines = doc.splitTextToSize(invoice.documentosRequeridos, 170);
        doc.text(reqLines, 25, yPosition);
        yPosition += reqLines.length * 5 + 5;

        doc.text('Documentos a Entregar:', 20, yPosition);
        yPosition += 5;
        const delLines = doc.splitTextToSize(invoice.documentosEntregar, 170);
        doc.text(delLines, 25, yPosition);
        yPosition += delLines.length * 5 + 5;

        // Notas
        doc.text('Notas y Términos de Pago:', 20, yPosition);
        yPosition += 5;
        const notesLines = doc.splitTextToSize(invoice.notas, 170);
        doc.text(notesLines, 25, yPosition);
        yPosition += notesLines.length * 5 + 10;
      });

      // Guardar PDF
      const fileName = `facturas_detalladas_${new Date().toISOString().split('T')[0]}.pdf`;
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

      // Header
      doc.setFontSize(20);
      doc.text('COTIZACIÓN', 105, 20, null, null, 'center');
      
      doc.setFontSize(12);
      doc.text('Sistema de Facturación Profesional', 105, 30, null, null, 'center');
      doc.text('Diseño Sanitario y Eléctrico', 105, 40, null, null, 'center');

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
      doc.text('DETALLE DE SERVICIOS', 20, 140);

      // Preparar datos de la tabla
      const servicesData = invoice.servicios.map(servicio => [
        servicio.tipo,
        `Nivel ${servicio.nivel}`,
        `${servicio.area.toFixed(2)} m²`,
        `RD$ ${servicio.precio.toFixed(2)}`,
        `RD$ ${(servicio.area * servicio.precio).toFixed(2)}`
      ]);

      // Agregar ajuste si existe
      if (invoice.ajuste !== 0) {
        servicesData.push([
          'AJUSTE',
          invoice.ajusteDescripcion || 'Ajuste de pago',
          '',
          '',
          `RD$ ${invoice.ajuste.toFixed(2)}`
        ]);
      }

      // Agregar fila de total
      servicesData.push([
        'TOTAL',
        '',
        '',
        '',
        `RD$ ${invoice.total.toFixed(2)}`
      ]);

      // Crear tabla de servicios
      doc.autoTable({
        head: [['Tipo', 'Nivel', 'Área (m²)', 'Precio Unit.', 'Subtotal']],
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
        },
        willDrawCell: (data) => {
          // Resaltar filas de ajuste y total
          if (data.row.index === servicesData.length - 1 || 
              data.row.index === servicesData.length - 2) {
            doc.setFillColor(230, 230, 250);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            doc.setTextColor(0, 0, 128);
          }
        }
      });

      // Documentación
      let yPos = doc.lastAutoTable.finalY + 20;
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

      // Pie de página
      doc.setFontSize(8);
      doc.text(`ID de factura: ${invoice.id}`, 20, 280);
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 170, 280, null, null, 'right');

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