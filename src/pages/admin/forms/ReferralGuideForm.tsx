import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, X, Search, Save, Package, UserPlus, ClipboardList, FileText, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { ProductSearchModal } from './ProductSearchModal';
import { SupplierSearchModal } from './SupplierSearchModal';
import { SupplierForm } from './SupplierForm';
import { SUNAT_PURCHASE_TYPES } from './PurchaseEntryForm';

interface ReferralGuideFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token?: string | null;
  formData: any;
  setFormData: (data: any) => void;
}

const DEFAULT_GUIDE_DOC_TYPES = [
  { code: '09', name: 'Guía de Remisión - Remitente', sigla: 'GRM' },
  { code: '31', name: 'Guía de Remisión - Transportista', sigla: 'GRT' }
];

export const ReferralGuideForm: React.FC<ReferralGuideFormProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  token, 
  formData, 
  setFormData 
}) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [prodSearch, setProdSearch] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  
  const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState({ 
    name: '', docType: 'RUC', docNumber: '', address: '', 
    phone: '', email: '', contact: '',
    department: '', province: '', district: '' 
  });

  const [docTypes, setDocTypes] = useState<any[]>(DEFAULT_GUIDE_DOC_TYPES);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [tcWarning, setTcWarning] = useState('');

  useEffect(() => {
    if (isOpen) fetchInitialData();
  }, [isOpen]);

  useEffect(() => {
    if (formData.date && isOpen) {
      fetchExchangeRate(formData.date);
    }
  }, [formData.date, isOpen]);

  const fetchExchangeRate = async (date: string) => {
    try {
      const res = await axios.get(`/api/exchange-rates/fetch-by-date/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.sell_rate) {
        setFormData((prev: any) => ({ ...prev, exchangeRate: res.data.sell_rate.toString() }));
        const rateDate = res.data.date?.split('T')[0];
        if (rateDate === date) {
          setTcWarning('');
        } else {
          setTcWarning(`Mostrando último T.C. registrado (${rateDate}). No hay registro exacto para hoy.`);
        }
      } else {
        setTcWarning('No hay tipo de cambio registrado para este día.');
      }
    } catch (err) {
      console.error('Error fetching TC:', err);
    }
  };

  const fetchInitialData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [sRes, pRes, wRes, dRes, cRes] = await Promise.all([
        axios.get('/api/suppliers', config).catch(() => ({ data: [] })),
        axios.get('/api/products', config).catch(() => ({ data: [] })),
        axios.get('/api/warehouses', config).catch(() => ({ data: [] })),
        axios.get('/api/sunat/TABLA_10', config).catch(() => ({ data: [] })),
        axios.get('/api/sunat/TABLA_04', config).catch(() => ({ data: [] }))
      ]);
      
      setSuppliers(Array.isArray(sRes.data) ? sRes.data : []);
      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
      const whs = Array.isArray(wRes.data) ? wRes.data.filter((w: any) => w.isActive !== false) : [];
      setWarehouses(whs);
      setCurrencies(Array.isArray(cRes.data) ? cRes.data : []);
      
      // Asegurar que Guías (09 / 31) estén presentes
      const dts = Array.isArray(dRes.data) && dRes.data.length > 0 ? dRes.data : DEFAULT_GUIDE_DOC_TYPES;
      const filtered = dts.filter((d: any) => ['09', '31', 'GRM', 'GRT'].includes(d.code));
      setDocTypes(filtered.length > 0 ? filtered : DEFAULT_GUIDE_DOC_TYPES);
      
      const defaultWh = whs.find((w: any) => {
        const name = (w.name || '').toUpperCase();
        return name.includes('COMPRAS NAC') || name.includes('COMPRAS IMP') || (w.type === 'TRANSITORIO' && name.includes('COMPRAS'));
      })?.id?.toString();
      
      setFormData((prev: any) => ({ 
        ...prev, 
        docType: prev.docType || '09',
        date: prev.date || new Date().toISOString().split('T')[0],
        currency: prev.currency || 'PEN',
        exchangeRate: prev.exchangeRate || '3.434',
        purchaseType: prev.purchaseType || 'NACIONAL',
        status: prev.status || 'ACTIVO',
        warehouseId: prev.warehouseId || defaultWh || '',
        items: prev.items || [],
        observation: prev.observation || ''
      }));
    } catch (err) { console.error(err); }
  };

  const handleQuickRegisterSupplier = async (data: any) => {
    setLoading(true);
    try {
      const res = await axios.post('/api/suppliers', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers([...suppliers, res.data]);
      setFormData({ ...formData, supplierId: res.data.id.toString() });
      setIsSupplierFormOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al registrar proveedor');
    } finally {
      setLoading(false);
    }
  };

  const addItem = (p: any) => {
    setFormData((prev: any) => ({
      ...prev,
      items: [...(prev.items || []), { 
        productId: p.id, name: p.name, code: p.code, unitSymbol: p.package?.symbol || p.subPackage?.symbol || p.unit?.symbol || 'UND',
        quantity: 1, 
        price: 0,
        lotNumber: '', 
        expiryDate: '', 
        entranceDate: new Date().toISOString().split('T')[0],
        observation: ''
      }]
    }));
    setProdSearch('');
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...(formData.items || [])];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || formData.items.length === 0 || !formData.warehouseId) return alert('Campos incompletos');
    setLoading(true);
    try {
      const selectedSupplier = suppliers.find(s => s.id.toString() === formData.supplierId.toString());
      const normalizedDocNumber = formData.docNumber ? String(formData.docNumber).replace(/\D/g, '').padStart(8, '0') : '';
      const payload = { ...formData, docNumber: normalizedDocNumber, supplierName: selectedSupplier?.name };
      
      if (formData.id) await axios.put(`/api/purchases/${formData.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      else await axios.post('/api/purchases', payload, { headers: { Authorization: `Bearer ${token}` } });
      onSuccess(); onClose();
    } catch (err: any) { alert(err.response?.data?.error || 'Error'); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  const selectedSupplier = suppliers.find(s => s.id.toString() === (formData.supplierId || '').toString());

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
          />

          <motion.div
            key="referral-guide"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[92vh]"
          >
            {/* Cabecera Institucional ERP */}
            <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white/10 rounded">
                  <Truck className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-tight">
                    Guía de Remisión de Ingreso
                  </h2>
                  <p className="text-[9px] text-blue-200 uppercase font-medium">
                    Módulo de Almacén · Recepción de Mercadería
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/70 flex flex-col">
                {/* Sección 1: Datos del Proveedor y Documento */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2.5 shrink-0">
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-700" />
                    <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">
                      Datos del Proveedor y Documento
                    </span>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 lg:col-span-6 space-y-1 min-w-0">
                      <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center justify-between">
                        <span>Proveedor</span>
                        <button
                          type="button"
                          onClick={() => setIsSupplierFormOpen(true)}
                          className="text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3 h-3" /> Registro Rápido
                        </button>
                      </label>
                      <div className="flex gap-1.5 min-w-0">
                        <select
                          value={formData.supplierId}
                          onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                          className="flex-1 min-w-0 w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 focus:border-blue-500 outline-none truncate"
                        >
                          <option value="">-- SELECCIONE PROVEEDOR --</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.docNumber} | {s.name.toUpperCase()}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setIsSupplierSearchOpen(true)}
                          title="Buscar proveedor"
                          className="h-8 px-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="col-span-12 lg:col-span-4 space-y-1 min-w-0">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Documento</label>
                      <div className="flex items-center gap-1">
                        <select
                          value={formData.docType}
                          onChange={e => setFormData({ ...formData, docType: e.target.value })}
                          className="w-20 h-8 px-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 text-center focus:border-blue-500 outline-none"
                        >
                          {docTypes.map(d => (
                            <option key={d.code} value={d.code}>
                              {d.sigla || (d.code === '09' ? 'GRM' : d.code === '31' ? 'GRT' : d.code)}
                            </option>
                          ))}
                          {formData.docType === 'GRM' && <option value="GRM">GRM</option>}
                        </select>
                        <input
                          placeholder="SERIE"
                          value={formData.docSeries}
                          onChange={e => setFormData({ ...formData, docSeries: e.target.value.toUpperCase() })}
                          className="w-20 h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold font-mono text-slate-800 text-center focus:border-blue-500 outline-none"
                        />
                        <span className="font-bold text-slate-400 text-xs">-</span>
                        <input
                          placeholder="NÚMERO"
                          maxLength={8}
                          value={formData.docNumber}
                          onChange={e => setFormData({ ...formData, docNumber: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                          onBlur={() => {
                            if (formData.docNumber && formData.docNumber.trim()) {
                              setFormData({ ...formData, docNumber: formData.docNumber.replace(/\D/g, '').padStart(8, '0') });
                            }
                          }}
                          className="flex-1 min-w-0 h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold font-mono text-slate-800 text-center focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="col-span-12 lg:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Fecha Ingreso</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-6 lg:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Tipo Cambio</label>
                      <input
                        value={formData.exchangeRate}
                        onChange={e => setFormData({ ...formData, exchangeRate: e.target.value })}
                        className={`w-full h-8 px-2 border rounded text-xs text-right font-bold font-mono focus:border-blue-500 outline-none ${tcWarning ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-slate-300 bg-white text-slate-800'}`}
                      />
                    </div>

                    <div className="col-span-6 lg:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Moneda</label>
                      <select
                        value={formData.currency}
                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                        className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-blue-700 focus:border-blue-500 outline-none"
                      >
                        {currencies.map(c => <option key={c.code} value={c.code}>{c.name.toUpperCase()}</option>)}
                      </select>
                    </div>

                    <div className="col-span-12 lg:col-span-4 space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Tipo Compra</label>
                      <select
                        value={formData.purchaseType || 'MERCADERIA'}
                        onChange={e => setFormData({ ...formData, purchaseType: e.target.value })}
                        className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 focus:border-blue-500 outline-none"
                      >
                        {SUNAT_PURCHASE_TYPES.map(t => (
                          <option key={t.code} value={t.code}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-12 lg:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Estado</label>
                      <select
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                        className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-emerald-700 focus:border-blue-500 outline-none"
                      >
                        <option value="ACTIVO">ACTIVO</option>
                        <option value="INACTIVO">INACTIVO</option>
                        <option value="ANULADO">ANULADO</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 lg:col-span-5 space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Almacén de Recepción</label>
                      <select
                        value={formData.warehouseId}
                        onChange={e => setFormData({ ...formData, warehouseId: e.target.value })}
                        className="w-full h-8 px-2 bg-blue-50/60 border border-blue-300 rounded text-xs font-bold text-blue-900 focus:border-blue-500 outline-none"
                      >
                        <option value="">-- SELECCIONE DESTINO --</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div className="col-span-12 lg:col-span-7 space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Observaciones / Glosa</label>
                      <input
                        placeholder="Motivo de ingreso, referencia adicional..."
                        value={formData.observation}
                        onChange={e => setFormData({ ...formData, observation: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Sección 2: Productos a Ingresar */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-2xs flex-1 flex flex-col min-h-[220px] overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-700" />
                      <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">
                        Productos a Ingresar
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="relative w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          placeholder="Buscar producto por nombre o código..."
                          value={prodSearch}
                          onChange={e => setProdSearch(e.target.value)}
                          className="w-full h-8 pl-8 pr-3 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white text-slate-800"
                        />
                        {prodSearch && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 shadow-2xl z-50 max-h-60 overflow-auto rounded-lg">
                            {products
                              .filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.code?.toLowerCase().includes(prodSearch.toLowerCase()))
                              .map(p => (
                                <div
                                  key={p.id}
                                  onClick={() => addItem(p)}
                                  className="p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 flex justify-between items-center"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800">{p.name}</span>
                                    <span className="text-[10px] font-mono text-slate-400">{p.code}</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">{p.unit?.symbol}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSearchModalOpen(true)}
                        className="h-8 px-3.5 bg-[#004A99] hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Agregar Ítem
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                        <tr className="text-[10px] text-slate-600 font-bold uppercase tracking-tight">
                          <th className="px-3 py-2 text-left w-28">Código</th>
                          <th className="px-3 py-2 text-left">Descripción del Producto</th>
                          <th className="px-2 py-2 text-center w-24">Cantidad</th>
                          <th className="px-2 py-2 text-center w-16">U.M.</th>
                          <th className="px-2 py-2 text-center w-32">Nro. Lote</th>
                          <th className="px-2 py-2 text-center w-36">F. Vencimiento</th>
                          <th className="px-2 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formData.items.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400 font-medium">
                              No hay productos agregados. Utiliza el buscador o haz clic en "Agregar Ítem".
                            </td>
                          </tr>
                        ) : (
                          formData.items.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                              <td className="px-3 py-1.5 font-mono text-[11px] text-slate-500">{item.code}</td>
                              <td className="px-3 py-1.5 font-bold text-slate-800 uppercase text-[11px]">{item.name}</td>
                              <td className="px-2 py-1">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                  className="w-full h-8 text-center border border-slate-300 focus:border-blue-500 bg-white rounded outline-none text-xs font-bold text-blue-700"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-center text-slate-600 font-bold text-[11px]">{item.unitSymbol}</td>
                              <td className="px-2 py-1">
                                <input
                                  placeholder="LOTE-001"
                                  value={item.lotNumber}
                                  onChange={e => updateItem(idx, 'lotNumber', e.target.value.toUpperCase())}
                                  className="w-full h-8 px-2 text-center border border-slate-300 focus:border-blue-500 bg-white outline-none font-bold font-mono text-[11px] text-slate-800 rounded"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="date"
                                  value={item.expiryDate}
                                  onChange={e => updateItem(idx, 'expiryDate', e.target.value)}
                                  className="w-full h-8 px-2 text-center border border-slate-300 focus:border-blue-500 bg-white outline-none text-[11px] font-medium text-slate-800 rounded"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => { const itms = [...formData.items]; itms.splice(idx, 1); setFormData({ ...formData, items: itms }); }}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Quitar ítem"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer Estándar ERP */}
              <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-red-500" /> Cancelar
                  </button>
                  <div className="flex items-center gap-1.5 px-3 h-8 bg-blue-50 rounded-lg border border-blue-200">
                    <ClipboardList className="w-3.5 h-3.5 text-blue-700" />
                    <span className="text-[10px] font-bold text-blue-900 uppercase">Total Ítems: {formData.items.length}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="h-8 px-5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {loading ? 'Procesando...' : 'Confirmar Ingreso'}
                </button>
              </div>
            </form>

          <ProductSearchModal 
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
            onSelect={(p) => { addItem(p); setIsSearchModalOpen(false); }}
            token={token || ''}
            allowZeroStock={true}
          />

          <SupplierSearchModal 
            isOpen={isSupplierSearchOpen}
            onClose={() => setIsSupplierSearchOpen(false)}
            onSelect={(s) => { setFormData({...formData, supplierId: s.id.toString()}); setIsSupplierSearchOpen(false); }}
            token={token || ''}
          />

          <SupplierForm 
            isOpen={isSupplierFormOpen}
            onClose={() => setIsSupplierFormOpen(false)}
            onSubmit={handleQuickRegisterSupplier}
            formData={supplierFormData}
            setFormData={setSupplierFormData}
            editingItem={null}
            loading={loading}
            token={token || ''}
          />
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
};

const PlusCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
