import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, FileOutput, Trash2, AlertCircle,
  Package, Search, RefreshCw, Hash, PlusCircle
} from 'lucide-react';
import axios from 'axios';
import {
  formatNumber, formatCurrency,
  calculateItemTotal
} from '../../../lib/utils';
import { ProductSearchModal } from './ProductSearchModal';

interface ExitNoteFormProps {
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

const FALLBACK_EXIT_REASONS = [
  { code: '01', name: 'VENTA' },
  { code: '04', name: 'CONSIGNACIÓN ENTREGADA' },
  { code: '06', name: 'DEVOLUCIÓN ENTREGADA' },
  { code: '07', name: 'BONIFICACIÓN / PROMOCIÓN' },
  { code: '08', name: 'PREMIO' },
  { code: '09', name: 'DONACIÓN' },
  { code: '10', name: 'SALIDA A PRODUCCIÓN' },
  { code: '11', name: 'TRANSFERENCIA ENTRE ALMACENES' },
  { code: '12', name: 'RETIRO' },
  { code: '13', name: 'MERMAS' },
  { code: '14', name: 'DESMEDROS' },
  { code: '15', name: 'DESTRUCCIÓN' },
  { code: '17', name: 'EXPORTACIÓN' },
  { code: '23', name: 'SALIDA POR IDENTIFICACIÓN ERRÓNEA' },
  { code: '25', name: 'SALIDA POR DEVOLUCIÓN AL PROVEEDOR' },
  { code: '27', name: 'SALIDA POR SERVICIO DE PRODUCCIÓN' },
  { code: '28', name: 'AJUSTE POR DIFERENCIA DE INVENTARIO' },
  { code: '30', name: 'SALIDA DE BIENES EN PRÉSTAMO' },
  { code: '32', name: 'SALIDA DE BIENES EN CUSTODIA' },
  { code: '99', name: 'OTROS' },
];

export const ExitNoteForm: React.FC<ExitNoteFormProps> = ({
  isOpen, onClose, editingNote, token, onSuccess
}) => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [reasons, setReasons] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  const [header, setHeader] = useState({
    warehouseId: '',
    zoneId: '',
    currency: 'PEN',
    exchangeRate: '1.0000',
    customerId: '',
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    reasonCode: '',
    guideRemission: '',
    status: 'ACTIVE',
    documentType: '',
    series: '',
    number: '',
  });

