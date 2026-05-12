import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, DollarSign, CreditCard, Landmark, Calendar, Hash, Save, Trash2 } from 'lucide-react';
import { formatNumber } from '../../../lib/utils';

interface Payment {
  id: number;
  amount: number;
  method: string;
  voucherNumber?: string;
  date: string;
}

interface Order {
  id: number;
  customerName: string;
  totalAmount: number;
  payments?: Payment[];
}

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSubmit: (data: any) => Promise<void>;
  onDeletePayment: (paymentId: number) => Promise<void>;
  loading: boolean;
}

export default function PaymentForm({ isOpen, onClose, order, onSubmit, onDeletePayment, loading }: PaymentFormProps) {
  const [formData, setFormData] = useState({
    amount: '',
    method: 'EFECTIVO',
    voucherNumber: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (order) {
      const remaining = order.totalAmount - (order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0);
      setFormData(prev => ({
        ...prev,
        amount: Math.max(0, remaining).toFixed(2)
      }));
    }
  }, [order]);

  if (!order) return null;

  const totalPaid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
  const balance = order.totalAmount - totalPaid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      orderId: order.id
    });
    setFormData({
      ...formData,
      voucherNumber: '',
      amount: '0.00'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 bg-blue-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black">Gestionar Cobros</h2>
                <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">Pedido #PED-{order.id} • {order.customerName}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pedido</p>
                  <p className="text-lg font-black text-slate-900">S/ {formatNumber(order.totalAmount)}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Cobrado</p>
                  <p className="text-lg font-black text-emerald-700">S/ {formatNumber(totalPaid)}</p>
                </div>
                <div className={`${balance > 0 ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'} p-4 rounded-2xl border`}>
                  <p className={`text-[10px] font-black ${balance > 0 ? 'text-amber-600' : 'text-blue-600'} uppercase tracking-widest mb-1`}>Saldo Pendiente</p>
                  <p className={`text-lg font-black ${balance > 0 ? 'text-amber-700' : 'text-blue-700'}`}>S/ {formatNumber(balance)}</p>
                </div>
              </div>

              {/* History */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Hash className="w-3 h-3" /> Historial de Pagos
                </h3>
                <div className="space-y-2">
                  {order.payments && order.payments.length > 0 ? (
                    order.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            p.method === 'EFECTIVO' ? 'bg-emerald-100 text-emerald-600' : 
                            p.method === 'TRANSFERENCIA' ? 'bg-blue-100 text-blue-600' : 
                            'bg-purple-100 text-purple-600'
                          }`}>
                            {p.method === 'EFECTIVO' ? <DollarSign className="w-4 h-4" /> : 
                             p.method === 'TRANSFERENCIA' ? <Landmark className="w-4 h-4" /> : 
                             <CreditCard className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800">S/ {formatNumber(p.amount)}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{p.method} {p.voucherNumber && `• REF: ${p.voucherNumber}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] text-slate-400 font-bold">{new Date(p.date).toLocaleDateString()}</span>
                          <button 
                            onClick={() => onDeletePayment(p.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-400 text-sm font-medium italic">No hay cobros registrados</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Add New Payment */}
              {balance > 0 && (
                <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                  <h3 className="text-sm font-black text-slate-900 mb-2">Registrar Nuevo Cobro</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Método de Pago</label>
                      <select
                        value={formData.method}
                        onChange={e => setFormData({ ...formData, method: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="EFECTIVO">EFECTIVO</option>
                        <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                        <option value="TARJETA / POS">TARJETA / POS</option>
                        <option value="YAPE / PLIN">YAPE / PLIN</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Monto a Cobrar</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">S/</span>
                        <input
                          required
                          type="number"
                          step="0.01"
                          value={formData.amount}
                          onChange={e => setFormData({ ...formData, amount: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-black outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nro. Operación / Voucher</label>
                      <input
                        type="text"
                        value={formData.voucherNumber}
                        onChange={e => setFormData({ ...formData, voucherNumber: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                        placeholder="Ej: 098234"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Fecha</label>
                      <input
                        required
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || parseFloat(formData.amount) <= 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    Registrar Cobro
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
