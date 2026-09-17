import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PlusCircle, Save, X, Search, Trash2, FileText, 
  DollarSign, Calendar, Tag, Info,
  Calculator, ChevronDown, Building2, UserPlus, 
  Printer, FileDown, RefreshCw, Truck, ClipboardList, HelpCircle, Hash, MapPin,
  ShoppingBag, Gift, Plus
} from 'lucide-react';
import { ProductSearchModal } from './ProductSearchModal';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { generateQuotationPDF } from '../../../lib/pdfGenerator';
import { formatNumber, formatFullCustomerAddress } from '../../../lib/utils';

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

export const OrderForm: React.FC<OrderFormProps> = ({
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

  // Forzar tipo de documento a PEDIDO y tipo de operación por defecto a 10
  useEffect(() => {
    if (isOpen && !editingItem) {
      setFormData((prev: any) => ({ 
        ...prev, 
        docType: 'PED',
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
      
      axios.get(`/api/series/next/${selected.warehouseId}/PED`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setFormData((prev: any) => ({
          ...prev,
          pickupPlace: warehouse?.id?.toString() || '',
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
    const matchingSeries = series.filter(s => s.warehouseId === wId && s.documentType === 'PED' && s.isActive !== false);

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
        targetSeries = series.find(s => s.warehouseId === parseInt(formData.warehouseId) && s.documentType === 'PED' && s.isActive !== false);
      }
      if (!targetSeries) {
        targetSeries = series.find(s => s.documentType === 'PED' && s.isActive !== false);
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
      // 1. Si ya existe en la base de datos local de clientes, seleccionarlo directamente
      const existing = customers.find(c => c.docNumber === formData.ruc.trim());
      if (existing) {
        selectCustomer(existing);
        return;
      }

      // 2. Si no existe, consultar a SUNAT / RENIEC
      const type = formData.ruc.trim().length === 11 ? 'RUC' : 'DNI';
      const data = await handleConsultCustomer(type, formData.ruc.trim());
      if (data) {
        let name = "";
        let rawAddress = "";
        if (type === 'RUC') {
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

        setFormData((prev: any) => ({
          ...prev,
          razonSocial: name,
          address: address
        }));
        setConsultedData({ ...data, docNumber: formData.ruc.trim(), docType: type, name, address });
      }
    } catch (err) {
      console.error('Error buscando documento:', err);
    } finally {
      setIsConsulting(false);
    }
  };

  const handleRucPredictiveSearch = (text: string) => {
    setFormData({ ...formData, ruc: text });
    if (text.trim().length >= 2) {
      const filtered = customers.filter(c => 
        c.docNumber && c.docNumber.toLowerCase().includes(text.toLowerCase())
      ).slice(0, 5);
      setRucSearchResults(filtered);
    } else {
      setRucSearchResults([]);
    }
  };

  const handleCustomerNameSearch = (text: string) => {
    setFormData({ ...formData, razonSocial: text });
    if (text.trim().length >= 2) {
      const filtered = customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(text.toLowerCase())) ||
        (c.firstName && `${c.firstName} ${c.lastName}`.toLowerCase().includes(text.toLowerCase()))
      ).slice(0, 5);
      setCustomerSearchResults(filtered);
    } else {
      setCustomerSearchResults([]);
    }
  };

  const selectCustomer = (c: any) => {
    const formattedAddress = formatFullCustomerAddress(
      c.address || '',
      c.district,
      c.province,
      c.department
    );

    setFormData((prev: any) => ({
      ...prev,
      customerId: c.id?.toString() || '',
      ruc: c.docNumber || '',
      razonSocial: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      address: formattedAddress,
      agencyId: c.shippingAgencyId ? c.shippingAgencyId.toString() : prev.agencyId,
      branchId: c.shippingBranchId ? c.shippingBranchId.toString() : prev.branchId
    }));
    setCustomerSearchResults([]);
    setRucSearchResults([]);
    setConsultedData(null);
  };

  // Cálculos de Totales considerando Ítems Gratuitos / Bonificación
  const totalGratuito = quotationItems.reduce((acc, item) => {
    if (!item.isFree) return acc;
    const refP = Number(item.referencePrice || item.originalPrice || item.price || 0);
    return acc + (refP * Number(item.quantity || 0));
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
        <div className="absolute inset-0 z-[110] flex items-center justify-center p-2 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.98, y: 10 }} 
            className="relative w-full h-full max-w-[98%] max-h-[98vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300"
          >
            {/* Header Compacto ERP */}
            <div className="bg-[#004A99] px-4 py-2 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white/10 rounded">
                  <ShoppingBag className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-tight">
                    Registro de Pedido
                  </h2>
                  <p className="text-[9px] text-blue-200 uppercase font-medium">Módulo de Ventas y Despacho</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 bg-blue-950/40 px-2 py-0.5 rounded border border-white/10">
                  <span className="text-[10px] font-bold text-blue-200 uppercase">IGV:</span>
                  <input 
                    type="number" 
                    value={formData.igvPercent || 18} 
                    onChange={e => setFormData({...formData, igvPercent: e.target.value})}
                    className="w-10 h-6 bg-white border border-slate-300 text-right px-1 text-xs font-bold text-slate-800 rounded outline-none"
                  />
                  <span className="text-[10px] font-bold text-blue-200">%</span>
                </div>

                <button 
                  onClick={onClose} 
                  className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form 
              onSubmit={onSubmit} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
              className="flex-1 overflow-hidden flex flex-col bg-slate-50/70 p-2.5 gap-2"
            >
              {/* SECCIÓN SUPERIOR COMPACTA (6 Filas Estructuradas) */}
              <div className="shrink-0 space-y-1.5">
                
                {/* FILA 1: Comprobante y Fecha */}
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Doc.</span>
                    <div className="h-7 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded px-2 text-[10px] font-black flex items-center uppercase">
                      Pedido
                    </div>
                    
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0 ml-1">Serie</span>
                    <select 
                      value={series.find(s => s.series === formData.docSeries && s.documentType === 'PED')?.id || ''} 
                      onChange={e => handleSeriesChange(e.target.value)}
                      className="h-7 border border-slate-300 rounded px-2 text-xs font-bold bg-blue-50/80 text-blue-900 focus:border-blue-500 w-20 text-center outline-none uppercase"
                    >
                      <option value="">--</option>
                      {series
                        .filter(s => s.documentType === 'PED' && s.isActive !== false)
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
                        value={formData.docNumber || ''} 
                        className="h-7 border border-slate-300 rounded pl-5 pr-2 text-xs font-bold w-full bg-slate-100 text-blue-900 font-mono outline-none" 
                        placeholder="00000001" 
                      />
                      <Hash className="w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 text-blue-700" />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Fecha Emisión:</span>
                    <input 
                      type="date" 
                      value={formData.date || ''} 
                      onChange={e => setFormData({...formData, date: e.target.value})} 
                      className="h-7 border border-slate-300 rounded px-2 text-xs font-bold w-36 bg-white focus:border-blue-500 outline-none" 
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">T. Cambio:</span>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        step="0.001" 
                        value={formData.exchangeRate || ''} 
                        onChange={e => setFormData({...formData, exchangeRate: e.target.value})} 
                        className="h-7 border border-slate-300 rounded px-2 text-xs font-bold w-20 text-right bg-yellow-50/70 font-mono text-slate-800 focus:border-blue-500 outline-none" 
                        title="Tipo de Cambio"
                      />
                      <button 
                        type="button" 
                        onClick={handleRefreshTC} 
                        className="h-7 w-7 bg-slate-100 hover:bg-blue-50 border border-slate-300 text-slate-600 hover:text-blue-700 rounded flex items-center justify-center transition-colors cursor-pointer" 
                        title="Refrescar TC"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* FILA 2: Datos del Cliente (RUC/DNI y Razón Social) */}
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 w-64">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">RUC/DNI:</span>
                    <div className="relative flex-1 group">
                      <input 
                        type="text" 
                        value={formData.ruc || ''} 
                        onChange={e => handleRucPredictiveSearch(e.target.value)}
                        className="h-7 w-full border border-slate-300 rounded pl-2 pr-12 text-xs font-bold font-mono uppercase bg-white focus:border-blue-500 outline-none" 
                        placeholder="00000000000" 
                      />
                      {rucSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-70 mt-1 bg-white shadow-2xl border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                          {rucSearchResults.map(c => (
                            <div key={c.id} onClick={() => selectCustomer(c)} className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex flex-col border-b border-slate-100">
                              <span className="font-bold text-slate-800">{c.docNumber}</span>
                              <span className="text-[10px] text-slate-500">{c.name || `${c.firstName} ${c.lastName}`}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="absolute right-0.5 top-1/2 -translate-y-1/2 flex items-center">
                        <button 
                          type="button" 
                          onClick={() => onOpenCustomerForm(formData.ruc)} 
                          className="p-1 text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer" 
                          title="Registrar Nuevo Cliente"
                        >
                          <UserPlus className="w-3 h-3" />
                        </button>
                        <button 
                          type="button" 
                          onClick={handleDocumentSearch} 
                          disabled={isConsulting} 
                          className="p-1 text-slate-500 hover:text-blue-700 transition-colors disabled:opacity-50 cursor-pointer" 
                          title="Consultar SUNAT / RENIEC"
                        >
                          {isConsulting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 flex-1 max-w-xl">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Cliente:</span>
                    <div className="flex-1 flex gap-1 relative">
                      <input 
                        type="text" 
                        value={formData.razonSocial || ''} 
                        onChange={e => handleCustomerNameSearch(e.target.value)} 
                        className="h-7 w-full border border-blue-200 rounded px-2 text-xs font-bold bg-blue-50/60 text-blue-950 uppercase focus:border-blue-500 outline-none" 
                        placeholder="CLIENTE FINAL" 
                      />
                      {customerSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-70 mt-1 bg-white shadow-2xl border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                          {customerSearchResults.map(c => (
                            <div key={c.id} onClick={() => selectCustomer(c)} className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex flex-col border-b border-slate-100">
                              <span className="font-bold text-slate-800">{c.name || `${c.firstName} ${c.lastName}`}</span>
                              <span className="text-[10px] text-slate-500">{c.docNumber} - {c.address}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {consultedData && (
                        <button 
                          type="button" 
                          onClick={async () => { await handleQuickRegister(consultedData); setConsultedData(null); }} 
                          className="h-7 px-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[8px] font-bold uppercase tracking-tight flex items-center gap-0.5 shrink-0 transition-colors cursor-pointer"
                        >
                          <UserPlus className="w-2.5 h-2.5" /> Grabar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* FILA 3: Dirección (Alineada exactamente con el espacio de la fila de Cliente) */}
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 w-full max-w-3xl">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Dirección:</span>
                    <div className="flex-1 relative group">
                      <input 
                        type="text" 
                        value={formData.address || ''} 
                        onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} 
                        className="h-7 w-full border border-slate-300 rounded pl-2 pr-6 text-xs font-medium bg-white uppercase text-slate-800 focus:border-blue-500 outline-none" 
                        placeholder="DIRECCIÓN FISCAL O DE ENTREGA..." 
                      />
                      <MapPin className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* FILA 4: Condiciones Comerciales */}
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Cond. Pago:</span>
                    <select 
                      value={formData.paymentCondition || '01'} 
                      onChange={e => setFormData({...formData, paymentCondition: e.target.value})} 
                      className="h-7 border border-slate-300 rounded px-2 text-xs font-bold bg-white focus:border-blue-500 outline-none w-32"
                    >
                      {sunatPaymentConditions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Moneda:</span>
                    <select 
                      value={formData.currency || 'PEN'} 
                      onChange={e => setFormData({...formData, currency: e.target.value})} 
                      className="h-7 border border-slate-300 rounded px-2 text-xs font-bold text-blue-900 bg-white focus:border-blue-500 outline-none w-24"
                    >
                      {sunatCurrencies.map(c => <option key={c.code} value={c.code}>{c.name} {c.symbol ? `(${c.symbol})` : ''}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Vendedor:</span>
                    <select 
                      value={formData.sellerId || ''} 
                      onChange={e => setFormData({...formData, sellerId: e.target.value})} 
                      className="h-7 border border-slate-300 rounded px-2 text-xs font-bold bg-white focus:border-blue-500 outline-none uppercase w-48 truncate"
                    >
                      <option value="">-- SELECCIONAR VENDEDOR --</option>
                      {sellers.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Tipo Op:</span>
                    <select 
                      value={formData.operationType || '10'} 
                      onChange={e => setFormData({...formData, operationType: e.target.value})} 
                      className="h-7 border border-slate-300 rounded px-2 text-xs font-bold bg-white text-slate-800 truncate focus:border-blue-500 outline-none w-56"
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
                    <label className="flex items-center gap-1 cursor-pointer shrink-0 select-none ml-1">
                      <input 
                        type="checkbox" 
                        checked={formData.priceIncludesIgv} 
                        onChange={e => setFormData({...formData, priceIncludesIgv: e.target.checked})} 
                        className="w-3.5 h-3.5 border-slate-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" 
                      />
                      <span className="text-[10px] font-bold text-slate-700 uppercase">Inc. IGV</span>
                    </label>
                  </div>
                </div>

                {/* FILA 5: Logística y Despacho (Almacén, Agencia y Sucursal) */}
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Almacén:</span>
                    <select 
                      value={formData.pickupPlace || ''} 
                      onChange={e => setFormData({...formData, pickupPlace: e.target.value})} 
                      className="h-7 border border-slate-300 rounded px-2 text-xs font-bold bg-white truncate focus:border-blue-500 outline-none uppercase w-48"
                    >
                      <option value="">-- SELECCIONAR ALMACÉN --</option>
                      {warehouses
                        .filter(w => !w.name.toUpperCase().includes('COMPRAS') && !w.name.toUpperCase().includes('TRANSITO'))
                        .map(w => (
                          <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>
                        ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Agencia:</span>
                    <select 
                      value={formData.agencyId || ''} 
                      onChange={e => {
                        const selectedAgency = shippingAgencies.find(a => a.id === parseInt(e.target.value));
                        const mainBranch = selectedAgency?.branches?.find((b: any) => b.isMain) || selectedAgency?.branches?.[0];
                        setFormData({
                          ...formData, 
                          agencyId: e.target.value,
                          branchId: mainBranch?.id?.toString() || ''
                        });
                      }} 
                      className="h-7 border border-slate-300 rounded px-2 text-xs font-bold bg-white truncate focus:border-blue-500 outline-none uppercase w-64"
                    >
                      <option value="">-- SELECCIONAR AGENCIA --</option>
                      {shippingAgencies.map(a => <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 max-w-lg">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Sucursal:</span>
                    <select 
                      value={formData.branchId || ''} 
                      onChange={e => setFormData({...formData, branchId: e.target.value})} 
                      disabled={!formData.agencyId}
                      className={`h-7 flex-1 border rounded px-2 text-xs font-bold truncate focus:border-blue-500 outline-none uppercase ${formData.agencyId ? 'border-slate-300 bg-white text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
                    >
                      <option value="">{formData.agencyId ? '-- SELECCIONAR SUCURSAL --' : '-- SELECCIONE AGENCIA --'}</option>
                      {formData.agencyId && (() => {
                        const selectedAgency = shippingAgencies.find(a => a.id === parseInt(formData.agencyId));
                        const branches = selectedAgency?.branches || [];
                        return branches.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.address ? b.address.substring(0, 45).toUpperCase() : 'PRINCIPAL'}{b.isMain ? ' (PRINCIPAL)' : ''}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                {/* FILA 6: Obs / Glosa */}
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 w-full max-w-3xl">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Obs/Glosa:</span>
                    <input 
                      type="text" 
                      value={formData.observation || ''} 
                      onChange={e => setFormData({...formData, observation: e.target.value})} 
                      className="h-7 flex-1 border border-slate-300 rounded px-2 text-xs font-medium bg-white focus:border-blue-500 outline-none" 
                      placeholder="Observación o detalle interno del pedido..." 
                    />
                  </div>
                </div>

              </div>

              {/* SECCIÓN 4: DETALLE DE PRODUCTOS (GRILLA MAXIMIZADA) */}
              <div className="flex-1 flex flex-col bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden min-h-[300px]">
                {/* Barra superior de la tabla */}
                <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-blue-700" />
                    Detalle de Ítems del Pedido ({quotationItems.length})
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative w-80">
                      <input 
                        type="text" 
                        placeholder="F1: Buscar producto por código o nombre..." 
                        onChange={e => handleSearchProduct(e.target.value)}
                        className="h-7.5 w-full border border-slate-300 bg-white text-slate-800 rounded-lg pl-7 pr-2 text-xs outline-none focus:border-blue-500" 
                      />
                      <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white shadow-2xl border border-slate-300 rounded-lg max-h-56 overflow-y-auto">
                          {searchResults.map(p => (
                            <div key={p.id} onClick={() => { addQuotationItem(p); handleSearchProduct(''); }} className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex justify-between border-b border-slate-100 items-center transition-colors">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 uppercase">{p.name}</span>
                                <div className="flex flex-wrap gap-1 items-center mt-0.5">
                                  <span className="text-[9px] bg-slate-100 px-1 rounded text-slate-600 font-mono font-bold">{p.code}</span>
                                  {p.stockRecords?.filter((sr: any) => {
                                    const wType = sr.warehouse?.type?.toUpperCase() || '';
                                    const wName = sr.warehouse?.name?.toUpperCase() || '';
                                    return !['TRANSITORIO', 'DESPACHO', 'COMPROBANTES', 'SISTEMA', 'CONTROL', 'EXISTENCIAS'].includes(wType) && 
                                           !wName.includes('DESPACHO') && 
                                           !wName.includes('COMPROBANTE') && 
                                           !wName.includes('TRANSITO') && 
                                           !wName.includes('EXISTENCIAS');
                                  }).map((sr: any) => (
                                    <span key={sr.id} className="text-[9px] text-indigo-700 font-bold bg-indigo-50 px-1 py-0.2 rounded flex items-center gap-0.5 border border-indigo-100">
                                      <MapPin className="w-2.5 h-2.5" /> {sr.warehouse?.name.split(' ')[0]}: {sr.quantity}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <span className="text-blue-700 font-bold whitespace-nowrap ml-4">S/ {formatNumber(p.salePrice || 0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button 
                      type="button" 
                      onClick={() => setIsProductSearchModalOpen(true)} 
                      className="h-7.5 px-3 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Detalle
                    </button>
                  </div>
                </div>

                {/* Tabla de Productos con Altura Maximizada */}
                <div className="overflow-auto flex-1">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="px-2 py-2 border-r border-slate-200 text-center w-8">#</th>
                        <th className="px-2 py-2 border-r border-slate-200 w-24">Código</th>
                        <th className="px-2 py-2 border-r border-slate-200 w-24 text-center">Lote</th>
                        <th className="px-2 py-2 border-r border-slate-200 min-w-50">Descripción</th>
                        <th className="px-2 py-2 border-r border-slate-200 text-center w-20">Cantidad</th>
                        <th className="px-2 py-2 border-r border-slate-200 text-center w-16">U.M.</th>
                        <th className="px-2 py-2 border-r border-slate-200 text-center w-20">Gratuito</th>
                        <th className="px-2 py-2 border-r border-slate-200 text-right w-24">P. Unitario</th>
                        <th className="px-2 py-2 border-r border-slate-200 text-right w-24">Subtotal</th>
                        <th className="px-2 py-2 border-r border-slate-200 text-right w-20">IGV</th>
                        <th className="px-2 py-2 border-r border-slate-200 text-right w-24">Total</th>
                        <th className="px-2 py-2 w-10 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {quotationItems.map((item, index) => {
                        const isFree = Boolean(item.isFree);
                        const effectivePrice = isFree ? 0 : Number(item.price || 0);
                        const subtotal = effectivePrice * Number(item.quantity || 0);
                        const totalLine = subtotal - ((subtotal * (Number(item.discount) || 0)) / 100);
                        const valorLine = totalLine / 1.18;
                        const igvLine = totalLine - valorLine;
                        const refPrice = Number(item.referencePrice || item.originalPrice || item.price || 0);

                        return (
                          <tr key={item.productId} className={`hover:bg-blue-50/30 transition-colors ${isFree ? 'bg-amber-50/40' : ''}`}>
                            <td className="px-2 py-1.5 text-center font-bold text-slate-400 border-r border-slate-100">{index + 1}</td>
                            <td className="px-2 py-1.5 border-r border-slate-100 font-mono text-[11px] font-bold text-slate-700">{item.code}</td>
                            <td className="px-2 py-1.5 border-r border-slate-100 text-center text-[10px] font-bold text-emerald-800 bg-emerald-50/30">
                              <div className="flex flex-col items-center">
                                <span className="uppercase tracking-tighter">{item.lot || '---'}</span>
                                {item.expiryDate && (
                                  <span className="text-[8px] text-amber-700 flex items-center gap-0.5 font-bold leading-none">
                                    <Calendar className="w-2 h-2 shrink-0" />
                                    {new Date(item.expiryDate).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 border-r border-slate-100 font-bold text-slate-900 uppercase truncate max-w-64">
                              <div className="flex items-center gap-1.5">
                                {isFree && (
                                  <span className="bg-amber-500 text-white text-[8px] px-1 py-0.2 rounded font-black tracking-wider shrink-0 flex items-center gap-0.5">
                                    <Gift className="w-2.5 h-2.5" /> REGALO
                                  </span>
                                )}
                                <span className="truncate">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-1 py-1 border-r border-slate-100">
                              <input 
                                type="number" 
                                min="1"
                                value={item.quantity} 
                                onChange={e => updateQuotationItem(item.productId, 'quantity', parseFloat(e.target.value) || 0)} 
                                className="h-7 w-full text-center border border-slate-200 rounded focus:border-blue-500 bg-white outline-none font-bold text-xs text-blue-900" 
                              />
                            </td>
                            <td className="px-1 py-1 border-r border-slate-100 text-center">
                              <select
                                value={item.unitMeasure || item.package?.symbol || item.subPackage?.symbol || item.unit?.symbol || 'UND'}
                                onChange={e => updateQuotationItem(item.productId, 'unitMeasure', e.target.value)}
                                className="h-7 w-full text-center border border-slate-200 rounded bg-white font-bold uppercase text-[10px] cursor-pointer focus:border-blue-500 outline-none"
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
                            <td className="px-2 py-1.5 border-r border-slate-100 text-center">
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
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer ${
                                  isFree 
                                    ? 'bg-amber-500 text-white shadow-2xs ring-1 ring-amber-400' 
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                                }`}
                                title={isFree ? "Ítem marcado como regalo/bonificación (Gratuito S/ 0.00)" : "Marcar producto como regalo/bonificación"}
                              >
                                <Gift className="w-2.5 h-2.5" />
                                {isFree ? 'SÍ' : 'NO'}
                              </button>
                            </td>
                            <td className="px-1 py-1 border-r border-slate-100">
                              {isFree ? (
                                <div className="flex flex-col items-end leading-tight pr-1">
                                  <span className="font-bold text-amber-700 text-xs">S/ 0.00</span>
                                  <span className="text-[8px] text-slate-400 font-medium">Ref: S/ {formatNumber(refPrice)}</span>
                                </div>
                              ) : (
                                <input 
                                  type="number" 
                                  step="0.000001" 
                                  value={item.price} 
                                  onChange={e => updateQuotationItem(item.productId, 'price', parseFloat(e.target.value) || 0)} 
                                  className="h-7 w-full text-right px-1.5 border border-slate-200 rounded text-xs font-bold text-slate-800 focus:border-blue-500 outline-none bg-white" 
                                />
                              )}
                            </td>
                            <td className="px-2 py-1.5 border-r border-slate-100 text-right font-bold text-slate-600">{formatNumber(valorLine)}</td>
                            <td className="px-2 py-1.5 border-r border-slate-100 text-right font-medium text-slate-500">{formatNumber(igvLine)}</td>
                            <td className="px-2 py-1.5 border-r border-slate-100 text-right font-bold text-blue-900 font-mono">{formatNumber(totalLine)}</td>
                            <td className="px-2 py-1.5 text-center">
                              <button 
                                type="button" 
                                onClick={() => removeQuotationItem(item.productId)} 
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Remover Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {quotationItems.length === 0 && (
                        <tr>
                          <td colSpan={12} className="p-12 text-center text-slate-400 italic">
                            Pulse el buscador superior o el botón "+ Agregar Detalle" para añadir productos al pedido.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Barra inferior de la tabla (con total de productos) */}
                <div className="bg-slate-50 px-3 py-1 border-t border-slate-200 flex items-center justify-end shrink-0">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">
                    Total de Productos Registrados: {quotationItems.length}
                  </span>
                </div>
              </div>

              {/* SECCIÓN 5: TOTALES Y FOOTER */}
              <div className="shrink-0 px-4 py-2 bg-slate-100/90 border border-slate-200 rounded-lg flex items-center justify-between shadow-2xs">
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-red-500" /> Cancelar
                  </button>

                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="h-8 px-6 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {loading ? 'Procesando...' : (editingItem ? 'Actualizar Pedido' : 'Guardar Pedido')}
                  </button>
                </div>

                <div className="flex gap-4 items-center">
                  {totalGratuito > 0 && (
                    <div className="flex flex-col items-end bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                      <span className="text-[8px] font-black text-amber-700 uppercase">Op. Gratuita (Ref)</span>
                      <span className="text-xs font-black text-amber-800 font-mono">S/ {formatNumber(totalGratuito)}</span>
                    </div>
                  )}

                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Valor Venta</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">S/ {formatNumber(valorVenta)}</span>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">IGV (18%)</span>
                    <span className="text-xs font-bold text-slate-600 font-mono">S/ {formatNumber(igvTotal)}</span>
                  </div>

                  <div className="bg-[#004A99] text-white px-4 py-1.5 rounded-lg flex flex-col items-end shadow-sm">
                    <span className="text-[9px] font-bold text-blue-200 uppercase">Total a Pagar</span>
                    <span className="text-base font-black font-mono">S/ {formatNumber(quotationTotal)}</span>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      <ProductSearchModal 
        isOpen={isProductSearchModalOpen} 
        onClose={() => setIsProductSearchModalOpen(false)} 
        onSelect={(p) => { addQuotationItem(p); setIsProductSearchModalOpen(false); }} 
        token={token} 
        selectedWarehouseId={formData.warehouseId}
        warehouses={warehouses}
      />
    </AnimatePresence>
  );
};