  const [items, setItems] = useState<any[]>([]);

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
        warehouseId: editingNote.warehouseId ? String(editingNote.warehouseId) : '',
        zoneId: editingNote.zoneId ? String(editingNote.zoneId) : '',
        currency: editingNote.currency || 'PEN',
        exchangeRate: String(editingNote.exchangeRate || '1.0000'),
        customerId: editingNote.customerId ? String(editingNote.customerId) : '',
        customerName: editingNote.customer?.name || '',
        date: editingNote.date ? new Date(editingNote.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: editingNote.description || '',
        reasonCode: editingNote.reasonCode || '',
        guideRemission: editingNote.guideRemission || '',
        status: editingNote.status || 'ACTIVE',
        documentType: editingNote.documentType || '',
        series: editingNote.series || '',
        number: editingNote.number || '',
      });
      setCustomerSearch(editingNote.customer?.name || '');
      setItems((editingNote.items || []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name,
        productCode: item.product?.code,
        productData: item.product,
        guideRemission: item.guideRemission || '',
        documentType: item.documentType || '',
        documentNumber: item.documentNumber || '',
        quantity: item.quantity,
        unitId: item.unitId,
        unitSymbol: item.unit?.symbol,
        unitCost: Number(item.unitCost),
        total: Number(item.total),
        orderNumber: item.orderNumber || '',
        lotNumber: item.lotNumber || '',
        exitDate: item.exitDate ? new Date(item.exitDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        weight: item.weight ? Number(item.weight) : null,
        totalWeight: item.totalWeight ? Number(item.totalWeight) : null,
      })));
    } else {
      setHeader({
        warehouseId: '', zoneId: '', currency: 'PEN', exchangeRate: '1.0000',
        customerId: '', customerName: '', date: new Date().toISOString().split('T')[0],
        description: '', reasonCode: '', guideRemission: '', status: 'ACTIVE',
        documentType: '', series: '', number: '',
      });
      setCustomerSearch('');
      setItems([]);
    }
    setValidationErrors([]);
  }, [editingNote]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setShowCustomerDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDependencies = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [whRes, custRes, reasonsRes, dtRes, rateRes, currRes] = await Promise.all([
        axios.get('/api/warehouses', config).catch(() => ({ data: [] })),
        axios.get('/api/customers', config).catch(() => ({ data: [] })),
        axios.get('/api/exit-notes/reasons', config).catch(() => ({ data: [] })),
        axios.get('/api/sunat/TABLA_10', config).catch(() => ({ data: [] })),
        axios.get('/api/exchange-rates/today').catch(() => ({ data: { rate: 1.0 } })),
        axios.get('/api/sunat/TABLA_04', config).catch(() => ({ data: [] })),
      ]);
      setWarehouses(Array.isArray(whRes.data) ? whRes.data : []);
      setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
      const apiReasons = Array.isArray(reasonsRes.data) ? reasonsRes.data : [];
      setReasons(apiReasons.length > 0 ? apiReasons : FALLBACK_EXIT_REASONS);
      setDocumentTypes(Array.isArray(dtRes.data) ? dtRes.data : []);
      setCurrencies(Array.isArray(currRes.data) && currRes.data.length > 0 ? currRes.data : [{ code: 'PEN', name: 'Soles' }, { code: 'USD', name: 'Dólares Americanos' }]);
      if (rateRes.data?.rate) setHeader(prev => ({ ...prev, exchangeRate: String(Number(rateRes.data.rate).toFixed(4)) }));
    } catch (error) { console.error('Error loading dependencies:', error); }
  };

  const filteredCustomers = customers.filter((c: any) => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return false;
    return c.name?.toLowerCase().includes(term) || c.docNumber?.toLowerCase().includes(term);
  }).slice(0, 20);

  const selectCustomer = (customer: any) => {
    setHeader(prev => ({ ...prev, customerId: String(customer.id), customerName: customer.name }));
    setCustomerSearch(`${customer.name} (${customer.docNumber})`);
    setShowCustomerDropdown(false);
  };

  const handleWarehouseZoneChange = (val: string) => {
    if (val.startsWith('z_')) {
      const [, whId, zId] = val.split('_');
      setHeader(prev => ({ ...prev, warehouseId: whId, zoneId: zId }));
    } else {
      setHeader(prev => ({ ...prev, warehouseId: val, zoneId: '' }));
    }
  };

  const handleSelectProduct = (product: any) => {
    const unitOpts = getProductUnitOptions(product);
    const defaultUnit = unitOpts[0] || { id: product.unitId || 1, symbol: product.unit?.symbol || 'UND' };
    const unitCost = Number(product.costPrice || 0);
    setItems(prev => [...prev, {
      productId: product.id,
      productName: product.name,
      productCode: product.code || '',
      productData: product,
      guideRemission: header.guideRemission || '',
      documentType: header.documentType || '',
      documentNumber: header.series && header.number ? `${header.series}-${header.number}` : '',
      quantity: 1,
      unitId: defaultUnit.id,
      unitSymbol: defaultUnit.symbol,
      unitCost,
      total: unitCost,
      orderNumber: '',
      lotNumber: '',
      exitDate: header.date || new Date().toISOString().split('T')[0],
      weight: product.weight ? Number(product.weight) : null,
      totalWeight: product.weight ? Number(product.weight) : null,
    }]);
    setShowProductSearch(false);
  };

  const updateItemField = (index: number, field: string, value: any) => {
    setItems(prev => prev.map((it, idx) => {
      if (idx !== index) return it;
      const updated = { ...it, [field]: value };
      if (field === 'quantity' || field === 'unitCost') {
        const qty = Number(field === 'quantity' ? value : updated.quantity) || 0;
        const cost = Number(field === 'unitCost' ? value : updated.unitCost) || 0;
        updated.total = calculateItemTotal(qty, cost);
        if (updated.weight) {
          updated.totalWeight = qty * Number(updated.weight);
        }
      }
      if (field === 'unitId' && updated.productData) {
        const opts = getProductUnitOptions(updated.productData);
        const found = opts.find(o => o.id === Number(value));
        if (found) updated.unitSymbol = found.symbol;
      }
      return updated;
    }));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitCost || 0)), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    if (!header.warehouseId) errors.push('Debe seleccionar un almacén.');
    if (!header.reasonCode) errors.push('Debe seleccionar un motivo SUNAT.');
    if (!header.date) errors.push('La fecha es obligatoria.');
    if (items.length === 0) errors.push('Debe agregar al menos un producto.');
    items.forEach((it, idx) => {
      if (!it.quantity || Number(it.quantity) <= 0) errors.push(`Ítem ${idx + 1}: cantidad debe ser mayor a 0.`);
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    setValidationErrors([]);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = { ...header, items };
      if (editingNote) {
        await axios.put(`/api/exit-notes/${editingNote.id}`, payload, config);
      } else {
        await axios.post('/api/exit-notes', payload, config);
      }
      onSuccess();
    } catch (error: any) {
      setValidationErrors([error.response?.data?.error || 'Error al guardar la nota de salida']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white border-b border-blue-900">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-white/10 rounded">
                <FileOutput className="w-4 h-4 text-blue-200" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-tight">
                  {editingNote ? 'Editar Nota de Salida' : 'Registro de Nota de Salida'}
                </h2>
                <p className="text-[9px] text-blue-200 uppercase font-medium">Módulo de Almacén - Despacho y Salida de Mercadería</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  {validationErrors.map((err, i) => (
                    <p key={i} className="text-xs font-bold text-red-700">{err}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Cabecera */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <div className="md:col-span-4 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Almacén</span>
                <select
                  value={header.zoneId ? `z_${header.warehouseId}_${header.zoneId}` : header.warehouseId}
                  onChange={e => handleWarehouseZoneChange(e.target.value)}
                  className="h-8 border border-slate-300 rounded px-2 text-xs font-bold bg-white flex-1 outline-none focus:border-blue-500"
                  required
                >
                  <option value="">--Seleccionar--</option>
                  {warehouses.map((wh: any) => {
                    const hasZones = wh.floors?.some((f: any) => f.zones?.length > 0);
                    return (
                      <React.Fragment key={wh.id}>
                        <option value={wh.id} className="font-bold text-slate-900">{wh.name}</option>
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

              <div className="md:col-span-3 flex items-center gap-2" ref={customerRef}>
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Cliente</span>
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(e.target.value.length >= 2); }}
                    onFocus={() => customerSearch.length >= 2 && setShowCustomerDropdown(true)}
                    className="h-8 border border-slate-300 rounded pl-7 pr-2 text-xs font-bold w-full bg-white outline-none focus:border-blue-500"
                    placeholder="Buscar cliente..."
                  />
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-40 overflow-y-auto">
                      {filteredCustomers.map((c: any) => (
                        <button key={c.id} type="button" onClick={() => selectCustomer(c)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 border-b border-slate-50 last:border-b-0">
                          <span className="font-bold text-slate-700">{c.name}</span>
                          <span className="ml-2 text-[10px] text-slate-400">{c.docType}: {c.docNumber}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Fecha</span>
                <input type="date" value={header.date} onChange={e => setHeader({...header, date: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1 outline-none focus:border-blue-500" required />
              </div>

              <div className="md:col-span-3 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase whitespace-nowrap">Tipo Cambio</span>
                <div className="flex items-center gap-1 flex-1">
                  <input type="number" step="0.0001" value={header.exchangeRate} onChange={e => setHeader({...header, exchangeRate: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold w-full text-right bg-yellow-50 outline-none focus:border-blue-500" />
                  <button type="button" onClick={loadDependencies} className="h-8 px-2 bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded transition-colors cursor-pointer" title="Refrescar TC">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Datos de la Nota */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-3 flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Motivo</span>
                  <select value={header.reasonCode} onChange={e => setHeader({...header, reasonCode: e.target.value})} className="h-8 border border-slate-300 rounded px-1.5 text-xs font-bold bg-blue-50 flex-1 min-w-0 w-full truncate outline-none focus:border-blue-500" required>
                    <option value="">--Seleccionar--</option>
                    {reasons.map(r => <option key={r.code} value={r.code}>{r.code} - {r.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3 flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Guía Rem.</span>
                  <input type="text" value={header.guideRemission} onChange={e => setHeader({...header, guideRemission: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold bg-white flex-1 min-w-0 w-full outline-none focus:border-blue-500" placeholder="T001-00001234" />
                </div>
                <div className="md:col-span-3 flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Glosa</span>
                  <input type="text" value={header.description} onChange={e => setHeader({...header, description: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-medium bg-white flex-1 min-w-0 w-full outline-none focus:border-blue-500" placeholder="Descripción..." />
                </div>
                <div className="md:col-span-3 flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Estado</span>
                  <select value={header.status} onChange={e => setHeader({...header, status: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold bg-white flex-1 min-w-0 w-full outline-none focus:border-blue-500">
                    <option value="ACTIVE">Activado</option>
                    <option value="ANNULLED">Anulado</option>
                  </select>
                </div>

                <div className="md:col-span-3 flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Documento</span>
                  <select value={header.documentType} onChange={e => setHeader({...header, documentType: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold bg-white flex-1 min-w-0 w-full truncate outline-none focus:border-blue-500">
                    <option value="">--Tipo--</option>
                    {documentTypes.map(d => <option key={d.code} value={d.code}>{d.sigla || d.code} - {d.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Serie</span>
                  <input type="text" value={header.series} onChange={e => setHeader({...header, series: e.target.value.toUpperCase()})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold text-center bg-white flex-1 min-w-0 w-full outline-none focus:border-blue-500" placeholder="S001" maxLength={4} />
                </div>
                <div className="md:col-span-3 flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Número</span>
                  <div className="relative flex-1 min-w-0">
                    <input type="text" value={header.number} onChange={e => setHeader({...header, number: e.target.value})} className="h-8 border border-slate-300 rounded pl-7 pr-2 text-xs font-bold w-full bg-white text-blue-700 outline-none focus:border-blue-500" placeholder="00001234" maxLength={8} />
                    <Hash className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-blue-500" />
                  </div>
                </div>
                <div className="md:col-span-4 flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Moneda</span>
                  <select value={header.currency} onChange={e => setHeader({...header, currency: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold bg-white flex-1 min-w-0 w-full truncate outline-none focus:border-blue-500">
                    {currencies.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Detalle de Productos */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#004A99]" />
                  <span className="text-xs font-bold text-slate-800 uppercase">Detalle de Productos</span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductSearch(true)}
                  className="h-8 px-3 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Agregar Producto
                </button>
              </div>

              {items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                        <th className="px-2 py-2 text-center w-8">#</th>
                        <th className="px-2 py-2">Cod.</th>
                        <th className="px-2 py-2 min-w-[180px]">Descripción</th>
                        <th className="px-2 py-2 w-24 text-center">Lote</th>
                        <th className="px-2 py-2 w-20 text-center">Cant.</th>
                        <th className="px-2 py-2 w-24">U.M.</th>
                        <th className="px-2 py-2 w-24 text-right">Costo Unit.</th>
                        <th className="px-2 py-2 w-24 text-right">Total</th>
                        <th className="px-2 py-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => {
                        const unitOpts = item.productData ? getProductUnitOptions(item.productData) : [{ id: item.unitId, symbol: item.unitSymbol || 'UND', label: item.unitSymbol || 'UND' }];
                        return (
                          <tr key={idx} className="hover:bg-blue-50/30">
                            <td className="px-2 py-1.5 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="px-2 py-1.5 font-mono font-bold text-slate-600">{item.productCode || '-'}</td>
                            <td className="px-2 py-1.5 font-bold text-slate-800 uppercase">{item.productName}</td>
                            <td className="px-2 py-1.5">
                              <input type="text" value={item.lotNumber || ''} onChange={e => updateItemField(idx, 'lotNumber', e.target.value.toUpperCase())} className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-mono font-bold text-center outline-none focus:border-blue-500" placeholder="Lote..." />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" min="1" value={item.quantity} onChange={e => updateItemField(idx, 'quantity', e.target.value)} className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-right outline-none focus:border-blue-500" />
                            </td>
                            <td className="px-2 py-1.5">
                              <select value={item.unitId} onChange={e => updateItemField(idx, 'unitId', parseInt(e.target.value))} className="h-8 w-full border border-slate-300 rounded px-1.5 text-xs font-bold bg-white outline-none focus:border-blue-500 uppercase">
                                {unitOpts.map(u => <option key={u.id} value={u.id} title={u.label}>{u.symbol}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" step="0.0001" min="0" value={item.unitCost} onChange={e => updateItemField(idx, 'unitCost', e.target.value)} className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-right outline-none focus:border-blue-500" />
                            </td>
                            <td className="px-2 py-1.5 text-right font-black text-slate-900 tabular-nums">
                              {formatNumber(item.total, 2)}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium italic">Pulse "Agregar Producto" para añadir ítems a la nota de salida</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button type="button" onClick={onClose} className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer">
                  <X className="w-3.5 h-3.5 text-red-500" /> Cancelar
                </button>
                <button type="submit" disabled={loading} className="h-8 px-5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer">
                  <Save className="w-3.5 h-3.5" />
                  {loading ? 'Guardando...' : (editingNote ? 'Actualizar Nota' : 'Registrar Nota')}
                </button>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-1.5 text-right">
                <span className="block text-[9px] font-bold text-blue-700 uppercase">Total Nota de Salida:</span>
                <span className="text-sm font-black text-[#004A99] tabular-nums">
                  {formatCurrency(totalAmount, header.currency === 'USD' ? '$' : 'S/')}
                </span>
              </div>
            </div>
          </form>

          <ProductSearchModal
            isOpen={showProductSearch}
            onClose={() => setShowProductSearch(false)}
            onSelect={handleSelectProduct}
            token={token}
          />
        </div>
      )}
    </AnimatePresence>
  );
};
