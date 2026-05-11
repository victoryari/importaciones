import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';

export const generateQuotationPDF = async (quotation: any, items: any[], action: 'save' | 'print' = 'save') => {
  console.log(`Iniciando generación de PDF Profesional (${action})...`);
  try {
    const settingsRes = await axios.get('/api/settings');
    const settings = settingsRes.data;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    // --- CABECERA ---
    // Logo con manejo de proporción
    if (settings.company_logo) {
      try {
        // Se asume 35x35 de espacio máximo para el logo
        doc.addImage(settings.company_logo, 'PNG', margin, 12, 35, 35, undefined, 'FAST');
      } catch (e) {
        console.warn("Error al cargar logo", e);
      }
    }

    // Información de la Empresa (Desplazada si hay logo)
    const companyX = settings.company_logo ? 52 : margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(33, 37, 41);
    doc.text(settings.company_name || "IMPORTACIONES CARMELITA DEL NORTE", companyX, 22);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`RUC: ${settings.company_ruc || "-"}`, companyX, 28);
    doc.text(settings.company_address || "-", companyX, 33);
    doc.text(`Telf: ${settings.company_phone || "-"} | Email: ${settings.company_email || "-"}`, companyX, 38);

    // Cuadro de Documento (Lado Derecho) - Diseño Moderno
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(pageWidth - 75, 12, 61, 35, 3, 3, 'FD');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(50);
    doc.text("COTIZACIÓN", pageWidth - 44.5, 22, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38); // Rojo acento
    doc.text(`${quotation.docSeries || '001'}-${quotation.docNumber || '00000001'}`, pageWidth - 44.5, 33, { align: 'center' });

    // Línea divisora
    doc.setDrawColor(240);
    doc.line(margin, 55, pageWidth - margin, 55);

    // --- INFORMACIÓN DEL CLIENTE ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text("DATOS DEL CLIENTE", margin, 63);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(33, 37, 41);
    
    // Grid de cliente
    doc.setFont("helvetica", "bold");
    doc.text("Señor(es):", margin, 72);
    doc.setFont("helvetica", "normal");
    doc.text(String(quotation.customerName || "PÚBLICO GENERAL"), 40, 72);

    doc.setFont("helvetica", "bold");
    doc.text("RUC / DNI:", margin, 79);
    doc.setFont("helvetica", "normal");
    doc.text(String(quotation.customerDocNumber || "-"), 40, 79);

    doc.setFont("helvetica", "bold");
    doc.text("Dirección:", margin, 86);
    doc.setFont("helvetica", "normal");
    doc.text(String(quotation.customerAddress || "-"), 40, 86);

    // Columna derecha del cliente
    doc.setFont("helvetica", "bold");
    doc.text("Fecha Emisión:", pageWidth - 80, 72);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(quotation.createdAt || quotation.date || Date.now()).toLocaleDateString(), pageWidth - 45, 72);

    doc.setFont("helvetica", "bold");
    doc.text("Moneda:", pageWidth - 80, 79);
    doc.setFont("helvetica", "normal");
    doc.text(quotation.currency === 'USD' ? 'DÓLARES AMERICANOS' : 'SOLES', pageWidth - 45, 79);

    // --- TABLA DE PRODUCTOS ---
    const tableData = (items || []).map((item, index) => [
      index + 1,
      item.product?.code || item.code || '-',
      item.product?.name || item.name || '-',
      item.quantity || 0,
      item.product?.unit?.symbol || item.unit?.symbol || 'UND',
      Number(item.price || 0).toFixed(2),
      (Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2)
    ]);

    autoTable(doc, {
      startY: 95,
      head: [['ITEM', 'CÓDIGO', 'DESCRIPCIÓN', 'CANT.', 'U.M.', 'P. UNIT', 'TOTAL']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [50, 50, 50], // Gris muy oscuro, casi negro
        textColor: [255, 255, 255], 
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'right', cellWidth: 25 },
        6: { halign: 'right', cellWidth: 25 },
      },
      margin: { left: margin, right: margin }
    });

    let finalY = (doc as any).lastAutoTable?.finalY || 150;

    // --- TOTALES ---
    const total = Number(quotation.totalAmount || 0);
    const subtotal = total / 1.18;
    const igv = total - subtotal;

    const totalsX = pageWidth - 65;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("SUBTOTAL:", totalsX, finalY + 10);
    doc.text(subtotal.toFixed(2), pageWidth - margin, finalY + 10, { align: 'right' });

    doc.text("I.G.V. (18%):", totalsX, finalY + 17);
    doc.text(igv.toFixed(2), pageWidth - margin, finalY + 17, { align: 'right' });

    doc.setDrawColor(200);
    doc.line(totalsX, finalY + 20, pageWidth - margin, finalY + 20);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", totalsX, finalY + 27);
    doc.text(`${quotation.currency === 'USD' ? '$' : 'S/'} ${total.toFixed(2)}`, pageWidth - margin, finalY + 27, { align: 'right' });

    // --- FOOTER ---
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120);
    doc.text(settings.footer_message || "Esta cotización tiene una validez de 7 días.", margin, finalY + 45);

    if (action === 'print') {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`Cotizacion_${quotation.docSeries || '001'}_${quotation.docNumber || '001'}.pdf`);
    }
  } catch (error: any) {
    console.error("Error al generar PDF:", error);
    alert("Error al generar PDF: " + error.message);
  }
};
