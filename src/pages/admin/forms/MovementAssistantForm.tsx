import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, ArrowRightLeft, Plus, Trash2, Download, Package, Tag, FileText, User } from 'lucide-react';
import axios from 'axios';
import { ExtractionModal } from './ExtractionModal';
import { ProductSearchModal } from './ProductSearchModal';

interface MovementAssistantFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  warehouses: any[];
  customers: any[];
  products: any[];
  token: string;
}

export const MovementAssistantForm: React.FC<MovementAssistantFormProps> = ({ isOpen, onClose, onSubmit, warehouses, customers = [], products = [], token }) => {
  const [type, setType] = useState<'INGRESO' | 'SALIDA' | 'TRANSFERENCIA'>('TRANSFERENCIA');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [exchangeRate, setExchangeRate] = useState('1.0000');
  const [currency, setCurrency] = useState('PEN');
  const [observation, setObservation] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [quickProductCode, setQuickProductCode] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [isExtractionModalOpen, setIsExtractionModalOpen] = useState(false);
  const [sunatOperations, setSunatOperations] = useState<any[]>([]);
  const [sunatCurrencies, setSunatCurrencies] = useState<any[]>([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  
  // Reset form when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setType('TRANSFERENCIA');
      setReason('');
      setObservation('');
      setCustomerId('');
      setCustomerName('');
      setItems([]);
      setQuickProductCode('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      axios.get(`/api/exchange-rates/fetch-by-date/${date}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setExchangeRate(res.data?.sell_rate || '1.0000'))
        .catch(() => setExchangeRate('1.0000'));
      
      axios.get('/api/sunat/CAT_51', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setSunatOperations(res.data))
        .catch(() => {});

      axios.get('/api/sunat/TABLA_04', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setSunatCurrencies(res.data))
        .catch(() => {});
    }
  }, [date, isOpen, token]);

  // Function removed as manual rows are now added via ProductSearchModal

  const handleRemoveRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'productId') {
      const prod = products?.find(p => p.id.toString() === value.toString());
      if (prod) {
        item.productName = prod.name || '';
        item.productCode = prod.code || '';
        item.unit = prod.package?.symbol || prod.subPackage?.symbol || prod.unit?.symbol || 'UN.';
      }
    }
    
    // Auto-select warehouse when zone changes
    if (field === 'fromZoneId' || field === 'toZoneId') {
      let foundWarehouseId = '';
      warehouses.forEach(w => {
        w.floors?.forEach((f: any) => {
          if (f.zones?.some((z: any) => z.id.toString() === value.toString())) {
            foundWarehouseId = w.id.toString();
          }
        });
      });
      if (foundWarehouseId) {
        if (field === 'fromZoneId') item.fromWarehouseId = foundWarehouseId;
        else item.toWarehouseId = foundWarehouseId;
      }
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const handleQuickProductSearch = (code: string) => {
    setQuickProductCode(code);
    const prod = products?.find(p => (p.code && p.code === code) || (p.barcode && p.barcode === code));
    if (prod) {
      setItems([...items, { 
        productId: prod.id, 
        productName: prod.name || 'Producto Sin Nombre', 
        productCode: prod.code || '',
        unit: prod.package?.symbol || prod.subPackage?.symbol || prod.unit?.symbol || 'UN.',
        fromWarehouseId: '', 
        fromZoneId: '', 
        toWarehouseId: '', 
        toZoneId: '', 
        quantity: 1, 
        lotNumber: '',
        expiryDate: '',
        guideNumber: '',
        docType: '',
        docNumber: '' 
      }]);
      setQuickProductCode('');
    }
  };

  const handleProductSelect = (product: any) => {
    setItems([...items, { 
      productId: product.id, 
      productName: product.name || 'Producto Sin Nombre', 
      productCode: product.code || '',
      fromWarehouseId: '', 
      fromZoneId: '', 
      toWarehouseId: '', 
      toZoneId: '', 
      quantity: 1, 
      guideNumber: '',
      docType: '',
      docNumber: '',
      unit: product.package?.symbol || product.subPackage?.symbol || product.unit?.symbol || 'UN.',
      lotNumber: '',
      expiryDate: ''
    }]);
    setIsProductSearchOpen(false);
  };

  const handleExtract = (sourceItems: any[], sourceInfo: any) => {
    const isGreTransfer = sourceInfo.sourceKind === 'SALES_REFERRAL_GUIDE';
    if (isGreTransfer) {
      setType('TRANSFERENCIA');
    }

    const getFirstZoneId = (whId: any) => {
      if (!whId) return '';
      const wh = warehouses.find((w: any) => String(w.id) === String(whId));
      const firstZone = wh?.floors?.[0]?.zones?.[0];
      return firstZone ? String(firstZone.id) : '';
    };

    const extractedItems = sourceItems.map(item => {
      let formattedExpiry = '';
      const rawExpiry = item.expiryDate || item.entranceDate || item.dueDate;
      if (rawExpiry) {
        try {
          formattedExpiry = typeof rawExpiry === 'string' 
            ? (rawExpiry.includes('T') ? rawExpiry.split('T')[0] : rawExpiry)
            : new Date(rawExpiry).toISOString().split('T')[0];
        } catch (e) {
          formattedExpiry = '';
        }
      }

      const displayDocType = isGreTransfer
        ? 'GRE'
        : (sourceInfo.docSigla || (sourceInfo.docType === '50' ? 'DUA' : sourceInfo.docType === '09' ? 'GRM' : (sourceInfo.docType || 'DUA')));
      return {
        productId: item.productId,
        productName: item.product?.name || item.description || 'Producto',
        productCode: item.product?.code || item.code || '',
        fromWarehouseId: isGreTransfer ? (sourceInfo.originWarehouseId?.toString() || '') : 'TRANSIT',
        fromZoneId: isGreTransfer ? getFirstZoneId(sourceInfo.originWarehouseId) : 'TRANSIT_ZONE',
        toWarehouseId: isGreTransfer ? (sourceInfo.deliveryWarehouseId?.toString() || '') : (sourceInfo.warehouseId?.toString() || ''),
        toZoneId: isGreTransfer ? getFirstZoneId(sourceInfo.deliveryWarehouseId) : '',
        quantity: item.quantity,
        lotNumber: item.lotNumber || '', // PRESERVAR EL LOTE
        expiryDate: formattedExpiry, // PRESERVAR LA FECHA DE VENCIMIENTO DEL LOTE
        guideNumber: isGreTransfer ? `${sourceInfo.docSeries}-${sourceInfo.docNumber}` : '',
        docType: displayDocType,
        docNumber: `${sourceInfo.docSeries}-${sourceInfo.docNumber}`,
        unit: item.unitSymbol || item.product?.package?.symbol || item.product?.subPackage?.symbol || item.product?.unit?.symbol || 'UN.'
      };
    });
    const obsDocType = isGreTransfer ? 'GRE' : (sourceInfo.docSigla || (sourceInfo.docType === '50' ? 'DUA' : sourceInfo.docType === '09' ? 'GRM' : sourceInfo.docType));
    setItems([...items, ...extractedItems]);
    setObservation(`${isGreTransfer ? 'Traslado por' : 'Extracción de'} ${obsDocType} ${sourceInfo.docSeries}-${sourceInfo.docNumber}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return alert('Agregue al menos un producto');
    
    // Basic validation for zones
    const invalidItem = items.find(item => {
      if (type === 'TRANSFERENCIA' && (!item.fromZoneId || !item.toZoneId)) return true;
      if (type === 'INGRESO' && !item.toZoneId) return true;
      if (type === 'SALIDA' && !item.fromZoneId) return true;
      return false;
    });

    if (invalidItem) return alert('Por favor seleccione Almacén y Zona para todos los ítems');

    const isManualEntryCheck = type === 'INGRESO' && (reason === 'SALDO INICIAL' || reason === 'AJUSTE POR DIFERENCIA DE INVENTARIO');
    if (isManualEntryCheck) {
      const missingStrictFields = items.find(item => !item.lotNumber || !item.expiryDate);
      if (missingStrictFields) {
        return alert('ERROR: Para Saldos Iniciales o Ajustes, es OBLIGATORIO ingresar el Lote y Fecha de Vencimiento en todos los productos.');
      }
    }

    onSubmit({ 
      type, 
      reason, 
      date, 
      observation, 
      customerId,
      currency,
      exchangeRate,
      items 
    });
  };

  const isManualEntry = type === 'INGRESO' && (reason === 'SALDO INICIAL' || reason === 'AJUSTE POR DIFERENCIA DE INVENTARIO');

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
            initial={{ opacity: 0, scale: 0.97, y: 10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.97, y: 10 }} 
            className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300"
          >
            {/* Cabecera Institucional ERP */}
            <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white/10 rounded">
                  <ArrowRightLeft className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-tight">Asistente de Movimiento de Almacén</h2>
                  <p className="text-[9px] text-blue-200 uppercase font-medium">Gestión de Inventario y Transferencias SUNAT</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 bg-slate-50/70 flex flex-col">
                {/* Sección 1: Datos del Movimiento */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2 shrink-0">
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-700" />
                    <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">
                      Datos del Movimiento
                    </span>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-6 sm:col-span-3 space-y-1 min-w-0">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Tipo</label>
                      <select 
                        value={type} 
                        onChange={(e: any) => {
                          setType(e.target.value);
                          setReason('');
                        }}
                        className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="INGRESO">▲ INGRESO</option>
                        <option value="SALIDA">▼ SALIDA</option>
                        <option value="TRANSFERENCIA">◀▶ TRANSFERENCIA</option>
                      </select>
                    </div>

                    <div className="col-span-12 sm:col-span-6 space-y-1 min-w-0">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Motivo / Operación SUNAT</label>
                      <select 
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 outline-none focus:border-blue-500 truncate"
                      >
                        <option value="">-- SELECCIONAR OPERACIÓN --</option>
                        {sunatOperations?.filter(op => {
                            if (!op || !op.code) return false;
                            if (type === 'TRANSFERENCIA') return op.code === '11' || op.code === '21';
                            return !['11', '21'].includes(op.code);
                          })
                          .map(op => (
                            <option key={op.code} value={op.name}>{op.code} - {op.name}</option>
                          ))}
                      </select>
                    </div>

                    <div className="col-span-6 sm:col-span-3 space-y-1 min-w-0">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Fecha</label>
                      <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-7 space-y-1 relative min-w-0">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Entidad (Cliente / Proveedor)</label>
                      <div className="relative">
                        <input 
                          type="text"
                          value={customerName}
                          onChange={(e) => {
                            setCustomerName(e.target.value);
                            setShowCustomerResults(true);
                          }}
                          onFocus={() => setShowCustomerResults(true)}
                          placeholder="Buscar Cliente o Proveedor..."
                          className="w-full h-8 pl-8 pr-3 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                        />
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      </div>

                      {showCustomerResults && customerName.length > 2 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-300 shadow-2xl rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                          {customers?.filter(c => {
                                const nameMatch = c?.name?.toLowerCase()?.includes(customerName?.toLowerCase() || '');
                                const docMatch = (c?.docNumber || c?.document_number)?.includes(customerName || '');
                                return nameMatch || docMatch;
                              })
                              .map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setCustomerId(c.id.toString());
                                    setCustomerName(c.name || '');
                                    setShowCustomerResults(false);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-slate-100 last:border-0 flex justify-between items-center transition-colors cursor-pointer"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800 uppercase">{c.name || 'SIN NOMBRE'}</span>
                                    <span className="text-[10px] font-mono text-slate-500">{c.docNumber || c.document_number || 'S/D'}</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${c.type === 'CUSTOMER' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {c.type === 'CUSTOMER' ? 'Cliente' : 'Proveedor'}
                                  </span>
                                </button>
                              ))}
                        </div>
                      )}
                    </div>

                    <div className="col-span-6 sm:col-span-3 space-y-1 min-w-0">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Moneda</label>
                      <select 
                        value={currency} 
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-blue-700 outline-none focus:border-blue-500"
                      >
                        {sunatCurrencies.map(c => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-6 sm:col-span-2 space-y-1 min-w-0">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">T.C.</label>
                      <input 
                        type="text" 
                        readOnly
                        value={exchangeRate} 
                        className="w-full h-8 px-2 bg-blue-50/70 border border-blue-200 rounded text-xs text-right font-bold font-mono text-blue-800 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Sección 2: Detalle de Productos */}
                <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-[190px]">
                  <div className="px-3 py-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-700" />
                      <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">
                        Detalle de Movimiento
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
                      <div className="relative w-full sm:w-80">
                        <Tag className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text"
                          value={quickProductCode}
                          onChange={(e) => handleQuickProductSearch(e.target.value)}
                          placeholder="Escanear código o SKU para agregar..."
                          className="w-full h-8 pl-8 pr-3 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500"
                        />
                      </div>
                      {!isManualEntry && (
                        <button type="button" onClick={() => setIsExtractionModalOpen(true)} className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer">
                          <Download className="w-3.5 h-3.5" /> Extraer Documento
                        </button>
                      )}
                      <button type="button" onClick={() => setIsProductSearchOpen(true)} className="h-8 px-3.5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer">
                        <Plus className="w-3.5 h-3.5" /> Buscar Producto
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse table-fixed min-w-350">
                      <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                        <tr className="text-slate-600 text-[10px] font-bold uppercase tracking-tight">
                          <th className="px-2 py-2 border-r border-slate-200 text-center w-12">#</th>
                          <th className="px-2 py-2 border-r border-slate-200 w-48 text-center">Origen (Salida)</th>
                          <th className="px-2 py-2 border-r border-slate-200 w-48 text-center">Destino (Entrada)</th>
                          <th className="px-2 py-2 border-r border-slate-200 w-32">SKU / COD</th>
                          <th className="px-2 py-2 border-r border-slate-200 w-auto">Descripción</th>
                          <th className="px-2 py-2 border-r border-slate-200 w-16 text-center">T.Doc</th>
                          <th className="px-2 py-2 border-r border-slate-200 w-32 text-center">Nro Doc</th>
                          <th className="px-2 py-2 border-r border-slate-200 w-32 text-center bg-blue-50/50 text-blue-800">Lote</th>
                          <th className="px-2 py-2 border-r border-slate-200 w-28 text-center bg-blue-50/50 text-blue-800">Venc.</th>
                          <th className="px-2 py-2 border-r border-slate-200 w-24 text-center">Cantidad</th>
                          <th className="px-2 py-2 border-r border-slate-200 w-16 text-center">U.M.</th>
                          <th className="px-2 py-2 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 group transition-colors">
                            <td className="px-2 py-1.5 text-[11px] font-bold text-slate-400 text-center border-r border-slate-100">{idx + 1}</td>
                            
                             {/* Origen */}
                             <td className="px-2 py-1.5 border-r border-slate-100">
                               {(type === 'INGRESO' || item.fromZoneId === 'TRANSIT_ZONE') ? (
                                 <div className="w-full h-8 flex items-center bg-slate-100 border border-slate-200 rounded px-2 text-[10px] font-bold text-slate-500 truncate" title="ALMACÉN TRANSITORIO (IMP/COMPRAS)">
                                   ALMACÉN TRANSITORIO (IMP/COMPRAS)
                                 </div>
                               ) : (
                                 <select 
                                   value={item.fromZoneId}
                                   onChange={(e) => handleItemChange(idx, 'fromZoneId', e.target.value)}
                                   className="w-full h-8 border border-slate-300 rounded px-1.5 text-[11px] font-bold outline-none bg-white text-slate-800 focus:border-blue-500"
                                 >
                                   <option value="">-- Seleccionar Origen --</option>
                                   {warehouses.map(w => (
                                     <optgroup key={w.id} label={w.name}>
                                       {w.floors?.map((f: any) => (
                                         <React.Fragment key={f.id}>
                                           {f.zones?.map((z: any) => (
                                             <option key={z.id} value={z.id}>{f.name} - {z.name}</option>
                                           ))}
                                         </React.Fragment>
                                       ))}
                                     </optgroup>
                                   ))}
                                 </select>
                               )}
                             </td>
 
                             {/* Destino */}
                             <td className="px-2 py-1.5 border-r border-slate-100">
                               {type === 'SALIDA' ? (
                                 <div className="w-full h-8 flex items-center bg-slate-100 border border-slate-200 rounded px-2 text-[10px] font-bold text-slate-500">
                                   CLIENTE / EXTERNO
                                 </div>
                               ) : (
                                 <select 
                                   value={item.toZoneId}
                                   onChange={(e) => handleItemChange(idx, 'toZoneId', e.target.value)}
                                   className="w-full h-8 border border-slate-300 rounded px-1.5 text-[11px] font-bold outline-none bg-white text-slate-800 focus:border-blue-500"
                                 >
                                   <option value="">-- Seleccionar Destino --</option>
                                   {warehouses.map(w => (
                                     <optgroup key={w.id} label={w.name}>
                                       {w.floors?.map((f: any) => (
                                         <React.Fragment key={f.id}>
                                           {f.zones?.map((z: any) => (
                                             <option key={z.id} value={z.id}>{f.name} - {z.name}</option>
                                           ))}
                                         </React.Fragment>
                                       ))}
                                     </optgroup>
                                   ))}
                                 </select>
                               )}
                             </td>

                            <td className="px-2 py-1.5 border-r border-slate-100">
                              <input type="text" value={item.productCode || ''} readOnly className="w-full bg-transparent border-none px-1 text-[11px] font-mono font-bold text-slate-500 outline-none" />
                            </td>
                            <td className="px-2 py-1.5 border-r border-slate-100">
                              <input type="text" value={item.productName || ''} readOnly className="w-full bg-transparent border-none px-1 text-[11px] font-bold text-slate-800 uppercase truncate outline-none" />
                            </td>
                            <td className="px-2 py-1.5 border-r border-slate-100">
                              <input type="text" value={item.docType === '50' ? 'DUA' : item.docType === '09' ? 'GRM' : (item.docType || '')} onChange={(e) => handleItemChange(idx, 'docType', e.target.value)} className="w-full h-8 bg-white border border-slate-300 rounded px-1 text-[11px] font-bold text-center text-slate-600 outline-none focus:border-blue-500" />
                            </td>
                            <td className="px-2 py-1.5 border-r border-slate-100">
                              <input type="text" value={item.docNumber || ''} onChange={(e) => handleItemChange(idx, 'docNumber', e.target.value)} className="w-full h-8 bg-white border border-slate-300 rounded px-2 text-[11px] font-bold font-mono text-blue-800 text-center outline-none focus:border-blue-500" />
                            </td>
                            <td className="px-2 py-1.5 border-r border-slate-100 bg-blue-50/20">
                              <input type="text" value={item.lotNumber || ''} onChange={(e) => handleItemChange(idx, 'lotNumber', e.target.value.toUpperCase())} className="w-full h-8 bg-white border border-blue-200 rounded px-2 text-[11px] font-bold font-mono text-center text-blue-700 outline-none focus:border-blue-500" placeholder="SIN LOTE" />
                            </td>
                            <td className="px-2 py-1.5 border-r border-slate-100 bg-blue-50/20">
                              <input type="date" value={item.expiryDate || ''} onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)} className="w-full h-8 bg-white border border-blue-200 rounded px-1.5 text-[11px] font-medium text-center text-slate-800 outline-none focus:border-blue-500" />
                            </td>
                            <td className="px-2 py-1.5 border-r border-slate-100">
                              <input type="number" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} className="w-full h-8 bg-white border border-blue-300 rounded px-2 text-xs text-right font-bold text-blue-700 outline-none focus:border-blue-500" />
                            </td>
                            <td className="px-2 py-1.5 border-r border-slate-100">
                              <input type="text" value={item.unit || 'UN.'} readOnly className="w-full bg-transparent border-none px-1 text-[10px] text-center font-bold text-slate-500 uppercase outline-none" />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button type="button" onClick={() => handleRemoveRow(idx)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors mx-auto cursor-pointer" title="Quitar ítem">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {items.length === 0 && (
                          <tr>
                            <td colSpan={12} className="py-10 text-center">
                              <div className="flex flex-col items-center text-slate-400">
                                <Package className="w-12 h-12 mb-2 stroke-1 opacity-50" />
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sin Detalle de Movimiento</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Escanea un código, extrae un documento o haz clic en "Buscar Producto".</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sección 3: Observación Global */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 text-blue-950 min-w-max">
                    <FileText className="w-3.5 h-3.5 text-blue-700" />
                    <span className="text-[10px] font-bold uppercase text-slate-600">Observación Global:</span>
                  </div>
                  <input 
                    type="text"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Escriba aquí cualquier observación adicional para este movimiento..."
                    className="flex-1 h-8 px-2.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Footer Estándar ERP */}
              <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={onClose} className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer">
                    <X className="w-3.5 h-3.5 text-red-500" /> Cancelar
                  </button>
                  <button type="button" className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer">
                    <FileText className="w-3.5 h-3.5 text-blue-700" /> Imprimir Comprobante
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 h-8 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Total Unidades:</span>
                    <span className="text-xs font-black text-slate-800 tabular-nums">
                      {items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">SKUs:</span>
                    <span className="text-xs font-black text-blue-700 tabular-nums">
                      {items.length}
                    </span>
                  </div>

                  <button type="submit" className="h-8 px-5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer">
                    <Save className="w-3.5 h-3.5" /> Procesar y Guardar
                  </button>
                </div>
              </div>
            </form>

            <ExtractionModal 
              isOpen={isExtractionModalOpen}
              onClose={() => setIsExtractionModalOpen(false)}
              onExtract={handleExtract}
              token={token}
            />

            {isProductSearchOpen && (
              <ProductSearchModal
                isOpen={isProductSearchOpen}
                onClose={() => setIsProductSearchOpen(false)}
                onSelect={handleProductSelect}
                token={token}
                allowZeroStock={true}
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
