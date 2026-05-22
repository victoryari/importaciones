import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, FileInput, Plus, Trash2, AlertCircle,
  MapPin, User, Calendar, DollarSign, FileText,
  Package, Search, RefreshCw, HelpCircle, Hash, PlusCircle
} from 'lucide-react';
import axios from 'axios';
import {
  formatNumber, formatCurrency,
  validateEntryNoteHeader, validateEntryNoteItem,
  calculateEntryNoteTotal, calculateItemTotal, calculateTotalWeight,
  EntryNoteItemData
} from '../../../lib/utils';
import { ProductSearchModal } from './ProductSearchModal';

interface EntryNoteFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingNote: any;
  token?: string;
  onSuccess: () => void;
}

interface ProductUnitOption {
  id: number;
  name: string;
  symbol: string;
  level: 'package' | 'subPackage' | 'unit';
  label: string;
}

export const EntryNoteForm: React.FC<EntryNoteFormProps> = ({
  isOpen, onClose, editingNote, token, onSuccess
}) => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [reasons, setReasons] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierRef = useRef<HTMLDivElement>(null);

  const [header, setHeader] = useState({
    warehouseId: '',
    zoneId: '',
    currency: 'PEN',
    exchangeRate: '1.0000',
    supplierId: '',
    supplierName: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    reasonCode: '',
    guideRemission: '',
    status: 'DRAFT',
    documentType: '',
    series: '',
    number: '',
  });

  const [items, setItems] = useState<EntryNoteItemData[]>([]);

  const getProductUnitOptions = useCallback((product: any): ProductUnitOption[] => {
    const options: ProductUnitOption[] = [];
    const baseUnit = product.unit;
    const pkg = product.package;
    const subPkg = product.subPackage;
    const qtyPerPkg = product.quantityPerPackage || 1;
    const qtyPerSub = product.quantityPerSubPackage || 1;

    if (baseUnit) {
      options.push({ id: baseUnit.id, name: baseUnit.name, symbol: baseUnit.symbol, level: 'unit', label: `${baseUnit.symbol} - Unidad base` });
    }
    if (subPkg && baseUnit) {
      options.push({ id: subPkg.id, name: subPkg.name, symbol: subPkg.symbol, level: 'subPackage', label: `${subPkg.symbol} - 1 ${subPkg.name} = ${qtyPerSub} ${baseUnit.symbol}` });
    }
    if (pkg && baseUnit) {
      const totalUnits = qtyPerPkg * qtyPerSub;
      options.push({ id: pkg.id, name: pkg.name, symbol: pkg.symbol, level: 'package', label: `${pkg.symbol} - 1 ${pkg.name} = ${totalUnits} ${baseUnit.symbol}` });
    }
    return options.reverse();
  }, []);

  useEffect(() => {
    if (isOpen && token) loadDependencies();
  }, [isOpen, token]);

  useEffect(() => {
    if (editingNote) {
      setHeader({
        warehouseId: editingNote.warehouseId || '',
        zoneId: editingNote.zoneId || '',
        currency: editingNote.currency || 'PEN',
        exchangeRate: String(editingNote.exchangeRate || '1.0000'),
        supplierId: editingNote.supplierId || '',
        supplierName: editingNote.supplier?.name || '',
        date: editingNote.date ? new Date(editingNote.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: editingNote.description || '',
        reasonCode: editingNote.reasonCode || '',
        guideRemission: editingNote.guideRemission || '',
        status: editingNote.status || 'DRAFT',
        documentType: editingNote.documentType || '',
        series: editingNote.series || '',
        number: editingNote.number || '',
      });
      setSupplierSearch(editingNote.supplier?.name || '');
      setItems((editingNote.items || []).map((item: any) => ({
        id: item.id, productId: item.productId, productName: item.product?.name, productCode: item.product?.code,
        productData: item.product, guideRemission: item.guideRemission || '', documentType: item.documentType || '',
        documentNumber: item.documentNumber || '', quantity: item.quantity, unitId: item.unitId, unitSymbol: item.unit?.symbol,
        unitCost: Number(item.unitCost), total: Number(item.total), orderNumber: item.orderNumber || '',
        lotNumber: item.lotNumber || '', entryDate: item.entryDate ? new Date(item.entryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        weight: item.weight ? Number(item.weight) : null, totalWeight: item.totalWeight ? Number(item.totalWeight) : null,
      })));
    } else {
      setHeader({ warehouseId: '', zoneId: '', currency: 'PEN', exchangeRate: '1.0000', supplierId: '', supplierName: '', date: new Date().toISOString().split('T')[0], description: '', reasonCode: '', guideRemission: '', status: 'DRAFT', documentType: '', series: '', number: '' });
      setSupplierSearch('');
      setItems([]);
    }
    setValidationErrors([]);
  }, [editingNote]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) setShowSupplierDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDependencies = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [whRes, supRes, reasonsRes, dtRes, rateRes, currRes] = await Promise.all([
        axios.get('/api/warehouses', config).catch(() => ({ data: [] })),
        axios.get('/api/suppliers', config).catch(() => ({ data: [] })),
        axios.get('/api/entry-notes/reasons', config).catch(() => ({ data: [] })),
        axios.get('/api/sunat/TABLA_10', config).catch(() => ({ data: [] })),
        axios.get('/api/exchange-rates/today').catch(() => ({ data: { rate: 1.0 } })),
        axios.get('/api/sunat/TABLA_04', config).catch(() => ({ data: [] })),
      ]);
      setWarehouses(Array.isArray(whRes.data) ? whRes.data : []);
      setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
      setReasons(Array.isArray(reasonsRes.data) ? reasonsRes.data : []);
      setDocumentTypes(Array.isArray(dtRes.data) ? dtRes.data : []);
      setCurrencies(Array.isArray(currRes.data) ? currRes.data : [{ code: 'PEN', name: 'Soles' }, { code: 'USD', name: 'Dólares Americanos' }]);
      if (rateRes.data?.rate) setHeader(prev => ({ ...prev, exchangeRate: String(Number(rateRes.data.rate).toFixed(4)) }));
    } catch (error) { console.error('Error loading dependencies:', error); }
  };

  const searchSuppliers = async (query: string) => {
    setSupplierSearch(query);
    if (query.length < 2) { setSuppliers([]); setShowSupplierDropdown(false); return; }
    try {
      const res = await axios.get(`/api/suppliers?q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` } });
      setSuppliers(Array.isArray(res.data) ? res.data : []);
      setShowSupplierDropdown(true);
    } catch (error) { console.error('Error searching suppliers:', error); }
  };

  const selectSupplier = (supplier: any) => {
    setHeader(prev => ({ ...prev, supplierId: String(supplier.id), supplierName: supplier.name }));
    setSupplierSearch(`${supplier.name} (${supplier.docNumber})`);
    setShowSupplierDropdown(false);
  };

  const handleAddProduct = (product: any) => {
    const existingItem = items.find(i => i.productId === product.id);
    if (existingItem) { alert('Este producto ya fue agregado al detalle.'); return; }
    const unitOptions = getProductUnitOptions(product);
    const defaultUnit = unitOptions.find(u => u.level === 'package') || unitOptions.find(u => u.level === 'subPackage') || unitOptions.find(u => u.level === 'unit') || unitOptions[0];
    const weight = product.weight ? Number(product.weight) : null;
    const newItem: EntryNoteItemData & { productData?: any } = {
      productId: product.id, productName: product.name, productCode: product.code, productData: product,
      guideRemission: '', documentType: '', documentNumber: '', quantity: 1,
      unitId: defaultUnit?.id || product.unitId || 0, unitSymbol: defaultUnit?.symbol || product.package?.symbol || product.subPackage?.symbol || product.unit?.symbol || 'un.',
      unitCost: Number(product.costPrice) || 0, total: Number(product.costPrice) || 0,
      orderNumber: '', lotNumber: '', entryDate: new Date().toISOString().split('T')[0],
      weight, totalWeight: weight ? 1 * weight : null,
    };
    setItems([...items, newItem]);
    setShowProductSearch(false);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    const item = { ...updated[index] };
    (item as any)[field] = value;
    if (field === 'quantity' || field === 'unitCost') {
      const qty = parseInt(String(item.quantity)) || 0;
      const cost = parseFloat(String(item.unitCost)) || 0;
      item.total = calculateItemTotal(qty, cost);
    }
    if (field === 'quantity' || field === 'weight') {
      const qty = parseInt(String(item.quantity)) || 0;
      const w = item.weight ? Number(item.weight) : null;
      item.totalWeight = calculateTotalWeight(qty, w);
    }
    if (field === 'unitId') {
      const product = item.productData;
      if (product) {
        const unitOptions = getProductUnitOptions(product);
        const selected = unitOptions.find(u => u.id === parseInt(value));
        if (selected) item.unitSymbol = selected.symbol;
      }
    }
    updated[index] = item;
    setItems(updated);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const totalAmount = calculateEntryNoteTotal(items);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const headerErrors = validateEntryNoteHeader(header);
    const itemErrors: string[] = [];
    items.forEach((item, idx) => {
      const errs = validateEntryNoteItem(item);
      errs.forEach(err => itemErrors.push(`Item ${idx + 1}: ${err}`));
    });
    if (items.length === 0) itemErrors.push('Debe agregar al menos un producto al detalle');
    const allErrors = [...headerErrors, ...itemErrors];
    if (allErrors.length > 0) { setValidationErrors(allErrors); return; }
    setValidationErrors([]);
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        ...header, zoneId: header.zoneId ? parseInt(header.zoneId) : null,
        items: items.map(item => ({
          productId: item.productId, guideRemission: item.guideRemission || null, documentType: item.documentType || null,
          documentNumber: item.documentNumber || null, quantity: parseInt(String(item.quantity)), unitId: parseInt(String(item.unitId)),
          unitCost: parseFloat(String(item.unitCost)), orderNumber: item.orderNumber || null, lotNumber: item.lotNumber || null,
          entryDate: item.entryDate || new Date().toISOString().split('T')[0], weight: item.weight,
        })),
      };
      if (editingNote?.id) await axios.put(`/api/entry-notes/${editingNote.id}`, payload, config);
      else await axios.post('/api/entry-notes', payload, config);
      onSuccess();
    } catch (error: any) { alert(error.response?.data?.error || 'Error al guardar la nota de ingreso'); }
    finally { setLoading(false); }
  };

  const handleWarehouseZoneChange = (value: string) => {
    if (!value) { setHeader(prev => ({ ...prev, warehouseId: '', zoneId: '' })); return; }
    if (value.startsWith('z_')) {
      const parts = value.split('_');
      setHeader(prev => ({ ...prev, warehouseId: parts[1], zoneId: parts[2] }));
    } else {
      setHeader(prev => ({ ...prev, warehouseId: value, zoneId: '' }));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="w-full z-10 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full bg-white rounded-xl shadow-md flex flex-col border border-slate-300"
            >
              {/* BARRA DE TITULO ESTILO ERP */}
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <FileInput className="w-4 h-4 text-blue-800" />
                  <h2 className="text-sm font-bold text-slate-700 tracking-tight">
                    {editingNote ? `Nota de Ingreso N° ${editingNote.id}` : 'Registro de Nota de Ingreso'}
                  </h2>
                </div>
                <div className="flex items-center gap-8">
                  {editingNote && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500">Estado:</span>
                      <span className="h-7 px-2 bg-emerald-100 border border-emerald-300 text-emerald-700 text-[10px] font-black rounded flex items-center uppercase">{editingNote.status}</span>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <button onClick={onClose} className="hover:bg-red-500 hover:text-white p-1 rounded transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="w-full flex flex-col bg-[#F0F4F8] rounded-b-xl">
                <div className="p-4 space-y-4">
                  {validationErrors.length > 0 && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        {validationErrors.map((err, i) => (<p key={i} className="text-[10px] font-bold text-red-600">{err}</p>))}
                      </div>
                    </div>
                  )}

                  {/* SECCIÓN 1: CABECERA */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-4 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 shrink-0">Almacén</span>
                      <select
                        value={header.zoneId ? `z_${header.warehouseId}_${header.zoneId}` : header.warehouseId}
                        onChange={e => handleWarehouseZoneChange(e.target.value)}
                        className="h-8 border border-slate-300 rounded px-1 text-xs font-bold bg-white flex-1"
                        required
                      >
                        <option value="">--Seleccionar--</option>
                        {warehouses.map((wh: any) => {
                          const hasZones = wh.floors?.some((f: any) => f.zones?.length > 0);
                          return (
                            <React.Fragment key={wh.id}>
                              <option value={wh.id} className="font-bold text-slate-900"> {wh.name}</option>
                              {hasZones && wh.floors?.map((floor: any) =>
                                floor.zones?.map((zone: any) => (
                                  <option key={zone.id} value={`z_${wh.id}_${zone.id}`} className="text-slate-500">
                                    {'    '}└ {floor.name} - {zone.name}
                                  </option>
                                ))
                              )}
                            </React.Fragment>
                          );
                        })}
                      </select>
                    </div>

                    <div className="md:col-span-3 flex items-center gap-2" ref={supplierRef}>
                      <span className="text-[11px] font-bold text-slate-600 shrink-0">Proveedor</span>
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text" value={supplierSearch} onChange={e => searchSuppliers(e.target.value)}
                          onFocus={() => supplierSearch.length >= 2 && setShowSupplierDropdown(true)}
                          className="h-8 border border-slate-300 rounded pl-7 pr-2 text-xs font-bold w-full bg-white"
                          placeholder="Buscar por RUC, DNI o razón social..."
                        />
                        {showSupplierDropdown && suppliers.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-40 overflow-y-auto">
                            {suppliers.map((s: any) => (
                              <button key={s.id} type="button" onClick={() => selectSupplier(s)} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-b-0">
                                <span className="font-bold text-slate-700">{s.name}</span>
                                <span className="ml-2 text-[10px] text-slate-400">{s.docType}: {s.docNumber}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2 flex items-center gap-2 justify-center">
                      <span className="text-[11px] font-bold text-slate-600">Fecha</span>
                      <input type="date" value={header.date} onChange={e => setHeader({...header, date: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold" required />
                    </div>

                    <div className="md:col-span-3 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Tipo Cambio</span>
                      <div className="flex items-center gap-1">
                        <input type="number" step="0.0001" value={header.exchangeRate} onChange={e => setHeader({...header, exchangeRate: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold w-24 text-right bg-yellow-50" />
                        <button type="button" onClick={loadDependencies} className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded transition-colors" title="Refrescar TC">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 2: DATOS DE LA NOTA */}
                  <fieldset className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <legend className="text-[10px] font-bold text-blue-700 px-2 uppercase tracking-tighter">Datos de la Nota</legend>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2">
                      <div className="md:col-span-3 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 shrink-0">Motivo</span>
                        <select value={header.reasonCode} onChange={e => setHeader({...header, reasonCode: e.target.value})} className="h-8 border border-slate-300 rounded px-1 text-xs font-bold bg-blue-50 flex-1" required>
                          <option value="">--Seleccionar--</option>
                          {reasons.map(r => <option key={r.code} value={r.code}>{r.code} - {r.name}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-3 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 shrink-0">Guía Remisión</span>
                        <input type="text" value={header.guideRemission} onChange={e => setHeader({...header, guideRemission: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold bg-slate-50 flex-1" placeholder="GR-001-00001234" />
                      </div>
                      <div className="md:col-span-3 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 shrink-0">Glosa</span>
                        <input type="text" value={header.description} onChange={e => setHeader({...header, description: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold bg-slate-50 flex-1" placeholder="Descripción..." />
                      </div>
                      <div className="md:col-span-3 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 shrink-0">Estado</span>
                        <select value={header.status} onChange={e => setHeader({...header, status: e.target.value})} className="h-8 border border-slate-300 rounded px-1 text-xs font-bold bg-white flex-1">
                          <option value="DRAFT">Borrador</option>
                          <option value="PENDING">Pendiente</option>
                          <option value="APPROVED">Aprobado</option>
                          <option value="COMPLETED">Completado</option>
                        </select>
                      </div>

                      <div className="md:col-span-3 flex items-center gap-2 border-t border-slate-100 pt-2 mt-1">
                        <span className="text-[11px] font-bold text-slate-600 shrink-0">Documento</span>
                        <select value={header.documentType} onChange={e => setHeader({...header, documentType: e.target.value})} className="h-8 border border-slate-300 rounded px-1 text-xs font-bold bg-white flex-1">
                          <option value="">--Tipo--</option>
                          {documentTypes.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2 border-t border-slate-100 pt-2 mt-1">
                        <span className="text-[11px] font-bold text-slate-600 shrink-0">Serie</span>
                        <input type="text" value={header.series} onChange={e => setHeader({...header, series: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold text-center bg-slate-50 w-20" placeholder="E001" maxLength={4} />
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2 border-t border-slate-100 pt-2 mt-1">
                        <span className="text-[11px] font-bold text-slate-600 shrink-0">Número</span>
                        <div className="relative flex-1">
                          <input type="text" value={header.number} onChange={e => setHeader({...header, number: e.target.value})} className="h-8 border border-slate-300 rounded pl-7 pr-2 text-xs font-bold w-full bg-slate-50 text-blue-700" placeholder="00001234" maxLength={8} />
                          <Hash className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-blue-500" />
                        </div>
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2 border-t border-slate-100 pt-2 mt-1">
                        <span className="text-[11px] font-bold text-slate-600 shrink-0">Moneda</span>
                        <select value={header.currency} onChange={e => setHeader({...header, currency: e.target.value})} className="h-8 border border-slate-300 rounded px-1 text-xs font-bold bg-white flex-1">
                          {currencies.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </fieldset>

                  {/* SECCIÓN 3: DETALLE */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-800" />
                        <span className="text-sm font-bold text-slate-700">Detalle de Productos</span>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">{items.length}</span>
                      </div>
                    </div>

                    {items.length > 0 ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[10px]">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider w-8">#</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider">Cod.</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider min-w-[180px]">Descripción</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider">Nro. GR</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider">Tipo Doc.</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider">Nro. Doc.</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider text-center w-16">Cant.</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider">U.M.</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider text-right w-24">Costo Unit.</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider text-right w-24">Total</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider">Nro. Pedido</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider">Lote</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider">F. Ingreso</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider text-right w-20">Peso</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider text-right w-24">Peso Total</th>
                                <th className="px-2 py-2 font-black text-slate-400 uppercase tracking-wider text-center w-10"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {items.map((item, idx) => {
                                const unitOptions = item.productData ? getProductUnitOptions(item.productData) : [];
                                return (
                                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-2 py-1.5 text-slate-400 font-black text-center">{idx + 1}</td>
                                    <td className="px-2 py-1.5 text-slate-500 font-black text-[10px]">{item.productCode || '-'}</td>
                                    <td className="px-2 py-1.5 font-bold text-slate-900 max-w-[200px] truncate" title={item.productName}>{item.productName}</td>
                                    <td className="px-2 py-1.5"><input type="text" value={item.guideRemission || ''} onChange={e => updateItem(idx, 'guideRemission', e.target.value)} className="w-full min-w-[100px] h-7 border border-slate-200 rounded px-1.5 text-[10px] font-bold bg-slate-50" /></td>
                                    <td className="px-2 py-1.5">
                                      <select value={item.documentType || ''} onChange={e => updateItem(idx, 'documentType', e.target.value)} className="w-full min-w-[80px] h-7 border border-slate-200 rounded px-1 text-[10px] font-bold bg-white">
                                        <option value="">--</option>
                                        {documentTypes.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                                      </select>
                                    </td>
                                    <td className="px-2 py-1.5"><input type="text" value={item.documentNumber || ''} onChange={e => updateItem(idx, 'documentNumber', e.target.value)} className="w-full min-w-[80px] h-7 border border-slate-200 rounded px-1.5 text-[10px] font-bold bg-slate-50" /></td>
                                    <td className="px-2 py-1.5"><input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-full h-7 border border-blue-200 rounded px-1 text-[10px] font-black text-center bg-blue-50" /></td>
                                    <td className="px-2 py-1.5">
                                      <select value={item.unitId} onChange={e => updateItem(idx, 'unitId', parseInt(e.target.value))} className="w-full min-w-[120px] h-7 border border-slate-200 rounded px-1 text-[10px] font-bold bg-white">
                                        {unitOptions.map(u => (<option key={u.id} value={u.id}>{u.label}</option>))}
                                      </select>
                                    </td>
                                    <td className="px-2 py-1.5"><input type="number" step="0.0001" min="0" value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)} className="w-full h-7 border border-emerald-200 rounded px-1 text-[10px] font-black text-right bg-emerald-50" /></td>
                                    <td className="px-2 py-1.5 text-right font-black text-blue-900 text-[11px]">{formatCurrency(item.total || 0, header.currency === 'USD' ? '$' : 'S/')}</td>
                                    <td className="px-2 py-1.5"><input type="text" value={item.orderNumber || ''} onChange={e => updateItem(idx, 'orderNumber', e.target.value)} className="w-full min-w-[80px] h-7 border border-slate-200 rounded px-1.5 text-[10px] font-bold bg-slate-50" /></td>
                                    <td className="px-2 py-1.5"><input type="text" value={item.lotNumber || ''} onChange={e => updateItem(idx, 'lotNumber', e.target.value)} className="w-full min-w-[80px] h-7 border border-slate-200 rounded px-1.5 text-[10px] font-bold bg-slate-50" /></td>
                                    <td className="px-2 py-1.5"><input type="date" value={item.entryDate || ''} onChange={e => updateItem(idx, 'entryDate', e.target.value)} className="w-full min-w-[110px] h-7 border border-slate-200 rounded px-1 text-[10px] font-bold bg-white" /></td>
                                    <td className="px-2 py-1.5 text-right text-slate-500 font-bold text-[10px]">{item.weight ? `${Number(item.weight).toFixed(4)}` : '-'}</td>
                                    <td className="px-2 py-1.5 text-right text-slate-700 font-black text-[10px]">{item.totalWeight ? `${Number(item.totalWeight).toFixed(4)}` : '-'}</td>
                                    <td className="px-2 py-1.5 text-center">
                                      <button type="button" onClick={() => removeItem(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {items.length === 0 && (
                                <tr><td colSpan={16} className="h-64 text-center text-slate-300 italic">Pulse "Agregar Detalle" para agregar productos</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="bg-slate-100 p-2 border-t border-slate-300 flex items-center justify-between shrink-0">
                          <div className="flex gap-1">
                            <button type="button" onClick={() => setShowProductSearch(true)} className="h-8 px-4 bg-emerald-600 border border-emerald-700 rounded-lg text-xs font-bold text-white hover:bg-emerald-700 flex items-center gap-2 shadow-sm transition-all shadow-emerald-200">
                              <PlusCircle className="w-4 h-4 text-emerald-100" /> Agregar Detalle
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-600">Total Ítems: {items.length}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                        <Package className="w-12 h-12 text-slate-200 mb-3" />
                        <p className="italic text-sm">Pulse "Agregar Detalle" para agregar productos</p>
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN 4: TOTALES */}
                  <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-end gap-6">
                    <div className="flex gap-2">
                      <button type="button" onClick={onClose} className="h-10 px-4 bg-slate-50 border border-slate-300 rounded text-xs font-bold hover:bg-slate-100 flex items-center gap-2">
                        <X className="w-4 h-4 text-red-500" /> Cancelar
                      </button>
                      <button type="submit" disabled={loading} className="h-10 px-8 bg-blue-800 text-white rounded shadow-lg shadow-blue-100 hover:bg-blue-900 flex items-center gap-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {loading ? 'Procesando...' : (editingNote ? 'Guardar Cambios' : 'Registrar Nota')}
                      </button>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right bg-[#D9E9FF] px-4 py-1 rounded border border-[#004A99]">
                        <p className="text-[10px] font-black text-[#004A99] mb-0">TOTAL NOTA DE INGRESO:</p>
                        <p className="text-xl font-black text-[#004A99] tracking-tight">{header.currency === 'USD' ? '$' : 'S/'} {formatNumber(totalAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>

          <ProductSearchModal isOpen={showProductSearch} onClose={() => setShowProductSearch(false)} onSelect={handleAddProduct} token={token} allowZeroStock={true} />
        </>
      )}
    </AnimatePresence>
  );
};
