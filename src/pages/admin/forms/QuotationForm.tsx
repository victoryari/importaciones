import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PlusCircle, Save, X, Search, Trash2, FileText, 
  DollarSign, Calendar, Tag, Info,
  Calculator, ChevronDown, Building2, UserPlus, 
  Printer, FileDown, RefreshCw, Truck, ClipboardList, HelpCircle, Hash, MapPin,
  Gift
} from 'lucide-react';
import { ProductSearchModal } from './ProductSearchModal';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { generateQuotationPDF } from '../../../lib/pdfGenerator';
import { formatNumber, formatFullCustomerAddress } from '../../../lib/utils';

interface QuotationFormProps {
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
  quotationItems: any[];
  addQuotationItem: (product: any) => void;
  updateQuotationItem: (productId: number, field: string | Record<string, any>, value?: any) => void;
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

export const QuotationForm: React.FC<QuotationFormProps> = ({
  isOpen, onClose, onSubmit, formData, setFormData, editingItem,
  loading, customers, sellers, warehouses, shippingAgencies,
  sunatCurrencies, sunatPaymentConditions, sunatOperationTypes,
  searchResults, handleSearchProduct,
  quotationItems, addQuotationItem, updateQuotationItem,
  removeQuotationItem, quotationTotal, handleConsultCustomer, handleQuickRegister,
  onOpenCustomerForm, token, sunatIgvAffectations, sunatDocTypes, series
}) => {
  const { user } = useAuth();
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

  // Asegurar operationType por defecto a 10
  useEffect(() => {
    if (isOpen && !editingItem) {
      setFormData((prev: any) => ({
        ...prev,
        operationType: prev.operationType || '10'
      }));
    }
  }, [isOpen, editingItem]);

  // Auto-seleccionar vendedor asignado o coincidente con el usuario logueado
  useEffect(() => {
    if (isOpen && (!formData.sellerId || formData.sellerId === '') && sellers.length > 0) {
      let matchedSeller = null;
      if (user) {
        if (user.email) {
          matchedSeller = sellers.find(s => s.email && s.email.toLowerCase() === user.email.toLowerCase() && s.isActive !== false);
        }
        if (!matchedSeller && user.name) {
          const uName = user.name.toLowerCase().trim();
          matchedSeller = sellers.find(s => s.name && (s.name.toLowerCase().trim() === uName || uName.includes(s.name.toLowerCase().trim()) || s.name.toLowerCase().trim().includes(uName)) && s.isActive !== false);
        }
        if (!matchedSeller && (user as any).dni) {
          matchedSeller = sellers.find(s => s.dni === (user as any).dni && s.isActive !== false);
        }
        if (!matchedSeller && user.warehouseId) {
          matchedSeller = sellers.find(s => s.warehouseId === user.warehouseId && s.isActive !== false);
        }
      }
      if (!matchedSeller && sellers.filter(s => s.isActive !== false).length === 1) {
        matchedSeller = sellers.find(s => s.isActive !== false);
      }
      if (matchedSeller) {
        setFormData((prev: any) => ({
          ...prev,
          sellerId: matchedSeller.id.toString(),
          sellerName: matchedSeller.name
        }));
      }
    }
  }, [isOpen, sellers, user, formData.sellerId]);



  const handleSeriesChange = (seriesId: string) => {
    const selected = series.find(s => s.id === parseInt(seriesId));
    if (selected) {
      const warehouse = warehouses.find(w => w.id === selected.warehouseId);

      axios.get(`/api/series/next/${selected.warehouseId}/${formData.docType || 'COT'}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setFormData((prev: any) => ({
          ...prev,
          pickupPlace: warehouse?.name || '',
          warehouseId: selected.warehouseId.toString(),
          docSeries: selected.series,
          docNumber: res.data.nextNumber,
          seriesId: selected.id
        }));
      }).catch(err => {
        console.error('Error al obtener correlativo:', err);
      });
    }
  };

  const handleWarehouseChange = (warehouseId: string) => {
    const wId = parseInt(warehouseId);
    const warehouse = warehouses.find(w => w.id === wId);
    const matchingSeries = series.filter(s => s.warehouseId === wId && s.documentType === (formData.docType || 'COT') && s.isActive !== false);

    if (matchingSeries.length > 0) {
      handleSeriesChange(matchingSeries[0].id.toString());
    } else {
      setFormData((prev: any) => ({
        ...prev,
        warehouseId: warehouseId,
        pickupPlace: warehouse?.name || '',
        docSeries: '',
        docNumber: '',
        seriesId: ''
      }));
    }
  };

  // Auto-seleccionar serie y almacén asignado al abrir
  useEffect(() => {
    if (isOpen && (!formData.docSeries || !formData.warehouseId) && series.length > 0) {
      let targetSeries: any = null;
      if (formData.warehouseId) {
        targetSeries = series.find(s => s.warehouseId === parseInt(formData.warehouseId) && s.documentType === (formData.docType || 'COT') && s.isActive !== false);
      }
      if (!targetSeries) {
        targetSeries = series.find(s => s.documentType === (formData.docType || 'COT') && s.isActive !== false);
      }
      if (targetSeries) {
        handleSeriesChange(targetSeries.id.toString());
      }
    }
  }, [isOpen, series, formData.warehouseId]);

  const handleDocumentSearch = async () => {
    if (!formData.ruc) return;
    setIsConsulting(true);
    try {
      // 1. Buscar localmente primero
      const existing = customers.find(c => c.docNumber === formData.ruc);
      if (existing) {
        selectCustomer(existing);
        return;
      }

      // 2. Si no está, consultar API
      const docType = formData.ruc.length === 11 ? 'RUC' : 'DNI';
      const data = await handleConsultCustomer(docType, formData.ruc);
      if (data) {
        let name = "";
        let rawAddress = "";
        if (docType === 'RUC') {
          name = data.nombre_o_razon_social || data.razonSocial || data.nombre || data.name || "";
          rawAddress = data.direccion_completa || data.direccion || data.address || "";
        } else {
          name = `${data.nombres || data.firstName || ''} ${data.apellido_paterno || data.apellidoPaterno || data.lastName || ''} ${data.apellido_materno || data.apellidoMaterno || ''}`.trim();
          rawAddress = data.direccion_completa || data.direccion || data.address || "";
        }

        const address = formatFullCustomerAddress(
          rawAddress,
          data.distrito || data.district,
          data.provincia || data.province,
          data.departamento || data.department
        );
        
        setFormData({
          ...formData,
          razonSocial: name,
          address: address
        });
        
        setConsultedData({
          name: name,
          address: address,
          docNumber: formData.ruc,
          docType: docType,
          personType: docType === 'RUC' ? 'JURIDICA' : 'NATURAL',
          firstName: data.nombres || '',
          lastName: `${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim(),
          department: data.departamento || data.department || '',
          province: data.provincia || data.province || '',
          district: data.distrito || data.district || ''
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
    setFormData({...formData, razonSocial: q.toUpperCase()});
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
    const clientName = (c.name || `${c.firstName || ''} ${c.lastName || ''}`).trim().toUpperCase();
    const clientAddress = formatFullCustomerAddress(c.address, c.district, c.province, c.department);
    setFormData({
      ...formData,
      customerId: c.id.toString(),
      ruc: c.docNumber,
      razonSocial: clientName,
      address: clientAddress
    });
    setCustomerSearchResults([]);
    setRucSearchResults([]);
    setConsultedData(null);
  };

  const totalGratuito = quotationItems.reduce((acc, item) => {
    if (!item.isFree) return acc;
    const refP = Number(item.referencePrice || item.originalPrice || item.price || 0);
    return acc + (refP * Number(item.quantity || 0));
  }, 0);

  const dsctoTotal = quotationItems.reduce((acc, item) => {
    if (item.isFree) return acc;
    const subtotal = Number(item.price || 0) * Number(item.quantity || 0);
    return acc + ((subtotal * (Number(item.discount) || 0)) / 100);
  }, 0);

  const valorVenta = quotationItems.reduce((acc, item) => {
    if (item.isFree) return acc;
    const subtotal = Number(item.price || 0) * Number(item.quantity || 0);
    const totalLine = subtotal - ((subtotal * (Number(item.discount) || 0)) / 100);
    return acc + (totalLine / 1.18);
  }, 0);

  const igvTotal = quotationItems.reduce((acc, item) => {
    if (item.isFree) return acc;
    const subtotal = Number(item.price || 0) * Number(item.quantity || 0);
    const totalLine = subtotal - ((subtotal * (Number(item.discount) || 0)) / 100);
    const valorLine = totalLine / 1.18;
    return acc + (totalLine - valorLine);
  }, 0);

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
                <FileText className="w-4 h-4 text-blue-800" />
                <h2 className="text-sm font-bold text-slate-700 tracking-tight">{formData.docType === 'PED' ? 'Pedido' : 'Cotización'}</h2>
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
                {/* --- SECCIÓN 1: CABECERA --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                  {/* Documento, Serie y Correlativo */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">Doc.</span>
                    <div className={`h-8 border border-slate-300 rounded px-2.5 text-[10px] font-black flex items-center uppercase ${formData.docType === 'PED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-blue-700'}`}>
                      {formData.docType === 'PED' ? 'Pedido' : 'Cotización'}
                    </div>

                    <span className="text-[11px] font-bold text-slate-600 shrink-0 ml-2">Serie</span>
                    <select 
                      value={series.find(s => s.series === formData.docSeries && s.documentType === (formData.docType || 'COT'))?.id || ''} 
                      onChange={e => handleSeriesChange(e.target.value)}
                      className="h-8 border border-slate-300 rounded px-2 text-xs font-bold bg-blue-50/80 text-blue-900 focus:bg-white focus:ring-1 focus:ring-blue-500 w-20 text-center"
                    >
                      <option value="">--</option>
                      {series
                        .filter(s => s.documentType === (formData.docType || 'COT') && s.isActive !== false)
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.series}
                          </option>
                        ))}
                    </select>
                    <span className="text-slate-400 font-bold">-</span>
                    <div className="relative w-28">
                      <input 
                        type="text" 
                        readOnly
                        value={formData.docNumber} 
                        className="h-8 border border-slate-300 rounded pl-6 pr-2 text-xs font-bold w-full bg-slate-100 text-blue-700 font-mono" 
                        placeholder="00000001" 
                      />
                      <Hash className="w-3.5 h-3.5 absolute left-1.5 top-1/2 -translate-y-1/2 text-blue-500" />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-600">Fecha</span>
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold w-36" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">T.C.</span>
                    <div className="flex items-center gap-1">
                      <input type="number" step="0.001" value={formData.exchangeRate} onChange={e => setFormData({...formData, exchangeRate: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold w-20 text-right bg-yellow-50 font-mono" />
                      <button 
                        type="button" 
                        onClick={handleRefreshTC}
                        className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Refrescar TC"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* --- SECCIÓN 2: DATOS CLIENTE --- */}
                <fieldset className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <legend className="text-[10px] font-bold text-blue-700 px-2 uppercase tracking-tighter">Datos Cliente</legend>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-3 flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-600 shrink-0">RUC/DNI:</span>
                      <div className="relative flex-1 group">
                        <Building2 className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-blue-800" />
                        <input 
                          type="text" 
                          value={formData.ruc} 
                          onChange={e => handleRucPredictiveSearch(e.target.value)}
                          className="h-8 w-full border border-slate-300 rounded pl-7 pr-14 text-xs font-bold font-mono" 
                          placeholder="00000000000"
                        />
                        {rucSearchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-70 mt-1 bg-white shadow-2xl border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                            {rucSearchResults.map(c => (
                              <div 
                                key={c.id} 
                                onClick={() => selectCustomer(c)} 
                                className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex flex-col border-b border-slate-100"
                              >
                                <span className="font-bold text-slate-800">{c.docNumber}</span>
                                <span className="text-[10px] text-slate-500">{c.name || `${c.firstName} ${c.lastName}`}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                          <button type="button" onClick={() => onOpenCustomerForm(formData.ruc)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Registrar Nuevo Cliente">
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={handleDocumentSearch} disabled={isConsulting} className="p-1 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50">
                            {isConsulting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="md:col-span-4 flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-600 shrink-0">Razón Social:</span>
                      <div className="flex-1 flex gap-1.5 relative">
                        <div className="flex-1 relative">
                          <input 
                            type="text" 
                            value={formData.razonSocial} 
                            onChange={e => handleCustomerNameSearch(e.target.value)} 
                            className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-[#D9E9FF] text-[#004A99] uppercase" 
                            placeholder="PÚBLICO GENERAL" 
                          />
                          {customerSearchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-70 mt-1 bg-white shadow-2xl border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                              {customerSearchResults.map(c => (
                                <div 
                                  key={c.id} 
                                  onClick={() => selectCustomer(c)} 
                                  className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex flex-col border-b border-slate-100"
                                >
                                  <span className="font-bold text-slate-800">{c.name || `${c.firstName} ${c.lastName}`}</span>
                                  <span className="text-[10px] text-slate-500">{c.docNumber} - {c.address}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {consultedData && (
                          <button 
                            type="button" 
                            onClick={async () => { await handleQuickRegister(consultedData); setConsultedData(null); }}
                            className="h-8 px-2 bg-emerald-600 text-white rounded text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 shrink-0"
                          >
                            <UserPlus className="w-3 h-3" /> Registrar
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-5 flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-600 shrink-0">Dirección:</span>
                      <div className="flex-1 relative group">
                        <input 
                          type="text" 
                          value={formData.address || ''} 
                          onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} 
                          className="h-8 w-full border border-slate-300 rounded pl-2 pr-7 text-xs font-bold bg-[#F8FBFF] uppercase text-slate-800 focus:bg-white" 
                          placeholder="DIRECCIÓN..." 
                        />
                        <MapPin className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* --- SECCIÓN 3: CONDICIONES --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  {/* Col Izquierda */}
                  <div className="lg:col-span-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-18 text-right shrink-0">Cond. Pago:</span>
                      <select value={formData.paymentCondition} onChange={e => setFormData({...formData, paymentCondition: e.target.value})} className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-white">
                        {sunatPaymentConditions.map(c => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-18 text-right shrink-0">Moneda:</span>
                      <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-white">
                        {sunatCurrencies.map(c => (
                          <option key={c.code} value={c.code}>{c.name} {c.symbol ? `(${c.symbol})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-18 text-right shrink-0">Vendedor:</span>
                      <select value={formData.sellerId} onChange={e => setFormData({...formData, sellerId: e.target.value})} className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-white">
                        <option value="">--Seleccionar Vendedor--</option>
                        {sellers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Col Derecha */}
                  <div className="lg:col-span-8 bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2.5 overflow-hidden">
                    {/* Fila 1: Operación e IGV (6 cols) | Estado y Dscto (6 cols) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-6 flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold text-slate-600 w-18 text-right shrink-0">Tipo Op.:</span>
                        <select 
                          value={formData.operationType || '10'} 
                          onChange={e => setFormData({...formData, operationType: e.target.value})} 
                          className="h-8 flex-1 min-w-0 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-white text-slate-800 truncate"
                        >
                          <option value="10">10 | GRAVADO - OPERACIÓN ONEROSA</option>
                          <option value="11">11 | [GRAVADO] RETIRO POR PREMIO</option>
                          <option value="12">12 | [GRAVADO] RETIRO POR DONACIÓN</option>
                          <option value="13">13 | [GRAVADO] RETIRO</option>
                          <option value="14">14 | [GRAVADO] RETIRO POR PUBLICIDAD</option>
                          <option value="15">15 | [GRAVADO] BONIFICACIONES</option>
                          <option value="16">16 | [GRAVADO] RETIRO A TRABAJADORES</option>
                          <option value="20">20 | EXONERADO - OPERACIÓN ONEROSA</option>
                          <option value="30">30 | INAFECTO - OPERACIÓN ONEROSA</option>
                          <option value="40">40 | EXPORTACIÓN</option>
                        </select>
                        <label className="flex items-center gap-1 cursor-pointer shrink-0">
                          <input type="checkbox" checked={formData.priceIncludesIgv} onChange={e => setFormData({...formData, priceIncludesIgv: e.target.checked})} className="w-3.5 h-3.5 border-slate-300 rounded text-blue-600" />
                          <span className="text-[11px] font-bold text-slate-600">Inc. IGV</span>
                        </label>
                      </div>

                      <div className="md:col-span-6 flex items-center gap-2 min-w-0">
                        <div className="flex-1 flex items-center gap-1 min-w-0">
                          <span className="text-[11px] font-bold text-slate-600 w-14 text-right shrink-0">Estado:</span>
                          <select value={formData.billingStatus} onChange={e => setFormData({...formData, billingStatus: e.target.value})} className="h-8 flex-1 min-w-0 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-white text-slate-400 italic truncate">
                            <option value="SIN FACTURAR">SIN FACTURAR</option>
                          </select>
                        </div>
                        <div className="w-22 flex items-center gap-1 shrink-0">
                          <span className="text-[11px] font-bold text-slate-600 shrink-0">Dscto:</span>
                          <div className="relative flex-1">
                            <input type="number" value={formData.globalDiscount} onChange={e => setFormData({...formData, globalDiscount: e.target.value})} className="h-8 w-full border border-slate-300 rounded px-1.5 text-xs font-bold bg-blue-50 text-blue-800 text-right pr-4" />
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-blue-400">%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fila 2: Agencia (6 cols) | Sucursal (6 cols) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-6 flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold text-slate-600 w-18 text-right shrink-0">Agencia:</span>
                        <select 
                          value={formData.agencyId} 
                          onChange={e => {
                            const selectedAgency = shippingAgencies.find(a => a.id === parseInt(e.target.value));
                            const mainBranch = selectedAgency?.branches?.find((b: any) => b.isMain) || selectedAgency?.branches?.[0];
                            setFormData({
                              ...formData, 
                              agencyId: e.target.value,
                              branchId: mainBranch?.id?.toString() || ''
                            });
                          }} 
                          className="h-8 flex-1 min-w-0 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-white truncate"
                        >
                          <option value="">--Seleccionar Agencia--</option>
                          {shippingAgencies.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-6 flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold text-slate-600 w-14 text-right shrink-0">Sucursal:</span>
                        <select 
                          value={formData.branchId || ''} 
                          onChange={e => setFormData({...formData, branchId: e.target.value})} 
                          disabled={!formData.agencyId}
                          className={`h-8 flex-1 min-w-0 w-full border rounded px-2 text-xs font-bold truncate ${formData.agencyId ? 'border-slate-300 bg-white text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
                        >
                          <option value="">{formData.agencyId ? '--Seleccionar Sucursal--' : '--Seleccione Agencia--'}</option>
                          {formData.agencyId && (() => {
                            const selectedAgency = shippingAgencies.find(a => a.id === parseInt(formData.agencyId));
                            const branches = selectedAgency?.branches || [];
                            return branches.map((b: any) => (
                              <option key={b.id} value={b.id}>
                                {b.address ? b.address.substring(0, 45) : 'Principal'}{b.isMain ? ' (Principal)' : ''}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>

                    {/* Fila 3: Observación */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-slate-600 w-18 text-right shrink-0">Obs.:</span>
                      <input 
                        type="text" 
                        value={formData.observation} 
                        onChange={e => setFormData({...formData, observation: e.target.value})} 
                        className="h-8 flex-1 min-w-0 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-white placeholder:font-normal placeholder:text-slate-400" 
                        placeholder="Observación o detalle de cotización (opcional)..." 
                      />
                    </div>
                  </div>
                </div>

                {/* --- SECCIÓN 4: DETALLE TABLA EXTENDIDA --- */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-75">
                  <div className="bg-slate-50 border-b border-slate-200 px-3 py-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Detalle de Pedido/Cotización</span>
                    <div className="relative group w-96">
                      <input 
                        type="text" 
                        placeholder="Buscar producto por código o nombre..." 
                        onChange={e => handleSearchProduct(e.target.value)}
                        className="h-7 w-full border border-slate-300 rounded px-8 text-xs bg-white outline-none focus:border-blue-500" 
                      />
                      <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white shadow-xl border border-slate-200 rounded max-h-64 overflow-y-auto">
                          {searchResults.map(p => (
                            <div key={p.id} onClick={() => { addQuotationItem(p); handleSearchProduct(''); }} className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex justify-between border-b border-slate-50 items-center">
                              <div className="flex flex-col">
                                <span className="font-bold">{p.name}</span>
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
                                        <MapPin className="w-2.5 h-2.5" />
                                        {sr.warehouse?.name.split(' ')[0]}: {sr.quantity} {sr.zone && <span className="text-indigo-400 font-bold">({sr.zone.name})</span>}
                                      </span>
                                    ))}
                                    {!p.stockRecords?.filter((sr: any) => {
                                      const wType = sr.warehouse?.type?.toUpperCase() || '';
                                      const wName = sr.warehouse?.name?.toUpperCase() || '';
                                      return !['TRANSITORIO', 'DESPACHO', 'COMPROBANTES', 'SISTEMA', 'CONTROL'].includes(wType) && 
                                             !wName.includes('DESPACHO') && 
                                             !wName.includes('COMPROBANTE') && 
                                             !wName.includes('TRANSITO');
                                    }).length && <span className="text-[9px] text-red-400 font-bold italic">Sin stock en almacenes</span>}
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
                          <th className="px-2 py-1 font-bold border-r border-slate-300 text-center w-8">Item</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-300 w-24">Almacén</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-300 w-24">Código</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-300 w-24 text-center">Lote</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-300 min-w-50">Descripción Producto</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-300 text-right w-16">Cantidad</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-300 text-center w-20">U.M.</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-300 text-center w-18">Gratuito</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-300 text-center w-24">Cat. Precio</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-300 text-right w-24">Precio Unitario</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-300 text-right w-16">Dscto%</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-300 text-right w-20">Descuento</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-300 text-right w-24">Precio Venta</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-300 text-right w-24">Valor Venta</th>
                          <th className="px-2 py-1 font-bold border-r border-slate-300 text-right w-20">Igv</th>
                          <th className="px-2 py-1 font-bold w-10 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotationItems.map((item, index) => {
                          const isFree = Boolean(item.isFree);
                          const effectivePrice = isFree ? 0 : Number(item.price || 0);
                          const subtotal = effectivePrice * Number(item.quantity || 0);
                          const dsctoLine = isFree ? 0 : ((subtotal * (Number(item.discount) || 0)) / 100);
                          const totalLine = isFree ? 0 : (subtotal - dsctoLine);
                          const valorLine = isFree ? 0 : (totalLine / 1.18);
                          const igvLine = isFree ? 0 : (totalLine - valorLine);
                          const refPrice = Number(item.referencePrice || item.originalPrice || item.price || 0);

                          return (
                            <tr key={item.productId} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${isFree ? 'bg-amber-50/40' : ''}`}>
                              <td className="px-2 py-1 text-center font-bold text-slate-500 border-r border-slate-200">{index + 1}</td>
                              <td className="px-2 py-1 border-r border-slate-200 text-blue-600 font-bold uppercase">{item.warehouseName || 'S/A'}</td>
                              <td className="px-2 py-1 border-r border-slate-200 font-bold">{item.code || 'S/C'}</td>
                              <td className="px-2 py-1 border-r border-slate-200 text-center font-bold text-[9px] text-emerald-700 bg-emerald-50/30">
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
                              <td className="px-2 py-1 border-r border-slate-200 font-bold truncate max-w-62.5">
                                <div className="flex items-center gap-1.5">
                                  {isFree && (
                                    <span className="bg-amber-500 text-white text-[8px] px-1 py-0.2 rounded font-black tracking-wider shrink-0 flex items-center gap-0.5">
                                      <Gift className="w-2.5 h-2.5" /> REGALO
                                    </span>
                                  )}
                                  <span className="truncate">{item.name}</span>
                                </div>
                              </td>
                              <td className="px-2 py-1 border-r border-slate-200"><input type="number" value={item.quantity} onChange={e => updateQuotationItem(item.productId, 'quantity', parseFloat(e.target.value) || 0)} className="w-full text-right bg-transparent outline-none focus:bg-white" /></td>
                              <td className="px-2 py-1 border-r border-slate-200 text-center">
                                <select
                                  value={item.unitMeasure || item.package?.symbol || item.subPackage?.symbol || item.unit?.symbol || 'UND'}
                                  onChange={e => updateQuotationItem(item.productId, 'unitMeasure', e.target.value)}
                                  className="w-full text-center bg-transparent outline-none focus:bg-white font-bold uppercase text-[10px] cursor-pointer"
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
                              <td className="px-2 py-1 border-r border-slate-200 text-center">
                                 <button
                                   type="button"
                                   onClick={() => {
                                     const nextFree = !item.isFree;
                                     if (nextFree) {
                                       const currentP = Number(item.price || 0) > 0 ? Number(item.price) : refPrice;
                                       updateQuotationItem(item.productId, {
                                         isFree: true,
                                         referencePrice: currentP,
                                         price: 0,
                                         discount: 0
                                       });
                                     } else {
                                       const restoreP = item.referencePrice || item.originalPrice || refPrice || 0;
                                       updateQuotationItem(item.productId, {
                                         isFree: false,
                                         price: restoreP
                                       });
                                     }
                                   }}
                                   className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer ${
                                     isFree 
                                       ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-400' 
                                       : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                   }`}
                                   title={isFree ? "Ítem marcado como regalo/bonificación (Gratuito S/ 0.00)" : "Marcar producto como regalo/bonificación"}
                                 >
                                   <Gift className="w-2.5 h-2.5" />
                                   {isFree ? 'SÍ' : 'NO'}
                                 </button>
                              </td>
                              <td className="px-2 py-1 border-r border-slate-200 text-center text-slate-400">--Seleccionar--</td>
                              <td className="px-2 py-1 border-r border-slate-200">
                                {isFree ? (
                                  <div className="flex flex-col items-end leading-tight">
                                    <span className="font-black text-amber-700">S/ 0.00</span>
                                    <span className="text-[8px] text-slate-400 font-medium">Ref: S/ {formatNumber(refPrice)}</span>
                                  </div>
                                ) : (
                                  <input type="number" step="0.000001" value={item.price} onChange={e => updateQuotationItem(item.productId, 'price', parseFloat(e.target.value) || 0)} className="w-full text-right bg-transparent outline-none focus:bg-white font-bold" />
                                )}
                              </td>
                              <td className="px-2 py-1 border-r border-slate-200">
                                {isFree ? (
                                  <span className="text-slate-300 text-center block">0</span>
                                ) : (
                                  <input type="number" value={item.discount} onChange={e => updateQuotationItem(item.productId, 'discount', parseFloat(e.target.value) || 0)} className="w-full text-right bg-transparent outline-none focus:bg-white" />
                                )}
                              </td>
                              <td className="px-2 py-1 border-r border-slate-200 text-right">{formatNumber(dsctoLine)}</td>
                              <td className="px-2 py-1 border-r border-slate-200 text-right font-bold">{formatNumber(totalLine)}</td>
                              <td className="px-2 py-1 border-r border-slate-200 text-right">{formatNumber(valorLine)}</td>
                              <td className="px-2 py-1 border-r border-slate-200 text-right">{formatNumber(igvLine)}</td>
                              <td className="px-2 py-1 text-center">
                                <button type="button" onClick={() => removeQuotationItem(item.productId)} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {quotationItems.length === 0 && (
                          <tr><td colSpan={16} className="h-64 text-center text-slate-300 italic">No hay productos en el detalle</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-100 p-2 border-t border-slate-300 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center"><Tag className="w-3.5 h-3.5 text-white" /></div>
                        <span className="text-[11px] font-bold text-slate-600">Lugar recojo:</span>
                        <select 
                          value={formData.pickupPlace} 
                          onChange={e => setFormData({...formData, pickupPlace: e.target.value})}
                          className="h-7 border border-slate-300 rounded px-2 text-[10px] bg-white w-64 font-bold"
                        >
                          <option value="">--Seleccionar--</option>
                          {warehouses
                            .filter(w => !w.name.toUpperCase().includes('COMPRAS') && !w.name.toUpperCase().includes('TRANSITO'))
                            .map(w => (
                              <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>
                            ))}
                        </select>
                        <RefreshCw className="w-4 h-4 text-emerald-500 cursor-pointer" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 ml-2">Cant. Total:</span>
                        <input type="text" readOnly value={quotationItems.length} className="h-7 w-20 bg-blue-50 border border-slate-300 text-center text-xs font-black text-blue-900 rounded" />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => removeQuotationItem(-1)} className="h-7 px-3 bg-white border border-slate-300 rounded text-[10px] font-bold hover:bg-slate-50 flex items-center gap-1 shadow-sm"><Trash2 className="w-3 h-3" /> Eliminar Detalle</button>
                      <button type="button" onClick={() => setIsProductSearchModalOpen(true)} className="h-7 px-3 bg-white border border-slate-300 rounded text-[10px] font-bold hover:bg-slate-50 flex items-center gap-1 shadow-sm"><PlusCircle className="w-3 h-3 text-emerald-500" /> Agregar Detalle</button>
                    </div>
                  </div>
                </div>

                {/* --- SECCIÓN 5: TOTALES PIE DE PÁGINA --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-end gap-6">
                  <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="h-10 px-4 bg-slate-50 border border-slate-300 rounded text-xs font-bold hover:bg-slate-100 flex items-center gap-2"><X className="w-4 h-4 text-red-500" /> Salir</button>
                    <button type="button" onClick={async () => await generateQuotationPDF(formData, quotationItems, 'print')} className="h-10 px-4 bg-white border border-slate-300 rounded text-xs font-bold hover:bg-slate-100 flex items-center gap-2"><Printer className="w-4 h-4 text-slate-600" /> Imprimir</button>
                    <button type="button" onClick={async () => await generateQuotationPDF(formData, quotationItems, 'print')} className="h-10 px-4 bg-white border border-slate-300 rounded text-[10px] font-bold hover:bg-slate-100 flex items-center gap-1">Imprimir B5</button>
                    <button type="submit" disabled={loading} className="h-10 px-8 bg-blue-800 text-white rounded shadow-lg shadow-blue-100 hover:bg-blue-900 flex items-center gap-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Procesando...</>
                      ) : (
                        <><Save className="w-4 h-4" /> Guardar</>
                      )}
                    </button>
                    <button type="button" onClick={async () => await generateQuotationPDF(formData, quotationItems, 'save')} className="h-10 px-4 bg-white border border-slate-300 rounded text-xs font-bold hover:bg-slate-100 flex items-center gap-2"><FileDown className="w-4 h-4 text-red-600" /> PDF</button>
                  </div>

                  <div className="flex items-center gap-2">
                    {totalGratuito > 0 && (
                      <div className="text-center bg-amber-50 px-2 py-1 rounded border border-amber-200">
                        <p className="text-[9px] font-black text-amber-700 uppercase mb-1">Op. Gratuita:</p>
                        <input type="text" readOnly value={formatNumber(totalGratuito)} className="w-20 h-8 bg-white border border-amber-300 text-right px-2 text-xs font-black text-amber-800 rounded" />
                      </div>
                    )}
                    <div className="grid grid-cols-6 gap-x-2 gap-y-1">
                      <div className="text-center"><p className="text-[10px] font-bold text-slate-500 mb-1">Flete:</p><input type="number" value={formData.flete} onChange={e => setFormData({...formData, flete: e.target.value})} className="w-20 h-8 border border-slate-300 text-right px-2 text-xs font-bold rounded" /></div>
                      <div className="text-center"><p className="text-[10px] font-bold text-slate-500 mb-1">Dscto. :</p><input type="text" readOnly value={formatNumber(dsctoTotal)} className="w-20 h-8 bg-slate-50 border border-slate-300 text-right px-2 text-xs font-bold rounded" /></div>
                      <div className="text-center"><p className="text-[10px] font-bold text-slate-500 mb-1">Valor:</p><input type="text" readOnly value={formatNumber(valorVenta)} className="w-20 h-8 bg-slate-50 border border-slate-300 text-right px-2 text-xs font-bold rounded" /></div>
                      <div className="text-center"><p className="text-[10px] font-bold text-slate-500 mb-1">Valor Venta:</p><input type="text" readOnly value={formatNumber(valorVenta)} className="w-20 h-8 bg-slate-50 border border-slate-300 text-right px-2 text-xs font-bold rounded" /></div>
                      <div className="text-center"><p className="text-[10px] font-bold text-slate-500 mb-1">I.G.V. :</p><input type="text" readOnly value={formatNumber(igvTotal)} className="w-20 h-8 bg-slate-50 border border-slate-300 text-right px-2 text-xs font-bold rounded" /></div>
                      <div className="text-center"><p className="text-[10px] font-bold text-slate-500 mb-1">P. Venta:</p><input type="text" readOnly value={formatNumber(quotationTotal)} className="w-24 h-8 bg-[#D9E9FF] border border-[#004A99] text-right px-2 text-sm font-black text-[#004A99] rounded" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
        <ProductSearchModal 
          isOpen={isProductSearchModalOpen} 
          onClose={() => setIsProductSearchModalOpen(false)} 
          onSelect={(p) => {
            addQuotationItem(p);
            setIsProductSearchModalOpen(false);
          }} 
          token={token} 
          selectedWarehouseId={formData.warehouseId}
          warehouses={warehouses}
        />
      </>
    )}
  </AnimatePresence>
);
};
