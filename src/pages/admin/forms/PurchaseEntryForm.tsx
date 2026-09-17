import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, X, Search, Save, Package, Truck, 
  Landmark, FileText, Calendar, DollarSign, UserPlus, 
  AlertCircle, RefreshCw, Trash2, Plus, Gift
} from 'lucide-react';
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
  productsList?: any[];
}

const DEFAULT_PURCHASE_DOC_TYPES = [
  { code: '01', name: 'Factura' },
  { code: '03', name: 'Boleta de Venta' },
  { code: '50', name: 'Declaración Única de Aduanas - Importación definitiva' },
  { code: '02', name: 'Recibo por Honorarios' },
  { code: '00', name: 'Otros' }
];

export const SUNAT_PURCHASE_TYPES = [
  { code: 'MERCADERIA', name: '01 | MERCADERÍAS (COMPRA NACIONAL)' },
  { code: 'IMPORTACION', name: '02 | IMPORTACIÓN / DUA (MERCADERÍA EXTERIOR)' },
  { code: 'MATERIA_PRIMA', name: '03 | MATERIAS PRIMAS E INSUMOS' },
  { code: 'ACTIVO', name: '04 | ACTIVOS FIJOS (MAQUINARIA Y EQUIPO)' },
  { code: 'SUMINISTROS', name: '05 | SUMINISTROS, ENVASES Y EMBALAJES' },
  { code: 'GASTO', name: '06 | GASTOS Y SERVICIOS / HONORARIOS' },
  { code: 'OTROS', name: '99 | OTROS REGISTROS DE COMPRA' }
];

export const SUNAT_PURCHASE_PAYMENT_CONDITIONS = [
  { code: 'CONTADO', name: 'CONTADO' },
  { code: 'CREDITO', name: 'CRÉDITO' }
];

