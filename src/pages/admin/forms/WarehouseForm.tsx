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
      <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }} 
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Mantenimiento de Almacén</h2>
                <p className="text-sm text-slate-500 font-medium">Configura ubicaciones y datos maestros</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
          </div>

          {/* Tabs */}
          <div className="flex px-8 border-b border-slate-100 bg-white">
            <button onClick={() => setActiveTab('general')} className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Datos Generales</button>
            <button onClick={() => setActiveTab('hierarchy')} className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'hierarchy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Estructura (Pisos/Zonas)</button>
          </div>

          <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-8">
            {activeTab === 'general' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Código / Siglas</label>
                    <input type="text" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" placeholder="ALMC-01" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nombre Almacén</label>
                    <input type="text" required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" placeholder="ALMACÉN CUZCO 1048" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Tipo de Almacén</label>
                    <select value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700">
                      <option value="">--Seleccionar--</option>
                      <option value="PRINCIPAL">PRINCIPAL</option>
                      <option value="DESPACHO">DESPACHO</option>
                      <option value="COMPROBANTES">COMPROBANTES</option>
                      <option value="REGULARIZACION">REGULARIZACION</option>
                      <option value="TRANSITORIO">TRANSITORIO</option>
                    </select>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={formData.validateStock} onChange={e => setFormData({...formData, validateStock: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-bold text-slate-600">Validar Stock</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-bold text-slate-600">Activo</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">RUC</label>
                    <input type="text" value={formData.ruc || ''} onChange={e => setFormData({...formData, ruc: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" placeholder="20123456789" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Dirección</label>
                    <div className="relative">
                      <MapPin className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                      <input type="text" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" placeholder="JR. CUZCO 1048 - LIMA" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Observaciones</label>
                    <textarea value={formData.observation || ''} onChange={e => setFormData({...formData, observation: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 h-24" placeholder="Notas adicionales..." />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {!formData.id ? (
                  <div className="p-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                    <p className="text-slate-500 font-bold">Guarda el almacén primero para poder configurar sus pisos y zonas.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Lista de Pisos */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-2">
                        <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2"><Layers className="w-4 h-4 text-blue-600" /> Pisos / Niveles</h3>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <input type="text" value={newFloorCode} onChange={e => setNewFloorCode(e.target.value)} placeholder="Ej: P2" className="w-1/3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase" />
                          <input type="text" value={newFloorName} onChange={e => setNewFloorName(e.target.value)} placeholder="Ej: 2DO PISO" className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase" />
                        </div>
                        <button type="button" onClick={handleAddFloor} className="p-2 bg-blue-600 text-white rounded-xl w-full flex items-center justify-center gap-2 font-bold text-sm hover:bg-blue-700 transition-colors">
                          <Plus className="w-5 h-5" /> Agregar Piso
                        </button>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {formData.floors?.map((floor: any) => (
                          editingFloorId === floor.id ? (
                            <div key={floor.id} className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col gap-2">
                              <div className="flex gap-2">
                                <input type="text" value={editFloorCode} onChange={e => setEditFloorCode(e.target.value)} className="w-1/3 px-3 py-1.5 rounded-lg text-sm font-bold uppercase border border-blue-200" placeholder="Código" />
                                <input type="text" value={editFloorName} onChange={e => setEditFloorName(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg text-sm font-bold uppercase border border-blue-200" placeholder="Nombre" />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button type="button" onClick={(e) => { e.stopPropagation(); setEditingFloorId(null); }} className="px-3 py-1 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded hover:bg-slate-50">Cancelar</button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleEditFloor(); }} className="px-3 py-1 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700">Guardar</button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              key={floor.id} 
                              onClick={() => setSelectedFloorId(floor.id)}
                              className={`p-3 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${selectedFloorId === floor.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:border-blue-100'}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded">{floor.code}</span>
                                <span className="text-sm font-bold text-slate-700">{floor.name}</span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button" onClick={(e) => { e.stopPropagation(); setEditingFloorId(floor.id); setEditFloorCode(floor.code); setEditFloorName(floor.name); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button type="button" onClick={(e) => handleDeleteFloor(e, floor.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                                <ChevronRight className={`w-4 h-4 ml-1 text-slate-400 transition-transform ${selectedFloorId === floor.id ? 'rotate-90 text-blue-600' : ''}`} />
                              </div>
                            </div>
                          )
                        ))}

                      </div>
                    </div>

                    {/* Lista de Zonas del Piso seleccionado */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2"><Grid className="w-4 h-4 text-emerald-600" /> Zonas del Piso</h3>
                      {selectedFloorId ? (
                        <>
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <input type="text" value={newZoneCode} onChange={e => setNewZoneCode(e.target.value)} placeholder="Ej: ZA" className="w-1/3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase" />
                              <input type="text" value={newZoneName} onChange={e => setNewZoneName(e.target.value)} placeholder="Ej: ZONA A (RACKS)" className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase" />
                            </div>
                            <button type="button" onClick={() => handleAddZone(selectedFloorId)} className="p-2 bg-emerald-600 text-white rounded-xl w-full flex items-center justify-center gap-2 font-bold text-sm hover:bg-emerald-700 transition-colors">
                              <Plus className="w-5 h-5" /> Agregar Zona
                            </button>
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                            {formData.floors?.find((f: any) => f.id === selectedFloorId)?.zones?.map((zone: any) => (
                              editingZoneId === zone.id ? (
                                <div key={zone.id} className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col gap-2">
                                  <div className="flex gap-2">
                                    <input type="text" value={editZoneCode} onChange={e => setEditZoneCode(e.target.value)} className="w-1/3 px-3 py-1.5 rounded-lg text-sm font-bold uppercase border border-emerald-200" placeholder="Código" />
                                    <input type="text" value={editZoneName} onChange={e => setEditZoneName(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg text-sm font-bold uppercase border border-emerald-200" placeholder="Nombre" />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button type="button" onClick={() => setEditingZoneId(null)} className="px-3 py-1 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded hover:bg-slate-50">Cancelar</button>
                                    <button type="button" onClick={handleEditZone} className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 rounded hover:bg-emerald-700">Guardar</button>
                                  </div>
                                </div>
                              ) : (
                                <div key={zone.id} className="p-3 bg-emerald-50/30 border border-emerald-100 rounded-2xl flex justify-between items-center group">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">{zone.code}</span>
                                    <span className="text-sm font-bold text-slate-700">{zone.name}</span>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button type="button" onClick={() => { setEditingZoneId(zone.id); setEditZoneCode(zone.code); setEditZoneName(zone.name); }} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"><Edit2 className="w-4 h-4" /></button>
                                    <button type="button" onClick={(e) => handleDeleteZone(e, zone.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </div>
                              )
                            ))}
                            {(!formData.floors?.find((f: any) => f.id === selectedFloorId)?.zones?.length) && (
                              <p className="text-center text-[11px] text-slate-400 font-bold py-8 italic">No hay zonas configuradas en este piso</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="h-48 flex items-center justify-center bg-slate-50 rounded-3xl border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center px-8">Selecciona un piso para gestionar sus zonas</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
            <button type="submit" onClick={onSubmit} disabled={loading} className="px-10 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center gap-2">
              {loading ? 'Guardando...' : <><Save className="w-5 h-5" /> Guardar Almacén</>}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
