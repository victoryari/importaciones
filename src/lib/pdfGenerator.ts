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

const loadLogoDataUrl = (url: string): Promise<{ dataUrl: string; width: number; height: number } | null> => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    if (url.startsWith('data:image/')) {
      const img = new Image();
      img.onload = () => resolve({ dataUrl: url, width: img.naturalWidth || 200, height: img.naturalHeight || 80 });
      img.onerror = () => resolve(null);
      img.src = url;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 200;
        canvas.height = img.naturalHeight || 80;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const drawFittedLogo = (
  doc: jsPDF,
  logo: { dataUrl: string; width: number; height: number } | null,
  x: number,
  y: number,
  maxW: number,
  maxH: number
) => {
  if (!logo) return false;
  const ratio = Math.min(maxW / logo.width, maxH / logo.height);
  const drawW = logo.width * ratio;
  const drawH = logo.height * ratio;
  const offsetX = x + (maxW - drawW) / 2;
  const offsetY = y + (maxH - drawH) / 2;
  doc.addImage(logo.dataUrl, 'PNG', offsetX, offsetY, drawW, drawH, undefined, 'FAST');
  return true;
};

const formatDatePE = (value: any): string => {
  if (!value) return new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return str;
  return parsed.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const generateQuotationPDF = async (quotation: any, items: any[], action: 'save' | 'print' = 'save') => {
  try {
    const [settingsRes, warehousesRes] = await Promise.all([
      axios.get('/api/settings'),
      (!quotation.pickupPlaceName && quotation.pickupPlace && /^\d+$/.test(String(quotation.pickupPlace).trim()))
        ? axios.get('/api/warehouses').catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] })
    ]);
    const settings = settingsRes.data || {};
    const warehousesList: any[] = Array.isArray(warehousesRes.data) ? warehousesRes.data : [];
    const matchedWarehouse = !quotation.pickupPlaceName && quotation.pickupPlace
      ? warehousesList.find((w: any) => String(w.id) === String(quotation.pickupPlace).trim())
      : null;
    const resolvedPickupPlace = quotation.pickupPlaceName
      || (matchedWarehouse ? `${matchedWarehouse.name}${matchedWarehouse.address ? ` (${matchedWarehouse.address})` : ''}` : '')
      || quotation.pickupPlace
      || '-';
    const logoUrl = settings.document_logo || settings.company_logo || '';
    const loadedLogo = await loadLogoDataUrl(logoUrl);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 12;

    // --- CABECERA ---
    const hasLogo = drawFittedLogo(doc, loadedLogo, margin + 8, 10, 74, 28);
    if (!hasLogo) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(20, 30, 50);
      doc.text(settings.company_name || "IMPORTACIONES CARMELITA DEL NORTE", margin, 25);
    }

    // Recuadro derecho RUC / COTIZACIÓN / SERIE-NÚMERO
    const boxW = 66;
    const boxH = 26;
    const boxX = pageWidth - margin - boxW;
    const boxY = 10;
    doc.setDrawColor(0);
    doc.setLineWidth(0.45);
    doc.rect(boxX, boxY, boxW, boxH);

    const docTitle = quotation.docType === 'PED' ? 'PEDIDO' : 'COTIZACIÓN';
    const docNumStr = `${quotation.docSeries || '0005'} - ${quotation.docNumber || '00000001'}`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`R.U.C.: ${settings.company_ruc || "20126500603"}`, boxX + boxW / 2, boxY + 7, { align: 'center' });
    doc.text(docTitle, boxX + boxW / 2, boxY + 14.5, { align: 'center' });
    doc.text(docNumStr, boxX + boxW / 2, boxY + 22, { align: 'center' });

    // --- DATOS DEL CLIENTE Y DOCUMENTO (2 COLUMNAS) ---
    let leftY = 43;
    let rightY = 43;
    const dividerX = 112;
    const leftLabelX = margin;
    const leftValX = margin + 22;
    const leftMaxW = dividerX - leftValX - 3;

    const rightLabelX = dividerX + 3;
    const rightValX = dividerX + 28;
    const rightMaxW = pageWidth - margin - rightValX;

    const rawDoc = String(quotation.customerDocNumber || quotation.ruc || "").trim();
    const isRuc = rawDoc.length === 11;
    const rucText = isRuc ? rawDoc : "";
    const dniText = !isRuc && rawDoc && rawDoc !== "-" ? rawDoc : "";
    const customerName = String(quotation.customerName || quotation.razonSocial || "PÚBLICO GENERAL").toUpperCase();
    const customerAddress = String(quotation.customerAddress || quotation.address || "-").toUpperCase();
    const paymentCond = String(quotation.paymentCondition || "CONTADO").toUpperCase();

    const drawLeftField = (label: string, value: string, boldValue = true) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(30);
      doc.text(label, leftLabelX, leftY);

      doc.setFont("helvetica", boldValue ? "bold" : "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      const lines = doc.splitTextToSize(value || "-", leftMaxW);
      doc.text(lines, leftValX, leftY);
      leftY += Math.max(1, lines.length) * 4.2 + 0.6;
    };

    drawLeftField("Fecha :        :", formatDatePE(quotation.date || quotation.createdAt));
    drawLeftField("Señor(es) :", customerName);
    drawLeftField("Dirección :", customerAddress, false);

    // Fila R.U.C. + DNI
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30);
    doc.text("R.U.C. :", leftLabelX, leftY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(0);
    doc.text(rucText, leftValX, leftY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("DNI", leftValX + 28, leftY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(dniText, leftValX + 38, leftY);
    leftY += 4.8;

    // Fila Condición de Pago + Forma de Pago
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30);
    doc.text("Condición de Pago:", leftLabelX, leftY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(0);
    doc.text(paymentCond, leftLabelX + 27, leftY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Forma de Pago:", leftLabelX + 44, leftY);
    leftY += 4.8;

    // Columna Derecha
    const sellerName = String(quotation.sellerName || quotation.seller?.name || "-").toUpperCase();
    const deliveryDateStr = quotation.deliveryDate
      ? formatDatePE(quotation.deliveryDate)
      : `${formatDatePE(quotation.date || quotation.createdAt)} ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`;
    const pickupPlace = String(resolvedPickupPlace || "-").toUpperCase();
    const agencyName = String(quotation.agencyName || quotation.shippingAgency?.name || "-").toUpperCase();
    const observation = String(quotation.observation || quotation.observations || "-").toUpperCase();

    const drawRightField = (label: string, value: string) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(30);
      doc.text(label, rightLabelX, rightY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      const lines = doc.splitTextToSize(value || "-", rightMaxW);
      doc.text(lines, rightValX, rightY);
      rightY += Math.max(1, lines.length) * 4.2 + 0.6;
    };

    drawRightField("Vendedor :", sellerName);
    drawRightField("Fecha de Entrega :", deliveryDateStr);
    drawRightField("Lugar de Entrega :", pickupPlace);
    drawRightField("Agencia :", agencyName);
    drawRightField("Observaciones: :", observation);

    // Línea divisoria vertical entre ambas columnas
    const infoBottomY = Math.max(leftY, rightY) - 1;
    doc.setDrawColor(60);
    doc.setLineWidth(0.35);
    doc.line(dividerX, 39.5, dividerX, infoBottomY);

    // --- TABLA DE PRODUCTOS ---
    const hasFreeItems = (items || []).some(item => Boolean(item.isFree));
    const tableData = (items || []).map((item) => {
      const isFree = Boolean(item.isFree);
      const qty = Number(item.quantity || 0);
      const effectivePrice = isFree ? 0 : Number(item.price || 0);
      const discountPct = Number(item.discount || 0);
      const rawLine = qty * effectivePrice;
      const lineTotal = isFree ? 0 : (rawLine - (rawLine * discountPct) / 100);
      const desc = (item.product?.name || item.name || '-') + (isFree ? ' [TRANSFERENCIA GRATUITA]' : '');
      const unitPriceStr = isFree
        ? `0.00 (Ref: ${formatNumber(item.referencePrice || item.originalPrice || item.price || 0)})`
        : formatNumber(effectivePrice);
      const unitStr = item.unitMeasure || item.product?.package?.symbol || item.product?.subPackage?.symbol || item.product?.unit?.symbol || item.unit?.symbol || 'UND';

      return [
        qty.toFixed(2),
        unitStr,
        item.product?.code || item.code || '-',
        desc,
        unitPriceStr,
        formatNumber(lineTotal)
      ];
    });

    autoTable(doc, {
      startY: infoBottomY + 2,
      head: [['CANT.', 'UNID.\nMEDIDA', 'CÓDIGO', 'DESCRIPCIÓN', 'PRECIO\nUNITARIO', 'TOTAL']],
      body: tableData,
      theme: 'plain',
      headStyles: {
        fillColor: [118, 118, 118],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 }
      },
      styles: {
        fontSize: 7.5,
        textColor: [20, 20, 20],
        cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 },
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { halign: 'right', cellWidth: 16 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'center', cellWidth: 26 },
        3: { halign: 'left' },
        4: { halign: 'right', cellWidth: 24 },
        5: { halign: 'right', cellWidth: 24 },
      },
      margin: { left: margin, right: margin }
    });

    let finalY = (doc as any).lastAutoTable?.finalY || (infoBottomY + 20);

    // --- TOTALES AL FINAL DEL DETALLE ---
    if (finalY + 42 > pageHeight - 12) {
      doc.addPage();
      finalY = 15;
    }

    const computedTotal = (items || []).reduce((acc, item) => {
      if (item.isFree) return acc;
      const line = Number(item.quantity || 0) * Number(item.price || 0);
      return acc + (line - (line * (Number(item.discount) || 0)) / 100);
    }, 0) + Number(quotation.flete || 0);

    const total = Number(quotation.totalAmount ?? computedTotal);
    const subtotal = quotation.subtotalAmount !== undefined ? Number(quotation.subtotalAmount) : (total / 1.18);
    const igv = quotation.igvAmount !== undefined ? Number(quotation.igvAmount) : (total - subtotal);

    const isUsd = quotation.currency === 'USD' || quotation.currency === '2';
    const currSymbol = isUsd ? '$' : 'S/';
    const currText = isUsd ? 'DÓLARES AMERICANOS' : 'SOLES';

    const totalsStartY = finalY + 4;

    // Izquierda: Total de Prod + SON
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(20);
    doc.text("Total de Prod:", margin, totalsStartY + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(String((items || []).length), margin + 24, totalsStartY + 5);

    const amountInWords = `SON : ${numeroALetras(total)} ${currText}  S.E.U.O.`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const wordsLines = doc.splitTextToSize(amountInWords, 118);
    doc.text(wordsLines, margin, totalsStartY + 11.5);

    if (hasFreeItems) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(180, 80, 0);
      doc.text("LEYENDA: TRANSFERENCIA GRATUITA DE UN BIEN Y/O SERVICIO PRESTADO GRATUITAMENTE", margin, totalsStartY + 18);
      doc.setTextColor(0);
    }

    // Derecha: Línea + SUB TOTAL / IGV / TOTAL / TOTAL PEDIDO
    const lineStartX = pageWidth - margin - 62;
    doc.setDrawColor(0);
    doc.setLineWidth(0.45);
    doc.line(lineStartX, totalsStartY, pageWidth - margin, totalsStartY);

    const labelRightX = pageWidth - margin - 32;
    const symX = pageWidth - margin - 29;
    const valRightX = pageWidth - margin;

    const drawTotalRow = (label: string, amount: number, yPos: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(0);
      doc.text(label, labelRightX, yPos, { align: 'right' });
      doc.setFont("helvetica", "normal");
      doc.text(currSymbol, symX, yPos);
      doc.text(formatNumber(amount), valRightX, yPos, { align: 'right' });
    };

    drawTotalRow("SUB TOTAL:", subtotal, totalsStartY + 5.5);
    drawTotalRow("IGV:", igv, totalsStartY + 11);
    drawTotalRow("TOTAL:", total, totalsStartY + 16.5);
    drawTotalRow("TOTAL PEDIDO:", total, totalsStartY + 25.5);

    // --- BLOQUE DE CUENTAS BANCARIAS Y AVISO AL PIE ---
    let accountsY = totalsStartY + 38;
    if (accountsY + 46 > pageHeight - 10) {
      doc.addPage();
      accountsY = 18;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(25);
    doc.text("CUENTAS BANCARIAS PARA DEPÓSITO:", margin, accountsY);

    const bankLines = settings.bank_accounts_text
      ? String(settings.bank_accounts_text).split('\n')
      : [
          "BCP S/. 191-1482686-0-24",
          "BCP CCI S/. 002-191-001482686024-50 => IMPORTACIONES CARMELITA DEL NORTE",
          "",
          "BBVA S/. 0011-0349-01-00043082-85",
          "CODIGO DE RECAUDO: 18467",
          "BBVA CCI S/. 011-349-000100043082-85",
        ];

    let curY = accountsY + 8;
    bankLines.forEach((line: string) => {
      if (!line.trim()) {
        curY += 3.5;
        return;
      }
      doc.text(line, margin, curY);
      curY += 4.3;
    });

    curY += 5;
    doc.text("ESTIMADO CLIENTE,", margin, curY);
    curY += 4.5;
    const footerNote = settings.quotation_footer_note || "SOLO SE ATENDERA EL DESPACHO CON LA NOTA DE PEDIDO, UNA VEZ ENTREGADA LA MERCADERIA NO HAY LUGAR A RECLAMO.";
    const footerLines = doc.splitTextToSize(footerNote, pageWidth - margin * 2);
    doc.text(footerLines, margin, curY);

    if (action === 'print') {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`Cotizacion_${quotation.docSeries || '0005'}_${quotation.docNumber || '001'}.pdf`);
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
    const invoiceLogo = await loadLogoDataUrl(settings.document_logo || settings.company_logo || '');
    const hasInvoiceLogo = drawFittedLogo(doc, invoiceLogo, margin, 11, 40, 20);

    // Información de la Empresa (Centro)
    const companyX = hasInvoiceLogo ? 56 : margin;
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
    doc.line(margin, footerY + 24, pageWidth - margin, footerY + 24);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(80);
    doc.text(`Representación Impresa de la ${docTypeName}, autorizada por SUNAT`, margin + 25, footerY + 6);
    doc.text("Autorizado mediante RESOLUCIÓN DE INTENDENCIA : 0340050008568/SUNAT", margin + 25, footerY + 10);
    
    const estCode = invoice.warehouse?.sunatCode || invoice.sunatEstablishmentCode || '0000';
    doc.text(`Establecimiento Emisor SUNAT: [${estCode}] | Hash: ${invoice.sunatHashCode || 'VALIDADO-DIGITALMENTE'}`, margin + 25, footerY + 14);
    doc.text("Consulte la validez de este comprobante en https://www.sunat.gob.pe/", margin + 25, footerY + 18);
    
    // QR Code
    drawQRCodeMockup(pageWidth - margin - 22, footerY + 2, 18);
    
    // Leyenda Powered By
    doc.setFont("helvetica", "italic");
    doc.setFontSize(5.5);
    doc.setTextColor(120);
    doc.text("SUNAT UBL 2.1", pageWidth - margin - 22, footerY + 22);

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

export const generateReferralGuidePDF = async (guide: any, items: any[], action: 'save' | 'print' = 'print') => {
  console.log(`Iniciando generación de PDF de Guía de Remisión (${action})...`);
  try {
    const settingsRes = await axios.get('/api/settings');
    const settings = settingsRes.data;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    const boxW = pageWidth - margin * 2;

    const drawFieldPill = (text: string, x: number, y: number) => {
      const originalFont = doc.getFont();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.2);
      const textWidth = doc.getTextWidth(text);
      const pillW = textWidth + 4;
      const pillH = 3.8;
      
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(140, 140, 140);
      doc.setLineWidth(0.18);
      doc.roundedRect(x - pillW / 2, y - pillH / 2, pillW, pillH, 1.2, 1.2, 'FD');
      
      doc.setTextColor(40, 40, 40);
      doc.text(text, x, y + 1.1, { align: 'center' });
      doc.setFont(originalFont.fontName, originalFont.fontStyle);
    };

    const drawQRCodeMockup = (x: number, y: number, size: number) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(x, y, size, size, 'F');
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.rect(x, y, size, size, 'D');

      doc.setFillColor(0, 0, 0);
      doc.rect(x + 1.5, y + 1.5, 3.5, 3.5, 'F');
      doc.rect(x + size - 5, y + 1.5, 3.5, 3.5, 'F');
      doc.rect(x + 1.5, y + size - 5, 3.5, 3.5, 'F');

      doc.setFillColor(255, 255, 255);
      doc.rect(x + 2.5, y + 2.5, 1.5, 1.5, 'F');
      doc.rect(x + size - 4, y + 2.5, 1.5, 1.5, 'F');
      doc.rect(x + 2.5, y + size - 4, 1.5, 1.5, 'F');

      doc.setFillColor(0, 0, 0);
      doc.rect(x + 7, y + 2, 2, 2, 'F');
      doc.rect(x + 5, y + 6, 2.5, 1.5, 'F');
      doc.rect(x + 8.5, y + 6, 2, 2.5, 'F');
      doc.rect(x + 6, y + size - 5, 3, 2, 'F');
      doc.rect(x + size - 5, y + 6, 2, 3, 'F');
    };

    // --- CABECERA ---
    const guideLogo = await loadLogoDataUrl(settings.document_logo || settings.company_logo || '');
    drawFittedLogo(doc, guideLogo, margin, 10, 48, 22);

    const centerX = pageWidth / 2 - 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(0);
    doc.text((settings.company_name || "IMPORTACIONES CARMELITA DEL NORTE SAC").toUpperCase(), centerX, 13.5, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(30);
    doc.text(`RUC: ${settings.company_ruc || "20126500603"}`, centerX, 18.5, { align: 'center' });
    doc.text(settings.company_address || "JR. CUZCO 809 A - LIMA", centerX, 22.5, { align: 'center' });
    doc.text(`TELF. ${settings.company_phone || "4262860 / RPC. 989567587"}`, centerX, 26.5, { align: 'center' });
    doc.text(`E-mail: ${settings.company_email || "ventas@grupocarmelita.com"}`, centerX, 30.5, { align: 'center' });

    // Cuadro de Comprobante (Derecha)
    const rightBoxW = 54;
    const rightBoxH = 25;
    const rightBoxX = pageWidth - margin - rightBoxW;
    const rightBoxY = 10;

    doc.setDrawColor(200);
    doc.setLineWidth(0.35);
    doc.setFillColor(250, 250, 250);
    doc.rect(rightBoxX, rightBoxY, rightBoxW, rightBoxH, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0);
    doc.text(`RUC: ${settings.company_ruc || "20126500603"}`, rightBoxX + rightBoxW / 2, rightBoxY + 6, { align: 'center' });

    doc.setFontSize(8);
    doc.text("GUIA DE REMISION", rightBoxX + rightBoxW / 2, rightBoxY + 11.5, { align: 'center' });
    doc.text("ELECTRONICA REMITENTE", rightBoxX + rightBoxW / 2, rightBoxY + 15.5, { align: 'center' });

    doc.setFontSize(9.5);
    doc.setTextColor(210, 35, 35);
    doc.text(`${guide.numberFormatted || 'T001-00000001'}`, rightBoxX + rightBoxW / 2, rightBoxY + 21.5, { align: 'center' });

    // Línea divisora debajo de cabecera
    doc.setDrawColor(160);
    doc.setLineWidth(0.3);
    doc.line(margin, 37.5, pageWidth - margin, 37.5);

    // --- DATOS GENERALES (2 COLUMNAS) ---
    let y = 42;
    const col1L = margin;
    const col1V = margin + 32;
    const col2L = margin + 68;
    const col2V = margin + 96;
    const col3L = margin + 124;
    const col3V = margin + 154;

    const emDate = formatDatePE(guide.issueDate);
    const trDate = formatDatePE(guide.transferDate || guide.issueDate);
    const refDate = guide.relatedDocDate
      ? formatDatePE(guide.relatedDocDate)
      : (guide.invoice?.issueDate ? formatDatePE(guide.invoice.issueDate) : (guide.order?.createdAt ? formatDatePE(guide.order.createdAt) : ''));

    const reasonText = (guide.transferReasonDescription || (guide.transferReason === '01' ? 'VENTA' : 'TRASLADO ENTRE LOCALES')).toUpperCase();
    const modeText = guide.transportMode === '01' ? 'Público' : 'Privado';
    const refDocPrefix = guide.relatedDocType === '03' ? 'BOL' : guide.relatedDocType === '01' ? 'FAC' : (guide.relatedDocType || '');
    const rawRefNum = guide.invoiceNumber || guide.relatedDocNumber || (guide.orderNumber ? `PED-${guide.orderNumber}` : '');
    const refDocText = rawRefNum ? `${refDocPrefix ? refDocPrefix + ' ' : ''}${rawRefNum}`.trim() : '-';

    const drawPair = (lx: number, vx: number, label: string, val: string, yy: number, boldVal = false) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(30);
      doc.text(label, lx, yy);
      doc.setFont("helvetica", boldVal ? "bold" : "normal");
      doc.setTextColor(0);
      doc.text(String(val || ''), vx, yy);
    };

    drawPair(col1L, col1V, "Fecha Emisión:", emDate, y);
    drawPair(col2L, col2V, "Doc. Refer", refDocText, y);
    drawPair(col3L, col3V, "Nro. Orden Compra:", guide.purchaseOrderNumber || "", y);
    y += 4.2;

    drawPair(col1L, col1V, "Motivo del Traslado:", reasonText, y);
    drawPair(col2L, col2V, "Fec. Referencia:", refDate, y);
    y += 4.2;

    drawPair(col1L, col1V, "Modalidad de Transporte:", modeText, y);
    drawPair(col2L, col2V + 4, "Fec. Inicio de traslado :", trDate, y);
    y += 4.2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(30);
    doc.text("Observación:", col1L, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    const obsLines = doc.splitTextToSize(String(guide.notes || '-'), pageWidth - margin - col1V);
    doc.text(obsLines, col1V, y);
    y += Math.max(1, obsLines.length) * 3.8 + 1.5;

    // --- DESTINATARIO ---
    const drawSectionHeader = (title: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      doc.text(title, margin, y);
      y += 4;
    };

    drawSectionHeader("DESTINATARIO");
    drawPair(col1L, col1V, "Rz. Social:", (guide.customerName || '-').toUpperCase(), y);
    y += 4;
    const custDocLabel = (guide.customerDocType === '6' || String(guide.customerDocNumber || '').length === 11) ? "RUC:" : "DNI:";
    drawPair(col1L, col1V, custDocLabel, guide.customerDocNumber || '-', y);
    y += 5;

    // --- DATOS DEL TRASLADO ---
    drawSectionHeader("DATOS DEL TRASLADO");
    drawPair(margin, margin + 67, "Indicador de Traslado en Vehículos de Categoría M1 o L :", guide.vehicleCategoryM1OrL ? "SI" : "NO", y);
    drawPair(margin + 86, margin + 174, "Indicador para registrar vehículos y conductores del transportista :", guide.registerTransportData ? "SI" : "NO", y);
    y += 4;
    drawPair(margin, margin + 78, "Indicador de retorno de vehículo con envases o embalajes vacíos :", guide.returnEmptyContainers ? "SI" : "NO", y);
    drawPair(margin + 98, margin + 148, "Indicador de Trasbordo programado :", guide.transshipment ? "SI" : "NO", y);
    y += 5;

    // --- TRANSPORTISTA ---
    drawSectionHeader("TRANSPORTISTA");
    const carrierNameStr = (guide.carrierName || settings.company_name || '-').toUpperCase();
    const carrierRucStr = guide.carrierDocNumber || settings.company_ruc || '-';
    const carrierMtcStr = guide.transportMode === '01' ? (guide.carrierMtcNumber || '') : (guide.vehicleMtc || guide.carrierMtcNumber || '');
    drawPair(margin, margin + 27, "Nombre, Rz. Social:", carrierNameStr, y);
    drawPair(margin + 142, margin + 162, "Num. MTC :", carrierMtcStr, y);
    y += 4;
    drawPair(margin, margin + 27, "Número de RUC:", carrierRucStr, y);
    drawPair(margin + 52, margin + 84, "Entidad Emis. de Aut. :", guide.authorizationEntity || "", y);
    drawPair(margin + 142, margin + 166, "Número Autoriz. :", guide.authorizationNumber || "", y);
    y += 5;

    // --- DATOS DE CONDUCTORES ---
    drawSectionHeader("DATOS DE CONDUCTORES");
    drawPair(margin, margin + 27, "Chofer:", (guide.driverName || '-').toUpperCase(), y);
    drawPair(margin + 114, margin + 144, "Nro. Licencia Chofer :", guide.driverLicenseNumber || '-', y);
    y += 5;

    // --- DATOS DE VEHÍCULOS ---
    drawSectionHeader("DATOS DE VEHÍCULOS");
    drawPair(margin, margin + 27, "Vehículo - Placa :", (guide.vehiclePlate || '-').toUpperCase(), y);
    drawPair(margin + 68, margin + 94, "Vehículo - Marca :", (guide.vehicleBrand || '-').toUpperCase(), y);
    drawPair(margin + 132, margin + 150, "Certificado:", guide.vehicleTuce || "", y);
    y += 5;

    // --- PUNTOS DE PARTIDA Y LLEGADA ---
    const originParts = [guide.originAddress || '-', guide.originWarehouse?.district, guide.originWarehouse?.province].filter(Boolean);
    const deliveryParts = [guide.deliveryAddress || '-'];
    if (guide.deliveryDistrict && !String(guide.deliveryAddress || '').toUpperCase().includes(guide.deliveryDistrict.toUpperCase())) {
      deliveryParts.push(guide.deliveryDistrict);
    }
    if (guide.deliveryProvince && !String(guide.deliveryAddress || '').toUpperCase().includes(guide.deliveryProvince.toUpperCase())) {
      deliveryParts.push(guide.deliveryProvince);
    }
    if (guide.deliveryDepartment && !String(guide.deliveryAddress || '').toUpperCase().includes(guide.deliveryDepartment.toUpperCase())) {
      deliveryParts.push(guide.deliveryDepartment);
    }
    drawPair(margin, margin + 27, "Punto de Partida:", originParts.join(' - ').toUpperCase(), y);
    y += 4;
    drawPair(margin, margin + 27, "Punto de Llegada:", deliveryParts.join(' - ').toUpperCase(), y);
    y += 5;

    // --- AGENCIA TRANSPORTE ---
    const agencyObj = guide.shippingAgency;
    if (agencyObj) {
      drawSectionHeader("AGENCIA TRANSPORTE");
      const matchedBranch = guide.shippingBranchId && Array.isArray(agencyObj.branches)
        ? agencyObj.branches.find((b: any) => Number(b.id) === Number(guide.shippingBranchId))
        : null;
      const agencyAddrParts = [
        matchedBranch?.address || agencyObj.address || guide.agencyAddress,
        matchedBranch?.district || agencyObj.district,
        matchedBranch?.province || agencyObj.province,
        matchedBranch?.department || agencyObj.department,
      ].filter(Boolean);
      const agencyAddrStr = agencyAddrParts.join(' - ').toUpperCase();

      drawPair(margin, margin + 27, "Nombre, Rz. Social:", (agencyObj.name || '-').toUpperCase(), y);
      drawPair(margin + 90, margin + 98, "Ruc:", agencyObj.ruc || guide.agencyRuc || '-', y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(30);
      doc.text("Dirección:", margin + 118, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      const agLines = doc.splitTextToSize(agencyAddrStr || '-', pageWidth - margin - (margin + 132));
      doc.text(agLines, margin + 132, y);
      y += Math.max(1, agLines.length) * 3.8 + 2.5;
    }

    // --- TABLA DE BIENES (8 COLUMNAS) ---
    const tableStartY = y + 1;
    const tableHeader = [['Código', 'Descripción', 'Cantidad', 'U.M.', 'Bultos', 'Tipo Bulto', 'Peso\nUnit(KG)', 'Peso Total']];
    const tableData = (items || []).map((it: any) => {
      const qty = parseFloat(it.quantity) || 0;
      const uWeight = parseFloat(it.unitWeight) || 0;
      const tWeight = parseFloat(it.totalWeight) || (qty * uWeight);
      const pkgs = parseFloat(it.packages) || 0;
      const code = it.code || it.product?.code || '-';
      const baseDesc = it.description || it.product?.name || 'Producto';
      const lotSuffix = it.lotNumber ? ` - Lote: ${it.lotNumber}` : '';
      const fullDesc = `${code !== '-' && !baseDesc.startsWith(code) ? `${code} - ` : ''}${baseDesc}${lotSuffix}`;

      return [
        code,
        fullDesc,
        qty.toFixed(2),
        it.unitMeasure || 'NIU',
        pkgs.toFixed(2),
        it.packageType || '',
        uWeight.toFixed(3),
        tWeight.toFixed(3)
      ];
    });

    autoTable(doc, {
      startY: tableStartY,
      head: tableHeader,
      body: tableData,
      theme: 'plain',
      headStyles: {
        fillColor: [224, 224, 224],
        textColor: [30, 30, 30],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: { top: 2.2, bottom: 2.2, left: 1.5, right: 1.5 }
      },
      styles: {
        fontSize: 6.8,
        cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
        textColor: [20, 20, 20],
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { halign: 'left' },
        2: { cellWidth: 14, halign: 'right' },
        3: { cellWidth: 11, halign: 'center' },
        4: { cellWidth: 13, halign: 'right' },
        5: { cellWidth: 15, halign: 'center' },
        6: { cellWidth: 17, halign: 'right' },
        7: { cellWidth: 18, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    });

    let finalY = (doc as any).lastAutoTable?.finalY || (tableStartY + 40);
    if (finalY + 26 > doc.internal.pageSize.height - 10) {
      doc.addPage();
      finalY = 15;
    }

    // --- FOOTER LEGAL Y QR ---
    const footerY = finalY + 6;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(80, 80, 80);
    doc.text("Representación Impresa de la GUÍA DE REMISIÓN ELECTRÓNICA - REMITENTE, autorizada por SUNAT", margin, footerY + 5);
    doc.text(`Establecimiento Emisor SUNAT: [${guide.originSunatCode || '0000'}] | Peso Bruto Total: ${parseFloat(guide.totalWeight || 0).toFixed(2)} ${guide.weightUnit || 'KGM'} | Hash: ${guide.sunatHashCode || 'VALIDADO-DIGITALMENTE'}`, margin, footerY + 9);
    doc.text("Consulte la validez de este comprobante en https://www.sunat.gob.pe/", margin, footerY + 13);

    drawQRCodeMockup(pageWidth - margin - 16, footerY + 2, 14);

    if (action === 'print') {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`Guia_Remision_${guide.numberFormatted || 'GRE'}.pdf`);
    }
  } catch (error: any) {
    console.error("Error al generar PDF de Guía de Remisión:", error);
    alert("Error al generar PDF de Guía de Remisión: " + error.message);
  }
};

export const generateKardexPDF = async (
  kardexData: any,
  mode: 'valued' | 'physical' = 'valued',
  action: 'save' | 'print' = 'save'
) => {
  try {
    const settingsRes = await axios.get('/api/settings').catch(() => ({ data: {} }));
    const settings = settingsRes.data || {};
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;

    const title = mode === 'valued'
      ? 'FORMATO 13.1: REGISTRO DE INVENTARIO PERMANENTE VALORIZADO - DETALLE DEL INVENTARIO VALORIZADO'
      : 'FORMATO 12.1: REGISTRO DE INVENTARIO PERMANENTE EN UNIDADES FÍSICAS - DETALLE DEL INVENTARIO FÍSICO';

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 74, 153);
    doc.text(title, margin, 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(20);
    doc.text(`RUC: ${settings.company_ruc || '20126500603'}   |   RAZÓN SOCIAL: ${(settings.company_name || 'IMPORTACIONES CARMELITA DEL NORTE SAC').toUpperCase()}`, margin, 18);

    const periodText = `${kardexData.period?.startDate || 'INICIO'} AL ${kardexData.period?.endDate || 'HOY'}`;
    const estText = kardexData.warehouse
      ? `${kardexData.warehouse.name.toUpperCase()} (${kardexData.warehouse.sunatCode || '0000'})`
      : 'GENERAL (TODOS LOS ALMACENES)';
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`PERIODO: ${periodText}   |   ESTABLECIMIENTO: ${estText}`, margin, 22.5);
    doc.text(`EXISTENCIA: [${kardexData.product?.code || '-'}] ${(kardexData.product?.name || '').toUpperCase()}   |   U.M.: ${kardexData.product?.unitSymbol || 'UND'}   |   MÉTODO: PROMEDIO PONDERADO`, margin, 27);

    const rows: any[] = kardexData.rows || [];
    if (mode === 'valued') {
      const head = [
        [
          { content: 'FECHA', rowSpan: 2 },
          { content: 'TIPO', rowSpan: 2 },
          { content: 'SERIE', rowSpan: 2 },
          { content: 'NÚMERO', rowSpan: 2 },
          { content: 'OP. 12', rowSpan: 2 },
          { content: 'ENTRADAS', colSpan: 3 },
          { content: 'SALIDAS', colSpan: 3 },
          { content: 'SALDO FINAL', colSpan: 3 }
        ],
        ['CANT.', 'C. UNIT.', 'C. TOTAL', 'CANT.', 'C. UNIT.', 'C. TOTAL', 'CANT.', 'C. PROM.', 'C. TOTAL']
      ];

      const body: any[] = [
        [
          { content: `SALDO INICIAL AL ${kardexData.period?.startDate || 'INICIO'}`, colSpan: 11, styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 247, 250] } },
          { content: formatNumber(kardexData.initialBalance?.quantity || 0, 2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 247, 250] } },
          { content: Number(kardexData.initialBalance?.unitCost || 0).toFixed(4), styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 247, 250] } },
          { content: formatNumber(kardexData.initialBalance?.totalCost || 0, 2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 247, 250] } }
        ],
        ...rows.map((r) => [
          r.date,
          r.docType,
          r.docSeries || '-',
          r.docNumber || '-',
          r.sunatOperationCode,
          r.inQty > 0 ? formatNumber(r.inQty, 2) : '',
          r.inQty > 0 ? Number(r.inUnitCost).toFixed(4) : '',
          r.inQty > 0 ? formatNumber(r.inTotalCost, 2) : '',
          r.outQty > 0 ? formatNumber(r.outQty, 2) : '',
          r.outQty > 0 ? Number(r.outUnitCost).toFixed(4) : '',
          r.outQty > 0 ? formatNumber(r.outTotalCost, 2) : '',
          formatNumber(r.balanceQty, 2),
          Number(r.balanceUnitCost).toFixed(4),
          formatNumber(r.balanceTotalCost, 2),
        ]),
        [
          { content: 'TOTALES DEL PERIODO / SALDO FINAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [232, 240, 254] } },
          { content: formatNumber(kardexData.totals?.inQty || 0, 2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [232, 240, 254] } },
          { content: '', styles: { fillColor: [232, 240, 254] } },
          { content: formatNumber(kardexData.totals?.inTotalCost || 0, 2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [232, 240, 254] } },
          { content: formatNumber(kardexData.totals?.outQty || 0, 2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [232, 240, 254] } },
          { content: '', styles: { fillColor: [232, 240, 254] } },
          { content: formatNumber(kardexData.totals?.outTotalCost || 0, 2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [232, 240, 254] } },
          { content: formatNumber(kardexData.finalBalance?.quantity || 0, 2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [232, 240, 254] } },
          { content: Number(kardexData.finalBalance?.unitCost || 0).toFixed(4), styles: { halign: 'right', fontStyle: 'bold', fillColor: [232, 240, 254] } },
          { content: formatNumber(kardexData.finalBalance?.totalCost || 0, 2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [232, 240, 254] } },
        ]
      ];

      autoTable(doc, {
        startY: 31,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [0, 74, 153], textColor: 255, fontSize: 6.5, halign: 'center', valign: 'middle' },
        styles: { fontSize: 6.5, cellPadding: 1.5, textColor: 20 },
        columnStyles: {
          0: { cellWidth: 18, halign: 'center' },
          1: { cellWidth: 10, halign: 'center' },
          2: { cellWidth: 12, halign: 'center' },
          3: { cellWidth: 22 },
          4: { cellWidth: 11, halign: 'center' },
          5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' },
          8: { halign: 'right' }, 9: { halign: 'right' }, 10: { halign: 'right' },
          11: { halign: 'right', fontStyle: 'bold' }, 12: { halign: 'right' }, 13: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: margin, right: margin },
      });
    } else {
      const head = [['FECHA', 'DOCUMENTO', 'OP. 12', 'LOTE', 'OBSERVACIÓN / ALMACÉN', 'ENTRADA', 'SALIDA', 'SALDO']];
      const body: any[] = [
        [
          { content: `SALDO INICIAL AL ${kardexData.period?.startDate || 'INICIO'}`, colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 247, 250] } },
          { content: formatNumber(kardexData.initialBalance?.quantity || 0, 2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 247, 250] } },
        ],
        ...rows.map((r) => [
          r.date,
          `${r.docType} ${r.docSeries ? `${r.docSeries}-` : ''}${r.docNumber || '-'}`,
          r.sunatOperationCode,
          r.lotNumber || '-',
          r.observation || r.warehouseName || '-',
          r.inQty > 0 ? formatNumber(r.inQty, 2) : '',
          r.outQty > 0 ? formatNumber(r.outQty, 2) : '',
          formatNumber(r.balanceQty, 2),
        ]),
        [
          { content: 'TOTALES DEL PERIODO / SALDO FINAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [232, 240, 254] } },
          { content: formatNumber(kardexData.totals?.inQty || 0, 2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [232, 240, 254] } },
          { content: formatNumber(kardexData.totals?.outQty || 0, 2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [232, 240, 254] } },
          { content: formatNumber(kardexData.finalBalance?.quantity || 0, 2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [232, 240, 254] } },
        ]
      ];

      autoTable(doc, {
        startY: 31,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [0, 74, 153], textColor: 255, fontSize: 7, halign: 'center' },
        styles: { fontSize: 7, cellPadding: 1.8, textColor: 20 },
        columnStyles: {
          0: { cellWidth: 22, halign: 'center' },
          1: { cellWidth: 34, halign: 'center' },
          2: { cellWidth: 14, halign: 'center' },
          3: { cellWidth: 28 },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 22, halign: 'right' },
          7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: margin, right: margin },
      });
    }

    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(`Generado el ${new Date().toLocaleString('es-PE')}`, pageWidth - margin, doc.internal.pageSize.height - 6, { align: 'right' });

    const codeSlug = (kardexData.product?.code || 'PROD').replace(/[^a-zA-Z0-9_-]/g, '_');
    if (action === 'print') {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`Kardex_${mode === 'valued' ? '13.1_Valorizado' : '12.1_Fisico'}_${codeSlug}.pdf`);
    }
  } catch (error: any) {
    console.error("Error al generar PDF de Kardex:", error);
    alert("Error al generar PDF de Kardex: " + error.message);
  }
};
