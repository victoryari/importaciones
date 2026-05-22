import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Save, X, FileText, Hash, Building2, User, DollarSign,
  Search, Trash2, Plus, Calendar, Calculator, RefreshCw,
  ShoppingBag, Percent, Receipt, ChevronDown, Truck, MapPin,
  PlusCircle, UserPlus, Edit3, Printer, Eye, Check
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
  handleConsultCustomer?: (type: string, number: string) => Promise<any>;
  handleQuickRegister?: (data: any) => Promise<void>;
  onOpenCustomerForm?: (docNumber?: string) => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  isOpen, onClose, onSubmit, formData, setFormData, editingItem,
  loading, customers, sellers, documentTypes, sunatCurrencies,
  sunatPaymentConditions, sunatOperationTypes, sunatIgvAffectations, searchResults,
  handleSearchProduct, quotationItems, addQuotationItem,
  updateQuotationItem, removeQuotationItem, quotationTotal,
  token, series,
  handleConsultCustomer, handleQuickRegister, onOpenCustomerForm
}) => {
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [docSearchResults, setDocSearchResults] = useState<any[]>([]);
  const [isConsulting, setIsConsulting] = useState(false);
  const [consultedData, setConsultedData] = useState<any>(null);
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

  const handleDocPredictiveSearch = (q: string) => {
    let docType = '';
    if (q.length === 8) docType = 'DNI';
    else if (q.length === 11) docType = 'RUC';
    setFormData((prev: any) => ({
      ...prev,
      customerDocNumber: q,
      customerDocType: docType || prev.customerDocType,
      ...(q === '' ? {
        customerName: '',
        customerAddress: '',
        customerEmail: '',
        customerPhone: '',
        customerId: null
      } : {})
    }));
    if (q.length > 2) {
      const filtered = customers.filter(c =>
        c.docNumber?.includes(q) ||
        (c.name && c.name.toLowerCase().includes(q.toLowerCase())) ||
        (c.firstName && c.firstName.toLowerCase().includes(q.toLowerCase())) ||
        (c.lastName && c.lastName.toLowerCase().includes(q.toLowerCase()))
      );
      setDocSearchResults(filtered);
    } else {
      setDocSearchResults([]);
    }
    if (q === '') setConsultedData(null);
  };

  const handleNamePredictiveSearch = (q: string) => {
    setFormData((prev: any) => ({ ...prev, customerName: q }));
    if (q.length > 2) {
      const filtered = customers.filter(c =>
        (c.name && c.name.toLowerCase().includes(q.toLowerCase())) ||
        (c.firstName && c.firstName.toLowerCase().includes(q.toLowerCase())) ||
        (c.lastName && c.lastName.toLowerCase().includes(q.toLowerCase())) ||
        c.docNumber?.includes(q)
      );
      setCustomerSearchResults(filtered);
    } else {
      setCustomerSearchResults([]);
    }
  };

  const selectCustomer = (c: any) => {
    setFormData((prev: any) => ({
      ...prev,
      customerDocNumber: c.docNumber || '',
      customerName: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || '',
      customerAddress: c.address || '',
      customerEmail: c.email || '',
      customerPhone: c.phone || '',
      customerId: c.id || null
    }));
    setCustomerSearchResults([]);
    setDocSearchResults([]);
    setConsultedData(null);
  };

  const handleApiPeruSearch = async () => {
    const docNum = formData.customerDocNumber;
    if (!docNum) return;
    setIsConsulting(true);
    try {
      const existing = customers.find(c => c.docNumber === docNum);
      if (existing) {
        selectCustomer(existing);
        return;
      }
      const docType = docNum.length === 11 ? 'RUC' : 'DNI';
      const data = await handleConsultCustomer?.(docType, docNum);
      if (data) {
        let name = '';
        let address = '';
        if (docType === 'RUC') {
          name = data.nombre_o_razon_social || data.razonSocial || '';
          address = data.direccion_completa || data.direccion || '';
        } else {
          name = `${data.nombres || ''} ${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim();
        }
        setFormData((prev: any) => ({
          ...prev,
          customerName: name || prev.customerName,
          customerAddress: address || prev.customerAddress,
        }));
        setConsultedData({
          name,
          address,
          docNumber: docNum,
          docType,
          personType: docType === 'RUC' ? 'JURIDICA' : 'NATURAL',
          firstName: data.nombres || '',
          lastName: `${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim(),
        });
      }
    } catch (err) {
      console.error('APIPeru search error:', err);
    } finally {
      setIsConsulting(false);
    }
  };

  const dsctoTotal = 0;
  const valorVenta = quotationTotal / 1.18;
  const igvTotal = quotationTotal - valorVenta;

  const inputCls = "h-7 border border-slate-300 rounded px-2 text-[11px] font-bold bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200";
  const selectCls = "h-7 border border-slate-300 rounded px-1 text-[11px] font-bold bg-white outline-none focus:border-blue-500";
  const labelCls = "text-[10px] font-bold text-slate-600 shrink-0 whitespace-nowrap";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-110 flex items-center justify-center p-0 overflow-hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            className="relative w-full h-full max-w-[98%] max-h-[98vh] bg-[#E8EEF4] rounded-lg shadow-2xl overflow-hidden flex flex-col border border-slate-400"
          >
            {/* --- BARRA DE TITULO ESTILO ERP --- */}
            <div className="bg-gradient-to-r from-blue-800 to-blue-700 px-4 py-1.5 flex items-center justify-between shrink-0 border-b border-blue-900">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-white" />
                <h2 className="text-xs font-bold text-white tracking-tight uppercase">
                  {editingItem ? 'Editar Comprobante' : 'Registro de Venta'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-blue-200">I.G.V.</span>
                  <input
                    type="number"
                    value={formData.igvPercent || 18}
                    onChange={e => setFormData((prev: any) => ({ ...prev, igvPercent: e.target.value }))}
                    className="w-14 h-6 border border-blue-600 rounded bg-blue-900 text-white text-[11px] font-bold text-right px-1 outline-none"
                  />
                  <span className="text-[10px] font-bold text-blue-200">%</span>
                </div>
                <button onClick={onClose} className="hover:bg-red-500 text-white p-1 rounded transition-colors"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <form
              onSubmit={onSubmit}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault(); }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                
                {/* === FILA 1: Documento + Doc Ref + Fecha Ref === */}
                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Documento:</span>
                    <select
                      value={formData.documentType || ''}
                      onChange={e => setFormData((prev: any) => ({ ...prev, documentType: e.target.value, series: '', docNumber: '' }))}
                      className={`${selectCls} w-36`}
                      required
                    >
                      <option value="">--Seleccionar--</option>
                      {documentTypes.filter(dt => ['01', '03', '07'].includes(dt.code)).map(dt => (
                        <option key={dt.code} value={dt.code}>{dt.code} - {dt.name}</option>
                      ))}
                    </select>
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
                      className={`${selectCls} w-20`}
                    >
                      <option value="">--Serie--</option>
                      {series.filter((s: any) => s.documentType === formData.documentType && s.isActive).map((s: any) => (
                        <option key={s.id} value={s.id}>{s.series}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      readOnly
                      value={formData.docSeries && formData.docNumber ? `${formData.docSeries}-${formData.docNumber}` : ''}
                      className={`${inputCls} w-28 bg-slate-100 text-blue-700 text-center font-black`}
                      placeholder="00000001"
                    />
                    <button type="button" className="p-1 text-slate-400 hover:text-blue-600"><Edit3 className="w-3.5 h-3.5" /></button>
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    <span className={labelCls}>Documento Ref.:</span>
                    <select className={`${selectCls} w-28`}>
                      <option value="">--Seleccionar--</option>
                    </select>
                    <input type="text" className={`${inputCls} w-20`} />
                    <input type="text" className={`${inputCls} w-20`} />
                    <span className={labelCls}>Fecha Ref.:</span>
                    <input type="date" className={`${inputCls} w-28`} />
                  </div>
                </div>

                {/* === SECCIÓN: Cliente === */}
                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-tighter">Cliente</span>
                    <div className="flex-1 border-b border-slate-200"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={labelCls}>RUC:</span>
                    <div className="relative flex-1 max-w-[200px]">
                      <input
                        type="text"
                        value={formData.customerDocNumber || ''}
                        onChange={e => handleDocPredictiveSearch(e.target.value)}
                        className={`${inputCls} w-full pr-20`}
                        placeholder="N° Documento"
                      />
                      {docSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-70 mt-1 bg-white shadow-2xl border border-slate-200 rounded max-h-48 overflow-y-auto">
                          {docSearchResults.map(c => (
                            <div key={c.id} onClick={() => selectCustomer(c)} className="p-2 hover:bg-blue-50 cursor-pointer text-xs border-b border-slate-100">
                              <span className="font-bold">{c.docNumber}</span>
                              <span className="text-[10px] text-slate-500 ml-2">{c.name || `${c.firstName} ${c.lastName}`}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        <button type="button" onClick={handleApiPeruSearch} disabled={isConsulting} className="p-0.5 text-blue-600 hover:bg-blue-50 rounded">
                          {isConsulting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        </button>
                        <button type="button" onClick={() => onOpenCustomerForm?.(formData.customerDocNumber)} className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Nuevo Cliente">
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <span className={labelCls}>Código Cliente:</span>
                    <input type="text" className={`${inputCls} w-24`} />
                    <span className={labelCls}>Nombre / Razón Social:</span>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={formData.customerName || ''}
                        onChange={e => handleNamePredictiveSearch(e.target.value)}
                        className={`${inputCls} w-full bg-blue-50 text-blue-800 font-black`}
                        placeholder="RAZÓN SOCIAL"
                        required
                      />
                      {customerSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-70 mt-1 bg-white shadow-2xl border border-slate-200 rounded max-h-48 overflow-y-auto">
                          {customerSearchResults.map(c => (
                            <div key={c.id} onClick={() => selectCustomer(c)} className="p-2 hover:bg-blue-50 cursor-pointer text-xs border-b border-slate-100">
                              <span className="font-bold">{c.name || `${c.firstName} ${c.lastName}`}</span>
                              <span className="text-[10px] text-slate-500 ml-2">{c.docNumber}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={labelCls}>Dirección:</span>
                    <input
                      type="text"
                      value={formData.customerAddress || ''}
                      onChange={e => setFormData((prev: any) => ({ ...prev, customerAddress: e.target.value }))}
                      className={`${inputCls} flex-1`}
                      placeholder="DIRECCIÓN"
                    />
                  </div>
                </div>

                {/* === FILA: Fechas + Tipo Cambio === */}
                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Fecha Emisión:</span>
                    <input type="date" value={formData.issueDate || ''} onChange={e => setFormData((prev: any) => ({ ...prev, issueDate: e.target.value }))} className={`${inputCls} w-28`} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>F. Ord. Servicio:</span>
                    <input type="date" className={`${inputCls} w-28`} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Tipo Cambio:</span>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.exchangeRate || '1.000'}
                      onChange={e => setFormData((prev: any) => ({ ...prev, exchangeRate: e.target.value }))}
                      className={`${inputCls} w-20 text-right bg-yellow-50 font-black text-blue-700`}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Nro. Días:</span>
                    <input type="number" className={`${inputCls} w-16 text-center`} defaultValue="0" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>F. Venc.:</span>
                    <input type="date" className={`${inputCls} w-28`} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>F. Mov. Almacén:</span>
                    <input type="date" className={`${inputCls} w-28`} />
                  </div>
                </div>

                {/* === FILA: Cond. Pago + Concepto + Placa === */}
                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Cond. de Pago:</span>
                    <select
                      value={formData.paymentCondition || 'CONTADO'}
                      onChange={e => handleConditionChange(e.target.value)}
                      className={`${selectCls} w-28`}
                    >
                      {sunatPaymentConditions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                    {showInstallments && (
                      <button type="button" onClick={() => setIsInstallmentModalOpen(true)} className="p-0.5 text-blue-600 hover:bg-blue-50 rounded">
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <span className={labelCls}>Concepto:</span>
                    <input type="text" className={`${inputCls} flex-1`} placeholder="VENTA DE MERCADERÍA" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Placa Vehículo:</span>
                    <input type="text" className={`${inputCls} w-24`} />
                  </div>
                </div>

                {/* === FILA: Moneda + Estado + Checkboxes === */}
                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Moneda:</span>
                    <select
                      value={formData.currency || 'PEN'}
                      onChange={e => setFormData((prev: any) => ({ ...prev, currency: e.target.value }))}
                      className={`${selectCls} w-28`}
                    >
                      {sunatCurrencies.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Estado:</span>
                    <select className={`${selectCls} w-24`}>
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="INACTIVO">INACTIVO</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={formData.includeIgv !== false} onChange={e => setFormData((prev: any) => ({ ...prev, includeIgv: e.target.checked }))} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600" />
                      Afecto a IGV
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={formData.priceIncludesIgv !== false} onChange={e => setFormData((prev: any) => ({ ...prev, priceIncludesIgv: e.target.checked }))} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600" />
                      Precios Incluyen IGV
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600" />
                      Deducción Anticipo
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600" />
                      Gratuito
                    </label>
                  </div>
                </div>

                {/* === FILA: Vendedor + Tipo Operación + Dscto + Comisión === */}
                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Vendedor:</span>
                    <select
                      value={formData.sellerId || ''}
                      onChange={e => setFormData((prev: any) => ({ ...prev, sellerId: e.target.value }))}
                      className={`${selectCls} w-40`}
                    >
                      <option value="">--Seleccionar--</option>
                      {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Tipo Operación:</span>
                    <select
                      value={formData.operationType || '10'}
                      onChange={e => setFormData((prev: any) => ({ ...prev, operationType: e.target.value }))}
                      className={`${selectCls} w-56`}
                    >
                      {(sunatIgvAffectations?.length ? sunatIgvAffectations : sunatOperationTypes).map(t => <option key={t.code} value={t.code}>{t.code} | {t.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Dscto:</span>
                    <input type="number" step="0.01" className={`${inputCls} w-16 text-right`} defaultValue="0" />
                    <span className="text-[10px] text-slate-500">%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Comisión:</span>
                    <input type="number" step="0.001" className={`${inputCls} w-16 text-right`} defaultValue="1.000" />
                    <span className="text-[10px] text-slate-500">%</span>
                  </div>
                </div>

                {/* === FILA: Tipo de Venta + Checkboxes adicionales === */}
                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Tipo de Venta:</span>
                    <select className={`${selectCls} w-28 bg-blue-100 text-blue-800 font-bold`}>
                      <option value="03">03 | VENTA</option>
                    </select>
                    <select className={`${selectCls} w-32`}>
                      <option value="">--Seleccionar--</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600" />
                      Anticipo
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600" />
                      Afecto Detracción
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600" />
                      Afecto Retención
                    </label>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600" />
                      Rec. Consumo
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                      Precios Incl. Rec. Consumo Porc:
                      <input type="number" step="0.01" className={`${inputCls} w-14 text-right`} defaultValue="0.0" />
                      <span className="text-[10px] text-slate-500">%</span>
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600" />
                      G/R Total
                    </label>
                  </div>
                </div>

                {/* === FILA: Referencias === */}
                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Nro Pedido:</span>
                    <input type="text" className={`${inputCls} w-32`} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>G. de Remisión:</span>
                    <input type="text" className={`${inputCls} w-20`} />
                    <span className="text-slate-400">-</span>
                    <button type="button" className="h-7 px-2 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold hover:bg-slate-200">
                      Use comas para separar
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>O/Compra:</span>
                    <input type="text" className={`${inputCls} w-24`} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={labelCls}>Fch. Ord. Compra:</span>
                    <input type="date" className={`${inputCls} w-28`} />
                    <button type="button" className="p-0.5 text-slate-400 hover:text-blue-600"><Calendar className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* === GRILLA DE DETALLE === */}
                <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-[#D6E4F0] border-b border-slate-300 px-2 py-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button type="button" className="p-1 hover:bg-slate-200 rounded"><FileText className="w-3.5 h-3.5 text-slate-600" /></button>
                    </div>
                    <div className="relative group w-80">
                      <input
                        type="text"
                        placeholder="Buscar producto..."
                        onChange={e => handleSearchProduct(e.target.value)}
                        className="h-6 w-full border border-slate-300 bg-white text-slate-800 rounded px-6 text-[10px] outline-none focus:border-blue-500"
                      />
                      <Search className="w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
                        <tr className="bg-[#C8D8E8] text-slate-700 border-b border-slate-300">
                          <th className="px-1 py-1 font-bold border-r border-slate-300 text-center w-6"></th>
                          <th className="px-1 py-1 font-bold border-r border-slate-300 text-center w-6"></th>
                          <th className="px-1 py-1 font-bold border-r border-slate-300 text-center w-6">Alm.</th>
                          <th className="px-1 py-1 font-bold border-r border-slate-300 w-20">Cod. Producto</th>
                          <th className="px-1 py-1 font-bold border-r border-slate-300 min-w-40">Descripción Producto</th>
                          <th className="px-1 py-1 font-bold border-r border-slate-300 text-right w-16">Cantidad</th>
                          <th className="px-1 py-1 font-bold border-r border-slate-300 text-center w-12">U. M.</th>
                          <th className="px-1 py-1 font-bold border-r border-slate-300 text-center w-16">Genera G/R?</th>
                          <th className="px-1 py-1 font-bold border-r border-slate-300 text-right w-16">Cant G/R</th>
                          <th className="px-1 py-1 font-bold border-r border-slate-300 text-center w-16">Cat. Precio</th>
                          <th className="px-1 py-1 font-bold border-r border-slate-300 text-right w-20">P. Unit.</th>
                          <th className="px-1 py-1 w-8 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotationItems.map((item, index) => {
                          const subtotal = item.price * item.quantity;
                          const discountAmt = subtotal * ((item.discount || 0) / 100);
                          const totalLine = subtotal - discountAmt;
                          return (
                            <tr key={item.productId || index} className="border-b border-slate-200 hover:bg-blue-50/50 transition-colors">
                              <td className="px-1 py-0.5 text-center border-r border-slate-200">
                                <input type="checkbox" className="w-3 h-3 rounded border-slate-300" />
                              </td>
                              <td className="px-1 py-0.5 text-center border-r border-slate-200 font-bold text-slate-400">{index + 1}</td>
                              <td className="px-1 py-0.5 text-center border-r border-slate-200">
                                <input type="text" className="w-full text-center bg-transparent outline-none font-bold text-[10px]" defaultValue="01" />
                              </td>
                              <td className="px-1 py-0.5 border-r border-slate-200 font-bold">{item.code}</td>
                              <td className="px-1 py-0.5 border-r border-slate-200 font-bold truncate max-w-64">{item.name}</td>
                              <td className="px-1 py-0.5 border-r border-slate-200">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={e => updateQuotationItem(item.productId, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-full text-right bg-transparent outline-none font-bold text-[10px]"
                                />
                              </td>
                              <td className="px-1 py-0.5 border-r border-slate-200 text-center">
                                <select
                                  value={item.unitMeasure || item.package?.symbol || item.subPackage?.symbol || item.unit?.symbol || 'UND'}
                                  onChange={e => updateQuotationItem(item.productId, 'unitMeasure', e.target.value)}
                                  className="w-full text-center bg-transparent outline-none font-bold text-[10px] cursor-pointer"
                                >
                                  {item.unitOptions && item.unitOptions.length > 0 ? (
                                    item.unitOptions.map((u: any, i: number) => (
                                      <option key={i} value={u.symbol}>{u.symbol}</option>
                                    ))
                                  ) : (
                                    <option value={item.unitMeasure || 'UND'}>{item.unitMeasure || 'UND'}</option>
                                  )}
                                </select>
                              </td>
                              <td className="px-1 py-0.5 border-r border-slate-200 text-center">
                                <input type="checkbox" className="w-3 h-3 rounded border-slate-300" />
                              </td>
                              <td className="px-1 py-0.5 border-r border-slate-200 text-right">
                                <input type="number" className="w-full text-right bg-transparent outline-none font-bold text-[10px]" defaultValue="0" />
                              </td>
                              <td className="px-1 py-0.5 border-r border-slate-200 text-center">
                                <select className="w-full bg-transparent outline-none font-bold text-[10px]">
                                  <option>01</option>
                                </select>
                              </td>
                              <td className="px-1 py-0.5 border-r border-slate-200">
                                <input
                                  type="number"
                                  step="0.000001"
                                  value={item.price}
                                  onChange={e => updateQuotationItem(item.productId, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-full text-right bg-transparent outline-none font-bold text-[10px]"
                                />
                              </td>
                              <td className="px-1 py-0.5 text-center">
                                <button type="button" onClick={() => removeQuotationItem(item.productId)} className="p-0.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3" /></button>
                              </td>
                            </tr>
                          );
                        })}
                        {quotationItems.length === 0 && (
                          <tr><td colSpan={12} className="h-48 text-center text-slate-400 italic text-xs">Busque y agregue productos</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-[#E8EEF4] p-1.5 border-t border-slate-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setIsProductSearchOpen(true)} className="h-6 px-2 bg-white border border-slate-300 rounded text-[10px] font-bold hover:bg-slate-50 flex items-center gap-1">
                        <Plus className="w-3 h-3 text-emerald-500" /> Agregar Detalle
                      </button>
                      <button type="button" className="h-6 px-2 bg-white border border-slate-300 rounded text-[10px] font-bold hover:bg-slate-50 flex items-center gap-1 text-red-600">
                        <Trash2 className="w-3 h-3" /> Eliminar Detalle
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-600">Cantidad Total:</span>
                      <input type="text" className={`${inputCls} w-20 text-right bg-white`} defaultValue={quotationItems.reduce((s, i) => s + i.quantity, 0)} />
                    </div>
                  </div>
                </div>

                {/* === MODAL CUOTAS === */}
                <AnimatePresence>
                  {isInstallmentModalOpen && (
                    <div className="absolute inset-0 z-120 flex items-center justify-center p-0 overflow-hidden">
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInstallmentModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 20 }}
                        className="relative bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-slate-300 z-10"
                      >
                        <div className="bg-blue-800 px-4 py-2 flex items-center justify-between">
                          <h2 className="text-xs font-bold text-white tracking-tight uppercase flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Gestión de Cuotas
                          </h2>
                          <button onClick={() => setIsInstallmentModalOpen(false)} className="hover:bg-red-500 text-white p-1 rounded"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-500">Cant.</span>
                              <input type="number" min="1" max="36" value={creditQty} onChange={e => setCreditQty(parseInt(e.target.value) || 1)} className={`${inputCls} w-16 text-center`} />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-500">C/días</span>
                              <input type="number" min="1" value={creditDays} onChange={e => setCreditDays(parseInt(e.target.value) || 30)} className={`${inputCls} w-16 text-center`} />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-500">Inicio</span>
                              <input type="date" value={creditStart} onChange={e => setCreditStart(e.target.value)} className={`${inputCls} flex-1`} />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-500">Importe</span>
                              <input type="number" min="0" step="0.01" value={creditAmount} onChange={e => setCreditAmount(parseFloat(e.target.value) || 0)} className={`${inputCls} w-24 text-right`} />
                            </div>
                            <button type="button" onClick={handleAddInstallments} className="h-7 px-3 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 flex items-center gap-1">
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

                {/* === TOTALES === */}
                <div className="bg-white p-2 rounded border border-slate-300 shadow-sm">
                  <div className="grid grid-cols-10 gap-2 text-[10px]">
                    <div className="text-right">
                      <span className="font-bold text-slate-500">Anticipo</span>
                      <input type="text" className={`${inputCls} w-full text-right mt-0.5`} defaultValue="0.00" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-500">Percepción</span>
                      <input type="text" className={`${inputCls} w-full text-right mt-0.5`} defaultValue="0.00" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-500">Dscto</span>
                      <input type="text" className={`${inputCls} w-full text-right mt-0.5`} defaultValue="0.00" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-500">V. Venta</span>
                      <input type="text" className={`${inputCls} w-full text-right mt-0.5 font-black text-blue-700`} value={formatNumber(valorVenta)} readOnly />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-500">ISC</span>
                      <input type="text" className={`${inputCls} w-full text-right mt-0.5`} defaultValue="0.00" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-500">I.G.V.</span>
                      <input type="text" className={`${inputCls} w-full text-right mt-0.5 font-black text-blue-700`} value={formatNumber(igvTotal)} readOnly />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-500">O.T.</span>
                      <input type="text" className={`${inputCls} w-full text-right mt-0.5`} defaultValue="0.00" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-500">Imp. Bolsa</span>
                      <input type="text" className={`${inputCls} w-full text-right mt-0.5`} defaultValue="0.00" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-500">Redondeo</span>
                      <input type="text" className={`${inputCls} w-full text-right mt-0.5`} defaultValue="0.00" />
                    </div>
                    <div className="text-right bg-[#D9E9FF] px-2 py-1 rounded border border-[#004A99]">
                      <span className="font-black text-[#004A99]">Total</span>
                      <p className="text-lg font-black text-[#004A99] tracking-tight">S/ {formatNumber(quotationTotal)}</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* === FOOTER: Botones de acción === */}
              <div className="bg-[#D6E4F0] px-3 py-2 border-t border-slate-300 flex items-center justify-between shrink-0">
                <div className="flex gap-2">
                  <button type="button" onClick={onClose} className="h-8 px-4 bg-white border border-slate-300 rounded text-[11px] font-bold hover:bg-slate-100 flex items-center gap-1.5 shadow-sm">
                    <X className="w-3.5 h-3.5 text-red-500" /> Salir
                  </button>
                  <button type="button" className="h-8 px-4 bg-white border border-slate-300 rounded text-[11px] font-bold hover:bg-slate-100 flex items-center gap-1.5 shadow-sm">
                    <Printer className="w-3.5 h-3.5 text-blue-600" /> Imprimir
                  </button>
                </div>
                <button type="submit" disabled={loading} className="h-8 px-6 bg-blue-800 text-white rounded shadow-lg shadow-blue-100 hover:bg-blue-900 flex items-center gap-1.5 text-[11px] font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {loading ? 'Procesando...' : (editingItem ? 'Actualizar' : 'Guardar')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      <ProductSearchModal isOpen={isProductSearchOpen} onClose={() => setIsProductSearchOpen(false)} onSelect={(p) => { addQuotationItem(p); setIsProductSearchOpen(false); }} token={token} />
    </AnimatePresence>
  );
};
