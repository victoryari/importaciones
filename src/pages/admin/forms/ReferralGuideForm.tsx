import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, X, Search, Save, Package, Calendar, UserPlus, AlertCircle, ClipboardList } from 'lucide-react';
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
  { code: '09', name: 'Guía de Remisión - Remitente' },
  { code: '31', name: 'Guía de Remisión - Transportista' }
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
      
      const defaultWh = whs.find((w: any) => w.name.toUpperCase().includes('COMPRAS IMP/NAC'))?.id?.toString();
      
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
        price: p.costPrice || 0, // Guía puede tener costo referencial
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
      const payload = { ...formData, supplierName: selectedSupplier?.name };
      
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
        <motion.div key="referral-guide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-hidden"
        >
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-6xl max-h-full bg-[#E8EBF0] flex flex-col border border-[#8A9DB8] shadow-2xl overflow-hidden rounded-sm">
          
          <div className="bg-[#5C7285] px-3 py-1.5 flex items-center justify-between border-b border-white shadow-sm">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-white" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Módulo de Almacén: Guía de Remisión de Ingreso</h2>
            </div>
            <button onClick={onClose} className="text-white hover:text-red-200 transition-colors"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col p-3 gap-3">
            
            <div className="bg-white p-4 border border-[#B0BCCB] rounded shadow-sm flex flex-col gap-4 text-[11px]">
              
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 lg:col-span-6 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px] flex justify-between">
                    <span>Proveedor:</span>
                    <span className="text-blue-600 cursor-pointer hover:underline flex items-center gap-1" onClick={() => setIsSupplierFormOpen(true)}>
                      <UserPlus className="w-3 h-3" /> REGISTRO RÁPIDO
                    </span>
                  </label>
                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <select value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})} className="w-full h-7 bg-slate-50 border border-slate-200 px-2 outline-none font-bold">
                        <option value="">-- SELECCIONE PROVEEDOR --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.docNumber} | {s.name.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => setIsSupplierSearchOpen(true)} className="w-8 h-7 bg-blue-600 text-white rounded flex items-center justify-center hover:bg-blue-700 shadow-sm transition-colors">
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-4 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Documento:</label>
                  <div className="flex items-center gap-1">
                    <select value={formData.docType} onChange={e => setFormData({...formData, docType: e.target.value})} className="w-20 h-7 bg-slate-50 border border-slate-200 px-1 outline-none font-bold text-center">
                      {docTypes.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
                      <option value="GRM">GRM</option>
                    </select>
                    <input placeholder="SERIE" value={formData.docSeries} onChange={e => setFormData({...formData, docSeries: e.target.value.toUpperCase()})} className="w-20 h-7 border border-slate-200 px-2 outline-none font-bold text-center" />
                    <span className="font-bold text-slate-400">-</span>
                    <input placeholder="NÚMERO" value={formData.docNumber} onChange={e => setFormData({...formData, docNumber: e.target.value})} className="flex-1 h-7 border border-slate-200 px-2 outline-none font-bold text-center" />
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-2 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Fecha Ingreso:</label>
                  <div className="relative">
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full h-7 border border-slate-200 px-2 outline-none font-bold bg-slate-50" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 border-t border-slate-50 pt-3">
                <div className="col-span-12 lg:col-span-2 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Tipo Cambio:</label>
                  <div className="flex items-center gap-1">
                    <input value={formData.exchangeRate} onChange={e => setFormData({...formData, exchangeRate: e.target.value})} className={`w-full h-7 border rounded px-2 text-right font-black ${tcWarning ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-slate-50'}`} />
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-3 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Moneda:</label>
                  <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full h-7 bg-slate-50 border border-slate-200 px-2 outline-none font-black text-blue-600">
                    {currencies.map(c => <option key={c.code} value={c.code}>{c.name.toUpperCase()}</option>)}
                  </select>
                </div>

                <div className="col-span-12 lg:col-span-4 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Tipo Compra:</label>
                  <select value={formData.purchaseType || 'MERCADERIA'} onChange={e => setFormData({...formData, purchaseType: e.target.value})} className="w-full h-7 bg-slate-50 border border-slate-200 px-2 outline-none font-bold">
                    {SUNAT_PURCHASE_TYPES.map(t => (
                      <option key={t.code} value={t.code}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-12 lg:col-span-3 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Estado:</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full h-7 bg-slate-50 border border-slate-200 px-2 outline-none font-bold text-emerald-600">
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                    <option value="ANULADO">ANULADO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 border-t border-slate-50 pt-3">
                <div className="col-span-12 lg:col-span-5 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Almacén de Recepción:</label>
                  <select value={formData.warehouseId} onChange={e => setFormData({...formData, warehouseId: e.target.value})} className="w-full h-7 bg-blue-50 border border-blue-200 px-2 outline-none font-black text-blue-900">
                    <option value="">-- SELECCIONE DESTINO --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="col-span-12 lg:col-span-7 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Observaciones / Glosa:</label>
                  <input placeholder="Motivo de ingreso, referencia adicional..." value={formData.observation} onChange={e => setFormData({...formData, observation: e.target.value})} className="w-full h-7 border border-slate-200 px-2 outline-none bg-slate-50" />
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-white border border-[#B0BCCB] rounded shadow-inner overflow-hidden">
              <div className="bg-[#F0F2F5] px-4 py-1.5 flex justify-between items-center border-b border-[#B0BCCB]">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] font-black text-slate-700 uppercase">Productos a Ingresar</span>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input placeholder="Buscar producto por nombre o código..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} className="w-full h-7 pl-9 pr-3 text-[11px] border border-[#B0BCCB] rounded-full outline-none focus:ring-2 focus:ring-blue-500/20" />
                    {prodSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#B0BCCB] shadow-2xl z-50 max-h-60 overflow-auto rounded-md">
                        {products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.code?.toLowerCase().includes(prodSearch.toLowerCase())).map(p => (
                          <div key={p.id} onClick={() => addItem(p)} className="p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-slate-800">{p.name}</span>
                              <span className="text-[9px] text-slate-400">{p.code}</span>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase">{p.unit?.symbol}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => setIsSearchModalOpen(true)} className="h-7 px-4 bg-slate-700 text-white text-[10px] font-bold rounded-full hover:bg-slate-800 shadow-sm flex items-center gap-2 transition-all">
                    <PlusCircle className="w-3.5 h-3.5" /> AGREGAR ÍTEM
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-[10px]">
                  <thead className="sticky top-0 bg-slate-50 border-b border-[#B0BCCB] shadow-sm z-10">
                    <tr className="text-slate-500 font-bold uppercase tracking-tighter">
                      <th className="p-2 text-left w-24">Código</th>
                      <th className="p-2 text-left">Descripción del Producto</th>
                      <th className="p-2 text-center w-20">Cantidad</th>
                      <th className="p-2 text-center w-16">U.M.</th>
                      <th className="p-2 text-center w-32">Nro. Lote</th>
                      <th className="p-2 text-center w-32">F. Vencimiento</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-2 font-mono text-slate-500">{item.code}</td>
                        <td className="p-2 font-bold text-slate-800 uppercase">{item.name}</td>
                        <td className="p-1">
                          <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-full h-7 text-center border border-transparent focus:border-blue-400 focus:bg-white bg-slate-50/50 rounded outline-none font-black text-blue-700" />
                        </td>
                        <td className="p-2 text-center text-slate-500 font-bold">{item.unitSymbol}</td>
                        <td className="p-1">
                          <input placeholder="LOTE-001" value={item.lotNumber} onChange={e => updateItem(idx, 'lotNumber', e.target.value.toUpperCase())} className="w-full h-7 text-center border border-slate-200 focus:border-blue-400 focus:bg-white bg-transparent outline-none font-bold text-[10px] rounded" />
                        </td>
                        <td className="p-1">
                          <input type="date" value={item.expiryDate} onChange={e => updateItem(idx, 'expiryDate', e.target.value)} className="w-full h-7 text-center border border-slate-200 focus:border-blue-400 focus:bg-white bg-transparent outline-none text-[10px] rounded" />
                        </td>
                        <td className="p-2 text-center">
                          <button type="button" onClick={() => { const itms = [...formData.items]; itms.splice(idx,1); setFormData({...formData, items: itms}); }} className="text-slate-300 hover:text-red-500 transition-colors font-bold text-base">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center bg-white p-3 border border-[#B0BCCB] rounded shadow-sm">
              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="h-10 px-8 bg-emerald-600 text-white font-black rounded flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all transform active:scale-95">
                  <Save className="w-5 h-5" /> {loading ? 'PROCESANDO...' : 'CONFIRMAR INGRESO'}
                </button>
                <button type="button" onClick={onClose} className="h-10 px-6 bg-white border border-slate-300 text-slate-500 font-bold rounded flex items-center gap-2 hover:bg-slate-50 transition-all">
                  <X className="w-5 h-5" /> CANCELAR
                </button>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
                <ClipboardList className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] font-black text-blue-700 uppercase">Total Ítems: {formData.items.length}</span>
              </div>
            </div>

          </form>

          <ProductSearchModal 
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
            onSelect={(p) => { addItem(p); setIsSearchModalOpen(false); }}
            token={token || ''}
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
      </motion.div>
    )}
  </AnimatePresence>
  );
};

const PlusCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
