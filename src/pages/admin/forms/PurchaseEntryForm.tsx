import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, X, Search, Save, Package, Truck, Landmark, FileText, Calendar, DollarSign, UserPlus, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { formatNumber } from '../../../lib/utils';
import { ProductSearchModal } from './ProductSearchModal';
import { SupplierSearchModal } from './SupplierSearchModal';
import { SupplierForm } from './SupplierForm';

interface PurchaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token?: string | null;
  formData: any;
  setFormData: (data: any) => void;
  mode?: 'invoices' | 'guides';
}

export const PurchaseEntryForm: React.FC<PurchaseFormProps> = ({ isOpen, onClose, onSuccess, token, formData, setFormData }) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [prodSearch, setProdSearch] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  
  // Nuevos estados para Proveedores
  const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState({ 
    name: '', docType: 'RUC', docNumber: '', address: '', 
    phone: '', email: '', contact: '',
    department: '', province: '', district: '' 
  });
  const [tcWarning, setTcWarning] = useState('');


  useEffect(() => {
    if (isOpen) fetchInitialData();
  }, [isOpen]);

  // Efecto para Tipo de Cambio
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
        // Si la fecha coincide exactamente, quitar advertencia
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
        axios.get('/api/sunat/doc_type', config).catch(() => ({ data: [] })),
        axios.get('/api/sunat/currency', config).catch(() => ({ data: [] }))
      ]);
      
      setSuppliers(Array.isArray(sRes.data) ? sRes.data : []);
      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
      const whs = Array.isArray(wRes.data) ? wRes.data.filter((w: any) => w.isActive !== false) : [];
      setWarehouses(whs);
      
      // Solo Facturas, Boletas, DUA
      const filteredDocs = (Array.isArray(dRes.data) ? dRes.data : []).filter((d: any) => 
        ['01', '03', '50'].includes(d.code)
      );
      setDocTypes(filteredDocs);
      setCurrencies(Array.isArray(cRes.data) ? cRes.data : []);
      
      const defaultWh = whs.find((w: any) => w.name.toUpperCase().includes('COMPRAS IMP/NAC'))?.id?.toString();
      
      setFormData((prev: any) => ({ 
        ...prev, 
        docType: prev.docType || '01',
        date: prev.date || new Date().toISOString().split('T')[0],
        currency: prev.currency || 'PEN',
        exchangeRate: prev.exchangeRate || '3.434',
        warehouseId: prev.warehouseId || defaultWh || '',
        items: prev.items || [],
        afectoIgv: prev.afectoIgv ?? false,
        preciosIncluyenIgv: prev.preciosIncluyenIgv ?? true,
        purchaseType: prev.purchaseType || 'MERCADERIA',
        observation: prev.observation || '',
        guideSeries: prev.guideSeries || '',
        guideNumber: prev.guideNumber || ''
      }));
    } catch (err) { console.error(err); }
  };

  const handleConsultGuide = async () => {
    if (!formData.guideSeries || !formData.guideNumber) return alert('Ingrese Serie y Número de Guía');
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`/api/purchases/search?type=09&series=${formData.guideSeries}&number=${formData.guideNumber}`, config);
      if (res.data && res.data.items) {
        const guideData = res.data;
        setFormData({
          ...formData,
          supplierId: guideData.supplierId.toString(),
          referenceId: guideData.id.toString(),
          items: guideData.items.map((it: any) => {
            const price = it.price || 0;
            const valor = formData.afectoIgv 
              ? (formData.preciosIncluyenIgv ? price / 1.18 : price)
              : price;
            const igv = formData.afectoIgv 
              ? (formData.preciosIncluyenIgv ? price - valor : valor * 0.18)
              : 0;

            return {
              productId: it.productId,
              name: it.product?.name || it.name || 'PRODUCTO SIN NOMBRE',
              code: it.product?.code || it.code || 'S/C',
              unitSymbol: it.unitSymbol || it.product?.unit?.symbol || 'UND',
              quantity: it.quantity,
              price: formData.afectoIgv ? (formData.preciosIncluyenIgv ? price : valor + igv) : valor,
              valorCompra: valor,
              igv: igv,
              lotNumber: it.lotNumber || '',
              expiryDate: it.expiryDate || '',
              entranceDate: it.expiryDate ? new Date(it.expiryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            };
          })
        });
        alert('Información de guía cargada correctamente: ' + guideData.items.length + ' productos encontrados.');
      } else {
        alert('No se encontró la guía especificada');
      }
    } catch (err) {
      alert('Error al consultar la guía');
    } finally {
      setLoading(false);
    }
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
      alert('Proveedor registrado y seleccionado');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al registrar proveedor');
    } finally {
      setLoading(false);
    }
  };

  const addItem = (p: any) => {
    const defaultPrice = p.costPrice || 0;
    const valor = formData.afectoIgv 
      ? (formData.preciosIncluyenIgv ? defaultPrice / 1.18 : defaultPrice)
      : defaultPrice;
    const igv = formData.afectoIgv 
      ? (formData.preciosIncluyenIgv ? defaultPrice - valor : valor * 0.18)
      : 0;
    const precio = formData.afectoIgv 
      ? (formData.preciosIncluyenIgv ? defaultPrice : valor + igv)
      : valor;

    setFormData((prev: any) => ({
      ...prev,
      items: [...(prev.items || []), { 
        productId: p.id, name: p.name, code: p.code, unitSymbol: p.unit?.symbol || 'UND',
        quantity: 1, 
        price: precio,
        valorCompra: valor,
        igv: igv,
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
    const item = newItems[index];
    if (!item) return;

    item[field] = value;

    if (field === 'price' || field === 'valorCompra' || field === 'quantity') {
      const val = parseFloat(value) || 0;
      if (formData.afectoIgv) {
        if (field === 'price') {
          // Si el usuario ingresa el PRECIO (Total)
          item.valorCompra = val / 1.18;
          item.igv = val - item.valorCompra;
        } else if (field === 'valorCompra') {
          // Si el usuario ingresa el VALOR (Neto)
          item.price = val * 1.18;
          item.igv = item.price - val;
        }
      } else {
        // Operación Exonerada / No Afecta
        item.igv = 0;
        if (field === 'price') item.valorCompra = val;
        else if (field === 'valorCompra') item.price = val;
      }
    }

    setFormData({ ...formData, items: newItems });
  };

  const subtotalGeneral = (formData.items || []).reduce((acc: number, item: any) => acc + (Number(item.valorCompra || 0) * Number(item.quantity || 0)), 0);
  const totalIgv = formData.afectoIgv ? (formData.items || []).reduce((acc: number, item: any) => acc + (Number(item.igv || 0) * Number(item.quantity || 0)), 0) : 0;
  const totalGeneral = subtotalGeneral + totalIgv;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || formData.items.length === 0 || !formData.warehouseId) return alert('Campos incompletos');
    setLoading(true);
    try {
      const selectedSupplier = suppliers.find(s => s.id.toString() === formData.supplierId.toString());
      const payload = { ...formData, supplierName: selectedSupplier?.name, totalAmount: totalGeneral };
      
      if (formData.id) await axios.put(`/api/purchases/${formData.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      else await axios.post('/api/purchases', payload, { headers: { Authorization: `Bearer ${token}` } });
      onSuccess(); onClose();
    } catch (err: any) { alert(err.response?.data?.error || 'Error'); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  const selectedSupplier = suppliers.find(s => s.id.toString() === formData.supplierId.toString());

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-hidden">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-7xl max-h-full bg-[#D4D9E2] flex flex-col border border-[#8A9DB8] shadow-2xl overflow-hidden rounded-sm">
          
          <div className="bg-[#4A628A] px-3 py-1.5 flex items-center justify-between border-b border-white shadow-sm">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-white" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Registro de Compra / Factura / Boleta / DUA
              </h2>
            </div>
            <button onClick={onClose} className="text-white hover:text-red-200 transition-colors"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col p-3 gap-3">
            
            <div className="bg-white p-4 border border-[#B0BCCB] rounded shadow-sm flex flex-col gap-4 text-[11px]">
              
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 lg:col-span-5 flex flex-col gap-1">
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
                    <button type="button" onClick={() => setIsSupplierSearchOpen(true)} className="w-8 h-7 bg-blue-600 text-white rounded flex items-center justify-center hover:bg-blue-700 shadow-sm">
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedSupplier && (
                    <div className="text-[10px] text-slate-400 font-bold px-2 py-0.5 bg-slate-50 rounded italic mt-0.5">
                      Dirección: {selectedSupplier.address || 'No especificada'}
                    </div>
                  )}
                </div>

                <div className="col-span-12 lg:col-span-3 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Tipo de Documento:</label>
                  <select value={formData.docType} onChange={e => setFormData({...formData, docType: e.target.value})} className="w-full h-7 bg-slate-50 border border-slate-200 px-2 outline-none font-bold">
                    {docTypes.map(d => <option key={d.code} value={d.code}>{d.code} | {d.name}</option>)}
                  </select>
                </div>

                <div className="col-span-12 lg:col-span-2 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Serie:</label>
                  <input placeholder="SERIE" value={formData.docSeries} onChange={e => setFormData({...formData, docSeries: e.target.value.toUpperCase()})} className="w-full h-7 border border-slate-200 px-2 outline-none font-bold text-center" />
                </div>

                <div className="col-span-12 lg:col-span-2 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Número:</label>
                  <input placeholder="NÚMERO" value={formData.docNumber} onChange={e => setFormData({...formData, docNumber: e.target.value})} className="w-full h-7 border border-slate-200 px-2 outline-none font-bold text-center" />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 border-t border-slate-100 pt-3">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Fecha Registro:</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-7 border border-slate-200 px-2 outline-none" />
                </div>

                <div className="col-span-3 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Moneda / T. Cambio:</label>
                  <div className="flex gap-1 items-center">
                    <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="flex-1 h-7 border border-slate-200 px-2 outline-none font-black text-blue-600">
                      {currencies.map(c => <option key={c.code} value={c.code}>{c.code} | {c.name}</option>)}
                    </select>
                    <input value={formData.exchangeRate} onChange={e => setFormData({...formData, exchangeRate: e.target.value})} className={`w-16 h-7 border rounded px-1 text-right font-black ${tcWarning ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`} />
                    {tcWarning && (
                      <div className="group relative">
                        <AlertCircle className="w-4 h-4 text-amber-500 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-amber-600 text-white text-[9px] p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                          {tcWarning}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-3 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Almacén de Ingreso:</label>
                  <select value={formData.warehouseId} onChange={e => setFormData({...formData, warehouseId: e.target.value})} className="w-full h-7 bg-blue-50 border border-blue-200 px-2 outline-none font-black text-blue-900">
                    <option value="">-- SELECCIONE DESTINO --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>)}
                  </select>
                </div>

                <div className="col-span-2 flex flex-col gap-1">
                  <label className="font-black text-slate-500 uppercase text-[9px]">Tipo de Compra:</label>
                  <select value={formData.purchaseType} onChange={e => setFormData({...formData, purchaseType: e.target.value})} className="w-full h-7 bg-slate-50 border border-slate-200 px-2 outline-none font-bold text-blue-700">
                    <option value="MERCADERIA">01 | MERCADERÍA</option>
                    <option value="ACTIVO">02 | ACTIVO FIJO</option>
                    <option value="GASTO">03 | GASTO / OTROS</option>
                  </select>
                </div>

                <div className="col-span-2 flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={formData.afectoIgv} onChange={e => setFormData({...formData, afectoIgv: e.target.checked})} className="w-4 h-4 accent-blue-600" />
                    <span className="font-black text-slate-500 uppercase text-[9px] group-hover:text-blue-600 transition-colors">Afecto IGV</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={formData.preciosIncluyenIgv} onChange={e => setFormData({...formData, preciosIncluyenIgv: e.target.checked})} className="w-4 h-4 accent-blue-600" />
                    <span className="font-black text-slate-500 uppercase text-[9px] group-hover:text-blue-600 transition-colors">Inc. IGV</span>
                  </label>
                </div>
              </div>

              <div className="bg-slate-50 p-2 border border-dashed border-slate-300 rounded flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <span className="font-black text-slate-500 uppercase text-[9px]">Referencia de Guía:</span>
                 </div>
                 <input placeholder="SERIE" value={formData.guideSeries} onChange={e => setFormData({...formData, guideSeries: e.target.value.toUpperCase()})} className="w-16 h-7 border border-slate-200 px-2 outline-none font-bold text-center" />
                 <input placeholder="NÚMERO" value={formData.guideNumber} onChange={e => setFormData({...formData, guideNumber: e.target.value})} className="w-24 h-7 border border-slate-200 px-2 outline-none font-bold text-center" />
                 <button type="button" onClick={handleConsultGuide} className="h-7 px-3 bg-slate-700 text-white font-bold rounded flex items-center gap-1 hover:bg-slate-800 transition-colors">
                    <Search className="w-3 h-3" /> CONSULTAR
                 </button>
                 <div className="ml-auto w-1/3">
                    <input placeholder="Glosa / Observaciones..." value={formData.observation} onChange={e => setFormData({...formData, observation: e.target.value})} className="w-full h-7 border border-slate-200 px-2 outline-none" />
                 </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-white border border-[#B0BCCB] rounded shadow-inner overflow-hidden">
              <div className="bg-[#E0E5ED] px-4 py-1.5 flex justify-between items-center border-b border-[#B0BCCB]">
                <span className="text-[10px] font-black text-slate-700 uppercase">Detalle de Productos</span>
                <div className="flex gap-2 items-center">
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input placeholder="F1 Buscar producto..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} className="w-full h-7 pl-9 pr-3 text-[11px] border border-[#B0BCCB] rounded-full outline-none focus:ring-2 focus:ring-blue-500/20" />
                    {prodSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#B0BCCB] shadow-2xl z-50 max-h-60 overflow-auto rounded-md">
                        {products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.code?.toLowerCase().includes(prodSearch.toLowerCase())).map(p => (
                          <div key={p.id} onClick={() => addItem(p)} className="p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 flex justify-between items-center transition-colors">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-slate-800">{p.name}</span>
                              <span className="text-[9px] text-slate-400">{p.code}</span>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600">S/ {p.costPrice}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setIsSearchModalOpen(true)}
                    className="h-7 px-3 bg-blue-600 text-white text-[10px] font-bold rounded-full hover:bg-blue-700 transition-all shadow-sm flex items-center gap-1"
                  >
                    + AGREGAR DETALLE
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-[10px]">
                  <thead className="sticky top-0 bg-slate-50 border-b border-[#B0BCCB] shadow-sm z-10">
                    <tr className="text-slate-500 font-bold uppercase tracking-tighter">
                      <th className="p-2 text-left w-20">Código</th>
                      <th className="p-2 text-left">Descripción</th>
                      <th className="p-2 text-center w-16">Cant.</th>
                      <th className="p-2 text-center w-12">U.M.</th>
                      <th className="p-2 text-right w-24 bg-blue-50/30">Valor Compra</th>
                      {formData.afectoIgv && <th className="p-2 text-right w-20 bg-slate-50">IGV</th>}
                      <th className="p-2 text-right w-24 bg-blue-50/50">Precio Compra</th>
                      <th className="p-2 text-center w-24">Lote</th>
                      <th className="p-2 text-center w-24">F. Ingreso</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                        <td className="p-2 font-mono text-slate-500">{item.code}</td>
                        <td className="p-2 font-bold text-slate-800 uppercase">{item.name}</td>
                        <td className="p-1">
                          <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-full h-7 text-center border-transparent focus:border-blue-400 focus:bg-white bg-transparent outline-none font-black text-slate-700" />
                        </td>
                        <td className="p-2 text-center text-slate-500 font-bold">{item.unitSymbol}</td>
                        <td className="p-1 bg-blue-50/10">
                          <input 
                            type="number" 
                            step="0.0001" 
                            value={item.valorCompra} 
                            onChange={e => updateItem(idx, 'valorCompra', e.target.value)} 
                            className={`w-full h-7 text-right border-transparent focus:border-blue-400 focus:bg-white outline-none font-bold ${formData.preciosIncluyenIgv ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'bg-transparent'}`} 
                            readOnly={formData.preciosIncluyenIgv}
                          />
                        </td>
                        {formData.afectoIgv && (
                          <td className="p-2 text-right font-bold text-slate-400">
                            {formatNumber(Number(item.igv || 0) * Number(item.quantity || 0))}
                          </td>
                        )}
                        <td className="p-1 bg-blue-50/20">
                          <input 
                            type="number" 
                            step="0.0001" 
                            value={item.price} 
                            onChange={e => updateItem(idx, 'price', e.target.value)} 
                            className={`w-full h-7 text-right border-transparent focus:border-blue-400 focus:bg-white outline-none font-black text-blue-700 ${!formData.preciosIncluyenIgv ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'bg-transparent'}`} 
                            readOnly={!formData.preciosIncluyenIgv}
                          />
                        </td>
                        <td className="p-1">
                          <input placeholder="LOTE" value={item.lotNumber} onChange={e => updateItem(idx, 'lotNumber', e.target.value.toUpperCase())} className="w-full h-7 text-center border-slate-200 focus:border-blue-400 focus:bg-white bg-transparent outline-none font-bold text-[9px]" />
                        </td>
                        <td className="p-1">
                          <input type="date" value={item.entranceDate} onChange={e => updateItem(idx, 'entranceDate', e.target.value)} className="w-full h-7 text-center border-transparent focus:border-blue-400 focus:bg-white bg-transparent outline-none text-[9px]" />
                        </td>
                        <td className="p-2 text-center">
                          <button type="button" onClick={() => { const itms = [...formData.items]; itms.splice(idx,1); setFormData({...formData, items: itms}); }} className="text-slate-300 hover:text-red-500 transition-colors">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center bg-[#F0F4F8] p-3 border border-[#B0BCCB] rounded shadow-sm">
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="h-10 px-8 bg-blue-600 text-white font-black rounded flex items-center gap-2 hover:bg-blue-700 shadow-lg transition-all transform active:scale-95">
                  <Save className="w-5 h-5" /> {loading ? 'PROCESANDO...' : 'GUARDAR REGISTRO'}
                </button>
                <button type="button" onClick={onClose} className="h-10 px-6 bg-white border border-[#B0BCCB] text-slate-600 font-bold rounded flex items-center gap-2 hover:bg-slate-50 transition-all">
                  <X className="w-5 h-5" /> CANCELAR
                </button>
              </div>

              <div className="flex gap-6 items-center">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Base Imponible</span>
                  <span className="text-sm font-black text-slate-700">S/ {formatNumber(subtotalGeneral)}</span>
                </div>
                {formData.afectoIgv && (
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase">IGV (18%)</span>
                    <span className="text-sm font-black text-slate-500">S/ {formatNumber(totalIgv)}</span>
                  </div>
                )}
                <div className="bg-blue-900 text-white px-6 py-2 rounded shadow-inner flex flex-col items-end">
                  <span className="text-[9px] font-black opacity-70 uppercase">Total a Pagar</span>
                  <span className="text-2xl font-black">S/ {formatNumber(totalGeneral)}</span>
                </div>
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
      </div>
    </AnimatePresence>
  );
};