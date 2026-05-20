import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PlusCircle, Save, X, Search, Trash2, FileText, 
  DollarSign, Calendar, Tag, Info,
  Calculator, ChevronDown, Building2, UserPlus, 
  Printer, FileDown, RefreshCw, Truck, ClipboardList, HelpCircle, Hash, MapPin,
  ShoppingBag
} from 'lucide-react';
import { ProductSearchModal } from './ProductSearchModal';
import axios from 'axios';
import { generateQuotationPDF } from '../../../lib/pdfGenerator';
import { formatNumber } from '../../../lib/utils';

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  editingItem: any;
  loading: boolean;
  customers: any[];
  sellers: any[];
  warehouses: any[];
  shippingAgencies: any[];
  sunatCurrencies: any[];
  sunatPaymentConditions: any[];
  sunatOperationTypes: any[];
  searchResults: any[];
  handleSearchProduct: (query: string) => void;
  quotationItems: any[]; // Se mantiene el nombre por compatibilidad con los handlers del padre
  addQuotationItem: (product: any) => void;
  updateQuotationItem: (productId: number, field: string, value: any) => void;
  removeQuotationItem: (productId: number) => void;
  quotationTotal: number;
  handleConsultCustomer: (docType: string, docNumber: string) => Promise<any>;
  handleQuickRegister: (customerData: any) => Promise<void>;
  onOpenCustomerForm: (doc: string) => void;
  token: string;
  sunatIgvAffectations: any[];
  sunatDocTypes: any[];
  series: any[];
}

