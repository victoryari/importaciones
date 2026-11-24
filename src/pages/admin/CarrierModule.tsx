import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
  Truck, Plus, Search, Edit2, Trash2, X, Save, User,
  Building2, RefreshCw, ShieldCheck, Phone
} from 'lucide-react';

interface CarrierModuleProps {
  token: string;
  onRefresh?: () => void;
}

export const CarrierModule: React.FC<CarrierModuleProps> = ({ token, onRefresh }) => {
  const [carriers, setCarriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'vehicles' | 'drivers'>('general');
  const [saving, setSaving] = useState(false);
  const [consultingRuc, setConsultingRuc] = useState(false);
  const [consultingDni, setConsultingDni] = useState(false);

  const [formData, setFormData] = useState<any>({
    id: null,
    ruc: '',
    name: '',
    address: '',
    mtcNumber: '',
    phone: '',
    email: '',
    isOwnFleet: false,
    isActive: true,
    vehicles: [],
    drivers: []
  });

  // Inline vehicle form
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [newVehicle, setNewVehicle] = useState({
    plate: '',
    brand: '',
    model: '',
    mtcNumber: '',
    tuce: ''
  });

  // Inline driver form
  const [editingDriverId, setEditingDriverId] = useState<number | null>(null);
  const [newDriver, setNewDriver] = useState({
    docNumber: '',
    name: '',
    licenseNumber: ''
  });

  const fetchCarriers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/carriers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setCarriers(list);
      if (formData.id) {
        const updated = list.find((c: any) => c.id === formData.id);
        if (updated) setFormData(updated);
      }
    } catch (err) {
      console.error('Error fetching carriers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCarriers();
  }, [token]);

  const openNewModal = () => {
    setFormData({
      id: null,
      ruc: '',
      name: '',
      address: '',
      mtcNumber: '',
      phone: '',
      email: '',
      isOwnFleet: false,
      isActive: true,
      vehicles: [],
      drivers: []
    });
    setActiveTab('general');
    handleCancelEditVehicle();
    handleCancelEditDriver();
    setIsModalOpen(true);
  };

  const openEditModal = (carrier: any) => {
    setFormData({ ...carrier });
    setActiveTab('general');
    handleCancelEditVehicle();
    handleCancelEditDriver();
    setIsModalOpen(true);
  };

  const handleConsultRuc = async () => {
    const clean = String(formData.ruc || '').trim();
    if (!/^\d{11}$/.test(clean)) return alert('Ingrese un RUC válido de 11 dígitos');
    setConsultingRuc(true);
    try {
      const res = await axios.get(`/api/consult/ruc/${clean}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setFormData((prev: any) => ({
          ...prev,
          name: (res.data.razonSocial || res.data.nombre || prev.name || '').toUpperCase(),
          address: (res.data.direccion || prev.address || '').toUpperCase()
        }));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'No se pudo consultar el RUC en SUNAT');
    } finally {
      setConsultingRuc(false);
    }
  };

  const handleConsultDni = async () => {
    const clean = String(newDriver.docNumber || '').trim();
    if (!/^\d{8}$/.test(clean)) return alert('Ingrese un DNI válido de 8 dígitos');
    setConsultingDni(true);
    try {
      const res = await axios.get(`/api/consult/dni/${clean}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        const fullName = `${res.data.nombres || ''} ${res.data.apellidoPaterno || ''} ${res.data.apellidoMaterno || ''}`.trim();
        setNewDriver(prev => ({
          ...prev,
          name: (fullName || res.data.nombre || prev.name || '').toUpperCase()
        }));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'No se pudo consultar el DNI en RENIEC');
    } finally {
      setConsultingDni(false);
    }
  };

  const handleSaveCarrier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let saved: any;
      if (formData.id) {
        const res = await axios.put(`/api/carriers/${formData.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        saved = res.data;
      } else {
        const res = await axios.post('/api/carriers', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        saved = res.data;
      }
      setFormData(saved);
      await fetchCarriers();
      if (onRefresh) onRefresh();
      if (!formData.id) {
        setActiveTab('vehicles');
      } else {
        setIsModalOpen(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al guardar transportista');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCarrier = async (id: number) => {
    if (!confirm('¿Seguro que desea eliminar esta empresa de transporte?')) return;
    try {
      await axios.delete(`/api/carriers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCarriers();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar transportista');
    }
  };

  const handleSaveVehicle = async () => {
    if (!formData.id) return;
    if (!newVehicle.plate.trim()) return alert('La placa es obligatoria');
    try {
      if (editingVehicleId) {
        await axios.put(`/api/vehicles/${editingVehicleId}`, {
          ...newVehicle,
          carrierId: formData.id
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/api/vehicles', {
          ...newVehicle,
          carrierId: formData.id
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      setEditingVehicleId(null);
      setNewVehicle({ plate: '', brand: '', model: '', mtcNumber: '', tuce: '' });
      await fetchCarriers();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || (editingVehicleId ? 'Error al actualizar vehículo' : 'Error al agregar vehículo'));
    }
  };

  const handleEditVehicle = (v: any) => {
    setEditingVehicleId(v.id);
    setNewVehicle({
      plate: v.plate || '',
      brand: v.brand || '',
      model: v.model || '',
      mtcNumber: v.mtcNumber || '',
      tuce: v.tuce || ''
    });
  };

  const handleCancelEditVehicle = () => {
    setEditingVehicleId(null);
    setNewVehicle({ plate: '', brand: '', model: '', mtcNumber: '', tuce: '' });
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!confirm('¿Eliminar esta unidad de transporte?')) return;
    try {
      await axios.delete(`/api/vehicles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (editingVehicleId === id) handleCancelEditVehicle();
      await fetchCarriers();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar vehículo');
    }
  };

  const handleSaveDriver = async () => {
    if (!formData.id) return;
    if (!newDriver.docNumber.trim() || !newDriver.name.trim()) {
      return alert('El DNI y el nombre del chofer son obligatorios');
    }
    try {
      if (editingDriverId) {
        await axios.put(`/api/drivers/${editingDriverId}`, {
          ...newDriver,
          carrierId: formData.id
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/api/drivers', {
          ...newDriver,
          carrierId: formData.id
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      setEditingDriverId(null);
      setNewDriver({ docNumber: '', name: '', licenseNumber: '' });
      await fetchCarriers();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || (editingDriverId ? 'Error al actualizar chofer' : 'Error al agregar chofer'));
    }
  };

  const handleEditDriver = (d: any) => {
    setEditingDriverId(d.id);
    setNewDriver({
      docNumber: d.docNumber || '',
      name: d.name || '',
      licenseNumber: d.licenseNumber || ''
    });
  };

  const handleCancelEditDriver = () => {
    setEditingDriverId(null);
    setNewDriver({ docNumber: '', name: '', licenseNumber: '' });
  };

  const handleDeleteDriver = async (id: number) => {
    if (!confirm('¿Eliminar este chofer?')) return;
    try {
      await axios.delete(`/api/drivers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (editingDriverId === id) handleCancelEditDriver();
      await fetchCarriers();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar chofer');
    }
  };

  const filteredCarriers = carriers.filter(c => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      c.ruc?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.mtcNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Empresas de Transporte (Transportistas)</h2>
          <p className="text-[11px] font-bold text-[#004A99] uppercase tracking-wider">
            Módulo de Logística: Flota propia, transportistas externos, unidades y choferes
          </p>
        </div>
        <button
          type="button"
          onClick={openNewModal}
          className="h-9 bg-[#004A99] hover:bg-[#003B7A] text-white px-4 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-2xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nuevo Transportista
        </button>
      </div>

      {/* Filtro */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por RUC, razón social o registro MTC..."
            className="w-full h-8 pl-8 pr-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          />
        </div>
        <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
          {loading ? 'Cargando...' : `${filteredCarriers.length} transportista(s)`}
        </span>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider font-bold text-slate-600">
              <tr>
                <th className="px-4 py-2.5">RUC / Razón Social</th>
                <th className="px-4 py-2.5">Registro MTC</th>
                <th className="px-4 py-2.5">Dirección / Contacto</th>
                <th className="px-4 py-2.5 text-center">Unidades</th>
                <th className="px-4 py-2.5 text-center">Choferes</th>
                <th className="px-4 py-2.5 text-center">Estado</th>
                <th className="px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCarriers.map(c => (
                <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 uppercase">{c.name}</span>
                      {c.isOwnFleet && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#004A99] text-white uppercase">
                          Flota Propia
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">RUC: {c.ruc}</div>
                  </td>
                  <td className="px-4 py-2.5 font-mono font-bold text-slate-700">
                    {c.mtcNumber || '-'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    <div className="truncate max-w-xs">{c.address || 'Sin dirección'}</div>
                    {c.phone && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => { openEditModal(c); setActiveTab('vehicles'); }}
                      className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#004A99] border border-blue-200 font-bold text-[11px] hover:bg-blue-100 cursor-pointer"
                    >
                      {c.vehicles?.length || 0} vehículo(s)
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => { openEditModal(c); setActiveTab('drivers'); }}
                      className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] hover:bg-emerald-100 cursor-pointer"
                    >
                      {c.drivers?.length || 0} chofer(es)
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      c.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {c.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="p-1.5 bg-blue-50 text-[#004A99] hover:bg-[#004A99] hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Editar transportista"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCarrier(c.id)}
                        className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar transportista"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCarriers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                    No hay empresas de transporte registradas. Haz clic en "Nuevo Transportista" para comenzar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Estándar ERP */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[92vh]"
            >
              {/* Cabecera Institucional */}
              <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white/10 rounded">
                    <Truck className="w-4 h-4 text-blue-200" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-tight">
                      {formData.id ? 'Editar Transportista / Flota' : 'Registro de Nuevo Transportista'}
                    </h2>
                    <p className="text-[9px] text-blue-200 uppercase font-medium">
                      Módulo de Logística · Datos Legales, Unidades y Choferes
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Pestañas */}
              <div className="px-4 pt-2 bg-slate-100/80 border-b border-slate-200 flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('general')}
                  className={`px-3 py-1.5 text-[11px] font-bold uppercase rounded-t-lg border-t border-x transition-colors cursor-pointer ${
                    activeTab === 'general' ? 'bg-white text-[#004A99] border-slate-200' : 'text-slate-500 border-transparent hover:text-slate-800'
                  }`}
                >
                  Datos Generales
                </button>
                <button
                  type="button"
                  disabled={!formData.id}
                  onClick={() => setActiveTab('vehicles')}
                  className={`px-3 py-1.5 text-[11px] font-bold uppercase rounded-t-lg border-t border-x transition-colors disabled:opacity-40 cursor-pointer ${
                    activeTab === 'vehicles' ? 'bg-white text-[#004A99] border-slate-200' : 'text-slate-500 border-transparent hover:text-slate-800'
                  }`}
                >
                  Unidades ({formData.vehicles?.length || 0})
                </button>
                <button
                  type="button"
                  disabled={!formData.id}
                  onClick={() => setActiveTab('drivers')}
                  className={`px-3 py-1.5 text-[11px] font-bold uppercase rounded-t-lg border-t border-x transition-colors disabled:opacity-40 cursor-pointer ${
                    activeTab === 'drivers' ? 'bg-white text-[#004A99] border-slate-200' : 'text-slate-500 border-transparent hover:text-slate-800'
                  }`}
                >
                  Choferes ({formData.drivers?.length || 0})
                </button>
              </div>

              {activeTab === 'general' && (
                <form onSubmit={handleSaveCarrier} className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/70">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-700" />
                        <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">
                          Identificación de la Empresa Transportista
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-5 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">RUC (11 dígitos)</label>
                          <div className="relative">
                            <input
                              type="text"
                              maxLength={11}
                              value={formData.ruc || ''}
                              onChange={e => setFormData({ ...formData, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                              className="w-full h-8 pl-2.5 pr-20 bg-white border border-slate-300 rounded text-xs font-bold font-mono text-slate-800 focus:border-blue-500 outline-none"
                              placeholder="20126500603"
                              required
                            />
                            <button
                              type="button"
                              onClick={handleConsultRuc}
                              disabled={consultingRuc || !formData.ruc}
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 px-2.5 bg-blue-700 text-white rounded text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-blue-800 disabled:opacity-40 cursor-pointer"
                            >
                              {consultingRuc ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                              SUNAT
                            </button>
                          </div>
                        </div>

                        <div className="sm:col-span-7 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">Razón Social</label>
                          <input
                            type="text"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                            className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 uppercase focus:border-blue-500 outline-none"
                            placeholder="RAZÓN SOCIAL DEL TRANSPORTISTA"
                            required
                          />
                        </div>

                        <div className="sm:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">Registro MTC</label>
                          <input
                            type="text"
                            value={formData.mtcNumber || ''}
                            onChange={e => setFormData({ ...formData, mtcNumber: e.target.value.toUpperCase() })}
                            className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs font-bold font-mono text-slate-800 uppercase focus:border-blue-500 outline-none"
                            placeholder="Ej. 1512345CNG"
                          />
                        </div>

                        <div className="sm:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">Teléfono</label>
                          <input
                            type="text"
                            value={formData.phone || ''}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 focus:border-blue-500 outline-none"
                            placeholder="999999999"
                          />
                        </div>

                        <div className="sm:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">Correo</label>
                          <input
                            type="email"
                            value={formData.email || ''}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 focus:border-blue-500 outline-none"
                            placeholder="transporte@empresa.com"
                          />
                        </div>

                        <div className="sm:col-span-12 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">Dirección Fiscal</label>
                          <input
                            type="text"
                            value={formData.address || ''}
                            onChange={e => setFormData({ ...formData, address: e.target.value.toUpperCase() })}
                            className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 uppercase focus:border-blue-500 outline-none"
                            placeholder="Dirección fiscal del transportista"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 pt-1">
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(formData.isOwnFleet)}
                            onChange={e => setFormData({ ...formData, isOwnFleet: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-[#004A99]"
                          />
                          <ShieldCheck className="w-4 h-4 text-[#004A99]" />
                          Es Flota Propia (Empresa Emisora)
                        </label>

                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isActive !== false}
                            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600"
                          />
                          Activo
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-red-500" /> Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="h-8 px-5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {saving ? 'Guardando...' : (formData.id ? 'Actualizar' : 'Guardar y Continuar')}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'vehicles' && formData.id && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/70">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-blue-700" />
                          <span className="text-[11px] font-bold text-blue-950 uppercase">
                            {editingVehicleId ? 'Editar Unidad de Transporte' : 'Agregar Unidad de Transporte'}
                          </span>
                        </div>
                        {editingVehicleId && (
                          <button
                            type="button"
                            onClick={handleCancelEditVehicle}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            Cancelar edición
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-6 sm:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">Placa</label>
                          <input
                            value={newVehicle.plate}
                            onChange={e => setNewVehicle({ ...newVehicle, plate: e.target.value.toUpperCase() })}
                            placeholder="AAF759"
                            className="w-full h-8 px-2 border border-slate-300 rounded text-xs font-mono font-bold uppercase outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">Marca</label>
                          <input
                            value={newVehicle.brand}
                            onChange={e => setNewVehicle({ ...newVehicle, brand: e.target.value.toUpperCase() })}
                            placeholder="HYUNDAI"
                            className="w-full h-8 px-2 border border-slate-300 rounded text-xs font-bold uppercase outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">Reg. MTC</label>
                          <input
                            value={newVehicle.mtcNumber}
                            onChange={e => setNewVehicle({ ...newVehicle, mtcNumber: e.target.value.toUpperCase() })}
                            placeholder="MTC"
                            className="w-full h-8 px-2 border border-slate-300 rounded text-xs font-mono uppercase outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">Nro. TUCE</label>
                          <input
                            value={newVehicle.tuce}
                            onChange={e => setNewVehicle({ ...newVehicle, tuce: e.target.value.toUpperCase() })}
                            placeholder="TUCE"
                            className="w-full h-8 px-2 border border-slate-300 rounded text-xs font-mono uppercase outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-2">
                          <button
                            type="button"
                            onClick={handleSaveVehicle}
                            className="w-full h-8 bg-[#004A99] hover:bg-blue-800 text-white rounded text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {editingVehicleId ? <><Save className="w-3.5 h-3.5" /> Actualizar</> : <><Plus className="w-3.5 h-3.5" /> Añadir</>}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">
                          <tr>
                            <th className="px-3 py-2">Placa</th>
                            <th className="px-3 py-2">Marca</th>
                            <th className="px-3 py-2">Reg. MTC</th>
                            <th className="px-3 py-2">Nro. TUCE</th>
                            <th className="px-3 py-2 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(formData.vehicles || []).map((v: any) => (
                            <tr key={v.id} className={editingVehicleId === v.id ? 'bg-blue-50/70' : ''}>
                              <td className="px-3 py-2 font-mono font-bold text-[#004A99]">{v.plate}</td>
                              <td className="px-3 py-2 font-bold text-slate-800">{v.brand || '-'}</td>
                              <td className="px-3 py-2 font-mono text-slate-600">{v.mtcNumber || '-'}</td>
                              <td className="px-3 py-2 font-mono text-slate-600">{v.tuce || '-'}</td>
                              <td className="px-3 py-2 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleEditVehicle(v)}
                                    title="Editar unidad"
                                    className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteVehicle(v.id)}
                                    title="Eliminar unidad"
                                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {(!formData.vehicles || formData.vehicles.length === 0) && (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-slate-400">
                                Sin unidades registradas para este transportista.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 flex justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="h-8 px-4 bg-[#004A99] text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'drivers' && formData.id && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/70">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-700" />
                          <span className="text-[11px] font-bold text-blue-950 uppercase">
                            {editingDriverId ? 'Editar Chofer / Conductor' : 'Agregar Chofer / Conductor'}
                          </span>
                        </div>
                        {editingDriverId && (
                          <button
                            type="button"
                            onClick={handleCancelEditDriver}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            Cancelar edición
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-6 sm:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">DNI</label>
                          <div className="relative">
                            <input
                              maxLength={11}
                              value={newDriver.docNumber}
                              onChange={e => setNewDriver({ ...newDriver, docNumber: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                              placeholder="12345678"
                              className="w-full h-8 pl-2 pr-8 border border-slate-300 rounded text-xs font-mono font-bold outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={handleConsultDni}
                              disabled={consultingDni || !newDriver.docNumber}
                              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                              title="Consultar RENIEC"
                            >
                              {consultingDni ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div className="col-span-6 sm:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">Apellidos y Nombres</label>
                          <input
                            value={newDriver.name}
                            onChange={e => setNewDriver({ ...newDriver, name: e.target.value.toUpperCase() })}
                            placeholder="NOMBRES COMPLETOS"
                            className="w-full h-8 px-2 border border-slate-300 rounded text-xs font-bold uppercase outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase block">Brevete / Licencia</label>
                          <input
                            value={newDriver.licenseNumber}
                            onChange={e => setNewDriver({ ...newDriver, licenseNumber: e.target.value.toUpperCase() })}
                            placeholder="Q72455909"
                            className="w-full h-8 px-2 border border-slate-300 rounded text-xs font-mono font-bold uppercase outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <button
                            type="button"
                            onClick={handleSaveDriver}
                            className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {editingDriverId ? <><Save className="w-3.5 h-3.5" /> Actualizar</> : <><Plus className="w-3.5 h-3.5" /> Añadir</>}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">
                          <tr>
                            <th className="px-3 py-2">DNI</th>
                            <th className="px-3 py-2">Apellidos y Nombres</th>
                            <th className="px-3 py-2">Brevete / Licencia</th>
                            <th className="px-3 py-2 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(formData.drivers || []).map((d: any) => (
                            <tr key={d.id} className={editingDriverId === d.id ? 'bg-emerald-50/70' : ''}>
                              <td className="px-3 py-2 font-mono font-bold text-slate-700">{d.docNumber}</td>
                              <td className="px-3 py-2 font-bold text-slate-900 uppercase">{d.name}</td>
                              <td className="px-3 py-2 font-mono font-bold text-emerald-700">{d.licenseNumber || '-'}</td>
                              <td className="px-3 py-2 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleEditDriver(d)}
                                    title="Editar chofer"
                                    className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDriver(d.id)}
                                    title="Eliminar chofer"
                                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {(!formData.drivers || formData.drivers.length === 0) && (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-slate-400">
                                Sin choferes registrados para este transportista.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 flex justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="h-8 px-4 bg-[#004A99] text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
