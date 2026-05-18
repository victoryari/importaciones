import { useEffect, useRef } from 'react';

interface PickingItem {
  id: number;
  quantity: number;
  price: number;
  discount: number;
  product: {
    name: string;
    code?: string;
    unit?: { symbol: string };
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

    const itemRows = order.items.map((item, i) => `
      <tr>
        <td style="text-align:center;padding:6px 8px;border-bottom:1px dashed #ccc;font-size:13px;font-weight:bold;width:32px">${i + 1}</td>
        <td style="padding:6px 8px;border-bottom:1px dashed #ccc;font-size:13px">
          <div style="font-weight:bold">${item.product.name}</div>
          <div style="font-size:11px;color:#666">${item.product.code || ''}${item.product.unit ? ' / ' + item.product.unit.symbol : ''}</div>
        </td>
        <td style="text-align:center;padding:6px 8px;border-bottom:1px dashed #ccc;font-size:14px;font-weight:bold;width:60px">${item.quantity}</td>
      </tr>
    `).join('');

    doc.open();
    doc.write(`
      <html>
      <head>
        <title>Ticket Picking #PED-${order.id}</title>
        <style>
          @page { margin: 10mm; }
          body { font-family: 'Courier New', monospace; margin: 0; padding: 12px; font-size: 12px; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { font-size: 18px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; }
          .header .meta { font-size: 11px; color: #333; }
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; }
          .info-grid .block { flex: 1; }
          .info-grid .label { color: #666; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
          .info-grid .value { font-weight: bold; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #f0f0f0; font-size: 10px; text-transform: uppercase; padding: 6px 8px; border-bottom: 2px solid #000; text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #eee; }
          .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #000; text-align: center; font-size: 10px; color: #555; }
          .footer .time { font-size: 14px; font-weight: bold; margin: 6px 0; }
          .notes { margin-top: 10px; padding: 8px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; font-size: 11px; }
          .badge { display: inline-block; padding: 2px 8px; border: 1px solid #000; font-size: 10px; font-weight: bold; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎯 Ticket de Picking</h1>
          <div class="meta">#PED-${order.id}${order.docSeries ? ' / ' + order.docSeries + '-' + order.docNumber : ''}</div>
          <div class="badge">PREPARACIÓN DE PEDIDO</div>
        </div>

        <div class="info-grid">
          <div class="block">
            <div class="label">Cliente</div>
            <div class="value">${order.customerName}</div>
            <div style="font-size:11px;color:#333;margin-top:2px">${order.customerPhone || ''}</div>
            ${order.customerAddress ? `<div style="font-size:11px;color:#333">${order.customerAddress}</div>` : ''}
          </div>
          <div class="block" style="text-align:right">
            <div class="label">Fecha</div>
            <div class="value">${new Date(order.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            <div class="label" style="margin-top:4px">Operario</div>
            <div class="value">${order.picker?.name || '—'}</div>
            ${order.pickingStartedAt ? `<div style="font-size:11px;color:#333;margin-top:2px">Inicio: ${new Date(order.pickingStartedAt).toLocaleTimeString('es-PE')}</div>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:32px;text-align:center">#</th>
              <th>Producto</th>
              <th style="width:60px;text-align:center">Cant</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        ${order.notes ? `<div class="notes"><strong>📝 Notas:</strong> ${order.notes}</div>` : ''}

        <div class="footer">
          <div>────────────────────────────</div>
          <div class="time">🕐 ${new Date().toLocaleString('es-PE')}</div>
          <div>Importaciones Carmelita del Norte</div>
          <div style="margin-top:4px">✂─── Espacio para marcar ───✂</div>
        </div>

        <script>
          window.onload = function() { window.print(); };
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