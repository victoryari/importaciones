import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, Search, PlusCircle, Filter, Edit, Trash2, MapPin, Package, AlertCircle, CheckCircle2, ChevronRight, ChevronDown, Activity, FileText, RefreshCw, Save } from 'lucide-react';
import { formatNumber } from '../../lib/utils';
import axios from 'axios';

interface Vehicle {
  id: number;
  plate: string;
  brand: string | null;
  model: string | null;
  capacityWeight: number; // KG
  capacityVolume: number; // m3
  status: string;
}

interface Dispatch {
  id: number;
  vehicleId: number;
  driverId: number | null;
  driverName: string | null;
  status: string;
  createdAt: string;
  vehicle: Vehicle;
  orders: any[];
  mappedOrders?: any[];
  currentWeight?: number;
  currentVolume?: number;
}

export const AdvancedLogisticsModule: React.FC<{ token: string | null }> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'delivery'>('delivery');
  
  // Data
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'vehicles') {
        const res = await axios.get('/api/vehicles', { headers: { Authorization: `Bearer ${token}` } });
        setVehicles(res.data);
      } else {
        // En delivery, cargar ambos: dispatches y vehicles (para el selector)
        const [dispatchesRes, vehiclesRes] = await Promise.all([
          axios.get('/api/dispatches', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/vehicles', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setDispatches(dispatchesRes.data);
        setVehicles(vehiclesRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-6">
      {/* Header and Tabs */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 relative overflow-hidden">
        {/* Soft background effect */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Logística y Flota</h2>
            <p className="text-sm font-medium text-slate-500">Gestión de vehículos y control de despachos</p>
          </div>
        </div>

        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl relative z-10 backdrop-blur-md border border-white/50">
          <button 
            onClick={() => setActiveTab('delivery')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'delivery' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            <Activity className="w-4 h-4" /> Centro de Reparto
          </button>
          <button 
            onClick={() => setActiveTab('vehicles')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'vehicles' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            <Truck className="w-4 h-4" /> Flota de Vehículos
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'delivery' ? (
            <DeliveryDashboard key="delivery" dispatches={dispatches} vehicles={vehicles} token={token} onRefresh={fetchData} />
          ) : (
            <VehiclesManager key="vehicles" vehicles={vehicles} token={token} onRefresh={fetchData} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const DeliveryDashboard: React.FC<{ dispatches: any[], vehicles: Vehicle[], token: string | null, onRefresh: () => void }> = ({ dispatches, vehicles, token, onRefresh }) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [includePending, setIncludePending] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showClosedDispatches, setShowClosedDispatches] = useState(true);
  const [drivers, setDrivers] = useState<{ id: number; name: string }[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | ''>('');

  // Find the dispatch for the currently selected vehicle, or create a mock one if empty
  const activeDispatch = dispatches.find(d => d.vehicleId === selectedVehicleId && d.status === 'PENDING');
  
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const truckCapacityKg = selectedVehicle ? Number(selectedVehicle.capacityWeight) : 0;
  const truckCapacityM3 = selectedVehicle ? Number(selectedVehicle.capacityVolume) : 0;

  const currentLoadKg = activeDispatch ? activeDispatch.currentWeight : 0;
  const currentLoadM3 = activeDispatch ? activeDispatch.currentVolume : 0;

  const loadPercentKg = truckCapacityKg > 0 ? (currentLoadKg / truckCapacityKg) * 100 : 0;
  const loadPercentM3 = truckCapacityM3 > 0 ? (currentLoadM3 / truckCapacityM3) * 100 : 0;
  const mainLoadPercent = Math.max(loadPercentKg, loadPercentM3);

  const getLoadColor = (percent: number) => {
    if (percent >= 95) return 'from-rose-500 to-red-600';
    if (percent >= 80) return 'from-amber-400 to-orange-500';
    return 'from-emerald-400 to-teal-500';
  };

  const loadColor = getLoadColor(mainLoadPercent);
  const assignedOrders = activeDispatch ? activeDispatch.mappedOrders : [];

  const handleOpenAssign = async () => {
    if (!selectedVehicleId) {
      alert('Primero seleccione un vehículo de la flota');
      return;
    }
    setIsAssignModalOpen(true);
    setSelectedDriverId('');
    fetchAvailableOrders();
    fetchDrivers();
  };

  const fetchDrivers = async () => {
    try {
      const res = await axios.get('/api/users?role=CONDUCTOR', { headers: { Authorization: `Bearer ${token}` } });
      setDrivers(res.data.map((u: any) => ({ id: u.id, name: u.name || u.email })));
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAvailableOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await axios.get(`/api/dispatches/available-orders?includePending=${includePending}`, { headers: { Authorization: `Bearer ${token}` } });
      setAvailableOrders(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isAssignModalOpen) {
      fetchAvailableOrders();
    }
  }, [includePending]);

  const handleAssignOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    setAssigning(true);
    try {
      await axios.post('/api/dispatches', {
        vehicleId: selectedVehicleId,
        orderIds: selectedOrderIds,
        driverId: selectedDriverId || undefined
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setIsAssignModalOpen(false);
      setSelectedOrderIds([]);
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al asignar pedidos');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveOrder = async (orderId: number) => {
    if (!activeDispatch || !confirm('¿Remover este pedido del camión?')) return;
    try {
      await axios.delete(`/api/dispatches/${activeDispatch.id}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al remover pedido');
    }
  };

  const handleLoadDispatch = async () => {
    if (!activeDispatch || activeDispatch.mappedOrders.length === 0) return;
    if (!confirm(`¿Confirmar carga de la unidad? ${activeDispatch.mappedOrders.length} pedido(s) serán marcados como "CARGADOS". Una vez cargada no se podrán agregar más pedidos.`)) return;
    setStatusLoading(true);
    try {
      await axios.put(`/api/dispatches/${activeDispatch.id}/status`, { status: 'LOADING' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al cargar la unidad');
    } finally {
      setStatusLoading(false);
    }
  };

  const closedDispatches = selectedVehicleId
    ? dispatches.filter(d => d.vehicleId === selectedVehicleId && d.status !== 'PENDING')
    : [];
  
  const nonPendingDispatch = selectedVehicleId
    ? dispatches.find(d => d.vehicleId === selectedVehicleId && d.status !== 'PENDING')
    : null;

  // Group by agency for the summary
  const agencySummary = assignedOrders.reduce((acc: any, order: any) => {
    if (!acc[order.agency]) {
      acc[order.agency] = { count: 0, weight: 0, volume: 0 };
    }
    acc[order.agency].count++;
    acc[order.agency].weight += order.weight;
    acc[order.agency].volume += order.volume;
    return acc;
  }, {});

  // Calculate potential load during selection
  const potentialWeight = currentLoadKg + availableOrders.filter(o => selectedOrderIds.includes(o.id)).reduce((sum, o) => sum + o.weight, 0);
  const potentialVolume = currentLoadM3 + availableOrders.filter(o => selectedOrderIds.includes(o.id)).reduce((sum, o) => sum + o.volume, 0);
  const overCapacity = potentialWeight > truckCapacityKg || potentialVolume > truckCapacityM3;

  const TruckGraphic = () => (
    <div className={`relative flex items-end h-[160px] w-full max-w-[420px] transition-opacity ${!selectedVehicleId ? 'opacity-30 grayscale' : ''}`}>
      {/* Cab (Left) */}
      <div className="w-[100px] h-[120px] relative z-20 flex-shrink-0 drop-shadow-xl">
        <svg viewBox="0 0 140 160" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M140 150 H30 C20 150 10 145 10 135 L5 80 C5 70 15 65 25 65 L45 65 L70 15 C75 10 85 10 95 10 H140 V150 Z" fill="#ffffff" />
          <path d="M140 150 H30 C20 150 10 145 10 135 L5 80 C5 70 15 65 25 65 L45 65 L70 15 C75 10 85 10 95 10 H140 V150 Z" stroke="#e2e8f0" strokeWidth="2" />
          <rect x="5" y="90" width="15" height="40" rx="2" fill="#e2e8f0" />
          <line x1="5" y1="95" x2="20" y2="95" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="5" y1="105" x2="20" y2="105" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="5" y1="115" x2="20" y2="115" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="5" y1="125" x2="20" y2="125" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M75 25 L50 65 H25 C20 65 15 60 15 55 L20 40 L45 25 H75 Z" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="2" />
          <path d="M85 150 V65 H45 L70 20" stroke="#f1f5f9" strokeWidth="3" />
          <rect x="70" y="80" width="10" height="4" rx="2" fill="#cbd5e1" />
          <circle cx="12" cy="140" r="3" fill="#fbbf24" />
          <rect x="120" y="20" width="8" height="130" fill="#f1f5f9" />
          <rect x="116" y="30" width="16" height="4" fill="#cbd5e1" />
          <rect x="116" y="40" width="16" height="4" fill="#cbd5e1" />
          <rect x="116" y="50" width="16" height="4" fill="#cbd5e1" />
          <path d="M30 150 A 25 25 0 0 1 80 150" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
        </svg>
        <div className="absolute bottom-[4px] left-[39px] w-[32px] h-[32px] bg-slate-800 rounded-full border-[5px] border-slate-300 shadow-lg flex items-center justify-center">
          <div className="w-[12px] h-[12px] bg-slate-400 rounded-full"></div>
        </div>
      </div>

      {/* Trailer (Right) */}
      <div className="flex-1 h-[150px] relative flex flex-col justify-end ml-[-10px] z-10 drop-shadow-xl">
        <div className="w-full h-[130px] bg-white rounded-tr-xl relative overflow-hidden border border-slate-200">
          <div className="absolute inset-0 bg-slate-50 opacity-50"></div>
          {selectedVehicleId && (
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${mainLoadPercent}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className={`absolute top-0 right-0 h-full bg-gradient-to-l ${getLoadColor(mainLoadPercent)} overflow-hidden shadow-inner flex flex-col items-center justify-center`}
            >
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,1)_25%,rgba(255,255,255,1)_50%,transparent_50%,transparent_75%,rgba(255,255,255,1)_75%,rgba(255,255,255,1)_100%)] bg-[length:40px_40px] animate-[slide_2s_linear_infinite]"></div>
              <div className="relative z-10 flex flex-col items-center justify-center text-white drop-shadow-md pr-8 min-w-[140px]">
                <div className="text-4xl font-black whitespace-nowrap">
                    {Math.round(mainLoadPercent)}% <span className="text-sm font-bold opacity-90">Loaded</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5 font-bold text-xs">
                  <Package className="w-3 h-3" />
                  {formatNumber(currentLoadKg, 0)} kg / {formatNumber(truckCapacityKg, 0)} kg
                </div>
              </div>
            </motion.div>
          )}
          {!selectedVehicleId && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">
              Seleccione un vehículo
            </div>
          )}
        </div>
        <div className="w-full h-[14px] bg-slate-800 relative z-20 flex justify-between items-center px-3">
          <div className="w-2 h-3 bg-red-600 rounded-sm absolute right-0 top-[-6px]"></div>
          <div className="flex-1"></div>
          <div className="flex gap-2 absolute bottom-[-12px] right-[15px]">
            <div className="w-[24px] h-[24px] bg-slate-800 rounded-full border-[4px] border-slate-300 shadow-lg flex items-center justify-center">
               <div className="w-[8px] h-[8px] bg-slate-400 rounded-full"></div>
            </div>
            <div className="w-[24px] h-[24px] bg-slate-800 rounded-full border-[4px] border-slate-300 shadow-lg flex items-center justify-center">
               <div className="w-[8px] h-[8px] bg-slate-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col gap-6">
      
      {/* Top Controls & Visualizer Panel */}
      <div className="bg-slate-50/50 rounded-3xl border border-slate-200 shadow-sm p-4 flex flex-col gap-6 items-center overflow-hidden relative">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none"></div>
        <div className="absolute left-0 bottom-0 w-1/4 h-1/2 bg-gradient-to-r from-blue-50/30 to-transparent pointer-events-none"></div>
        
        {/* Selector Header */}
        <div className="w-full flex justify-between items-center z-10 px-4">
          <div className="flex items-center gap-4">
            <h3 className="font-black text-slate-700 uppercase tracking-widest text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-500" /> Vehículo en Carga
            </h3>
            <select 
              value={selectedVehicleId || ''} 
              onChange={e => setSelectedVehicleId(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 shadow-sm focus:ring-indigo-500 min-w-[250px]"
            >
              <option value="">-- Seleccionar Vehículo --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate} ({v.brand} {v.model}) - {formatNumber(v.capacityWeight, 0)}kg</option>
              ))}
            </select>
            
            {activeDispatch?.driverName && (
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {activeDispatch.driverName}
              </div>
            )}
          </div>
          
          {selectedVehicleId && (
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capacidad Usada</p>
                <p className="text-xl font-black text-slate-700">{mainLoadPercent.toFixed(1)}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Two Column Layout: Truck Left, Cards Right */}
        <div className="w-full grid grid-cols-12 gap-6 z-10 px-4">
          {/* Left Column: Truck Graphic (4 cols) */}
          <div className="col-span-12 md:col-span-4 flex items-center justify-center">
            <TruckGraphic />
          </div>
          
          {/* Right Column: Agency Summary Cards (8 cols) */}
          {selectedVehicleId && Object.keys(agencySummary).length > 0 && (
            <div className="col-span-12 md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.keys(agencySummary).map(agency => {
                const agencyOrders = assignedOrders.filter((o: any) => o.agency === agency);
                const orderCodes = agencyOrders.map((o: any) => o.code).join(', ');
                return (
                  <div key={agency} className="bg-white border border-indigo-100 p-4 rounded-xl flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="font-black text-slate-500 text-[10px] uppercase tracking-widest flex items-center gap-1.5 mb-2 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-indigo-400" /> {agency}
                    </h3>
                    <p className="text-xl font-black text-indigo-700 leading-none">{agencySummary[agency].count} <span className="text-sm text-indigo-400 font-bold">pedidos</span></p>
                    <p className="text-xs font-bold text-slate-500 mt-2 truncate" title={orderCodes}>{orderCodes}</p>
                    <p className="text-xs font-bold text-indigo-500 mt-1 bg-indigo-50 px-2 py-1 rounded-md self-start">{formatNumber(agencySummary[agency].weight, 0)} kg</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Orders Table Area */}
      <div className={`flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0 transition-opacity ${!selectedVehicleId ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <h3 className="font-black text-slate-700 flex items-center gap-2 text-sm uppercase tracking-widest">
              <Package className="w-4 h-4 text-indigo-500" /> Pedidos Asignados ({assignedOrders.length})
            </h3>
            {activeDispatch && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                activeDispatch.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                activeDispatch.status === 'LOADING' ? 'bg-blue-100 text-blue-700' :
                activeDispatch.status === 'IN_TRANSIT' ? 'bg-purple-100 text-purple-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {activeDispatch.status === 'PENDING' ? 'PENDIENTE' :
                 activeDispatch.status === 'LOADING' ? 'CARGADO' :
                 activeDispatch.status === 'IN_TRANSIT' ? 'EN TRÁNSITO' :
                 activeDispatch.status === 'DELIVERED' ? 'ENTREGADO' : activeDispatch.status}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {activeDispatch && activeDispatch.mappedOrders.length > 0 && activeDispatch.status === 'PENDING' && (
              <button 
                onClick={handleLoadDispatch}
                disabled={statusLoading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                {statusLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Cargar Unidad
              </button>
            )}
            <button onClick={handleOpenAssign} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Asignar Pedidos
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {assignedOrders.length === 0 && !nonPendingDispatch ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
              <Package className="w-12 h-12 opacity-20" />
              <p className="font-bold text-sm">El camión está vacío</p>
              <button onClick={handleOpenAssign} className="text-indigo-600 font-bold hover:underline text-sm">Agregar el primer pedido</button>
            </div>
          ) : assignedOrders.length === 0 && nonPendingDispatch ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
              <Truck className="w-12 h-12 opacity-20" />
              <p className="font-bold text-sm">Esta unidad ya fue cargada</p>
              <p className="text-xs">Ve el detalle en "Historial de Cierres"</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white sticky top-0 z-10 shadow-sm">
                <tr className="text-[10px] uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4 font-black">Código</th>
                  <th className="px-6 py-4 font-black text-center">Cant. Items</th>
                  <th className="px-6 py-4 font-black text-right">Peso (KG)</th>
                  <th className="px-6 py-4 font-black text-right">Vol (m³)</th>
                  <th className="px-6 py-4 font-black">Agencia / Destino</th>
                  <th className="px-6 py-4 font-black text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {assignedOrders.map((o: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-700">{o.code}</td>
                    <td className="px-6 py-4 font-black text-indigo-600 text-center">{o.qty}</td>
                    <td className="px-6 py-4 font-bold text-slate-700 text-right">{formatNumber(o.weight, 1)}</td>
                    <td className="px-6 py-4 font-bold text-slate-700 text-right">{formatNumber(o.volume, 2)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-700 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></div> 
                          {o.agency}
                        </span>
                        {o.agencyAddress && (
                          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]" title={o.agencyAddress}>
                            {o.agencyAddress}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {activeDispatch?.status === 'PENDING' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRemoveOrder(o.id); }}
                          className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Closed Dispatches History */}
      {selectedVehicleId && nonPendingDispatch && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <button 
            onClick={() => setShowClosedDispatches(!showClosedDispatches)}
            className="w-full px-6 py-3 flex items-center justify-between bg-slate-50/50 hover:bg-slate-100 transition-colors"
          >
            <h3 className="font-black text-slate-600 flex items-center gap-2 text-sm uppercase tracking-widest">
              <Truck className="w-4 h-4 text-slate-400" /> Historial de Cierres ({closedDispatches.length})
            </h3>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showClosedDispatches ? '' : '-rotate-90'}`} />
          </button>
          
          {showClosedDispatches && (
            <div className="divide-y divide-slate-100">
              {closedDispatches.map((d: any) => {
                const orderCount = d.mappedOrders?.length || 0;
                const totalWeight = d.currentWeight || 0;
                const totalVolume = d.currentVolume || 0;
                return (
                  <div key={d.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        d.status === 'LOADING' ? 'bg-blue-500' :
                        d.status === 'IN_TRANSIT' ? 'bg-purple-500' :
                        'bg-emerald-500'
                      }`}></div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        d.status === 'LOADING' ? 'bg-blue-100 text-blue-700' :
                        d.status === 'IN_TRANSIT' ? 'bg-purple-100 text-purple-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {d.status === 'LOADING' ? 'CARGADO' :
                         d.status === 'IN_TRANSIT' ? 'EN TRÁNSITO' :
                         d.status === 'DELIVERED' ? 'ENTREGADO' : d.status}
                      </span>
                      <span className="font-bold text-slate-700 text-sm">
                        {d.vehicle?.plate}
                      </span>
                      {d.driverName && (
                        <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {d.driverName}
                        </span>
                      )}
                      <span className="font-bold text-slate-700 text-sm">
                        {orderCount} pedido(s)
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        {new Date(d.createdAt).toLocaleDateString('es-PE', { 
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                      <span>{formatNumber(totalWeight, 0)} kg</span>
                      <span>{formatNumber(totalVolume, 1)} m³</span>
                      <div className="flex gap-1">
                        {(d.mappedOrders || []).slice(0, 3).map((o: any) => (
                          <span key={o.id} className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-bold text-slate-500">{o.code}</span>
                        ))}
                        {orderCount > 3 && <span className="text-[9px] text-slate-400 font-bold self-center">+{orderCount - 3}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Assignment Modal */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-100 flex flex-col h-[80vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Asignar Pedidos al Camión</h3>
                  <p className="text-sm font-medium text-slate-500">Seleccione los pedidos que serán cargados en el {selectedVehicle?.plate}</p>
                </div>
                <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
              </div>

              <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={includePending} onChange={e => setIncludePending(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                  Incluir pedidos en estado "Pendiente"
                </label>
                
                {overCapacity && (
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-sm bg-rose-50 px-4 py-2 rounded-xl">
                    <AlertCircle className="w-4 h-4" /> Capacidad del camión excedida
                  </div>
                )}
              </div>

              <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center gap-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest shrink-0">
                  Conductor Asignado
                </label>
                <select
                  value={selectedDriverId}
                  onChange={e => setSelectedDriverId(e.target.value ? Number(e.target.value) : '')}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 flex-1 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                >
                  <option value="">-- Sin conductor --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1 overflow-auto bg-slate-50 p-4">
                {loadingOrders ? (
                  <div className="h-full flex items-center justify-center text-slate-400"><RefreshCw className="w-8 h-8 animate-spin" /></div>
                ) : availableOrders.length === 0 ? (
                  <div className="h-full flex items-center justify-center font-bold text-slate-400">No hay pedidos disponibles</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {availableOrders.map(o => {
                      const isSelected = selectedOrderIds.includes(o.id);
                      return (
                        <div 
                          key={o.id} 
                          onClick={() => {
                            if (isSelected) {
                              setSelectedOrderIds(prev => prev.filter(id => id !== o.id));
                            } else {
                              setSelectedOrderIds(prev => [...prev, o.id]);
                            }
                          }}
                          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 shadow-sm ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-indigo-300'}`}
                        >
                          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-black text-slate-800">{o.code}</h4>
                                <p className="text-xs font-bold text-slate-500">{o.customerName}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${o.status === 'PICKED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {o.status === 'PICKED' ? 'PREPARADO' : o.status}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 mt-3">
                              <div className="bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-indigo-400" />
                                <span className="text-[11px] font-bold text-slate-600 truncate">{o.agency}</span>
                              </div>
                              <div className="bg-slate-50 px-3 py-1.5 rounded-lg text-center">
                                <span className="text-[11px] font-bold text-slate-600">{formatNumber(o.weight, 1)} kg</span>
                              </div>
                              <div className="bg-slate-50 px-3 py-1.5 rounded-lg text-center">
                                <span className="text-[11px] font-bold text-slate-600">{formatNumber(o.volume, 2)} m³</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
                <div className="flex gap-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso Total a Cargar</p>
                    <p className={`font-black text-lg ${potentialWeight > truckCapacityKg ? 'text-rose-600' : 'text-slate-700'}`}>
                      {formatNumber(potentialWeight, 0)} <span className="text-sm font-medium text-slate-400">/ {formatNumber(truckCapacityKg, 0)} kg</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volumen Total</p>
                    <p className={`font-black text-lg ${potentialVolume > truckCapacityM3 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {formatNumber(potentialVolume, 1)} <span className="text-sm font-medium text-slate-400">/ {formatNumber(truckCapacityM3, 1)} m³</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button onClick={() => setIsAssignModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
                  <button 
                    onClick={handleAssignOrders} 
                    disabled={selectedOrderIds.length === 0 || assigning || overCapacity} 
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 ${(selectedOrderIds.length === 0 || overCapacity) ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                  >
                    {assigning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Confirmar Asignación ({selectedOrderIds.length})
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const VehiclesManager: React.FC<{ vehicles: Vehicle[], token: string | null, onRefresh: () => void }> = ({ vehicles, token, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ plate: '', brand: '', model: '', capacityWeight: '', capacityVolume: '', status: 'ACTIVE' });
  const [loading, setLoading] = useState(false);

  const handleOpen = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingId(vehicle.id);
      setFormData({
        plate: vehicle.plate,
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        capacityWeight: vehicle.capacityWeight.toString(),
        capacityVolume: vehicle.capacityVolume.toString(),
        status: vehicle.status
      });
    } else {
      setEditingId(null);
      setFormData({ plate: '', brand: '', model: '', capacityWeight: '', capacityVolume: '', status: 'ACTIVE' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await axios.put(`/api/vehicles/${editingId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/api/vehicles', formData, { headers: { Authorization: `Bearer ${token}` } });
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al guardar el vehículo');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que desea eliminar este vehículo?')) return;
    try {
      await axios.delete(`/api/vehicles/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-3xl">
        <div>
          <h3 className="font-black text-slate-800 text-lg">Catálogo de Vehículos</h3>
          <p className="text-sm font-medium text-slate-500">Gestione capacidades y estados de la flota</p>
        </div>
        <button onClick={() => handleOpen()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2">
          <PlusCircle className="w-4 h-4" /> Nuevo Vehículo
        </button>
      </div>
      
      <div className="flex-1 overflow-auto p-6">
        {vehicles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
            <Truck className="w-16 h-16 opacity-20" />
            <p className="font-bold text-sm">No hay vehículos registrados</p>
            <button onClick={() => handleOpen()} className="text-indigo-600 font-bold hover:underline text-sm">Registrar el primero</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map(v => (
              <div key={v.id} className="border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all group bg-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 uppercase tracking-widest">{v.plate}</h4>
                      <p className="text-xs font-bold text-slate-500">{v.brand} {v.model}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${v.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : v.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                    {v.status}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso Max.</p>
                    <p className="font-bold text-slate-700">{formatNumber(v.capacityWeight, 0)} kg</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volumen Max.</p>
                    <p className="font-bold text-slate-700">{formatNumber(v.capacityVolume, 1)} m³</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpen(v)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(v.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-800">{editingId ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
              </div>
              <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-1">Placa *</label>
                    <input required value={formData.plate} onChange={e => setFormData({...formData, plate: e.target.value.toUpperCase()})} className="w-full border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2 bg-slate-50 uppercase font-bold" placeholder="ABC-123" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-1">Estado</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2 bg-slate-50 font-bold text-slate-700">
                      <option value="ACTIVE">Activo</option>
                      <option value="MAINTENANCE">En Mantenimiento</option>
                      <option value="INACTIVE">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-1">Marca</label>
                    <input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2" placeholder="Ej. Volvo" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-1">Modelo</label>
                    <input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2" placeholder="Ej. FH16" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-1">Capacidad (KG) *</label>
                    <input type="number" step="0.01" required value={formData.capacityWeight} onChange={e => setFormData({...formData, capacityWeight: e.target.value})} className="w-full border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2" placeholder="5000" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-1">Volumen (m³) *</label>
                    <input type="number" step="0.01" required value={formData.capacityVolume} onChange={e => setFormData({...formData, capacityVolume: e.target.value})} className="w-full border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2" placeholder="20" />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
                  <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2">
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar Vehículo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
