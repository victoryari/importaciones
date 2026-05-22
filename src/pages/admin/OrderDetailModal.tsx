import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingCart, User, Truck, DollarSign, Calendar, Hash, FileText, Package } from 'lucide-react';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(val));

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ isOpen, onClose, order }) => {
  if (!order) return null;

  const statusLabel: Record<string, string> = {
    PREPARING: 'Preparando',
    DISPATCHED: 'Despachado',
    SHIPPED: 'En Camino',
    DELIVERED: 'Entregado',
  };

  const paymentLabel: Record<string, string> = {
    UNPAID: 'Pendiente',
    PAID: 'Pagado',
    PARTIAL: 'Parcial',
  };

  const items = order.items || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 overflow-hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-slate-200 z-10 flex flex-col"
          >
            <div className="bg-blue-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Pedido #PED-{order.docSeries || ''}{order.docNumber ? `-${order.docNumber}` : order.id}
              </h2>
              <button onClick={onClose} className="hover:bg-red-500 text-white p-1.5 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Cliente */}
              <section className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><User className="w-4 h-4 text-blue-600" /> Cliente</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-400 text-[10px] font-bold uppercase">Nombre</span><p className="font-bold text-slate-800">{order.customerName}</p></div>
                  <div><span className="text-slate-400 text-[10px] font-bold uppercase">Documento</span><p className="font-bold text-slate-800">{order.customerDocType} {order.customerDocNumber}</p></div>
                  <div><span className="text-slate-400 text-[10px] font-bold uppercase">Dirección</span><p className="font-bold text-slate-800">{order.customerAddress || '—'}</p></div>
                  <div><span className="text-slate-400 text-[10px] font-bold uppercase">Email / Teléfono</span><p className="font-bold text-slate-800">{order.customerEmail || '—'} / {order.customerPhone || '—'}</p></div>
                </div>
              </section>

              {/* Estado y Pago */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><Truck className="w-4 h-4 text-blue-600" /> Estado</h3>
                  <p className="text-lg font-black">{statusLabel[order.status] || order.status}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(order.createdAt).toLocaleDateString('es-PE', { dateStyle: 'long' })}
                  </div>
                </section>
                <section className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-blue-600" /> Pago</h3>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {paymentLabel[order.paymentStatus] || order.paymentStatus}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{order.paymentCondition} / {order.currency}</span>
                  </div>
                  <p className="font-black text-2xl text-slate-900 mt-2">{formatCurrency(order.totalAmount)}</p>
                </section>
              </div>

              {/* Envío */}
              {order.agency && (
                <section className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><Truck className="w-4 h-4 text-blue-600" /> Envío</h3>
                  <p className="font-bold text-slate-800">{order.agency.name}</p>
                  {order.pickupPlace && <p className="text-sm text-slate-600">{order.pickupPlace}</p>}
                </section>
              )}

              {/* Guías */}
              {(order.referralGuide || order.carrierGuide) && (
                <section className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" /> Guías</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {order.referralGuide && <div><span className="text-slate-400 text-[10px] font-bold uppercase">Guía Remisión</span><p className="font-bold">{order.referralGuide}</p></div>}
                    {order.carrierGuide && <div><span className="text-slate-400 text-[10px] font-bold uppercase">Guía Transportista</span><p className="font-bold">{order.carrierGuide}</p></div>}
                  </div>
                </section>
              )}

              {/* Voucher */}
              {order.voucherNumber && (
                <section className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" /> Comprobante</h3>
                  <p className="font-bold text-slate-800">{order.voucherNumber}</p>
                </section>
              )}

              {/* Items */}
              <section className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-blue-600" /> Productos ({items.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[9px] font-black uppercase tracking-wider">
                        <th className="text-left pb-2 pr-2">#</th>
                        <th className="text-left pb-2 pr-2">Código</th>
                        <th className="text-left pb-2 pr-2">Producto</th>
                        <th className="text-center pb-2 pr-2">Cant.</th>
                        <th className="text-right pb-2 pr-2">P. Unit.</th>
                        <th className="text-right pb-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any, i: number) => (
                        <tr key={item.id || i} className="border-b border-slate-100">
                          <td className="py-2 pr-2 font-bold text-slate-400">{i + 1}</td>
                          <td className="py-2 pr-2 font-bold">{item.product?.code || item.code || '—'}</td>
                          <td className="py-2 pr-2 font-bold">{item.product?.name || item.name}</td>
                          <td className="py-2 pr-2 text-center font-bold">{item.quantity}</td>
                          <td className="py-2 pr-2 text-right font-bold">{formatCurrency(item.price)}</td>
                          <td className="py-2 text-right font-black">{formatCurrency(item.quantity * item.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="text-right pt-3 font-black text-sm">Total:</td>
                        <td className="text-right pt-3 font-black text-lg text-blue-800">{formatCurrency(order.totalAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              {/* Notas */}
              {order.notes && (
                <section className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Notas</h3>
                  <p className="text-sm text-slate-700">{order.notes}</p>
                </section>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
