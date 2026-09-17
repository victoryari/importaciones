import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Save, Building2, MapPin, Phone, Info, Layers, 
  Grid, ChevronRight, Plus, Trash2, Edit2, RefreshCw 
} from 'lucide-react';
import axios from 'axios';

interface WarehouseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  loading: boolean;
  token: string;
  refreshData: () => Promise<void>;
}

export const WarehouseForm: React.FC<WarehouseFormProps> = ({
  isOpen, onClose, onSubmit, formData, setFormData, loading, token, refreshData
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'hierarchy'>('general');
  const [newFloorName, setNewFloorName] = useState('');
  const [newFloorCode, setNewFloorCode] = useState('');
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCode, setNewZoneCode] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);

  const [editingFloorId, setEditingFloorId] = useState<number | null>(null);
  const [editFloorName, setEditFloorName] = useState('');
  const [editFloorCode, setEditFloorCode] = useState('');

  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [editZoneName, setEditZoneName] = useState('');
  const [editZoneCode, setEditZoneCode] = useState('');

  const fetchCurrentWarehouse = async () => {
    try {
      const res = await axios.get(`/api/warehouses`, { headers: { Authorization: `Bearer ${token}` } });
      const currentWarehouse = res.data.find((w: any) => w.id === formData.id);
      if (currentWarehouse) {
        setFormData(currentWarehouse);
      }
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFloor = async () => {
    if (!newFloorName || !newFloorCode || !formData.id) return;
    try {
      await axios.post('/api/warehouses/floors', {
        warehouseId: formData.id,
        name: newFloorName,
        code: newFloorCode
      }, { headers: { Authorization: `Bearer ${token}` } });
      setNewFloorName('');
      setNewFloorCode('');
      await fetchCurrentWarehouse();
    } catch (err: any) { 
      console.error(err); 
      alert(err.response?.data?.error || 'Error al agregar piso.');
    }
  };

  const handleEditFloor = async () => {
    if (!editFloorName || !editFloorCode || !editingFloorId) return;
    try {
      await axios.put(`/api/warehouses/floors/${editingFloorId}`, {
        name: editFloorName, code: editFloorCode
      }, { headers: { Authorization: `Bearer ${token}` } });
      setEditingFloorId(null);
      await fetchCurrentWarehouse();
    } catch (err: any) { alert(err.response?.data?.error || 'Error al actualizar'); }
  };

  const handleDeleteFloor = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('¿Seguro que desea eliminar este piso? No podrá deshacer esta acción.')) return;
    try {
      await axios.delete(`/api/warehouses/floors/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (selectedFloorId === id) setSelectedFloorId(null);
      await fetchCurrentWarehouse();
    } catch (err: any) { alert(err.response?.data?.error || 'Error al eliminar'); }
  };

  const handleAddZone = async (floorId: number) => {
    if (!newZoneName || !newZoneCode) return;
    try {
      await axios.post('/api/warehouses/zones', {
        floorId,
        name: newZoneName,
        code: newZoneCode
      }, { headers: { Authorization: `Bearer ${token}` } });
      setNewZoneName('');
      setNewZoneCode('');
      await fetchCurrentWarehouse();
    } catch (err: any) { 
      console.error(err); 
      alert(err.response?.data?.error || 'Error al agregar zona.');
    }
  };

  const handleEditZone = async () => {
    if (!editZoneName || !editZoneCode || !editingZoneId) return;
    try {
      await axios.put(`/api/warehouses/zones/${editingZoneId}`, {
        name: editZoneName, code: editZoneCode
      }, { headers: { Authorization: `Bearer ${token}` } });
      setEditingZoneId(null);
      await fetchCurrentWarehouse();
    } catch (err: any) { alert(err.response?.data?.error || 'Error al actualizar'); }
  };

  const handleDeleteZone = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('¿Seguro que desea eliminar esta zona?')) return;
    try {
      await axios.delete(`/api/warehouses/zones/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchCurrentWarehouse();
    } catch (err: any) { alert(err.response?.data?.error || 'Error al eliminar'); }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center p-3 overflow-hidden">
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
            className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[92vh]"
          >
            {/* Header Compacto ERP */}
            <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white/10 rounded">
                  <Building2 className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold text-white uppercase tracking-tight">
                      {formData.id ? 'Editar Almacén / Mantenimiento' : 'Registro de Nuevo Almacén'}
                    </h2>
                    {formData.id && (
                      <span className="bg-white/20 text-white px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">
                        ID: {formData.id}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-blue-200 uppercase font-medium">Gestión de Sedes y Ubicaciones Físicas</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-Header / Tabs Compact */}
            <div className="flex bg-slate-100/90 border-b border-slate-200 px-3 shrink-0 gap-1 pt-1">
              <button 
                type="button"
                onClick={() => setActiveTab('general')} 
                className={`px-4 py-1.5 text-xs font-bold uppercase rounded-t-md transition-all ${
                  activeTab === 'general' 
                    ? 'bg-white text-blue-900 border-t-2 border-t-blue-700 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Datos Generales
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('hierarchy')} 
                className={`px-4 py-1.5 text-xs font-bold uppercase rounded-t-md transition-all ${
                  activeTab === 'hierarchy' 
                    ? 'bg-white text-blue-900 border-t-2 border-t-blue-700 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Estructura (Pisos / Zonas)
              </button>
            </div>

            <form 
              onSubmit={onSubmit} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
              className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/70"
            >
              {activeTab === 'general' ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  <div className="md:col-span-7 space-y-2.5">
                    {/* Identificación y Tipo */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-700" />
                        <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">Identificación y Tipo</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Código / Siglas</label>
                          <input 
                            type="text" 
                            value={formData.code || ''} 
                            onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                            className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold font-mono bg-slate-50 text-slate-800 focus:border-blue-500 outline-none" 
                            placeholder="ALMC-01" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-blue-800 uppercase">Cód. SUNAT (4 Dígitos)</label>
                          <input 
                            type="text" 
                            maxLength={4} 
                            value={formData.sunatCode || ''} 
                            onChange={e => setFormData({...formData, sunatCode: e.target.value})} 
                            className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-mono font-bold bg-blue-50/70 text-blue-900 focus:border-blue-500 outline-none" 
                            placeholder="0000" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Tipo Almacén</label>
                          <select 
                            value={formData.type || ''} 
                            onChange={e => setFormData({...formData, type: e.target.value})} 
                            className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-slate-800 bg-white focus:border-blue-500 outline-none uppercase"
                          >
                            <option value="">-- SELECCIONE --</option>
                            <option value="PRINCIPAL">PRINCIPAL</option>
                            <option value="DESPACHO">DESPACHO</option>
                            <option value="COMPROBANTES">COMPROBANTES</option>
                            <option value="REGULARIZACION">REGULARIZACION</option>
                            <option value="TRANSITORIO">TRANSITORIO</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">Nombre Completo del Almacén</label>
                        <input 
                          type="text" 
                          required 
                          value={formData.name || ''} 
                          onChange={e => setFormData({...formData, name: e.target.value})} 
                          className="h-8 w-full border border-slate-300 rounded px-2.5 text-xs font-bold text-blue-900 uppercase focus:border-blue-500 outline-none" 
                          placeholder="ALMACÉN CENTRAL CUZCO" 
                        />
                      </div>

                      <div className="flex gap-4 pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={formData.validateStock} 
                            onChange={e => setFormData({...formData, validateStock: e.target.checked})} 
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                          />
                          <span className="text-[10px] font-bold text-slate-700 uppercase">Validar Stock Físico</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={formData.isActive !== false} 
                            onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                          />
                          <span className="text-[10px] font-bold text-slate-700 uppercase">Almacén Activo</span>
                        </label>
                      </div>
                    </div>

                    {/* Ubicación y Contacto */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-700" />
                        <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">Ubicación y Contacto</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">Dirección Fiscal / Punto de Partida</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={formData.address || ''} 
                            onChange={e => setFormData({...formData, address: e.target.value})} 
                            className="h-8 w-full border border-slate-300 rounded pl-7 pr-2 text-xs font-medium text-slate-800 uppercase focus:border-blue-500 outline-none" 
                            placeholder="AV. LOS PROCERES 123 - LIMA" 
                          />
                          <MapPin className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">RUC Asociado</label>
                          <input 
                            type="text" 
                            value={formData.ruc || ''} 
                            onChange={e => setFormData({...formData, ruc: e.target.value})} 
                            className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold font-mono text-slate-800 focus:border-blue-500 outline-none" 
                            placeholder="20XXXXXXXXX" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Teléfono / Celular</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={formData.phone || ''} 
                              onChange={e => setFormData({...formData, phone: e.target.value})} 
                              className="h-8 w-full border border-slate-300 rounded pl-7 pr-2 text-xs font-medium text-slate-800 focus:border-blue-500 outline-none" 
                              placeholder="01-XXXXXXX" 
                            />
                            <Phone className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-5 space-y-2.5">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs h-full flex flex-col space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <Info className="w-3.5 h-3.5 text-blue-700" /> Observaciones Internas
                      </label>
                      <textarea 
                        value={formData.observation || ''} 
                        onChange={e => setFormData({...formData, observation: e.target.value})} 
                        className="flex-1 w-full p-2.5 border border-slate-300 rounded text-xs font-medium resize-none focus:border-blue-500 outline-none min-h-[140px]" 
                        placeholder="Notas adicionales del almacén..." 
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {!formData.id ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-lg border border-slate-200 border-dashed">
                      <Layers className="w-10 h-10 text-slate-300 mb-2" />
                      <p className="text-slate-600 font-bold text-xs text-center">
                        Guarda los datos generales primero para poder gestionar la estructura de pisos y zonas.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full overflow-hidden">
                      {/* Lista de Pisos */}
                      <div className="flex flex-col gap-2 h-full overflow-hidden">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col gap-1.5">
                          <h3 className="text-[10px] font-bold text-blue-950 uppercase flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-blue-700" /> Gestión de Pisos / Niveles
                          </h3>
                          <div className="flex gap-1.5">
                            <input 
                              type="text" 
                              value={newFloorCode} 
                              onChange={e => setNewFloorCode(e.target.value.toUpperCase())} 
                              placeholder="COD" 
                              className="w-16 h-8 border border-slate-300 rounded px-2 text-xs font-mono font-bold uppercase bg-white focus:border-blue-500 outline-none" 
                            />
                            <input 
                              type="text" 
                              value={newFloorName} 
                              onChange={e => setNewFloorName(e.target.value.toUpperCase())} 
                              placeholder="NOMBRE DEL PISO (EJ. 1ER PISO)" 
                              className="flex-1 h-8 border border-slate-300 rounded px-2 text-xs font-bold uppercase bg-white focus:border-blue-500 outline-none" 
                            />
                            <button 
                              type="button" 
                              onClick={handleAddFloor} 
                              className="h-8 px-3 bg-[#004A99] hover:bg-blue-800 text-white rounded text-xs font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Añadir
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-slate-200 max-h-[300px]">
                          {formData.floors?.map((floor: any) => (
                            editingFloorId === floor.id ? (
                              <div key={floor.id} className="p-1.5 bg-blue-50 border border-blue-200 rounded flex items-center gap-1.5">
                                <input type="text" value={editFloorCode} onChange={e => setEditFloorCode(e.target.value.toUpperCase())} className="w-14 h-7 text-xs font-bold font-mono border border-blue-300 rounded px-1.5 uppercase" />
                                <input type="text" value={editFloorName} onChange={e => setEditFloorName(e.target.value.toUpperCase())} className="flex-1 h-7 text-xs font-bold border border-blue-300 rounded px-1.5 uppercase" />
                                <div className="flex gap-1">
                                  <button type="button" onClick={() => setEditingFloorId(null)} className="p-1 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                  <button type="button" onClick={handleEditFloor} className="p-1 text-emerald-600 hover:text-emerald-700"><Save className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                key={floor.id} 
                                onClick={() => setSelectedFloorId(floor.id)}
                                className={`p-2 rounded border transition-all cursor-pointer flex justify-between items-center group ${selectedFloorId === floor.id ? 'bg-blue-100/70 border-blue-300' : 'bg-slate-50/60 border-slate-200 hover:border-blue-200'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-mono font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">{floor.code}</span>
                                  <span className="text-xs font-bold text-slate-800 uppercase">{floor.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button type="button" onClick={(e) => { e.stopPropagation(); setEditingFloorId(floor.id); setEditFloorCode(floor.code); setEditFloorName(floor.name); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 className="w-3 h-3" /></button>
                                  <button type="button" onClick={(e) => handleDeleteFloor(e, floor.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                  <ChevronRight className={`w-3.5 h-3.5 ml-1 text-slate-400 transition-transform ${selectedFloorId === floor.id ? 'rotate-90 text-blue-600' : ''}`} />
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      </div>

                      {/* Lista de Zonas */}
                      <div className="flex flex-col gap-2 h-full overflow-hidden">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col gap-1.5">
                          <h3 className="text-[10px] font-bold text-blue-950 uppercase flex items-center gap-1.5">
                            <Grid className="w-3.5 h-3.5 text-emerald-700" /> Zonas del Nivel
                          </h3>
                          {selectedFloorId ? (
                            <div className="flex gap-1.5">
                              <input 
                                type="text" 
                                value={newZoneCode} 
                                onChange={e => setNewZoneCode(e.target.value.toUpperCase())} 
                                placeholder="COD" 
                                className="w-16 h-8 border border-slate-300 rounded px-2 text-xs font-mono font-bold uppercase bg-white focus:border-blue-500 outline-none" 
                              />
                              <input 
                                type="text" 
                                value={newZoneName} 
                                onChange={e => setNewZoneName(e.target.value.toUpperCase())} 
                                placeholder="NOMBRE DE LA ZONA (EJ. ZONA A)" 
                                className="flex-1 h-8 border border-slate-300 rounded px-2 text-xs font-bold uppercase bg-white focus:border-blue-500 outline-none" 
                              />
                              <button 
                                type="button" 
                                onClick={() => handleAddZone(selectedFloorId)} 
                                className="h-8 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" /> Añadir
                              </button>
                            </div>
                          ) : (
                            <div className="h-8 bg-slate-50 border border-slate-200 rounded flex items-center justify-center">
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Seleccione un piso a la izquierda</p>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-slate-200 max-h-[300px]">
                          {selectedFloorId ? (
                            formData.floors?.find((f: any) => f.id === selectedFloorId)?.zones?.map((zone: any) => (
                              editingZoneId === zone.id ? (
                                <div key={zone.id} className="p-1.5 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-1.5">
                                  <input type="text" value={editZoneCode} onChange={e => setEditZoneCode(e.target.value.toUpperCase())} className="w-14 h-7 text-xs font-bold font-mono border border-emerald-300 rounded px-1.5 uppercase" />
                                  <input type="text" value={editZoneName} onChange={e => setEditZoneName(e.target.value.toUpperCase())} className="flex-1 h-7 text-xs font-bold border border-emerald-300 rounded px-1.5 uppercase" />
                                  <div className="flex gap-1">
                                    <button type="button" onClick={() => setEditingZoneId(null)} className="p-1 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                    <button type="button" onClick={handleEditZone} className="p-1 text-emerald-600 hover:text-emerald-700"><Save className="w-3.5 h-3.5" /></button>
                                  </div>
                                </div>
                              ) : (
                                <div key={zone.id} className="p-2 rounded border border-emerald-100 bg-emerald-50/40 flex justify-between items-center group">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">{zone.code}</span>
                                    <span className="text-xs font-bold text-slate-800 uppercase">{zone.name}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <button type="button" onClick={() => { setEditingZoneId(zone.id); setEditZoneCode(zone.code); setEditZoneName(zone.name); }} className="p-1 text-slate-400 hover:text-emerald-600"><Edit2 className="w-3 h-3" /></button>
                                    <button type="button" onClick={(e) => handleDeleteZone(e, zone.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              )
                            ))
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center p-8 opacity-40">
                              <Grid className="w-8 h-8 text-slate-400 mb-1" />
                              <p className="text-[10px] font-bold text-slate-500 uppercase text-center">Sin selección de nivel</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* Footer Compacto */}
            <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button 
                type="button" 
                onClick={onClose}
                className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-red-500" /> Cancelar
              </button>

              <button 
                type="button" 
                onClick={onSubmit}
                disabled={loading}
                className="h-8 px-5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {loading ? 'Guardando...' : (formData.id ? 'Actualizar Almacén' : 'Guardar Almacén')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
