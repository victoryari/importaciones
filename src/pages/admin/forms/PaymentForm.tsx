import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { X, DollarSign, CreditCard, Landmark, Calendar, Hash, Save, Trash2 } from 'lucide-react';
import { formatNumber } from '../../../lib/utils';

interface Payment {
  id: number;
  amount: number;
  method: string;
  bankName?: string;
  accountNumber?: string;
  ruc?: string;
  currency?: string;
  exchangeRate?: number;
  originalAmount?: number;
  voucherNumber?: string;
  date: string;
}

interface Order {
  id: number;
  customerName: string;
  totalAmount: number;
  docSeries?: string;
  docNumber?: string;
  payments?: Payment[];
}

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSubmit: (data: any) => Promise<void>;
  onDeletePayment: (paymentId: number) => Promise<void>;
  loading: boolean;
  exchangeRates?: any[];
}

const BANK_OPTIONS = [
  'BCP',
  'BBVA',
  'INTERBANK',
  'SCOTIABANK',
  'BANBIF',
  'PICHINCHA',
  'BANCO DE LA NACIÓN',
  'CAJA PIURA',
  'CAJA AREQUIPA',
  'OTRO'
];

export default function PaymentForm({ isOpen, onClose, order, onSubmit, onDeletePayment, loading, exchangeRates = [] }: PaymentFormProps) {
  const getRateForDate = (targetDate: string) => {
    const match = exchangeRates.find((r: any) => r.date && String(r.date).split('T')[0] === targetDate);
    const rate = match?.sell_rate ?? exchangeRates[0]?.sell_rate ?? 1;
    return Number(rate) > 0 ? String(rate) : '1';
  };

  const [formData, setFormData] = useState({
    amount: '',
    method: 'EFECTIVO',
    bankName: '',
    accountNumber: '',
    ruc: '',
    currency: 'PEN',
    exchangeRate: '1',
    voucherNumber: '',
    observation: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [paymentMethods, setPaymentMethods] = useState<string[]>(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA / POS', 'YAPE / PLIN']);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    axios.get('/api/payment-methods?activeOnly=true')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setPaymentMethods(res.data.map((m: any) => m.name));
        }
      })
      .catch(() => {});
    axios.get('/api/bank-accounts?activeOnly=true')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setBankAccounts(res.data);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (order && isOpen) {
      const today = new Date().toISOString().split('T')[0];
      const remaining = order.totalAmount - (order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0);
      setFormData({
        amount: Math.max(0, remaining).toFixed(2),
        method: 'EFECTIVO',
        bankName: '',
        accountNumber: '',
        ruc: '',
        currency: 'PEN',
        exchangeRate: getRateForDate(today),
        voucherNumber: '',
        observation: '',
        date: today
      });
    }
  }, [order, isOpen]);

  if (!order) return null;

  const totalPaid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
  const balance = order.totalAmount - totalPaid;

  const rawAmount = parseFloat(formData.amount) || 0;
  const activeRate = parseFloat(formData.exchangeRate) || 1;
  const convertedAmountPEN = formData.currency === 'USD' ? Number((rawAmount * activeRate).toFixed(2)) : rawAmount;

  const handleCurrencyChange = (newCurrency: string) => {
    if (newCurrency === formData.currency) return;
    const rate = parseFloat(formData.exchangeRate) || 1;
    const current = parseFloat(formData.amount) || 0;
    let nextAmount = formData.amount;
    if (newCurrency === 'USD' && rate > 0) {
      nextAmount = (current / rate).toFixed(2);
    } else if (newCurrency === 'PEN') {
      nextAmount = (current * rate).toFixed(2);
    }
    setFormData(prev => ({
      ...prev,
      currency: newCurrency,
      amount: nextAmount
    }));
  };

  const handleDateChange = (newDate: string) => {
    setFormData(prev => ({
      ...prev,
      date: newDate,
      exchangeRate: getRateForDate(newDate)
    }));
  };

  const isTransferOrDeposit = /TRANSFER|DEPOS|DEPÓS/i.test(String(formData.method || ''));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      ruc: isTransferOrDeposit ? formData.ruc : '',
      amount: convertedAmountPEN,
      originalAmount: formData.currency === 'USD' ? rawAmount : null,
      exchangeRate: formData.currency === 'USD' ? activeRate : null,
      orderId: order.id
    });
    setFormData(prev => ({
      ...prev,
      voucherNumber: '',
      accountNumber: '',
      ruc: '',
      amount: '0.00'
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="payment-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-300"
          >
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#004A99] text-white flex justify-between items-center border-b border-blue-900 shrink-0">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-tight">Gestionar Cobros</h2>
                <p className="text-blue-200 text-[11px] font-semibold uppercase tracking-wider">Pedido #PED-{order.docSeries || ''}{order.docNumber ? `-${order.docNumber}` : order.id} • {order.customerName}</p>
              </div>
              <button onClick={onClose} aria-label="Cerrar modal" className="p-1.5 hover:bg-red-600 rounded-lg text-white/80 hover:text-white transition-colors duration-150">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5 bg-slate-50/60">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 tabular-nums">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Pedido</p>
                  <p className="text-lg font-bold text-slate-900">S/ {formatNumber(order.totalAmount)}</p>
                </div>
                <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Total Cobrado</p>
                  <p className="text-lg font-bold text-emerald-800">S/ {formatNumber(totalPaid)}</p>
                </div>
                <div className={`${balance > 0 ? 'bg-amber-50/80 border-amber-200' : 'bg-blue-50/80 border-blue-200'} p-3.5 rounded-xl border shadow-2xs`}>
                  <p className={`text-[11px] font-bold ${balance > 0 ? 'text-amber-700' : 'text-[#004A99]'} uppercase tracking-wider mb-1`}>Saldo Pendiente</p>
                  <p className={`text-lg font-bold ${balance > 0 ? 'text-amber-800' : 'text-[#004A99]'}`}>S/ {formatNumber(balance)}</p>
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
                            <p className="text-sm font-black text-slate-800">
                              S/ {formatNumber(p.amount)}
                              {p.currency === 'USD' && p.originalAmount && (
                                <span className="ml-2 text-xs font-bold text-blue-600">
                                  ($ {formatNumber(p.originalAmount)} • T.C. {Number(p.exchangeRate || 1).toFixed(3)})
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              {p.method}
                              {p.bankName && ` • ${p.bankName}`}
                              {p.accountNumber && ` • CTA: ${p.accountNumber}`}
                              {p.ruc && ` • RUC: ${p.ruc}`}
                              {p.voucherNumber && ` • REF: ${p.voucherNumber}`}
                            </p>
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
                <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Registrar Nuevo Cobro</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Método de Pago</label>
                      <select
                        value={formData.method}
                        onChange={e => {
                          const nextMethod = e.target.value;
                          const keepRuc = /TRANSFER|DEPOS|DEPÓS/i.test(nextMethod);
                          setFormData({ ...formData, method: nextMethod, ruc: keepRuc ? formData.ruc : '' });
                        }}
                        className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-sm outline-none focus:border-[#004A99]"
                      >
                        {paymentMethods.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                        {formData.method && !paymentMethods.includes(formData.method) && (
                          <option value={formData.method}>{formData.method}</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Moneda</label>
                      <select
                        value={formData.currency}
                        onChange={e => handleCurrencyChange(e.target.value)}
                        className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-sm font-semibold outline-none focus:border-[#004A99]"
                      >
                        <option value="PEN">SOLES (S/)</option>
                        <option value="USD">DÓLARES ($)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Banco del Abono</label>
                      <select
                        value={formData.bankName}
                        onChange={e => {
                          const bank = e.target.value;
                          const matchingAccounts = bankAccounts.filter((a) => a.bankName === bank);
                          const preferred = matchingAccounts.find((a) => a.currency === formData.currency) || matchingAccounts[0];
                          setFormData({
                            ...formData,
                            bankName: bank,
                            accountNumber: preferred ? preferred.accountNumber : ''
                          });
                        }}
                        className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-sm outline-none focus:border-[#004A99]"
                      >
                        <option value="">-- Seleccionar Banco --</option>
                        {(bankAccounts.length > 0
                          ? Array.from(new Set(bankAccounts.map((a) => a.bankName)))
                          : BANK_OPTIONS
                        ).map(bank => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                        {formData.bankName &&
                          bankAccounts.length > 0 &&
                          !bankAccounts.some((a) => a.bankName === formData.bankName) && (
                            <option value={formData.bankName}>{formData.bankName}</option>
                          )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Nro. de Cuenta</label>
                      {(() => {
                        const matching = bankAccounts.filter((a) => a.bankName === formData.bankName);
                        if (matching.length > 0) {
                          return (
                            <select
                              value={formData.accountNumber}
                              onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                              className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-sm font-mono outline-none focus:border-[#004A99]"
                            >
                              <option value="">-- Seleccionar Cuenta --</option>
                              {matching.map((acc) => (
                                <option key={acc.id} value={acc.accountNumber}>
                                  {acc.accountNumber} ({acc.currency})
                                </option>
                              ))}
                              {formData.accountNumber && !matching.some((a) => a.accountNumber === formData.accountNumber) && (
                                <option value={formData.accountNumber}>{formData.accountNumber}</option>
                              )}
                            </select>
                          );
                        }
                        return (
                          <input
                            type="text"
                            value={formData.accountNumber}
                            onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                            className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-sm font-mono outline-none focus:border-[#004A99]"
                            placeholder="Ej: 191-12345678-0-90"
                          />
                        );
                      })()}
                    </div>

                    {isTransferOrDeposit && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Número de RUC (Titular / Empresa)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={11}
                          value={formData.ruc}
                          onChange={e => setFormData({ ...formData, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                          className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-sm font-mono outline-none focus:border-[#004A99]"
                          placeholder="Ej: 20123456789"
                        />
                      </div>
                    )}

                    {formData.currency === 'USD' && (
                      <div>
                        <label className="block text-[11px] font-bold text-[#004A99] uppercase tracking-wide mb-1">Tipo de Cambio del Día</label>
                        <input
                          required
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={formData.exchangeRate}
                          onChange={e => setFormData({ ...formData, exchangeRate: e.target.value })}
                          className="h-9 w-full bg-blue-50/70 border border-blue-300 rounded-lg px-3 text-sm font-mono font-bold text-[#004A99] outline-none focus:border-[#004A99]"
                        />
                      </div>
                    )}

                    <div className={formData.currency === 'USD' ? '' : 'sm:col-span-2'}>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                        Monto a Cobrar {formData.currency === 'USD' ? '(en Dólares)' : '(en Soles)'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                          {formData.currency === 'USD' ? '$' : 'S/'}
                        </span>
                        <input
                          required
                          type="number"
                          step="0.01"
                          value={formData.amount}
                          onChange={e => setFormData({ ...formData, amount: e.target.value })}
                          className="h-9 w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 text-sm font-mono font-bold outline-none focus:border-[#004A99]"
                        />
                      </div>
                      {formData.currency === 'USD' && (
                        <p className="mt-1 text-[11px] font-semibold text-emerald-700 tabular-nums">
                          Equivalente convertido: S/ {formatNumber(convertedAmountPEN)} (Factor T.C. {activeRate})
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Nro. Operación / Voucher</label>
                      <input
                        type="text"
                        value={formData.voucherNumber}
                        onChange={e => setFormData({ ...formData, voucherNumber: e.target.value })}
                        className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-sm font-mono outline-none focus:border-[#004A99]"
                        placeholder="Ej: 098234"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Fecha Operación</label>
                      <input
                        required
                        type="date"
                        value={formData.date}
                        onChange={e => handleDateChange(e.target.value)}
                        className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-sm outline-none focus:border-[#004A99]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Glosa / Observación</label>
                      <input
                        type="text"
                        value={formData.observation}
                        onChange={e => setFormData({ ...formData, observation: e.target.value })}
                        className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-sm outline-none focus:border-[#004A99]"
                        placeholder="Ej: Adelanto 50% por pedido..."
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || convertedAmountPEN <= 0}
                    aria-busy={loading}
                    className="h-10 w-full bg-[#004A99] hover:bg-[#003B7A] text-white font-semibold text-sm rounded-lg shadow-xs transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Registrando...' : 'Registrar Cobro'}
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
