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
      
      axios.get('/api/sunat/operation_type', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setSunatOperations(res.data))
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
        item.unit = prod.unit?.symbol || 'UN.';
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
        unit: prod.unit?.symbol || 'UN.',
        fromWarehouseId: '', 
        fromZoneId: '', 
        toWarehouseId: '', 
        toZoneId: '', 
        quantity: 1, 
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
      unit: product.unit?.symbol || 'UN.',
      lotNumber: '',
      expiryDate: ''
    }]);
    setIsProductSearchOpen(false);
  };

  const handleExtract = (sourceItems: any[], sourceInfo: any) => {
    const extractedItems = sourceItems.map(item => ({
      productId: item.productId,
      productName: item.product?.name || 'Producto',
      productCode: item.product?.code || '',
      fromWarehouseId: 'TRANSIT', // Special ID for transitory
      fromZoneId: 'TRANSIT_ZONE',
      toWarehouseId: sourceInfo.warehouseId?.toString() || '',
      toZoneId: '',
      quantity: item.quantity,
      lotNumber: item.lotNumber || '', // PRESERVAR EL LOTE
      guideNumber: '',
      docType: sourceInfo.docType || '50',
      docNumber: `${sourceInfo.docSeries}-${sourceInfo.docNumber}`,
      unit: item.unitSymbol || item.product?.unit?.symbol || 'UN.'
    }));
    setItems([...items, ...extractedItems]);
    setObservation(`Extracción de ${sourceInfo.docType} ${sourceInfo.docSeries}-${sourceInfo.docNumber}`);
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
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 30 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.98, y: 30 }} 
            className="relative w-full max-w-[98vw] h-[95vh] bg-[#F8FAFC] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/40"
          >
            {/* Header */}
            <div className="bg-slate-800 px-4 py-2.5 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <ArrowRightLeft className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-xs font-black text-white uppercase tracking-widest">Asistente de Movimiento de Almacén</h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Gestión de Inventario y Transferencias SUNAT</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={onClose} className="w-7 h-7 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center text-slate-400 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {/* Cabecera */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="grid grid-cols-12 gap-x-6 gap-y-4 items-center">
                    <div className="col-span-1 text-right">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Tipo:</label>
                    </div>
                    <div className="col-span-2">
                      <select 
                        value={type} 
                        onChange={(e: any) => {
                          setType(e.target.value);
                          setReason('');
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] font-black text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                      >
                        <option value="INGRESO">▲ INGRESO</option>
                        <option value="SALIDA">▼ SALIDA</option>
                        <option value="TRANSFERENCIA">◀▶ TRANSFERENCIA</option>
                      </select>
                    </div>

                    <div className="col-span-1 text-right">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Motivo:</label>
                    </div>
                    <div className="col-span-4">
                      <select 
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
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

                    <div className="col-span-1 text-right">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Fecha:</label>
                    </div>
                    <div className="col-span-3">
                      <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="col-span-1 text-right">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Entidad:</label>
                    </div>
                    <div className="col-span-7 relative">
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
                          className="w-full bg-white border border-slate-300 rounded-lg px-10 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                        />
                        <User className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
                      </div>

                      {showCustomerResults && customerName.length > 2 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden max-h-60 overflow-y-auto">
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
                                  className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-slate-50 last:border-0 flex justify-between items-center transition-colors"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-slate-700 uppercase">{c.name || 'SIN NOMBRE'}</span>
                                    <span className="text-[9px] text-slate-400 font-bold">{c.docNumber || c.document_number || 'S/D'}</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${c.type === 'CUSTOMER' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {c.type === 'CUSTOMER' ? 'Cliente' : 'Proveedor'}
                                  </span>
                                </button>
                              ))}
                        </div>
                      )}
                    </div>

                    <div className="col-span-1 text-right">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Moneda:</label>
                    </div>
                    <div className="col-span-1">
                      <select 
                        value={currency} 
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-700 outline-none"
                      >
                        <option value="PEN">SOLES</option>
                        <option value="USD">DOLARES</option>
                      </select>
                    </div>

                    <div className="col-span-1 text-right">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">T.C.:</label>
                    </div>
                    <div className="col-span-1">
                      <input 
                        type="text" 
                        readOnly
                        value={exchangeRate} 
                        className="w-full bg-blue-50 border border-blue-200 rounded-lg px-1 py-1.5 text-[11px] text-center font-black text-blue-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Buscador de Productos */}
                <div className="bg-slate-800 p-3 rounded-xl flex items-center justify-between shadow-lg shadow-slate-900/20">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2 text-blue-400">
                      <Tag className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Escaneo de Barra:</span>
                    </div>
                    <input 
                      type="text"
                      value={quickProductCode}
                      onChange={(e) => handleQuickProductSearch(e.target.value)}
                      placeholder="ESCANEAR CÓDIGO O SKU PARA AGREGAR AUTOMÁTICAMENTE..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-xs font-mono text-blue-400 placeholder:text-slate-600 outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!isManualEntry && (
                      <button type="button" onClick={() => setIsExtractionModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black hover:bg-emerald-500 transition-all active:scale-95 shadow-lg shadow-emerald-900/20">
                        <Download className="w-4 h-4" /> EXTRAER DOCUMENTO
                      </button>
                    )}
                    <button type="button" onClick={() => setIsProductSearchOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-900/20">
                      <Plus className="w-4 h-4" /> BUSCAR PRODUCTO
                    </button>
                  </div>
                </div>

                {/* Detalle Grid */}
                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-87.5">
                  <div className="overflow-x-auto overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse table-fixed min-w-350">
                      <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200">
                        <tr className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
                          <th className="px-2 py-3 border-r border-slate-200 text-center w-12">#</th>
                          <th className="px-2 py-3 border-r border-slate-200 w-48 text-center bg-slate-200/50 text-slate-700">Origen (Salida)</th>
                          <th className="px-2 py-3 border-r border-slate-200 w-48 text-center bg-slate-200/50 text-slate-700">Destino (Entrada)</th>
                          <th className="px-2 py-3 border-r border-slate-200 w-32">SKU / COD</th>
                          <th className="px-2 py-3 border-r border-slate-200 w-auto">Descripción</th>
                          <th className="px-2 py-3 border-r border-slate-200 w-28 text-center">Nro Guía</th>
                          <th className="px-2 py-3 border-r border-slate-200 w-16 text-center">T.Doc</th>
                          <th className="px-2 py-3 border-r border-slate-200 w-32 text-center">Nro Doc</th>
                          <th className="px-2 py-3 border-r border-slate-200 w-32 text-center bg-blue-50/50 text-blue-700">Lote</th>
                          <th className="px-2 py-3 border-r border-slate-200 w-28 text-center bg-blue-50/50 text-blue-700">Venc.</th>
                          <th className="px-2 py-3 border-r border-slate-200 w-24 text-center">Cantidad</th>
                          <th className="px-2 py-3 border-r border-slate-200 w-16 text-center">U.M.</th>
                          <th className="px-2 py-3 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/20 group transition-colors">
                            <td className="px-2 py-2 text-[10px] font-black text-slate-400 text-center border-r border-slate-50">{idx + 1}</td>
                            
                             {/* Origen */}
                             <td className="px-2 py-2 border-r border-slate-50">
                               {(type === 'INGRESO' || item.fromZoneId === 'TRANSIT_ZONE') ? (
                                 <div className="w-full bg-slate-100 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-500 truncate" title="ALMACÉN TRANSITORIO (IMP/COMPRAS)">
                                   ALMACÉN TRANSITORIO (IMP/COMPRAS)
                                 </div>
                               ) : (
                                 <select 
                                   value={item.fromZoneId}
                                   onChange={(e) => handleItemChange(idx, 'fromZoneId', e.target.value)}
                                   className="w-full border border-slate-300 rounded px-1.5 py-1 text-[10px] font-bold outline-none bg-white text-slate-700 focus:border-blue-500"
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
                             <td className="px-2 py-2 border-r border-slate-50">
                               {type === 'SALIDA' ? (
                                 <div className="w-full bg-slate-100 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-500">
                                   CLIENTE / EXTERNO
                                 </div>
                               ) : (
                                 <select 
                                   value={item.toZoneId}
                                   onChange={(e) => handleItemChange(idx, 'toZoneId', e.target.value)}
                                   className="w-full border border-slate-300 rounded px-1.5 py-1 text-[10px] font-bold outline-none bg-white text-slate-700 focus:border-emerald-500"
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

                            <td className="px-2 py-2 border-r border-slate-50">
                              <input type="text" value={item.productCode || ''} readOnly className="w-full bg-transparent border-none px-1 text-[10px] font-mono font-black text-slate-500" />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-50">
                              <input type="text" value={item.productName || ''} readOnly className="w-full bg-transparent border-none px-1 text-[10px] font-black text-slate-800 uppercase truncate" />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-50">
                              <input type="text" value={item.guideNumber || ''} onChange={(e) => handleItemChange(idx, 'guideNumber', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-center" />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-50">
                              <input type="text" value={item.docType || ''} onChange={(e) => handleItemChange(idx, 'docType', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[10px] font-black text-center text-slate-400" />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-50">
                              <input type="text" value={item.docNumber || ''} onChange={(e) => handleItemChange(idx, 'docNumber', e.target.value)} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[10px] font-black text-blue-800 text-center" />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-50 bg-blue-50/20">
                              <input type="text" value={item.lotNumber || ''} onChange={(e) => handleItemChange(idx, 'lotNumber', e.target.value.toUpperCase())} className="w-full bg-white border border-blue-200 rounded px-2 py-1 text-[10px] font-black text-center text-blue-600 outline-none focus:border-blue-500" placeholder="SIN LOTE" />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-50 bg-blue-50/20">
                              <input type="date" value={item.expiryDate || ''} onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)} className="w-full bg-white border border-blue-200 rounded px-2 py-1 text-[10px] font-black text-center text-blue-600 outline-none focus:border-blue-500" />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-50">
                              <input type="number" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} className="w-full bg-blue-50 border border-blue-200 rounded px-2 py-1 text-[11px] text-right font-black text-blue-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20" />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-50">
                              <input type="text" value={item.unit || 'UN.'} readOnly className="w-full bg-transparent border-none px-1 text-[9px] text-center font-black text-slate-400 uppercase" />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button type="button" onClick={() => handleRemoveRow(idx)} className="w-8 h-8 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center transition-all mx-auto shadow-sm active:scale-90">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {items.length === 0 && (
                          <tr>
                            <td colSpan={12} className="py-32 text-center">
                              <div className="flex flex-col items-center opacity-20 grayscale">
                                <Package className="w-24 h-24 text-slate-400 mb-4 stroke-1" />
                                <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-sm">Sin Detalle de Movimiento</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Observación Global */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-400 min-w-max">
                    <FileText className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Observación Global:</span>
                  </div>
                  <input 
                    type="text"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Escriba aquí cualquier observación adicional para este movimiento..."
                    className="flex-1 bg-transparent border-none text-[11px] font-bold text-slate-700 outline-none"
                  />
                </div>
              </div>

              {/* Footer de Resumen y Acciones */}
              <div className="bg-slate-900 px-6 py-4 border-t border-slate-700 flex items-center justify-between shrink-0 shadow-2xl">
                <div className="flex gap-3">
                  <button type="button" onClick={onClose} className="px-6 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[11px] font-black text-slate-400 hover:bg-slate-700 hover:text-white flex items-center gap-2 transition-all">
                    <X className="w-4 h-4" /> CANCELAR
                  </button>
                  <button type="submit" className="px-8 py-2 bg-blue-600 border border-blue-500 rounded-xl shadow-lg shadow-blue-600/30 text-[11px] font-black text-white hover:bg-blue-500 flex items-center gap-2 transition-all active:scale-95">
                    <Save className="w-4 h-4" /> PROCESAR Y GUARDAR
                  </button>
                  <button type="button" className="px-6 py-2 bg-slate-700 border border-slate-600 rounded-xl text-[11px] font-black text-white hover:bg-slate-600 flex items-center gap-2 transition-all shadow-lg shadow-slate-900/20">
                    <FileText className="w-4 h-4 text-slate-400" /> IMPRIMIR COMPROBANTE
                  </button>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Unidades</span>
                    <div className="text-2xl font-black text-white tabular-nums">
                      {items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)}
                    </div>
                  </div>
                  <div className="w-px h-10 bg-slate-700" />
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total SKUs</span>
                    <div className="text-2xl font-black text-blue-400 tabular-nums">
                      {items.length}
                    </div>
                  </div>
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
