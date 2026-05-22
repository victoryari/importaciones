import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import { formatNumber } from './utils';

const currencyNames: Record<string, string> = {
  'PEN': 'SOLES',
  'USD': 'DÓLARES AMERICANOS',
  'EUR': 'EUROS',
  'GBP': 'LIBRAS ESTERLINAS',
  'CNY': 'YUAN CHINO'
};

const getCurrencyName = (code: string) => currencyNames[code] || code;

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
    doc.text(getCurrencyName(quotation.currency), pageWidth - 45, 79);

    // --- TABLA DE PRODUCTOS ---
    const tableData = (items || []).map((item, index) => [
      index + 1,
      item.product?.code || item.code || '-',
      item.product?.name || item.name || '-',
      item.quantity || 0,
      item.product?.unit?.symbol || item.unit?.symbol || 'UND',
      formatNumber(item.price || 0),
      formatNumber(Number(item.quantity || 0) * Number(item.price || 0))
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
    doc.text(formatNumber(subtotal), pageWidth - margin, finalY + 10, { align: 'right' });

    doc.text("I.G.V. (18%):", totalsX, finalY + 17);
    doc.text(formatNumber(igv), pageWidth - margin, finalY + 17, { align: 'right' });

    doc.setDrawColor(200);
    doc.line(totalsX, finalY + 20, pageWidth - margin, finalY + 20);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", totalsX, finalY + 27);
    doc.text(`${quotation.currency === 'USD' ? '$' : 'S/'} ${formatNumber(total)}`, pageWidth - margin, finalY + 27, { align: 'right' });

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

function numeroALetras(num: number): string {
  const Unidades = (num: number) => {
    switch (num) {
      case 1: return 'UN';
      case 2: return 'DOS';
      case 3: return 'TRES';
      case 4: return 'CUATRO';
      case 5: return 'CINCO';
      case 6: return 'SEIS';
      case 7: return 'SIETE';
      case 8: return 'OCHO';
      case 9: return 'NUEVE';
    }
    return '';
  };

  const DecenasAnd = (strSin: string, numUnidades: number) => {
    if (numUnidades > 0) return strSin + ' Y ' + Unidades(numUnidades);
    return strSin;
  };

  const Decenas = (num: number) => {
    const decena = Math.floor(num / 10);
    const unidad = num - (decena * 10);
    switch (decena) {
      case 1:
        switch (unidad) {
          case 0: return 'DIEZ';
          case 1: return 'ONCE';
          case 2: return 'DOCE';
          case 3: return 'TRECE';
          case 4: return 'CATORCE';
          case 5: return 'QUINCE';
          default: return 'DIECI' + Unidades(unidad);
        }
      case 2:
        if (unidad === 0) return 'VEINTE';
        return 'VEINTI' + Unidades(unidad);
      case 3: return DecenasAnd('TREINTA', unidad);
      case 4: return DecenasAnd('CUARENTA', unidad);
      case 5: return DecenasAnd('CINCUENTA', unidad);
      case 6: return DecenasAnd('SESENTA', unidad);
      case 7: return DecenasAnd('SETENTA', unidad);
      case 8: return DecenasAnd('OCHENTA', unidad);
      case 9: return DecenasAnd('NOVENTA', unidad);
      case 0: return Unidades(unidad);
    }
    return '';
  };

  const Centenas = (num: number) => {
    const centena = Math.floor(num / 100);
    const decenas = num - (centena * 100);
    switch (centena) {
      case 1:
        if (decenas > 0) return 'CIENTO ' + Decenas(decenas);
        return 'CIEN';
      case 2: return 'DOSCIENTOS ' + Decenas(decenas);
      case 3: return 'TRESCIENTOS ' + Decenas(decenas);
      case 4: return 'CUATROCIENTOS ' + Decenas(decenas);
      case 5: return 'QUINIENTOS ' + Decenas(decenas);
      case 6: return 'SEISCIENTOS ' + Decenas(decenas);
      case 7: return 'SETECIENTOS ' + Decenas(decenas);
      case 8: return 'OCHOCIENTOS ' + Decenas(decenas);
      case 9: return 'NOVECIENTOS ' + Decenas(decenas);
      case 0: return Decenas(decenas);
    }
    return '';
  };

  const Seccion = (num: number, divisor: number, strSingular: string, strPlural: string) => {
    const cientos = Math.floor(num / divisor);
    const resto = num - (cientos * divisor);
    let letras = '';
    if (cientos > 0) {
      if (cientos > 1) letras = Centenas(cientos) + ' ' + strPlural;
      else letras = strSingular;
    } else {
      letras = '';
    }
    if (resto > 0) letras += '';
    return letras;
  };

  const Miles = (num: number) => {
    const divisor = 1000;
    const cientos = Math.floor(num / divisor);
    const resto = num - (cientos * divisor);
    const strMiles = Seccion(num, divisor, 'UN MIL', 'MIL');
    const strCentenas = Centenas(resto);
    if (strMiles === '') return strCentenas;
    return (strMiles + ' ' + strCentenas).trim();
  };

  const Millones = (num: number) => {
    const divisor = 1000000;
    const millones = Math.floor(num / divisor);
    const resto = num - (millones * divisor);
    const strMillones = Seccion(num, divisor, 'UN MILLON', 'MILLONES');
    const strMiles = Miles(resto);
    if (strMillones === '') return strMiles;
    return (strMillones + ' ' + strMiles).trim();
  };

  const entero = Math.floor(num);
  const centavos = Math.round((num - entero) * 100);
  const centavosStr = centavos.toString().padStart(2, '0') + '/100';
  
  if (entero === 0) return `CERO CON ${centavosStr}`;
  
  const letrasEnt = Millones(entero);
  return `${letrasEnt} CON ${centavosStr}`;
}

export const generateInvoicePDF = async (invoice: any, items: any[], action: 'save' | 'print' = 'print') => {
  console.log(`Iniciando generación de PDF de Comprobante (${action})...`);
  try {
    const settingsRes = await axios.get('/api/settings');
    const settings = settingsRes.data;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    // Helper para dibujar las etiquetas tipo "pildora/burbuja"
    const drawFieldPill = (text: string, x: number, y: number) => {
      const originalFont = doc.getFont();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.2);
      const textWidth = doc.getTextWidth(text);
      const pillW = textWidth + 4;
      const pillH = 3.8;
      
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.15);
      doc.roundedRect(x - pillW / 2, y - pillH / 2, pillW, pillH, 1.2, 1.2, 'FD');
      
      doc.setTextColor(60, 60, 60);
      doc.text(text, x, y + 1.1, { align: 'center' });
      doc.setFont(originalFont.fontName, originalFont.fontStyle);
    };

    // Helper para simular un QR Code muy realista sin librerías externas
    const drawQRCodeMockup = (x: number, y: number, size: number) => {
      doc.setFillColor(0, 0, 0);
      // Localizador superior izquierdo
      doc.rect(x, y, 4, 4, 'F');
      doc.setFillColor(255, 255, 255);
      doc.rect(x + 0.8, y + 0.8, 2.4, 2.4, 'F');
      doc.setFillColor(0, 0, 0);
      doc.rect(x + 1.4, y + 1.4, 1.2, 1.2, 'F');

      // Localizador superior derecho
      doc.rect(x + size - 4, y, 4, 4, 'F');
      doc.setFillColor(255, 255, 255);
      doc.rect(x + size - 3.2, y + 0.8, 2.4, 2.4, 'F');
      doc.setFillColor(0, 0, 0);
      doc.rect(x + size - 2.6, y + 1.4, 1.2, 1.2, 'F');

      // Localizador inferior izquierdo
      doc.rect(x, y + size - 4, 4, 4, 'F');
      doc.setFillColor(255, 255, 255);
      doc.rect(x + 0.8, y + size - 3.2, 2.4, 2.4, 'F');
      doc.setFillColor(0, 0, 0);
      doc.rect(x + 1.4, y + size - 2.6, 1.2, 1.2, 'F');

      // Patrones de relleno pseudo-aleatorios usando seno
      doc.setFillColor(0, 0, 0);
      for (let i = 0; i < size; i += 1.2) {
        for (let j = 0; j < size; j += 1.2) {
          if (i < 5 && j < 5) continue;
          if (i > size - 5 && j < 5) continue;
          if (i < 5 && j > size - 5) continue;
          
          if (Math.sin(i * 15.3 + j * 42.5) > 0.1) {
            doc.rect(x + i, y + j, 0.8, 0.8, 'F');
          }
        }
      }
    };

    // --- CABECERA ---
    if (settings.company_logo) {
      try {
        doc.addImage(settings.company_logo, 'PNG', margin, 12, 38, 16, undefined, 'FAST');
      } catch (e) {
        console.warn("Error al cargar logo", e);
      }
    }

    // Información de la Empresa (Centro)
    const companyX = settings.company_logo ? 56 : margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(27, 54, 93); // Azul Carmelita
    doc.text(settings.company_name || "IMPORTACIONES CARMELITA DEL NORTE SAC", companyX, 16);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(80);
    doc.text(`RUC: ${settings.company_ruc || "20126500603"}`, companyX, 21);
    doc.text(settings.company_address || "JR. CUZCO 809 A - LIMA", companyX, 25);
    doc.text(`TELF. ${settings.company_phone || "4262860 / RPC. 989567587"}`, companyX, 29);
    doc.text(`E-mail: ${settings.company_email || "ventas@grupocarmelita.com"}`, companyX, 33);

    // Cuadro de Comprobante (Derecha)
    doc.setDrawColor(27, 54, 93);
    doc.setLineWidth(0.5);
    doc.setFillColor(255, 255, 255);
    const boxW = 54;
    const boxH = 25;
    const boxX = pageWidth - margin - boxW;
    const boxY = 12;
    doc.rect(boxX, boxY, boxW, boxH, 'FD');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(27, 54, 93);
    doc.text(`R.U.C. ${settings.company_ruc || "20126500603"}`, boxX + boxW / 2, boxY + 6.5, { align: 'center' });
    
    let docTypeName = 'COMPROBANTE ELECTRÓNICO';
    if (invoice.documentType === '01') docTypeName = 'FACTURA ELECTRÓNICA';
    else if (invoice.documentType === '03') docTypeName = 'BOLETA DE VENTA ELECTRÓNICA';
    else if (invoice.documentType === '07') docTypeName = 'NOTA DE CRÉDITO ELECTRÓNICA';
    
    doc.setFontSize(8);
    doc.text(docTypeName, boxX + boxW / 2, boxY + 13, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(33, 37, 41);
    const numberFormatted = invoice.numberFormatted || `${invoice.series || 'F001'}-${String(invoice.number || '1').padStart(8, '0')}`;
    doc.text(numberFormatted, boxX + boxW / 2, boxY + 20, { align: 'center' });

    // --- DATOS DEL CLIENTE (ADQUIRIENTE) ---
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.2);
    doc.rect(margin, 43, 182, 17);
    
    drawFieldPill("DATOS DEL ADQUIRIENTE", margin + 22, 43);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(33, 37, 41);
    doc.text((invoice.customerName || "PÚBLICO GENERAL").toUpperCase(), margin + 3, 49);
    
    doc.line(margin, 52, pageWidth - margin, 52);
    
    drawFieldPill("DIRECCIÓN", margin + 12, 52);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text((invoice.customerAddress || "-").toUpperCase(), margin + 3, 57.5);

    // --- GRILLA DE METADATOS ---
    doc.rect(margin, 64, 182, 15);
    
    // Línea horizontal intermedia
    doc.line(margin, 71.5, pageWidth - margin, 71.5);
    
    // Divisiones verticales Fila 1
    doc.line(margin + 40, 64, margin + 40, 71.5);
    doc.line(margin + 70, 64, margin + 70, 71.5);
    doc.line(margin + 95, 64, margin + 95, 71.5);
    doc.line(margin + 138.5, 64, margin + 138.5, 71.5);
    
    // Divisiones verticales Fila 2
    doc.line(margin + 40, 71.5, margin + 40, 79);
    doc.line(margin + 70, 71.5, margin + 70, 79);
    doc.line(margin + 138.5, 71.5, margin + 138.5, 79);
    
    // Burbujas Fila 1
    drawFieldPill("RUC", margin + 20, 64);
    drawFieldPill("ORDEN DE COMPRA", margin + 55, 64);
    drawFieldPill("FECHA O/C", margin + 82.5, 64);
    drawFieldPill("CONDICIÓN DE PAGO", margin + 116.75, 64);
    drawFieldPill("VENCIMIENTO", margin + 160.25, 64);
    
    // Burbujas Fila 2
    drawFieldPill("FECHA DE EMISIÓN", margin + 20, 71.5);
    drawFieldPill("MONEDA", margin + 55, 71.5);
    drawFieldPill("VENDEDOR", margin + 104.25, 71.5);
    drawFieldPill("GUIA N°", margin + 160.25, 71.5);
    
    // Valores Fila 1 (y = 69)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(invoice.customerDocNumber || "-", margin + 20, 69, { align: 'center' });
    doc.text(invoice.order?.purchaseOrder || "-", margin + 55, 69, { align: 'center' });
    doc.text(invoice.order?.purchaseOrderDate ? new Date(invoice.order.purchaseOrderDate).toLocaleDateString() : "-", margin + 82.5, 69, { align: 'center' });
    
    doc.setFont("helvetica", "bold");
    doc.text((invoice.paymentCondition || "CONTADO").toUpperCase(), margin + 116.75, 69, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.text(invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-", margin + 160.25, 69, { align: 'center' });
    
    // Valores Fila 2 (y = 76.5)
    doc.text(new Date(invoice.issueDate || Date.now()).toLocaleDateString(), margin + 20, 76.5, { align: 'center' });
    
    const currencyLabel = getCurrencyName(invoice.currency === '2' ? 'USD' : invoice.currency);
    doc.text(currencyLabel.toUpperCase(), margin + 55, 76.5, { align: 'center' });
    
    const sellerName = invoice.seller?.name || invoice.sellerName || "-";
    doc.text(sellerName.toUpperCase(), margin + 104.25, 76.5, { align: 'center' });
    
    doc.text(invoice.order?.referralGuide || "-", margin + 160.25, 76.5, { align: 'center' });

    // --- TABLA DE PRODUCTOS ---
    const tableData = (items || []).map((item, index) => {
      const name = item.product?.name || item.name || '-';
      const code = item.product?.code || item.code || '-';
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const discount = Number(item.discount || 0);
      const unit = item.unitMeasure || 'UND';
      const lot = item.lotNumber || '-';
      
      const subtotalItem = qty * price;
      const discountAmount = subtotalItem * (discount / 100);
      const finalItemTotal = subtotalItem - discountAmount;

      // Descripción combinada
      let desc = name;
      if (lot && lot !== '-') {
        desc += ` - - Lote: ${lot}`;
      }

      return [
        index + 1,
        code,
        qty.toFixed(2),
        unit,
        desc,
        price.toFixed(4),
        discount > 0 ? discount.toFixed(2) : "0.00",
        formatNumber(finalItemTotal)
      ];
    });

    autoTable(doc, {
      startY: 84,
      head: [['ITEM', 'CÓDIGO', 'CANT', 'U.M.', 'DESCRIPCIÓN', 'PREC. VTA UNIT.', 'DSCTO', 'V. VENTA']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [27, 54, 93], // Azul Carmelita
        textColor: [255, 255, 255], 
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 7,
        cellPadding: 2,
        textColor: [33, 37, 41]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 22 },
        2: { halign: 'right', cellWidth: 15 },
        3: { halign: 'center', cellWidth: 12 },
        4: { halign: 'left', cellWidth: 73 },
        5: { halign: 'right', cellWidth: 22 },
        6: { halign: 'right', cellWidth: 12 },
        7: { halign: 'right', cellWidth: 18 },
      },
      margin: { left: margin, right: margin }
    });

    let finalY = (doc as any).lastAutoTable?.finalY || 150;

    // --- MONTO EN LETRAS ---
    const total = Number(invoice.totalAmount || 0);
    const subtotal = Number(invoice.subtotal || 0);
    const igv = Number(invoice.totalIgv || 0);
    const discount = Number(invoice.totalDiscount || 0);
    const igvPercent = Number(invoice.igvPercent || 18);

    const currencyText = getCurrencyName(invoice.currency === '2' ? 'USD' : invoice.currency);
    const letters = `SON : ${numeroALetras(total)} ${currencyText}`;
    
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.2);
    doc.rect(margin, finalY + 5, 115, 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(33, 37, 41);
    doc.text(letters.toUpperCase(), margin + 2, finalY + 9.2);

    // --- CONDICIONES / LEYENDAS ---
    const noteText = "GUARDA TU VOUCHER. ES EL SUSTENTO PARA VALIDAR TU COMPRA, REPRESENTACION IMPRESA DE LA BOLETA ELECTRONICA PUEDE SER CONSULTADO EN WWW.TISOLUCIONES.NET.PE/BOL. APROBADO MEDIANTE RESOLUCION NRO. 08005001024/SUNAT. NO SE ACEPTAN DEVOLUCIONES DE DINERO. CAMBIO DE MERCADERIA UNICAMENTE DENTRO DE LAS 48 HORAS SIGUIENTES A LA COMPRA. INDISPENSABLE PRESENTAR COMPROBANTE.";
    doc.rect(margin, finalY + 12, 115, 23);
    const splitNote = doc.splitTextToSize(noteText, 111);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(80);
    doc.text(splitNote, margin + 2, finalY + 16);

    // --- TOTALES A LA DERECHA ---
    const totalX = 135;
    const labelW = 26;
    const valueW = 35;
    const rowH = 6.2;
    const currencySymbol = (invoice.currency === '2' ? 'USD' : invoice.currency) === 'USD' ? '$' : 'S/';
    
    const totalsList = [
      { label: "DESCUENTOS", value: `${currencySymbol} ${formatNumber(discount)}` },
      { label: "SUB-TOTAL", value: `${currencySymbol} ${formatNumber(subtotal)}` },
      { label: `IGV ${igvPercent}%`, value: `${currencySymbol} ${formatNumber(igv)}` },
      { label: "PRECIO VENTA", value: `${currencySymbol} ${formatNumber(total)}` },
    ];
    
    totalsList.forEach((row, idx) => {
      const curY = finalY + 5 + idx * rowH;
      // Fondo para la etiqueta
      doc.setFillColor(27, 54, 93);
      doc.rect(totalX, curY, labelW, rowH, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(row.label, totalX + 2, curY + 4.2);
      
      // Borde del valor
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.2);
      doc.rect(totalX + labelW, curY, valueW, rowH, 'S');
      
      doc.setTextColor(33, 37, 41);
      doc.text(row.value, totalX + labelW + valueW - 2, curY + 4.2, { align: 'right' });
    });

    // --- DETALLE DE CUOTAS (SI ES CRÉDITO) ---
    let installmentsHeight = 0;
    if (invoice.paymentCondition === 'CREDITO' && invoice.installments && invoice.installments.length > 0) {
      const instHeader = [['Cuota', 'Fecha de Vencimiento', 'Monto de Cuota']];
      const instData = invoice.installments.map((inst: any, index: number) => [
        `Cuota${String(index + 1).padStart(3, '0')}`,
        new Date(inst.dueDate || inst.paidDate || Date.now()).toLocaleDateString(),
        `${currencySymbol} ${formatNumber(inst.amount)}`
      ]);
      
      autoTable(doc, {
        startY: finalY + 38,
        head: instHeader,
        body: instData,
        theme: 'grid',
        headStyles: { 
          fillColor: [255, 255, 255], 
          textColor: [33, 37, 41], 
          fontSize: 7, 
          fontStyle: 'bold', 
          halign: 'center', 
          lineColor: [120, 120, 120], 
          lineWidth: 0.2 
        },
        styles: { 
          fontSize: 7, 
          cellPadding: 1.8, 
          halign: 'center',
          textColor: [33, 37, 41]
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 45 },
          2: { cellWidth: 35, halign: 'right' },
        },
        margin: { left: margin }
      });
      const instFinalY = (doc as any).lastAutoTable?.finalY || (finalY + 38);
      installmentsHeight = instFinalY - (finalY + 38) + 4;
    }

    // --- PIE DE PÁGINA (LEGAL Y QR) ---
    const footerY = Math.max(finalY + 38 + installmentsHeight, finalY + 32);
    
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY + 22, pageWidth - margin, footerY + 22);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80);
    doc.text("Representación Impresa de la FACTURA ELECTRÓNICA, consulte https://consulta.factesol.net.pe/", margin + 25, footerY + 7);
    doc.text("Autorizado mediante RESOLUCIÓN DE INTENDENCIA : 0340050008568/SUNAT", margin + 25, footerY + 11);
    
    // QR Code
    drawQRCodeMockup(pageWidth - margin - 22, footerY + 2, 18);
    
    // Leyenda Powered By
    doc.setFont("helvetica", "italic");
    doc.setFontSize(5.5);
    doc.setTextColor(120);
    doc.text("powered by TI", pageWidth - margin - 22, footerY + 21);

    if (action === 'print') {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`Invoice_${invoice.numberFormatted || 'Comprobante'}.pdf`);
    }
  } catch (error: any) {
    console.error("Error al generar PDF de Factura:", error);
    alert("Error al generar PDF de Factura: " + error.message);
  }
};
