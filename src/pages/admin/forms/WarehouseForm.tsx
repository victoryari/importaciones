import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Building2, MapPin, Phone, Info, Layers, Grid, ChevronRight, ChevronDown, Plus, Trash2, Edit2, Hash } from 'lucide-react';
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
      alert(err.response?.data?.error || 'Error al agregar piso. Es posible que el nombre o código ya existan.');
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
      alert(err.response?.data?.error || 'Error al agregar zona. Es posible que el nombre o código ya existan.');
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
      <div className="absolute inset-0 z-110 flex items-center justify-center p-0 overflow-hidden">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 10 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.98, y: 10 }} 
          className="relative w-full h-full max-w-[95%] max-h-[95vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300"
        >
          {/* Header ERP Style */}
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-800" />
              <h2 className="text-sm font-bold text-slate-700 tracking-tight">Mantenimiento de Almacén</h2>
            </div>
            <div className="flex items-center gap-4">
              {formData.id && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">ID:</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">{formData.id}</span>
                </div>
              )}
              <button onClick={onClose} className="hover:bg-red-500 hover:text-white p-1 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-Header / Tabs Compact */}
          <div className="flex bg-slate-50 border-b border-slate-200 px-2 shrink-0">
            <button 
              onClick={() => setActiveTab('general')} 
              className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'general' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Datos Generales
            </button>
            <button 
              onClick={() => setActiveTab('hierarchy')} 
              className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'hierarchy' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Estructura (Pisos/Zonas)
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex-1 overflow-hidden flex flex-col bg-[#F8FAFC]">
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'general' ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-7 space-y-4">
                    <fieldset className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
                      <legend className="text-[10px] font-bold text-blue-700 px-2 uppercase">Identificación y Tipo</legend>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Código / Siglas</label>
                          <input type="text" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-slate-50" placeholder="ALMC-01" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tipo Almacén</label>
                          <select value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} className="h-8 w-full border border-slate-300 rounded px-1 text-xs font-bold bg-white">
                            <option value="">--Seleccionar--</option>
                            <option value="PRINCIPAL">PRINCIPAL</option>
                            <option value="DESPACHO">DESPACHO</option>
                            <option value="COMPROBANTES">COMPROBANTES</option>
                            <option value="REGULARIZACION">REGULARIZACION</option>
                            <option value="TRANSITORIO">TRANSITORIO</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nombre Completo</label>
                        <input type="text" required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-blue-50 text-blue-900" placeholder="ALMACÉN CENTRAL" />
                      </div>
                      <div className="flex gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" checked={formData.validateStock} onChange={e => setFormData({...formData, validateStock: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                          <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600 transition-colors">Validar Stock</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                          <span className="text-[11px] font-bold text-slate-600 group-hover:text-emerald-600 transition-colors">Estado Activo</span>
                        </label>
                      </div>
                    </fieldset>

                    <fieldset className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
                      <legend className="text-[10px] font-bold text-slate-700 px-2 uppercase">Ubicación y Contacto</legend>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Dirección Fiscal / Punto de Partida</label>
                        <div className="relative">
                          <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                          <input type="text" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="h-8 w-full border border-slate-300 rounded pl-8 pr-2 text-xs font-medium" placeholder="AV. LOS PROCERES 123 - LIMA" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">RUC Asociado</label>
                          <input type="text" value={formData.ruc || ''} onChange={e => setFormData({...formData, ruc: e.target.value})} className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold" placeholder="20XXXXXXXXX" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Teléfono</label>
                          <div className="relative">
                            <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                            <input type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-8 w-full border border-slate-300 rounded pl-8 pr-2 text-xs font-medium" placeholder="01-XXXXXXX" />
                          </div>
                        </div>
                      </div>
                    </fieldset>
                  </div>

                  <div className="md:col-span-5 space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm h-full flex flex-col">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-2 mb-2"><Info className="w-3.5 h-3.5" /> Observaciones Internas</label>
                      <textarea value={formData.observation || ''} onChange={e => setFormData({...formData, observation: e.target.value})} className="flex-1 w-full p-3 border border-slate-300 rounded text-xs font-medium resize-none focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Notas adicionales del almacén..." />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {!formData.id ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-slate-200 border-dashed m-2">
                      <Layers className="w-12 h-12 text-slate-200 mb-4" />
                      <p className="text-slate-500 font-bold text-sm text-center">Guarda los datos generales primero para poder gestionar la estructura del almacén.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden">
                      {/* Lista de Pisos */}
                      <div className="flex flex-col gap-3 h-full overflow-hidden">
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
                          <h3 className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-2"><Layers className="w-4 h-4 text-blue-600" /> Gestión de Pisos / Niveles</h3>
                          <div className="flex gap-2">
                            <input type="text" value={newFloorCode} onChange={e => setNewFloorCode(e.target.value)} placeholder="COD" className="w-16 h-8 border border-slate-300 rounded px-2 text-[10px] font-black uppercase" />
                            <input type="text" value={newFloorName} onChange={e => setNewFloorName(e.target.value)} placeholder="NOMBRE DEL PISO" className="flex-1 h-8 border border-slate-300 rounded px-2 text-[10px] font-bold uppercase" />
                            <button type="button" onClick={handleAddFloor} className="h-8 px-3 bg-blue-800 text-white rounded font-black text-[10px] hover:bg-blue-900 transition-colors uppercase flex items-center gap-1">
                              <Plus className="w-3.5 h-3.5" /> Añadir
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1 bg-slate-50/50 p-2 rounded-lg border border-slate-200">
                          {formData.floors?.map((floor: any) => (
                            editingFloorId === floor.id ? (
                              <div key={floor.id} className="p-2 bg-blue-50 border border-blue-200 rounded flex items-center gap-2">
                                <input type="text" value={editFloorCode} onChange={e => setEditFloorCode(e.target.value)} className="w-14 h-7 text-[10px] font-black border border-blue-300 rounded px-1.5 uppercase" />
                                <input type="text" value={editFloorName} onChange={e => setEditFloorName(e.target.value)} className="flex-1 h-7 text-[10px] font-bold border border-blue-300 rounded px-1.5 uppercase" />
                                <div className="flex gap-1">
                                  <button type="button" onClick={() => setEditingFloorId(null)} className="p-1 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                  <button type="button" onClick={handleEditFloor} className="p-1 text-emerald-600 hover:text-emerald-700"><Save className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                key={floor.id} 
                                onClick={() => setSelectedFloorId(floor.id)}
                                className={`p-2 rounded border transition-all cursor-pointer flex justify-between items-center group ${selectedFloorId === floor.id ? 'bg-blue-100 border-blue-300' : 'bg-white border-slate-200 hover:border-blue-200'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-blue-700 bg-blue-200/50 px-1.5 py-0.5 rounded border border-blue-200">{floor.code}</span>
                                  <span className="text-[10px] font-black text-slate-700 uppercase">{floor.name}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <div className="flex flex-col gap-3 h-full overflow-hidden border-l border-slate-200 pl-6">
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
                          <h3 className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-2"><Grid className="w-4 h-4 text-emerald-600" /> Zonas del Nivel</h3>
                          {selectedFloorId ? (
                            <div className="flex gap-2">
                              <input type="text" value={newZoneCode} onChange={e => setNewZoneCode(e.target.value)} placeholder="COD" className="w-16 h-8 border border-slate-300 rounded px-2 text-[10px] font-black uppercase" />
                              <input type="text" value={newZoneName} onChange={e => setNewZoneName(e.target.value)} placeholder="NOMBRE DE LA ZONA" className="flex-1 h-8 border border-slate-300 rounded px-2 text-[10px] font-bold uppercase" />
                              <button type="button" onClick={() => handleAddZone(selectedFloorId)} className="h-8 px-3 bg-emerald-700 text-white rounded font-black text-[10px] hover:bg-emerald-800 transition-colors uppercase flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" /> Añadir
                              </button>
                            </div>
                          ) : (
                            <div className="h-8 bg-slate-50 border border-slate-200 rounded flex items-center justify-center">
                              <p className="text-[9px] font-black text-slate-400 uppercase">Selecciona un piso primero</p>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1 bg-slate-50/50 p-2 rounded-lg border border-slate-200">
                          {selectedFloorId ? (
                            formData.floors?.find((f: any) => f.id === selectedFloorId)?.zones?.map((zone: any) => (
                              editingZoneId === zone.id ? (
                                <div key={zone.id} className="p-2 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-2">
                                  <input type="text" value={editZoneCode} onChange={e => setEditZoneCode(e.target.value)} className="w-14 h-7 text-[10px] font-black border border-emerald-300 rounded px-1.5 uppercase" />
                                  <input type="text" value={editZoneName} onChange={e => setEditZoneName(e.target.value)} className="flex-1 h-7 text-[10px] font-bold border border-emerald-300 rounded px-1.5 uppercase" />
                                  <div className="flex gap-1">
                                    <button type="button" onClick={() => setEditingZoneId(null)} className="p-1 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                    <button type="button" onClick={handleEditZone} className="p-1 text-emerald-600 hover:text-emerald-700"><Save className="w-3.5 h-3.5" /></button>
                                  </div>
                                </div>
                              ) : (
                                <div key={zone.id} className="p-2 rounded border border-emerald-100 bg-white flex justify-between items-center group">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">{zone.code}</span>
                                    <span className="text-[10px] font-black text-slate-700 uppercase">{zone.name}</span>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button type="button" onClick={() => { setEditingZoneId(zone.id); setEditZoneCode(zone.code); setEditZoneName(zone.name); }} className="p-1 text-slate-400 hover:text-emerald-600"><Edit2 className="w-3 h-3" /></button>
                                    <button type="button" onClick={(e) => handleDeleteZone(e, zone.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              )
                            ))
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center p-8 opacity-40">
                              <Grid className="w-10 h-10 text-slate-400 mb-2" />
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Sin selección de nivel</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={onClose}
                className="px-6 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded text-xs transition-all uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                onClick={onSubmit}
                disabled={loading}
                className="px-8 h-10 bg-blue-800 hover:bg-blue-900 text-white font-black rounded shadow-lg shadow-blue-100 transition-all flex items-center gap-2 disabled:bg-blue-300 uppercase text-xs"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Procesando...' : 'Guardar Almacén'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