export const PurchaseEntryForm: React.FC<PurchaseFormProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  token, 
  formData, 
  setFormData,
  productsList
}) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>(productsList || []);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [docTypes, setDocTypes] = useState<any[]>(DEFAULT_PURCHASE_DOC_TYPES);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [prodSearch, setProdSearch] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  
  // Estados para Proveedores
  const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState({ 
    name: '', docType: 'RUC', docNumber: '', address: '', 
    phone: '', email: '', contact: '',
    department: '', province: '', district: '' 
  });
  const [tcWarning, setTcWarning] = useState('');

  const getDueDate = (dateStr: string, days: number) => {
    if (!dateStr || !days) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        d.setDate(d.getDate() + Number(days));
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy}`;
      }
    } catch {
      return '';
    }
    return '';
  };

  useEffect(() => {
    if (productsList && Array.isArray(productsList) && productsList.length > 0) {
      setProducts(productsList);
    }
  }, [productsList]);

  useEffect(() => {
    if (isOpen) fetchInitialData();
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const pRes = await axios.get('/api/products', config);
      if (Array.isArray(pRes.data)) {
        setProducts(pRes.data);
      }
    } catch (err) {
      console.error('Error refreshing products:', err);
    }
  };

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
      const prods = Array.isArray(pRes.data) && pRes.data.length > 0 ? pRes.data : (productsList || []);
      setProducts(prods);
      const whs = Array.isArray(wRes.data) ? wRes.data.filter((w: any) => w.isActive !== false) : [];
      setWarehouses(whs);
      
      // Comprobantes de compra: Facturas (01), Boletas (03), DUA (50), Recibos (02), Otros (00)
      const rawDocs = Array.isArray(dRes.data) && dRes.data.length > 0 ? dRes.data : DEFAULT_PURCHASE_DOC_TYPES;
      const filteredDocs = rawDocs.filter((d: any) => 
        ['01', '03', '50', '02', '00', '07', '08', '91', '97', '98'].includes(d.code)
      );
      setDocTypes(filteredDocs.length > 0 ? filteredDocs : DEFAULT_PURCHASE_DOC_TYPES);
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
        paymentCondition: prev.paymentCondition || 'CONTADO',
        creditDays: prev.creditDays ?? 0,
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
              unitSymbol: it.unitSymbol || it.product?.package?.symbol || it.product?.subPackage?.symbol || it.product?.unit?.symbol || 'UND',
              quantity: it.quantity,
              price: formData.afectoIgv ? (formData.preciosIncluyenIgv ? price : valor + igv) : valor,
              valorCompra: valor,
              referenceCost: valor,
              referencePrice: formData.afectoIgv ? (formData.preciosIncluyenIgv ? price : valor + igv) : valor,
              isFree: Boolean(it.isFree),
              freeType: it.freeType || '14',
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
        productId: p.id, 
        name: p.name, 
        code: p.code, 
        unitSymbol: p.package?.symbol || p.subPackage?.symbol || p.unit?.symbol || 'UND',
        quantity: 1, 
        price: precio,
        valorCompra: valor,
        referenceCost: valor,
        referencePrice: precio,
        isFree: false,
        freeType: '14',
        igv: igv,
        lotNumber: '',
        expiryDate: '',
        entranceDate: new Date().toISOString().split('T')[0]
      }]
    }));
  };

  const toggleFreeItem = (index: number) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    if (!item.isFree) {
      item.referenceCost = Number(item.valorCompra || item.referenceCost || 0);
      item.referencePrice = Number(item.price || item.referencePrice || 0);
      item.isFree = true;
      item.freeType = '14'; // 14: Muestras comerciales/regalos, 12: Bonificación
      item.valorCompra = 0;
      item.price = 0;
      item.igv = 0;
    } else {
      item.isFree = false;
      item.freeType = undefined;
      const restoredCost = Number(item.referenceCost || 0);
      const restoredPrice = Number(item.referencePrice || 0);
      item.valorCompra = restoredCost;
      item.price = restoredPrice;
      if (formData.afectoIgv) {
        item.igv = formData.preciosIncluyenIgv ? (restoredPrice - restoredCost) : (restoredCost * 0.18);
      } else {
        item.igv = 0;
      }
    }
    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'price') {
      const price = parseFloat(value) || 0;
      if (item.isFree) {
        item.referencePrice = price;
        item.price = 0;
        item.valorCompra = 0;
        item.igv = 0;
      } else if (formData.afectoIgv) {
        if (formData.preciosIncluyenIgv) {
          item.valorCompra = price / 1.18;
          item.igv = price - item.valorCompra;
        } else {
          item.valorCompra = price;
          item.igv = price * 0.18;
        }
      } else {
        item.valorCompra = price;
        item.igv = 0;
      }
    } else if (field === 'valorCompra') {
      const valor = parseFloat(value) || 0;
      if (item.isFree) {
        item.referenceCost = valor;
        item.valorCompra = 0;
        item.price = 0;
        item.igv = 0;
      } else if (formData.afectoIgv) {
        item.igv = valor * 0.18;
        item.price = valor + item.igv;
      } else {
        item.igv = 0;
        item.price = valor;
      }
    }
    
    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) return alert('Seleccione un Proveedor');
    if (!formData.warehouseId) return alert('Seleccione un Almacén de Ingreso');
    if (!formData.docSeries || !formData.docNumber) return alert('Ingrese Serie y Número del comprobante');
    if (!formData.items || formData.items.length === 0) return alert('Agregue al menos un producto a la compra');

    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const supp = suppliers.find(s => s.id.toString() === (formData.supplierId || '').toString());
      const payload = {
        ...formData,
        supplierName: formData.supplierName || (supp ? supp.name : '')
      };
      await axios.post('/api/purchases', payload, config);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Error al registrar la compra');
    } finally {
      setLoading(false);
    }
  };

  // Cálculos de totales
  const subtotalGeneral = (formData.items || []).reduce((acc: number, item: any) => {
    if (item.isFree) return acc;
    return acc + (Number(item.valorCompra || 0) * Number(item.quantity || 0));
  }, 0);

  const totalIgv = (formData.items || []).reduce((acc: number, item: any) => {
    if (item.isFree) return acc;
    return acc + (Number(item.igv || 0) * Number(item.quantity || 0));
  }, 0);

  const totalGeneral = (formData.items || []).reduce((acc: number, item: any) => {
    if (item.isFree) return acc;
    return acc + (Number(item.price || 0) * Number(item.quantity || 0));
  }, 0);

  const totalGratuito = (formData.items || []).reduce((acc: number, item: any) => {
    if (!item.isFree) return acc;
    return acc + (Number(item.referencePrice || item.referenceCost || 0) * Number(item.quantity || 0));
  }, 0);

  const selectedSupplier = suppliers.find(s => s.id.toString() === (formData.supplierId || '').toString());

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="purchase-entry"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-2 overflow-hidden"
        >
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
                  <ShoppingCart className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-tight">
                    Registro de Compra (Factura / Boleta / DUA)
                  </h2>
                  <p className="text-[9px] text-blue-200 uppercase font-medium">Módulo de Compras e Ingreso a Almacén</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form 
              onSubmit={handleSubmit} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
              className="flex-1 overflow-hidden flex flex-col bg-slate-50/70 p-2.5 gap-2"
            >
              {/* Sección 1: Datos del Comprobante y Proveedor */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-2 text-xs">
                
                {/* Fila 1: Proveedor, Tipo Doc, Serie, Número */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <div className="md:col-span-6 space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Proveedor</label>
                      <button 
                        type="button" 
                        onClick={() => setIsSupplierFormOpen(true)}
                        className="text-[10px] text-blue-700 hover:text-blue-800 font-bold uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" /> + Registro Rápido
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <select 
                        value={formData.supplierId || ''} 
                        onChange={e => {
                          const supp = suppliers.find(s => s.id.toString() === e.target.value);
                          setFormData({
                            ...formData, 
                            supplierId: e.target.value,
                            supplierName: supp ? supp.name : ''
                          });
                        }} 
                        className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 focus:border-blue-500 outline-none uppercase"
                      >
                        <option value="">-- SELECCIONE PROVEEDOR --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.docNumber} | {s.name.toUpperCase()}</option>)}
                      </select>
                      <button 
                        type="button" 
                        onClick={() => setIsSupplierSearchOpen(true)} 
                        className="w-8 h-8 bg-blue-700 hover:bg-blue-800 text-white rounded flex items-center justify-center shrink-0 transition-colors shadow-2xs cursor-pointer"
                        title="Buscar Proveedor"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {selectedSupplier && (
                      <div className="text-[9px] text-slate-500 font-bold truncate bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        📍 {selectedSupplier.address || 'Sin dirección fiscal registrada'}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Tipo Documento</label>
                    <select 
                      value={formData.docType || '01'} 
                      onChange={e => setFormData({...formData, docType: e.target.value})} 
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 focus:border-blue-500 outline-none"
                    >
                      {docTypes.map(d => <option key={d.code} value={d.code}>{d.code} | {d.name}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Serie</label>
                    <input 
                      placeholder="F001 / E001" 
                      value={formData.docSeries || ''} 
                      onChange={e => setFormData({...formData, docSeries: e.target.value.toUpperCase()})} 
                      className="w-full h-8 px-2 border border-slate-300 rounded text-xs font-bold font-mono text-center uppercase focus:border-blue-500 outline-none bg-white" 
                      required
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Número</label>
                    <input 
                      placeholder="00001234" 
                      value={formData.docNumber || ''} 
                      onChange={e => setFormData({...formData, docNumber: e.target.value})} 
                      className="w-full h-8 px-2 border border-slate-300 rounded text-xs font-bold font-mono text-center focus:border-blue-500 outline-none bg-white" 
                      required
                    />
                  </div>
                </div>

                {/* Fila 2: Fecha, Moneda/TC, Almacén, Tipo Compra, Condición de Pago */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 border-t border-slate-100 pt-2">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Fecha Emisión</label>
                    <input 
                      type="date" 
                      value={formData.date || ''} 
                      onChange={e => setFormData({...formData, date: e.target.value})} 
                      className="w-full h-8 px-2 border border-slate-300 rounded text-xs font-medium focus:border-blue-500 outline-none bg-white" 
                      required
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Moneda / T. Cambio</label>
                    <div className="flex gap-1 items-center">
                      <select 
                        value={formData.currency || 'PEN'} 
                        onChange={e => setFormData({...formData, currency: e.target.value})} 
                        className="w-full h-8 px-1.5 border border-slate-300 rounded text-xs font-bold text-blue-900 bg-white focus:border-blue-500 outline-none"
                      >
                        {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                      </select>
                      <input 
                        value={formData.exchangeRate || ''} 
                        onChange={e => setFormData({...formData, exchangeRate: e.target.value})} 
                        className={`w-16 h-8 border rounded px-1.5 text-right font-mono font-bold text-xs ${tcWarning ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-slate-300 bg-white'}`} 
                        title="Tipo de Cambio"
                      />
                      {tcWarning && (
                        <div className="group relative">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 cursor-help shrink-0" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-amber-700 text-white text-[9px] p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                            {tcWarning}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Almacén Destino</label>
                    <select 
                      value={formData.warehouseId || ''} 
                      onChange={e => setFormData({...formData, warehouseId: e.target.value})} 
                      className="w-full h-8 px-2 bg-blue-50/70 border border-blue-200 rounded text-xs font-bold text-blue-950 focus:border-blue-500 outline-none uppercase truncate"
                      required
                    >
                      <option value="">-- SELECCIONE --</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Tipo Compra (SUNAT)</label>
                    <select 
                      value={formData.purchaseType || 'MERCADERIA'} 
                      onChange={e => setFormData({...formData, purchaseType: e.target.value})} 
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 focus:border-blue-500 outline-none truncate"
                    >
                      {SUNAT_PURCHASE_TYPES.map(t => (
                        <option key={t.code} value={t.code}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Condición de Pago</label>
                      {formData.paymentCondition === 'CREDITO' && (formData.creditDays || 0) > 0 && formData.date && (
                        <span className="text-[9px] text-blue-700 font-bold tracking-tight truncate">
                          Vence: {getDueDate(formData.date, formData.creditDays)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 items-center">
                      <select 
                        value={formData.paymentCondition || 'CONTADO'} 
                        onChange={e => {
                          const val = e.target.value;
                          setFormData({
                            ...formData, 
                            paymentCondition: val,
                            creditDays: val === 'CREDITO' ? (formData.creditDays || 30) : 0
                          });
                        }} 
                        className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 focus:border-blue-500 outline-none"
                      >
                        {SUNAT_PURCHASE_PAYMENT_CONDITIONS.map(p => (
                          <option key={p.code} value={p.code}>{p.name}</option>
                        ))}
                      </select>
                      {formData.paymentCondition === 'CREDITO' && (
                        <div className="flex items-center gap-1 shrink-0">
                          <input 
                            type="number"
                            min="1"
                            max="365"
                            placeholder="Días"
                            title="Días de crédito"
                            value={formData.creditDays || ''} 
                            onChange={e => setFormData({...formData, creditDays: parseInt(e.target.value) || 0})} 
                            className="w-14 h-8 px-1 border border-blue-400 bg-blue-50/70 rounded text-xs font-bold font-mono text-center text-blue-950 focus:border-blue-600 outline-none" 
                          />
                          <span className="text-[10px] font-bold text-slate-500">D</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fila 3: Opciones IGV, Referencia de Guía y Glosa */}
                <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-wrap items-center gap-3">
                  {/* Checks IGV */}
                  <div className="flex items-center gap-3 pr-2.5 border-r border-slate-200">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={formData.afectoIgv} 
                        onChange={e => setFormData({...formData, afectoIgv: e.target.checked})} 
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                      />
                      <span className="text-[10px] font-bold text-slate-700 uppercase">Afecto IGV</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={formData.preciosIncluyenIgv} 
                        onChange={e => setFormData({...formData, preciosIncluyenIgv: e.target.checked})} 
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                      />
                      <span className="text-[10px] font-bold text-slate-700 uppercase">Inc. IGV</span>
                    </label>
                  </div>

                  {/* Doc Ref Guía */}
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-700" />
                    <span className="text-[10px] font-bold text-slate-700 uppercase">Doc. Ref. Guía:</span>
                  </div>
                  <input 
                    placeholder="SERIE" 
                    value={formData.guideSeries || ''} 
                    onChange={e => setFormData({...formData, guideSeries: e.target.value.toUpperCase()})} 
                    className="w-16 h-7 border border-slate-300 rounded px-2 text-xs font-mono font-bold text-center uppercase bg-white focus:border-blue-500 outline-none" 
                  />
                  <input 
                    placeholder="NÚMERO" 
                    value={formData.guideNumber || ''} 
                    onChange={e => setFormData({...formData, guideNumber: e.target.value})} 
                    className="w-24 h-7 border border-slate-300 rounded px-2 text-xs font-mono font-bold text-center bg-white focus:border-blue-500 outline-none" 
                  />
                  <button 
                    type="button" 
                    onClick={handleConsultGuide} 
                    className="h-7 px-2.5 bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold uppercase rounded flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Search className="w-3 h-3" /> Consultar
                  </button>

                  {/* Glosa */}
                  <div className="flex-1 min-w-[200px] ml-auto">
                    <input 
                      placeholder="Glosa / Observación del registro de compra..." 
                      value={formData.observation || ''} 
                      onChange={e => setFormData({...formData, observation: e.target.value})} 
                      className="w-full h-7 border border-slate-300 rounded px-2 text-xs bg-white focus:border-blue-500 outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Detalle de Productos */}
              <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden min-h-[220px]">
                <div className="bg-slate-100 px-3 py-1.5 flex justify-between items-center border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-700" />
                    <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">
                      Detalle de Productos ({formData.items?.length || 0})
                    </span>
                  </div>

                  <div className="flex gap-2 items-center">
                    <div className="relative w-64">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        placeholder="Buscar producto por nombre/código..." 
                        value={prodSearch} 
                        onChange={e => setProdSearch(e.target.value)} 
                        onFocus={fetchProducts}
                        className="w-full h-7 pl-8 pr-3 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white" 
                      />
                      {prodSearch && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 shadow-2xl z-50 max-h-56 overflow-auto rounded-lg">
                          {products
                            .filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.code?.toLowerCase().includes(prodSearch.toLowerCase()))
                            .slice(0, 15)
                            .map(p => (
                              <div 
                                key={p.id} 
                                onClick={() => { addItem(p); setProdSearch(''); }} 
                                className="p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 flex justify-between items-center transition-colors"
                              >
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-800 uppercase">{p.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">{p.code}</span>
                                </div>
                                <span className="text-xs font-bold text-blue-700">S/ {formatNumber(p.costPrice || 0)}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <button 
                      type="button" 
                      onClick={() => {
                        fetchProducts();
                        setIsSearchModalOpen(true);
                      }}
                      className="h-7 px-3 bg-[#004A99] hover:bg-blue-800 text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Detalle
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                      <tr className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="p-2 text-left w-24">Código</th>
                        <th className="p-2 text-left">Descripción</th>
                        <th className="p-2 text-center w-20">Gratuito</th>
                        <th className="p-2 text-center w-16">Cant.</th>
                        <th className="p-2 text-center w-14">U.M.</th>
                        <th className="p-2 text-right w-24 bg-blue-50/40">Costo Unitario</th>
                        {formData.afectoIgv && <th className="p-2 text-right w-20">IGV</th>}
                        <th className="p-2 text-right w-24 bg-emerald-50/40">Valor Compra</th>
                        <th className="p-2 text-right w-24 bg-slate-100/50">Precio Compra</th>
                        <th className="p-2 text-center w-24">Lote</th>
                        <th className="p-2 text-center w-28">F. Vencimiento</th>
                        <th className="p-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {formData.items.map((item: any, idx: number) => {
                        const itemQty = Number(item.quantity || 0);
                        const isFree = Boolean(item.isFree);
                        const itemPrice = isFree ? 0 : Number(item.price || item.valorCompra || 0);
                        const itemRowTotal = isFree ? 0 : (itemQty * itemPrice);

                        return (
                          <tr key={idx} className={`hover:bg-blue-50/30 transition-colors ${isFree ? 'bg-amber-50/30' : ''}`}>
                            <td className="p-2 font-mono text-[11px] font-bold text-slate-700">{item.code}</td>
                            <td className="p-2 font-bold text-slate-900 uppercase text-xs">
                              <div className="flex flex-col">
                                <span>{item.name}</span>
                                {isFree && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                      <Gift className="w-2.5 h-2.5" /> GRATUITO / BONIFICACIÓN
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-1 text-center">
                              <button
                                type="button"
                                onClick={() => toggleFreeItem(idx)}
                                title={isFree ? "Cambiar a producto regular" : "Marcar como producto gratuito/muestra/regalo"}
                                className={`h-7 px-2 rounded text-[10px] font-bold inline-flex items-center gap-1 border transition-all cursor-pointer ${
                                  isFree
                                    ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-2xs'
                                    : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                              >
                                <Gift className={`w-3 h-3 ${isFree ? 'text-white' : 'text-slate-400'}`} />
                                {isFree ? 'SÍ' : 'NO'}
                              </button>
                            </td>
                            <td className="p-1">
                              <input 
                                type="number" 
                                min="1"
                                value={item.quantity} 
                                onChange={e => updateItem(idx, 'quantity', e.target.value)} 
                                className="w-full h-7 text-center border border-slate-200 rounded focus:border-blue-500 bg-white outline-none font-bold text-xs text-blue-900" 
                              />
                            </td>
                            <td className="p-2 text-center">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700 uppercase">
                                {item.unitSymbol || 'UND'}
                              </span>
                            </td>
                            <td className="p-1 bg-blue-50/20">
                              {isFree ? (
                                <div className="text-right px-1.5 py-1">
                                  <span className="text-xs font-bold text-slate-400">S/ 0.00</span>
                                  <div className="text-[9px] text-slate-400 font-mono">Ref: {formatNumber(item.referenceCost || item.referencePrice || 0)}</div>
                                </div>
                              ) : (
                                <input 
                                  type="number" 
                                  step="0.0001" 
                                  value={item.valorCompra} 
                                  onChange={e => updateItem(idx, 'valorCompra', e.target.value)} 
                                  className={`w-full h-7 text-right px-1.5 border rounded text-xs font-bold ${formData.preciosIncluyenIgv ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-300 text-slate-800 focus:border-blue-500'} outline-none`} 
                                  readOnly={formData.preciosIncluyenIgv}
                                  title="Costo Unitario base sin IGV"
                                />
                              )}
                            </td>
                            {formData.afectoIgv && (
                              <td className="p-2 text-right font-bold text-slate-500 text-xs">
                                {isFree ? '0.00' : formatNumber(Number(item.igv || 0) * itemQty)}
                              </td>
                            )}
                            <td className="p-1 bg-emerald-50/20">
                              {isFree ? (
                                <div className="text-right px-1.5 py-1">
                                  <span className="text-xs font-bold text-slate-400">S/ 0.00</span>
                                  <div className="text-[9px] text-slate-400 font-mono">Ref: {formatNumber(item.referencePrice || item.referenceCost || 0)}</div>
                                </div>
                              ) : (
                                <input 
                                  type="number" 
                                  step="0.0001" 
                                  value={item.price} 
                                  onChange={e => updateItem(idx, 'price', e.target.value)} 
                                  className={`w-full h-7 text-right px-1.5 border rounded text-xs font-bold ${!formData.preciosIncluyenIgv ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-300 text-emerald-800 focus:border-emerald-500'} outline-none`} 
                                  readOnly={!formData.preciosIncluyenIgv}
                                  title="Valor Compra unitario (Incluye IGV si está afecto)"
                                />
                              )}
                            </td>
                            <td className="p-2 text-right font-bold text-slate-800 font-mono text-xs bg-slate-50/50">
                              {isFree ? (
                                <div className="text-right">
                                  <span className="text-xs font-bold text-amber-700">S/ 0.00</span>
                                  <div className="text-[9px] text-amber-600/70 font-mono">Gratuito</div>
                                </div>
                              ) : (
                                formatNumber(itemRowTotal)
                              )}
                            </td>
                            <td className="p-1">
                              <input 
                                placeholder="LOTE" 
                                value={item.lotNumber || ''} 
                                onChange={e => updateItem(idx, 'lotNumber', e.target.value.toUpperCase())} 
                                className="w-full h-7 text-center border border-slate-200 rounded focus:border-blue-500 bg-white outline-none font-bold font-mono text-[10px]" 
                              />
                            </td>
                            <td className="p-1">
                              <input 
                                type="date" 
                                value={item.expiryDate ? (typeof item.expiryDate === 'string' ? (item.expiryDate.includes('T') ? item.expiryDate.split('T')[0] : item.expiryDate) : new Date(item.expiryDate).toISOString().split('T')[0]) : (item.entranceDate || '')} 
                                onChange={e => {
                                  const val = e.target.value;
                                  const newItems = [...formData.items];
                                  newItems[idx] = { ...newItems[idx], expiryDate: val, entranceDate: val };
                                  setFormData({ ...formData, items: newItems });
                                }} 
                                className="w-full h-7 text-center border border-slate-200 rounded focus:border-blue-500 bg-white outline-none text-[10px]" 
                                title="Fecha de Vencimiento del Lote"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button 
                                type="button" 
                                onClick={() => { 
                                  const itms = [...formData.items]; 
                                  itms.splice(idx, 1); 
                                  setFormData({...formData, items: itms}); 
                                }} 
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Remover Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {(!formData.items || formData.items.length === 0) && (
                        <tr>
                          <td colSpan={formData.afectoIgv ? 12 : 11} className="p-8 text-center text-slate-400 italic">
                            No hay productos agregados. Utilice el buscador superior o el botón "+ Agregar Detalle".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sección 3: Totales y Acciones */}
              <div className="px-4 py-2 bg-slate-100/90 border border-slate-200 rounded-lg flex items-center justify-between shrink-0 shadow-2xs">
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
                    {loading ? 'Procesando...' : 'Guardar Registro'}
                  </button>
                </div>

                <div className="flex gap-4 items-center">
                  {totalGratuito > 0 && (
                    <div className="flex flex-col items-end px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="text-[9px] font-bold text-amber-800 uppercase flex items-center gap-1">
                        <Gift className="w-2.5 h-2.5" /> Op. Gratuitas (Ref)
                      </span>
                      <span className="text-xs font-bold text-amber-900 font-mono">S/ {formatNumber(totalGratuito)}</span>
                    </div>
                  )}

                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Base Imponible</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">S/ {formatNumber(subtotalGeneral)}</span>
                  </div>

                  {formData.afectoIgv && (
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">IGV (18%)</span>
                      <span className="text-xs font-bold text-slate-600 font-mono">S/ {formatNumber(totalIgv)}</span>
                    </div>
                  )}

                  <div className="bg-[#004A99] text-white px-4 py-1.5 rounded-lg flex flex-col items-end shadow-sm">
                    <span className="text-[9px] font-bold text-blue-200 uppercase">Total a Pagar</span>
                    <span className="text-base font-black font-mono">S/ {formatNumber(totalGeneral)}</span>
                  </div>
                </div>
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
              onSelect={(s) => { 
                setFormData({
                  ...formData, 
                  supplierId: s.id.toString(),
                  supplierName: s.name
                }); 
                setIsSupplierSearchOpen(false); 
              }}
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