export const OrderForm: React.FC<OrderFormProps> = ({
  isOpen, onClose, onSubmit, formData, setFormData, editingItem,
  loading, customers, sellers, warehouses, shippingAgencies,
  sunatCurrencies, sunatPaymentConditions, sunatOperationTypes,
  searchResults, handleSearchProduct,
  quotationItems, addQuotationItem, updateQuotationItem,
  removeQuotationItem, quotationTotal, handleConsultCustomer, handleQuickRegister,
  onOpenCustomerForm, token, sunatIgvAffectations, sunatDocTypes, series
}) => {
  const [isConsulting, setIsConsulting] = useState(false);
  const [consultedData, setConsultedData] = useState<any>(null);
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [rucSearchResults, setRucSearchResults] = useState<any[]>([]);
  const [isProductSearchModalOpen, setIsProductSearchModalOpen] = useState(false);

  const handleRefreshTC = async () => {
    if (!formData.date) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`/api/exchange-rates/fetch-by-date/${formData.date}`, config);
      if (res.data) {
        const isSoles = formData.currency === '1' || formData.currency === 'PEN';
        const rate = isSoles ? res.data.buy_rate : res.data.sell_rate;
        setFormData((prev: any) => ({ ...prev, exchangeRate: rate }));
      }
    } catch (err) {
      console.error('Error refreshing TC:', err);
    }
  };

  useEffect(() => {
    if (isOpen && formData.date) {
      handleRefreshTC();
    }
  }, [isOpen, formData.date, formData.currency]);

  // Forzar tipo de documento a PEDIDO
  useEffect(() => {
    if (isOpen && !editingItem) {
      setFormData((prev: any) => ({ ...prev, docType: 'PED' }));
    }
  }, [isOpen, editingItem]);

  const handleSeriesChange = (seriesId: string) => {
    const selected = series.find(s => s.id === parseInt(seriesId));
    if (selected) {
      const warehouse = warehouses.find(w => w.id === selected.warehouseId);
      
      axios.get(`/api/series/next/${selected.warehouseId}/PED`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setFormData((prev: any) => ({
          ...prev,
          pickupPlace: warehouse?.id?.toString() || '',
          docSeries: selected.series,
          docNumber: res.data.nextNumber,
          seriesId: selected.id
        }));
      }).catch(err => {
        console.error('Error al obtener correlativo:', err);
      });
    }
  };

  const dsctoTotal = formData.flete * 0; // Placeholder
  const valorVenta = quotationTotal / 1.18;
  const igvTotal = quotationTotal - valorVenta;

  const handleDocumentSearch = async () => {
    if (!formData.ruc) return;
    setIsConsulting(true);
    try {
      const existing = customers.find(c => c.docNumber === formData.ruc);
      if (existing) {
        selectCustomer(existing);
        return;
      }
      const docType = formData.ruc.length === 11 ? 'RUC' : 'DNI';
      const data = await handleConsultCustomer(docType, formData.ruc);
      if (data) {
        let name = "";
        let address = "";
        if (docType === 'RUC') {
          name = data.nombre_o_razon_social || data.razonSocial || "";
          address = data.direccion_completa || data.direccion || "";
        } else {
          name = `${data.nombres} ${data.apellido_paterno} ${data.apellido_materno}`;
        }
        setFormData({ ...formData, razonSocial: name, address: address });
        setConsultedData({
          name: name,
          address: address,
          docNumber: formData.ruc,
          docType: docType,
          personType: docType === 'RUC' ? 'JURIDICA' : 'NATURAL',
          firstName: data.nombres || '',
          lastName: `${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim()
        });
      }
    } catch (err) { console.error("Search error:", err); }
    finally { setIsConsulting(false); }
  };

  const handleRucPredictiveSearch = (q: string) => {
    setFormData({...formData, ruc: q});
    if (q.length > 2) {
      const filtered = customers.filter(c => 
        c.docNumber.includes(q) ||
        (c.name && c.name.toLowerCase().includes(q.toLowerCase())) ||
        (c.firstName && c.firstName.toLowerCase().includes(q.toLowerCase())) ||
        (c.lastName && c.lastName.toLowerCase().includes(q.toLowerCase()))
      );
      setRucSearchResults(filtered);
    } else {
      setRucSearchResults([]);
    }
  };

  const handleCustomerNameSearch = (q: string) => {
    setFormData({...formData, razonSocial: q});
    if (q.length > 2) {
      const filtered = customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(q.toLowerCase())) ||
        (c.firstName && c.firstName.toLowerCase().includes(q.toLowerCase())) ||
        (c.lastName && c.lastName.toLowerCase().includes(q.toLowerCase())) ||
        c.docNumber.includes(q)
      );
      setCustomerSearchResults(filtered);
    } else {
      setCustomerSearchResults([]);
    }
  };

  const selectCustomer = (c: any) => {
    setFormData({
      ...formData,
      customerId: c.id.toString(),
      ruc: c.docNumber,
      razonSocial: c.name || `${c.firstName} ${c.lastName}`,
      address: c.address || ''
    });
    setCustomerSearchResults([]);
    setRucSearchResults([]);
    setConsultedData(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="absolute inset-0 z-110 flex items-center justify-center p-0 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98, y: 20 }} 
              className="relative w-full h-full max-w-[98%] max-h-[98vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300"
            >
              {/* --- BARRA DE TITULO ESTILO ERP --- */}
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-blue-800" />
                  <h2 className="text-sm font-bold text-slate-700 tracking-tight">Registro de Pedido Directo (Venta)</h2>
                </div>
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">IGV:</span>
                    <input 
                      type="number" 
                      value={formData.igvPercent} 
                      onChange={e => setFormData({...formData, igvPercent: e.target.value})}
                      className="w-16 h-7 bg-white border border-slate-300 text-right px-2 text-xs font-bold rounded"
                    />
                    <HelpCircle className="w-4 h-4 text-blue-500 cursor-help" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={onClose} className="hover:bg-red-500 hover:text-white p-1 rounded transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              <form 
                onSubmit={onSubmit} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                    e.preventDefault();
                  }
                }}
                className="flex-1 overflow-hidden flex flex-col bg-[#F0F4F8]"
              >
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  
                  {/* --- SECCIÓN 1: CABECERA --- */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-5 flex items-center gap-1">
                      <span className="text-[11px] font-bold text-slate-600 shrink-0">Documento</span>
                      <div className="h-8 border border-slate-300 rounded px-2 text-[10px] font-black bg-slate-100 w-20 flex items-center text-blue-700 uppercase">Pedido</div>
                      
                      <span className="text-[11px] font-bold text-slate-600 shrink-0 ml-2">Serie</span>
                      <select 
                        value={series.find(s => s.series === formData.docSeries)?.id || ''} 
                        onChange={e => handleSeriesChange(e.target.value)}
                        className="h-8 border border-slate-300 rounded px-1 text-xs font-bold bg-blue-50 w-28"
                      >
                        <option value="">--SERIE--</option>
                        {series.filter(s => s.documentType === 'PED').map(s => (
                          <option key={s.id} value={s.id}>{s.series} ({s.warehouse?.name || 'S/A'})</option>
                        ))}
                      </select>
                      <span className="text-slate-400">-</span>
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          readOnly
                          value={formData.docNumber} 
                          className="h-8 border border-slate-300 rounded pl-7 pr-2 text-xs font-bold w-full bg-slate-100 text-blue-700" 
                          placeholder="00000001" 
                        />
                        <Hash className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-blue-500" />
                      </div>
                    </div>

                    <div className="md:col-span-3 flex items-center gap-2 justify-center">
                      <span className="text-[11px] font-bold text-slate-600">Fecha</span>
                      <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold" />
                    </div>

                    <div className="md:col-span-3 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Tipo Cambio</span>
                      <div className="flex items-center gap-1">
                        <input type="number" step="0.001" value={formData.exchangeRate} onChange={e => setFormData({...formData, exchangeRate: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold w-24 text-right bg-yellow-50" />
                        <button type="button" onClick={handleRefreshTC} className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded transition-colors" title="Refrescar TC">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* --- SECCIÓN 2: DATOS CLIENTE --- */}
                  <fieldset className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <legend className="text-[10px] font-bold text-blue-700 px-2 uppercase tracking-tighter">Datos del Comprador</legend>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2">
                      <div className="md:col-span-4 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 w-12 text-right">RUC/DNI:</span>
                        <div className="relative flex-1 group">
                          <Building2 className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-blue-800" />
                          <input 
                            type="text" 
                            value={formData.ruc} 
                            onChange={e => handleRucPredictiveSearch(e.target.value)}
                            className="h-8 w-full border border-slate-300 rounded pl-8 pr-16 text-xs font-bold" 
                            placeholder="00000000000"
                          />
                          {rucSearchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-70 mt-1 bg-white shadow-2xl border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                              {rucSearchResults.map(c => (
                                <div key={c.id} onClick={() => selectCustomer(c)} className="p-3 hover:bg-blue-50 cursor-pointer text-xs flex flex-col border-b border-slate-100">
                                  <span className="font-bold text-slate-800">{c.docNumber}</span>
                                  <span className="text-[10px] text-slate-500">{c.name || `${c.firstName} ${c.lastName}`}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button type="button" onClick={() => onOpenCustomerForm(formData.ruc)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Registrar Nuevo Cliente">
                              <UserPlus className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={handleDocumentSearch} disabled={isConsulting} className="p-1 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50">
                              {isConsulting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="md:col-span-8 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 w-24 text-right">Razón Social:</span>
                        <div className="flex-1 flex gap-2 relative">
                          <div className="flex-1 relative">
                            <input 
                              type="text" 
                              value={formData.razonSocial} 
                              onChange={e => handleCustomerNameSearch(e.target.value)} 
                              className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-[#D9E9FF] text-[#004A99]" 
                              placeholder="CLIENTE FINAL" 
                            />
                            {customerSearchResults.length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-70 mt-1 bg-white shadow-2xl border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                                {customerSearchResults.map(c => (
                                  <div key={c.id} onClick={() => selectCustomer(c)} className="p-3 hover:bg-blue-50 cursor-pointer text-xs flex flex-col border-b border-slate-100">
                                    <span className="font-bold text-slate-800">{c.name || `${c.firstName} ${c.lastName}`}</span>
                                    <span className="text-[10px] text-slate-500">{c.docNumber} - {c.address}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {consultedData && (
                            <button type="button" onClick={async () => { await handleQuickRegister(consultedData); setConsultedData(null); }} className="h-8 px-2 bg-emerald-600 text-white rounded text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 shrink-0">
                              <UserPlus className="w-3 h-3" /> Registrar
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-12 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 w-12 text-right">Dirección:</span>
                        <div className="flex-1 relative group">
                          <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-[#F8FBFF]" placeholder="DIRECCIÓN FISCAL O DE ENTREGA..." />
                          <MapPin className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-300" />
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  {/* --- SECCIÓN 3: CONDICIONES Y LOGÍSTICA --- */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <div className="lg:col-span-5 bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 w-20 text-right">Cond. Pago:</span>
                        <select value={formData.paymentCondition} onChange={e => setFormData({...formData, paymentCondition: e.target.value})} className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-white">
                          {sunatPaymentConditions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 w-20 text-right">Moneda:</span>
                        <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-white">
                          {sunatCurrencies.map(c => <option key={c.code} value={c.code}>{c.name} {c.symbol ? `(${c.symbol})` : ''}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 w-20 text-right">Vendedor:</span>
                        <select value={formData.sellerId} onChange={e => setFormData({...formData, sellerId: e.target.value})} className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-white">
                          <option value="">--Seleccionar Vendedor--</option>
                          {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="lg:col-span-7 bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2">
                      <div className="flex gap-4">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-600 w-20 text-right">Observación:</span>
                          <input type="text" value={formData.observation} onChange={e => setFormData({...formData, observation: e.target.value})} className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-white" />
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-600 w-20 text-right">Agencia:</span>
                          <div className="flex flex-1 gap-1">
                            <select value={formData.agencyId} onChange={e => setFormData({...formData, agencyId: e.target.value})} className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-white">
                              <option value="">--Seleccionar Agencia de Transporte--</option>
                              {shippingAgencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="w-64 flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-600 shrink-0">Lugar Recojo:</span>
                          <select 
                            value={formData.pickupPlace} 
                            onChange={e => setFormData({...formData, pickupPlace: e.target.value})} 
                            className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-white"
                          >
                            <option value="">--Seleccionar--</option>
                            {warehouses
                              .filter(w => !w.name.toUpperCase().includes('COMPRAS') && !w.name.toUpperCase().includes('TRANSITO'))
                              .map(w => (
                                <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 w-20 text-right whitespace-nowrap">Afectación:</span>
                        <select value={formData.operationType} onChange={e => setFormData({...formData, operationType: e.target.value})} className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-white">
                          {sunatIgvAffectations.map(t => <option key={t.code} value={t.code}>{t.code} | {t.name}</option>)}
                        </select>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          <input type="checkbox" checked={formData.priceIncludesIgv} onChange={e => setFormData({...formData, priceIncludesIgv: e.target.checked})} className="w-4 h-4 border-slate-300 rounded" />
                          <span className="text-[11px] font-bold text-slate-600">Inc. IGV</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* --- SECCIÓN 4: DETALLE TABLA --- */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-75">
                    <div className="bg-slate-50 border-b border-slate-200 px-3 py-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                        Detalle de Ítems del Pedido
                      </span>
                      <div className="relative group w-96">
                        <input 
                          type="text" 
                          placeholder="F1: Buscar producto por código o nombre..." 
                          onChange={e => handleSearchProduct(e.target.value)}
                          className="h-7 w-full border border-slate-300 bg-white text-slate-800 rounded px-8 text-xs outline-none focus:border-blue-500" 
                        />
                        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        {searchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white shadow-2xl border border-slate-200 rounded max-h-64 overflow-y-auto">
                            {searchResults.map(p => (
                              <div key={p.id} onClick={() => { addQuotationItem(p); handleSearchProduct(''); }} className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex justify-between border-b border-slate-50 items-center">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800">{p.name}</span>
                                  <div className="flex flex-wrap gap-1 items-center mt-1">
                                    <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500 font-bold">{p.code}</span>
                                    {p.stockRecords?.filter((sr: any) => {
                                      const wType = sr.warehouse?.type?.toUpperCase() || '';
                                      const wName = sr.warehouse?.name?.toUpperCase() || '';
                                      return !['TRANSITORIO', 'DESPACHO', 'COMPROBANTES', 'SISTEMA', 'CONTROL', 'EXISTENCIAS'].includes(wType) && 
                                             !wName.includes('DESPACHO') && 
                                             !wName.includes('COMPROBANTE') && 
                                             !wName.includes('TRANSITO') &&
                                             !wName.includes('EXISTENCIAS');
                                    }).map((sr: any) => (
                                      <span key={sr.id} className="text-[9px] text-indigo-600 font-black bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-indigo-100">
                                        <MapPin className="w-2.5 h-2.5" /> {sr.warehouse?.name.split(' ')[0]}: {sr.quantity}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <span className="text-blue-600 font-black whitespace-nowrap ml-4">S/ {p.salePrice}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-[10px] border-collapse">
                        <thead>
                          <tr className="bg-[#E2E8F0] text-slate-700 border-b border-slate-300">
                            <th className="px-2 py-1 font-bold border-r border-slate-300 text-center w-8">#</th>
                            <th className="px-2 py-1 font-bold border-r border-slate-300 w-24">Código</th>
                            <th className="px-2 py-1 font-bold border-r border-slate-300 w-24 text-center">Lote</th>
                            <th className="px-2 py-1 font-bold border-r border-slate-300 min-w-50">Descripción</th>
                            <th className="px-2 py-1 font-bold border-r border-slate-300 text-right w-20">Cantidad</th>
                            <th className="px-2 py-1 font-bold border-r border-slate-300 text-center w-20">U.M.</th>
                            <th className="px-2 py-1 font-bold border-r border-slate-300 text-right w-24">P. Unitario</th>
                            <th className="px-2 py-1 border-r border-slate-300 text-right w-24">Subtotal</th>
                            <th className="px-2 py-1 border-r border-slate-300 text-right w-20">IGV</th>
                            <th className="px-2 py-1 border-r border-slate-300 text-right w-24">Total</th>
                            <th className="px-2 py-1 w-10 text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quotationItems.map((item, index) => {
                            const subtotal = item.price * item.quantity;
                            const totalLine = subtotal - ((subtotal * (item.discount || 0)) / 100);
                            const valorLine = totalLine / 1.18;
                            const igvLine = totalLine - valorLine;
                            return (
                              <tr key={item.productId} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                <td className="px-2 py-1 text-center font-bold text-slate-400 border-r border-slate-200">{index + 1}</td>
                                <td className="px-2 py-1 border-r border-slate-200 font-bold">{item.code}</td>
                                <td className="px-2 py-1 border-r border-slate-200 text-center text-[10px] font-bold text-emerald-700 bg-emerald-50/30">
                                  <div className="flex flex-col items-center">
                                    <span className="uppercase tracking-tighter">{item.lot || '---'}</span>
                                    {item.expiryDate && (
                                      <span className="text-[8px] text-amber-600 flex items-center gap-0.5 mt-0.5 font-black leading-none">
                                        <Calendar className="w-2 h-2 shrink-0" />
                                        {new Date(item.expiryDate).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-2 py-1 border-r border-slate-200 font-bold truncate max-w-62.5">{item.name}</td>
                                <td className="px-2 py-1 border-r border-slate-200"><input type="number" value={item.quantity} onChange={e => updateQuotationItem(item.productId, 'quantity', parseFloat(e.target.value) || 0)} className="w-full text-right bg-transparent outline-none focus:bg-white font-bold" /></td>
                                <td className="px-2 py-1 border-r border-slate-200 text-center">
                                  <input
                                    type="text"
                                    value={item.unitMeasure || item.unit?.symbol || 'UND'}
                                    onChange={e => updateQuotationItem(item.productId, 'unitMeasure', e.target.value)}
                                    className="w-full text-center bg-transparent outline-none focus:bg-white font-bold uppercase"
                                  />
                                </td>
                                <td className="px-2 py-1 border-r border-slate-200"><input type="number" step="0.000001" value={item.price} onChange={e => updateQuotationItem(item.productId, 'price', parseFloat(e.target.value) || 0)} className="w-full text-right bg-transparent outline-none focus:bg-white font-bold" /></td>
                                <td className="px-2 py-1 border-r border-slate-200 text-right font-bold text-slate-600">{formatNumber(valorLine)}</td>
                                <td className="px-2 py-1 border-r border-slate-200 text-right text-slate-500">{formatNumber(igvLine)}</td>
                                <td className="px-2 py-1 border-r border-slate-200 text-right font-black text-blue-900">{formatNumber(totalLine)}</td>
                                <td className="px-2 py-1 text-center">
                                  <button type="button" onClick={() => removeQuotationItem(item.productId)} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                </td>
                              </tr>
                            );
                          })}
                          {quotationItems.length === 0 && (
                            <tr><td colSpan={11} className="h-64 text-center text-slate-300 italic">Pulse el buscador superior para agregar productos al pedido</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-slate-100 p-2 border-t border-slate-300 flex items-center justify-between shrink-0">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => removeQuotationItem(-1)} className="h-7 px-3 bg-white border border-slate-300 rounded text-[10px] font-bold hover:bg-slate-50 flex items-center gap-1 shadow-sm"><Trash2 className="w-3 h-3" /> Eliminar Detalle</button>
                        <button type="button" onClick={() => setIsProductSearchModalOpen(true)} className="h-7 px-3 bg-white border border-slate-300 rounded text-[10px] font-bold hover:bg-slate-50 flex items-center gap-1 shadow-sm"><PlusCircle className="w-3 h-3 text-emerald-500" /> Agregar Detalle</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600">Total Ítems: {quotationItems.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* --- SECCIÓN 5: TOTALES --- */}
                  <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-end gap-6">
                    <div className="flex gap-2">
                      <button type="button" onClick={onClose} className="h-10 px-4 bg-slate-50 border border-slate-300 rounded text-xs font-bold hover:bg-slate-100 flex items-center gap-2"><X className="w-4 h-4 text-red-500" /> Cancelar</button>
                      <button type="submit" disabled={loading} className="h-10 px-8 bg-blue-800 text-white rounded shadow-lg shadow-blue-100 hover:bg-blue-900 flex items-center gap-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {loading ? 'Procesando...' : 'Guardar Pedido'}
                      </button>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right"><p className="text-[10px] font-bold text-slate-400 mb-0">VALOR VENTA:</p><p className="text-xs font-bold text-slate-700">{formatNumber(valorVenta)}</p></div>
                      <div className="text-right"><p className="text-[10px] font-bold text-slate-400 mb-0">I.G.V. (18%):</p><p className="text-xs font-bold text-slate-700">{formatNumber(igvTotal)}</p></div>
                      <div className="text-right bg-[#D9E9FF] px-4 py-1 rounded border border-[#004A99]">
                        <p className="text-[10px] font-black text-[#004A99] mb-0">TOTAL A PAGAR:</p>
                        <p className="text-xl font-black text-[#004A99] tracking-tight">S/ {formatNumber(quotationTotal)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
          <ProductSearchModal isOpen={isProductSearchModalOpen} onClose={() => setIsProductSearchModalOpen(false)} onSelect={(p) => { addQuotationItem(p); setIsProductSearchModalOpen(false); }} token={token} />
        </>
      )}
    </AnimatePresence>
  );
};
