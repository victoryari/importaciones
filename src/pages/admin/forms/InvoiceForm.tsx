import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Save, X, FileText, Hash, Building2, User, DollarSign,
  Search, Trash2, Plus, Calendar, Calculator, RefreshCw,
  ShoppingBag, Percent, Receipt, ChevronDown, Truck, MapPin,
  PlusCircle
} from 'lucide-react';
import { ProductSearchModal } from './ProductSearchModal';
import { formatNumber } from '../../../lib/utils';
import axios from 'axios';

interface DocumentTypeOption {
  code: string;
  name: string;
}

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  editingItem: any;
  loading: boolean;
  customers: any[];
  sellers: any[];
  documentTypes: DocumentTypeOption[];
  sunatCurrencies: any[];
  sunatPaymentConditions: any[];
  sunatOperationTypes: any[];
  sunatIgvAffectations?: any[];
  searchResults: any[];
  handleSearchProduct: (query: string) => void;
  quotationItems: any[];
  addQuotationItem: (product: any) => void;
  updateQuotationItem: (productId: number, field: string, value: any) => void;
  removeQuotationItem: (productId: number) => void;
  quotationTotal: number;
  token: string;
  series: any[];
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  isOpen, onClose, onSubmit, formData, setFormData, editingItem,
  loading, customers, sellers, documentTypes, sunatCurrencies,
  sunatPaymentConditions, sunatOperationTypes, sunatIgvAffectations, searchResults,
  handleSearchProduct, quotationItems, addQuotationItem,
  updateQuotationItem, removeQuotationItem, quotationTotal,
  token, series
}) => {
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [showInstallments, setShowInstallments] = useState(formData.paymentCondition === 'CREDITO');
  const [installments, setInstallments] = useState<any[]>(formData.installments || []);
  const [creditQty, setCreditQty] = useState(1);
  const [creditDays, setCreditDays] = useState(30);
  const [creditStart, setCreditStart] = useState(formData.issueDate || new Date().toISOString().split('T')[0]);
  const [creditAmount, setCreditAmount] = useState(quotationTotal);

  useEffect(() => {
    if (isOpen) {
      setShowInstallments(formData.paymentCondition === 'CREDITO');
      if (!editingItem) {
        setInstallments([]);
      } else {
        setInstallments(formData.installments || []);
      }
    }
  }, [isOpen, formData.paymentCondition]);

  useEffect(() => {
    setFormData((prev: any) => ({ ...prev, installments }));
  }, [installments]);

  useEffect(() => {
    if (isOpen && formData.issueDate && !editingItem) {
      axios.get(`/api/exchange-rates/fetch-by-date/${formData.issueDate}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (res.data) {
            const isSoles = formData.currency === 'PEN';
            const rate = isSoles ? res.data.buy_rate : res.data.sell_rate;
            setFormData((prev: any) => ({ ...prev, exchangeRate: rate }));
          }
        }).catch(() => {});
    }
  }, [formData.issueDate, isOpen, formData.currency]);

  const handleAddInstallments = () => {
    const start = new Date(creditStart);
    const newInstallments = [];
    const totalToFinance = creditAmount || quotationTotal;
    const amountPerInst = totalToFinance / creditQty;
    for (let i = 0; i < creditQty; i++) {
      const dueDate = new Date(start);
      dueDate.setDate(dueDate.getDate() + creditDays * (i + 1));
      newInstallments.push({
        number: i + 1,
        amount: i === creditQty - 1
          ? totalToFinance - amountPerInst * (creditQty - 1)
          : amountPerInst,
        daysOffset: creditDays * (i + 1),
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'PENDING'
      });
    }
    setInstallments(newInstallments);
  };

  const handleConditionChange = (value: string) => {
    setFormData((prev: any) => ({ ...prev, paymentCondition: value }));
    setShowInstallments(value === 'CREDITO');
    if (value !== 'CREDITO') {
      setInstallments([]);
    }
  };

  const dsctoTotal = 0;
  const valorVenta = quotationTotal / 1.18;
  const igvTotal = quotationTotal - valorVenta;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-110 flex items-center justify-center p-0 overflow-hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            className="relative w-full h-full max-w-[98%] max-h-[98vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300"
          >
            <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white tracking-tight uppercase">
                  {editingItem ? 'Editar Comprobante' : 'Nuevo Comprobante'}
                </h2>
              </div>
              <button onClick={onClose} className="hover:bg-red-500 text-white p-1 rounded transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <form
              onSubmit={onSubmit}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault(); }}
              className="flex-1 overflow-hidden flex flex-col bg-[#F0F4F8]"
            >
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* --- HEADER: Documento, Serie, Número --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-3 flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">Tipo Doc.</span>
                    <select
                      value={formData.documentType || ''}
                      onChange={e => {
                        setFormData((prev: any) => ({ ...prev, documentType: e.target.value, series: '', docNumber: '' }));
                      }}
                      className="h-8 flex-1 border border-slate-300 rounded px-1 text-xs font-bold bg-white"
                      required
                    >
                      <option value="">--Seleccionar--</option>
                      {documentTypes.filter(dt => ['FACT', 'BOOL', 'NCRE'].includes(dt.code)).map(dt => (
                        <option key={dt.code} value={dt.code}>{dt.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">Serie</span>
                    <select
                      value={formData.series || ''}
                      onChange={e => {
                        const sel = e.target.value;
                        setFormData((prev: any) => ({ ...prev, series: sel }));
                        if (sel) {
                          const s = series.find((x: any) => x.id === parseInt(sel));
                          if (s) {
                            axios.get(`/api/series/next/${s.warehouseId}/${formData.documentType}`, {
                              headers: { Authorization: `Bearer ${token}` }
                            }).then(res => {
                              setFormData((prev: any) => ({
                                ...prev,
                                docSeries: res.data.series,
                                docNumber: res.data.nextNumber,
                                seriesId: s.id
                              }));
                            }).catch(() => {});
                          }
                        }
                      }}
                      className="h-8 flex-1 border border-slate-300 rounded px-1 text-xs font-bold bg-white"
                    >
                      <option value="">--Serie--</option>
                      {series
                        .filter((s: any) => s.documentType === formData.documentType && s.isActive)
                        .map((s: any) => (
                          <option key={s.id} value={s.id}>{s.series}</option>
                        ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">N°</span>
                    <div className="relative flex-1">
                      <Hash className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        readOnly
                        value={formData.docSeries && formData.docNumber ? `${formData.docSeries}-${formData.docNumber}` : ''}
                        className="h-8 w-full border border-slate-300 rounded pl-7 pr-2 text-xs font-bold bg-slate-100 text-blue-700"
                        placeholder="F001-00000001"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-3 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">F. Emisión</span>
                    <input
                      type="date"
                      value={formData.issueDate || ''}
                      onChange={e => setFormData((prev: any) => ({ ...prev, issueDate: e.target.value }))}
                      className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">T. Cambio</span>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.exchangeRate || '1.000'}
                      onChange={e => setFormData((prev: any) => ({ ...prev, exchangeRate: e.target.value }))}
                      className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-right bg-yellow-50"
                    />
                  </div>
                </div>

                {/* --- SECCIÓN: Cliente --- */}
                <fieldset className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <legend className="text-[10px] font-bold text-blue-700 px-2 uppercase tracking-tighter">Cliente</legend>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2">
                    <div className="md:col-span-3 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-16 text-right">Doc.:</span>
                      <select
                        value={formData.customerDocType || 'DNI'}
                        onChange={e => setFormData((prev: any) => ({ ...prev, customerDocType: e.target.value }))}
                        className="h-8 w-24 border border-slate-300 rounded px-1 text-xs font-bold bg-white"
                      >
                        <option value="DNI">DNI</option>
                        <option value="RUC">RUC</option>
                        <option value="CE">CE</option>
                      </select>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={formData.customerDocNumber || ''}
                          onChange={e => {
                            const val = e.target.value;
                            const found = customers.find(c => c.docNumber === val);
                            setFormData((prev: any) => ({
                              ...prev,
                              customerDocNumber: val,
                              customerName: found ? (found.name || `${found.firstName || ''} ${found.lastName || ''}`.trim()) : prev.customerName,
                              customerAddress: found?.address || prev.customerAddress,
                              customerEmail: found?.email || prev.customerEmail,
                              customerPhone: found?.phone || prev.customerPhone,
                              customerId: found?.id || null
                            }));
                          }}
                          className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold"
                          placeholder="N° Documento"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-5 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 shrink-0">Razón Social:</span>
                      <input
                        type="text"
                        value={formData.customerName || ''}
                        onChange={e => setFormData((prev: any) => ({ ...prev, customerName: e.target.value }))}
                        className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-[#D9E9FF] text-[#004A99]"
                        placeholder="RAZÓN SOCIAL"
                        required
                      />
                    </div>
                    <div className="md:col-span-4 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 shrink-0">Dirección:</span>
                      <input
                        type="text"
                        value={formData.customerAddress || ''}
                        onChange={e => setFormData((prev: any) => ({ ...prev, customerAddress: e.target.value }))}
                        className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold"
                        placeholder="DIRECCIÓN"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* --- SECCIÓN: Condiciones --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-5 bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-24 text-right">Cond. Pago:</span>
                      <select
                        value={formData.paymentCondition || 'CONTADO'}
                        onChange={e => handleConditionChange(e.target.value)}
                        className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-white"
                      >
                        {sunatPaymentConditions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-24 text-right">Moneda:</span>
                      <select
                        value={formData.currency || 'PEN'}
                        onChange={e => setFormData((prev: any) => ({ ...prev, currency: e.target.value }))}
                        className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-white"
                      >
                        {sunatCurrencies.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-24 text-right">Vendedor:</span>
                      <select
                        value={formData.sellerId || ''}
                        onChange={e => setFormData((prev: any) => ({ ...prev, sellerId: e.target.value }))}
                        className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-white"
                      >
                        <option value="">--Seleccionar--</option>
                        {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="lg:col-span-7 bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-32 text-right">Afectación:</span>
                      <select
                        value={formData.operationType || '10'}
                        onChange={e => setFormData((prev: any) => ({ ...prev, operationType: e.target.value }))}
                        className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-white"
                      >
                        {(sunatIgvAffectations?.length ? sunatIgvAffectations : sunatOperationTypes).map(t => <option key={t.code} value={t.code}>{t.code} | {t.name}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={formData.includeIgv !== false}
                          onChange={e => setFormData((prev: any) => ({ ...prev, includeIgv: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600"
                        />
                        Afecto a IGV
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={formData.priceIncludesIgv !== false}
                          onChange={e => setFormData((prev: any) => ({ ...prev, priceIncludesIgv: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600"
                        />
                        Precios incluyen IGV
                      </label>
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-[11px] font-bold text-slate-600">IGV:</span>
                        <input
                          type="number"
                          value={formData.igvPercent || 18}
                          onChange={e => setFormData((prev: any) => ({ ...prev, igvPercent: e.target.value }))}
                          className="h-7 w-16 border border-slate-300 rounded px-1 text-xs font-bold text-right bg-white"
                        />
                        <span className="text-[10px] text-slate-400">%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-32 text-right">Observación:</span>
                      <input
                        type="text"
                        value={formData.notes || ''}
                        onChange={e => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
                        className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold"
                        placeholder="Observaciones..."
                      />
                    </div>
                  </div>
                </div>

                {/* --- CUOTAS (solo CRÉDITO) --- */}
                {showInstallments && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> Cuotas
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsInstallmentModalOpen(true)}
                        className="h-7 px-3 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> {installments.length > 0 ? 'Editar Cuotas' : 'Gestionar Cuotas'}
                      </button>
                    </div>
                    {installments.length > 0 && (
                      <div className="mt-2 flex items-center gap-4 text-[11px]">
                        <span className="font-bold text-slate-600">{installments.length} cuota(s)</span>
                        <span className="font-black text-blue-800">
                          {formatNumber(installments.reduce((s, i) => s + i.amount, 0))}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* --- MODAL CUOTAS --- */}
                <AnimatePresence>
                  {isInstallmentModalOpen && (
                    <div className="absolute inset-0 z-120 flex items-center justify-center p-0 overflow-hidden">
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInstallmentModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 20 }}
                        transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 z-10"
                      >
                        <div className="bg-blue-800 px-4 py-2.5 flex items-center justify-between">
                          <h2 className="text-sm font-bold text-white tracking-tight uppercase flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Gestión de Cuotas
                          </h2>
                          <button onClick={() => setIsInstallmentModalOpen(false)} className="hover:bg-red-500 text-white p-1 rounded transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-4 space-y-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-500">Cant.</span>
                              <input
                                type="number"
                                min="1"
                                max="36"
                                value={creditQty}
                                onChange={e => setCreditQty(parseInt(e.target.value) || 1)}
                                className="h-7 w-16 border border-slate-300 rounded px-1 text-xs font-bold text-center"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-500">C/días</span>
                              <input
                                type="number"
                                min="1"
                                value={creditDays}
                                onChange={e => setCreditDays(parseInt(e.target.value) || 30)}
                                className="h-7 w-16 border border-slate-300 rounded px-1 text-xs font-bold text-center"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-500">Inicio</span>
                              <input
                                type="date"
                                value={creditStart}
                                onChange={e => setCreditStart(e.target.value)}
                                className="h-7 flex-1 border border-slate-300 rounded px-2 text-xs font-bold"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-500">Importe</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={creditAmount}
                                onChange={e => setCreditAmount(parseFloat(e.target.value) || 0)}
                                className="h-7 w-24 border border-slate-300 rounded px-1 text-xs font-bold text-right"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleAddInstallments}
                              className="h-7 px-3 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Generar
                            </button>
                          </div>
                          {installments.length > 0 && (
                            <table className="w-full text-[10px]">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="px-2 py-1 font-bold text-left">#</th>
                                  <th className="px-2 py-1 font-bold text-right">Monto</th>
                                  <th className="px-2 py-1 font-bold text-right">Días</th>
                                  <th className="px-2 py-1 font-bold text-right">Vencimiento</th>
                                </tr>
                              </thead>
                              <tbody>
                                {installments.map((inst, i) => (
                                  <tr key={i} className="border-b border-slate-100">
                                    <td className="px-2 py-1 font-bold">{inst.number}</td>
                                    <td className="px-2 py-1 text-right font-bold">{formatNumber(inst.amount)}</td>
                                    <td className="px-2 py-1 text-right">{inst.daysOffset}</td>
                                    <td className="px-2 py-1 text-right">{inst.dueDate}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* --- GRILLA DE DETALLE --- */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-75">
                  <div className="bg-slate-800 border-b border-slate-700 px-3 py-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                      Detalle de Ítems
                    </span>
                    <div className="relative group w-96">
                      <input
                        type="text"
                        placeholder="Buscar producto por código o nombre..."
                        onChange={e => handleSearchProduct(e.target.value)}
                        className="h-7 w-full border border-slate-600 bg-slate-700 text-white rounded px-8 text-xs outline-none focus:border-blue-400"
                      />
                      <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white shadow-2xl border border-slate-200 rounded max-h-64 overflow-y-auto">
                          {searchResults.map(p => (
                            <div key={p.id} onClick={() => { addQuotationItem(p); handleSearchProduct(''); }} className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex justify-between border-b border-slate-50">
                              <span className="font-bold text-slate-800">{p.name}</span>
                              <span className="text-blue-600 font-black">S/ {p.salePrice}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                          <th className="px-2 py-1 font-bold border-r border-slate-200 text-center w-8">#</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-200 w-20">Código</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-200 text-center w-28">Lote</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-200 min-w-50">Descripción</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-200 text-right w-16">Cant.</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-200 text-center w-16">U.M.</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-200 text-right w-20">Dscto.</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-200 text-right w-24">P. Unitario</th>
                          <th className="px-2 py-1 border-r border-slate-200 text-right w-24">Total</th>
                          <th className="px-2 py-1 w-10 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotationItems.map((item, index) => {
                          const subtotal = item.price * item.quantity;
                          const discountAmt = subtotal * ((item.discount || 0) / 100);
                          const totalLine = subtotal - discountAmt;
                          return (
                            <tr key={item.productId || index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="px-2 py-1 text-center font-bold text-slate-400 border-r border-slate-100">{index + 1}</td>
                              <td className="px-2 py-1 border-r border-slate-100 font-bold">{item.code}</td>
                              <td className="px-2 py-1 border-r border-slate-100 text-center">
                                <input
                                  type="text"
                                  value={item.lotNumber || ''}
                                  onChange={e => updateQuotationItem(item.productId, 'lotNumber', e.target.value)}
                                  className="w-full text-center bg-transparent outline-none focus:bg-white font-bold text-xs"
                                />
                              </td>
                              <td className="px-2 py-1 border-r border-slate-100 font-bold truncate max-w-62.5">{item.name}</td>
                              <td className="px-2 py-1 border-r border-slate-100">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={e => updateQuotationItem(item.productId, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-full text-right bg-emerald-50/30 outline-none focus:bg-white font-black text-blue-800"
                                />
                              </td>
                              <td className="px-2 py-1 border-r border-slate-100 text-center">{item.unitMeasure || item.unit?.symbol || 'UND'}</td>
                              <td className="px-2 py-1 border-r border-slate-100 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.discount || 0}
                                  onChange={e => updateQuotationItem(item.productId, 'discount', parseFloat(e.target.value) || 0)}
                                  className="w-full text-right bg-transparent outline-none focus:bg-white font-bold"
                                />
                              </td>
                              <td className="px-2 py-1 border-r border-slate-100">
                                <input
                                  type="number"
                                  step="0.000001"
                                  value={item.price}
                                  onChange={e => updateQuotationItem(item.productId, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-full text-right bg-transparent outline-none focus:bg-white font-bold"
                                />
                              </td>
                              <td className="px-2 py-1 border-r border-slate-100 text-right font-black text-blue-900">{formatNumber(totalLine)}</td>
                              <td className="px-2 py-1 text-center">
                                <button type="button" onClick={() => removeQuotationItem(item.productId)} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </td>
                            </tr>
                          );
                        })}
                        {quotationItems.length === 0 && (
                          <tr><td colSpan={10} className="h-64 text-center text-slate-300 italic">Pulse el buscador superior para agregar productos</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-50 p-2 border-t border-slate-200 flex items-center justify-between shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsProductSearchOpen(true)}
                      className="h-7 px-3 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700 flex items-center gap-1 shadow-sm"
                    >
                      <PlusCircle className="w-3 h-3" /> Agregar Ítem
                    </button>
                    <span className="text-[11px] font-bold text-slate-600">Total Ítems: {quotationItems.length}</span>
                  </div>
                </div>

                {/* --- TOTALES --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-end gap-6">
                  <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="h-10 px-4 bg-slate-50 border border-slate-300 rounded text-xs font-bold hover:bg-slate-100 flex items-center gap-2"><X className="w-4 h-4 text-red-500" /> Cancelar</button>
                    <button type="submit" disabled={loading} className="h-10 px-12 bg-blue-800 text-white rounded shadow-lg shadow-blue-200 hover:bg-blue-900 flex items-center gap-2 text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all">
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {loading ? 'Procesando...' : (editingItem ? 'Actualizar' : 'Emitir Comprobante')}
                    </button>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right"><p className="text-[10px] font-bold text-slate-400 mb-0">SUB TOTAL:</p><p className="text-xs font-bold text-slate-700">{formatNumber(valorVenta)}</p></div>
                    <div className="text-right"><p className="text-[10px] font-bold text-slate-400 mb-0">I.G.V.:</p><p className="text-xs font-bold text-slate-700">{formatNumber(igvTotal)}</p></div>
                    <div className="text-right bg-blue-50 px-4 py-1 rounded border border-blue-100">
                      <p className="text-[10px] font-black text-blue-500 mb-0">TOTAL:</p>
                      <p className="text-xl font-black text-blue-900 tracking-tight">S/ {formatNumber(quotationTotal)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      <ProductSearchModal isOpen={isProductSearchOpen} onClose={() => setIsProductSearchOpen(false)} onSelect={(p) => { addQuotationItem(p); setIsProductSearchOpen(false); }} token={token} />
    </AnimatePresence>
  );
};
