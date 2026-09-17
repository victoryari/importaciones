import { useEffect, useRef } from 'react';

interface PickingItem {
  id: number;
  quantity: number;
  unitMeasure?: string;
  price: number;
  discount: number;
  product: {
    name: string;
    code?: string;
    unit?: { symbol: string };
    package?: { symbol: string };
    subPackage?: { symbol: string };
  };
}

interface PickingOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  docNumber?: string;
  docSeries?: string;
  createdAt: string;
  picker?: { name: string } | null;
  pickingStartedAt?: string;
  items: PickingItem[];
  notes?: string;
}

export default function PickingTicketPrint({ order }: { order: PickingOrder }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const totalQty = order.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

    const itemRows = order.items.map((item, i) => {
      const unit = (item.unitMeasure || item.product?.package?.symbol || item.product?.subPackage?.symbol || item.product?.unit?.symbol || 'UND').toUpperCase();
      return `
        <tr>
          <td style="text-align:center;padding:4px 2px;border-bottom:1px dashed #555;font-size:11px;font-weight:bold;width:22px;vertical-align:top">${i + 1}</td>
          <td style="padding:4px 4px;border-bottom:1px dashed #555;font-size:11px;vertical-align:top">
            <div style="font-weight:bold;font-size:12px;color:#000;line-height:1.2">${item.product?.name || 'Producto'}</div>
            <div style="font-size:10px;color:#444;margin-top:2px">
              ${item.product?.code ? `<span style="font-family:monospace;font-weight:bold">[${item.product.code}]</span> ` : ''}
              <span>${unit}</span>
            </div>
          </td>
          <td style="text-align:right;padding:4px 2px;border-bottom:1px dashed #555;font-size:12px;font-weight:bold;width:55px;vertical-align:top;white-space:nowrap">
            ${item.quantity} <span style="font-size:10px;color:#222">${unit}</span>
          </td>
        </tr>
      `;
    }).join('');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket Picking #PED-${order.docSeries || ''}${order.docNumber ? '-' + order.docNumber : order.id}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            margin: 0 auto;
            padding: 0;
            background: #fff;
          }
          body {
            font-family: 'Lucida Console', 'Courier New', Courier, monospace;
            width: 76mm;
            max-width: 76mm;
            padding: 4mm 3mm;
            font-size: 11px;
            color: #000;
            line-height: 1.25;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .header { text-align: center; margin-bottom: 6px; }
          .header .company { font-size: 13px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.5px; }
          .header .sub { font-size: 10px; color: #333; margin-bottom: 4px; }
          .header .title { font-size: 14px; font-weight: 900; text-transform: uppercase; border: 1.5px solid #000; padding: 3px 6px; display: inline-block; margin: 4px 0; }
          .header .doc-num { font-size: 13px; font-weight: 900; font-family: monospace; margin-top: 2px; }
          .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
          .double-divider { border-bottom: 2px solid #000; margin: 6px 0; }
          .info-section { font-size: 10.5px; margin: 4px 0; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .info-label { font-weight: bold; text-transform: uppercase; font-size: 9.5px; color: #333; }
          .info-val { font-weight: bold; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          th { font-size: 9.5px; text-transform: uppercase; padding: 3px 2px; border-bottom: 1.5px solid #000; border-top: 1.5px solid #000; }
          .totals-section { margin-top: 6px; font-size: 11px; font-weight: bold; }
          .notes-box { margin-top: 6px; padding: 4px; border: 1px dashed #000; font-size: 10px; }
          .footer { margin-top: 10px; text-align: center; font-size: 9.5px; }
          .footer .signatures { display: flex; justify-content: space-between; margin-top: 22px; padding-top: 4px; }
          .footer .sign-line { width: 45%; border-top: 1px solid #000; text-align: center; font-size: 9px; font-weight: bold; padding-top: 2px; }
          
          @media print {
            body {
              width: 76mm !important;
              max-width: 76mm !important;
              margin: 0 auto !important;
              padding: 2mm 3mm !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">IMPORTACIONES CARMELITA</div>
          <div class="sub">Control Logístico de Almacén</div>
          <div class="title">TICKET DE PICKING</div>
          <div class="doc-num">#PED-${order.docSeries || ''}${order.docNumber ? '-' + order.docNumber : order.id}</div>
        </div>

        <div class="divider"></div>

        <div class="info-section">
          <div class="info-row">
            <span class="info-label">FECHA:</span>
            <span class="info-val">${new Date(order.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          </div>
          <div class="info-row">
            <span class="info-label">CLIENTE:</span>
            <span class="info-val" style="text-align:right;max-width:55mm">${order.customerName}</span>
          </div>
          ${order.customerPhone ? `
          <div class="info-row">
            <span class="info-label">TELÉFONO:</span>
            <span class="info-val">${order.customerPhone}</span>
          </div>` : ''}
          ${order.customerAddress ? `
          <div class="info-row">
            <span class="info-label">DIRECCIÓN:</span>
            <span class="info-val" style="font-size:9.5px;text-align:right;max-width:52mm">${order.customerAddress}</span>
          </div>` : ''}
          <div class="divider"></div>
          <div class="info-row">
            <span class="info-label">OPERARIO:</span>
            <span class="info-val">${order.picker?.name || 'POR ASIGNAR'}</span>
          </div>
          ${order.pickingStartedAt ? `
          <div class="info-row">
            <span class="info-label">HORA INICIO:</span>
            <span class="info-val">${new Date(order.pickingStartedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:20px;text-align:center">#</th>
              <th style="text-align:left">PRODUCTO</th>
              <th style="width:55px;text-align:right">CANT</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="info-row">
            <span>TOTAL ÍTEMS:</span>
            <span>${order.items.length}</span>
          </div>
          <div class="info-row">
            <span>TOTAL UNIDADES:</span>
            <span>${totalQty}</span>
          </div>
        </div>

        ${order.notes ? `
        <div class="notes-box">
          <strong>OBSERVACIONES:</strong><br>${order.notes}
        </div>` : ''}

        <div class="footer">
          <div class="signatures">
            <div class="sign-line">Despachador</div>
            <div class="sign-line">Control / Verif.</div>
          </div>
          <div class="divider" style="margin-top:10px"></div>
          <div style="font-size:8.5px;color:#333;margin-top:2px">
            Impreso: ${new Date().toLocaleString('es-PE')}
          </div>
          <div style="font-size:8px;color:#666;margin-top:2px">
            *** ERP Carmelita del Norte ***
          </div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    doc.close();
  }, [order]);

  return (
    <iframe
      ref={iframeRef}
      style={{ position: 'absolute', width: 0, height: 0, border: 'none' }}
      title="Ticket de Picking"
    />
  );
}