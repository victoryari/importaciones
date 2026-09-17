import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, Search, PlusCircle, Filter, Edit, Trash2, MapPin, 
  Package, AlertCircle, CheckCircle2, ChevronRight, ChevronDown, 
  Activity, FileText, RefreshCw, Save, X, User, Check, Box
} from 'lucide-react';
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

interface Driver {
  id: number;
  docType: string;
  docNumber: string;
  name: string;
  licenseNumber: string | null;
  phone: string | null;
  email: string | null;
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
  const [activeTab, setActiveTab] = useState<'delivery' | 'vehicles' | 'drivers'>('delivery');
  
  // Data
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
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
      } else if (activeTab === 'drivers') {
        const res = await axios.get('/api/drivers', { headers: { Authorization: `Bearer ${token}` } });
        setDrivers(res.data);
      } else {
        const [dispatchesRes, vehiclesRes, driversRes] = await Promise.all([
          axios.get('/api/dispatches', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/vehicles', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/drivers', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
        ]);
        setDispatches(dispatchesRes.data);
        setVehicles(vehiclesRes.data);
        setDrivers(driversRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Metric calculations for the top summary header
  const totalVehicles = vehicles.length;
  const totalDrivers = drivers.length;
  const activeDispatchesCount = dispatches.filter(d => ['PENDING', 'LOADING', 'IN_TRANSIT'].includes(d.status)).length;
  const todayDeliveriesCount = dispatches.reduce((acc, d) => {
    const isToday = new Date(d.createdAt).toDateString() === new Date().toDateString();
    return acc + (isToday ? (d.mappedOrders?.length || d.orders?.length || 1) : 0);
  }, 0);

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* BEGIN: Header Section (Summary Card styled from Stitch) */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-blue-50/60 rounded-full blur-2xl pointer-events-none"></div>

        {/* Title and Icon */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Logística y Flota</h1>
            <p className="text-sm text-gray-500 font-medium">Gestión de vehículos, conductores y control de despachos</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="flex items-center gap-6 sm:gap-8 pl-4 lg:border-l border-gray-200 relative z-10">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Total Vehículos</p>
            <p className="text-2xl font-black text-gray-900">{totalVehicles}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Conductores</p>
            <p className="text-2xl font-black text-purple-600">{totalDrivers}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Despachos Activos</p>
            <p className="text-2xl font-black text-blue-600">{activeDispatchesCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Entregas Hoy</p>
            <p className="text-2xl font-black text-emerald-600">{todayDeliveriesCount}</p>
          </div>
        </div>

        {/* Action Buttons / Module Tabs */}
        <div className="flex items-center gap-2 ml-auto relative z-10">
          <button 
            onClick={() => setActiveTab('delivery')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-sm cursor-pointer ${
              activeTab === 'delivery'
                ? 'bg-blue-600 text-white shadow-blue-200'
                : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Activity className="w-4 h-4" />
            Centro de Reparto
          </button>
          <button 
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-sm cursor-pointer ${
              activeTab === 'vehicles'
                ? 'bg-blue-600 text-white shadow-blue-200'
                : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Truck className="w-4 h-4" />
            Flota de Vehículos
          </button>
          <button 
            onClick={() => setActiveTab('drivers')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-sm cursor-pointer ${
              activeTab === 'drivers'
                ? 'bg-blue-600 text-white shadow-blue-200'
                : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <User className="w-4 h-4" />
            Conductores / Choferes
          </button>
        </div>
      </section>
      {/* END: Header Section */}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'delivery' ? (
            <DeliveryDashboard 
              key="delivery" 
              dispatches={dispatches} 
              vehicles={vehicles} 
              token={token} 
              onRefresh={fetchData} 
            />
          ) : activeTab === 'vehicles' ? (
            <VehiclesManager 
              key="vehicles" 
              vehicles={vehicles} 
              token={token} 
              onRefresh={fetchData} 
            />
          ) : (
            <DriversManager 
              key="drivers" 
              drivers={drivers} 
              token={token} 
              onRefresh={fetchData} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const DeliveryDashboard: React.FC<{ 
  dispatches: any[], 
  vehicles: Vehicle[], 
  token: string | null, 
  onRefresh: () => void 
}> = ({ dispatches, vehicles, token, onRefresh }) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showClosedDispatches, setShowClosedDispatches] = useState(true);
  const [drivers, setDrivers] = useState<{ id: number; name: string }[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | ''>('');

  // Auto-select first vehicle if none is selected
  useEffect(() => {
    if (!selectedVehicleId && vehicles.length > 0) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  // Find active dispatch for the currently selected vehicle
  const activeDispatch = dispatches.find(d => d.vehicleId === selectedVehicleId && d.status === 'PENDING');
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  
  const truckCapacityKg = selectedVehicle ? Number(selectedVehicle.capacityWeight) : 0;
  const truckCapacityM3 = selectedVehicle ? Number(selectedVehicle.capacityVolume) : 0;

  const currentLoadKg = activeDispatch ? (activeDispatch.currentWeight || 0) : 0;
  const currentLoadM3 = activeDispatch ? (activeDispatch.currentVolume || 0) : 0;

  const loadPercentKg = truckCapacityKg > 0 ? (currentLoadKg / truckCapacityKg) * 100 : 0;
  const loadPercentM3 = truckCapacityM3 > 0 ? (currentLoadM3 / truckCapacityM3) * 100 : 0;
  const mainLoadPercent = Math.min(100, Math.max(0, Math.max(loadPercentKg, loadPercentM3)));

  // SVG Gauge calculations
  const gaugeRadius = 40;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius; // ~251.327
  const gaugeStrokeOffset = gaugeCircumference - (mainLoadPercent / 100) * gaugeCircumference;
  const gaugeColor = mainLoadPercent >= 95 ? '#ef4444' : mainLoadPercent >= 80 ? '#f59e0b' : '#3b82f6';

  const assignedOrders = activeDispatch?.mappedOrders || activeDispatch?.orders || [];

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
      const res = await axios.get('/api/dispatches/available-orders', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
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
  }, [isAssignModalOpen]);

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
    if (!activeDispatch || assignedOrders.length === 0) return;
    if (!confirm(`¿Confirmar carga de la unidad? ${assignedOrders.length} pedido(s) serán marcados como "CARGADOS". Una vez cargada no se podrán agregar más pedidos.`)) return;
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

  // Group by agency for the summary breakdown
  const agencySummary = assignedOrders.reduce((acc: any, order: any) => {
    const agName = order.agency || 'Sin Agencia';
    if (!acc[agName]) {
      acc[agName] = { count: 0, weight: 0, volume: 0 };
    }
    acc[agName].count++;
    acc[agName].weight += Number(order.weight || 0);
    acc[agName].volume += Number(order.volume || 0);
    return acc;
  }, {});

  // Calculate potential load during selection in modal
  const potentialWeight = currentLoadKg + availableOrders.filter(o => selectedOrderIds.includes(o.id)).reduce((sum, o) => sum + Number(o.weight || 0), 0);
  const potentialVolume = currentLoadM3 + availableOrders.filter(o => selectedOrderIds.includes(o.id)).reduce((sum, o) => sum + Number(o.volume || 0), 0);
  const overCapacity = potentialWeight > truckCapacityKg || potentialVolume > truckCapacityM3;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      
      {/* BEGIN: Vehicle Selection and Visuals Section (Stitch Design) */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-blue-50/30 pointer-events-none z-0"></div>

        {/* Top bar of Vehicle Card: Selector & Percentage */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-700 font-bold uppercase text-xs sm:text-sm tracking-wider">
              <Truck className="w-5 h-5 text-blue-600" />
              Vehículo en Carga
            </div>
            
            <div className="relative">
              <select 
                value={selectedVehicleId || ''} 
                onChange={e => setSelectedVehicleId(Number(e.target.value))}
                className="appearance-none bg-white border-2 border-gray-800 text-gray-900 text-sm font-bold rounded-xl py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-gray-900 cursor-pointer shadow-sm min-w-[260px]"
              >
                <option value="">-- Seleccionar Vehículo --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.plate} ({v.brand || ''} {v.model || ''}) - {formatNumber(v.capacityWeight, 0)}kg
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Driver Badge if assigned */}
            {activeDispatch?.driverName && (
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 rounded-xl px-3 py-2">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Conductor: {activeDispatch.driverName}</span>
              </div>
            )}
          </div>

          {/* Capacity Info Top Right */}
          <div className="text-right">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Capacidad Usada</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">
              {mainLoadPercent.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Illustration and Chart Area */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 px-4 sm:px-10 pb-4 relative z-10">
          
          {/* Truck Illustration with Dynamic Animated Cargo Level */}
          <div className="w-full md:w-1/2 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-[380px] h-[160px] flex items-end justify-center">
              {/* Truck Graphic Container */}
              <div className="relative flex items-end w-full h-[150px]">
                {/* Cabin (Left) */}
                <div className="w-[110px] h-[130px] relative z-20 flex-shrink-0">
                  <svg viewBox="0 0 140 160" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M140 150 H30 C20 150 10 145 10 135 L5 80 C5 70 15 65 25 65 L45 65 L70 15 C75 10 85 10 95 10 H140 V150 Z" fill="#1e293b" />
                    <path d="M75 25 L50 65 H25 C20 65 15 60 15 55 L20 40 L45 25 H75 Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
                    <rect x="5" y="90" width="15" height="35" rx="2" fill="#334155" />
                    <line x1="5" y1="95" x2="20" y2="95" stroke="#475569" strokeWidth="2" />
                    <line x1="5" y1="105" x2="20" y2="105" stroke="#475569" strokeWidth="2" />
                    <line x1="5" y1="115" x2="20" y2="115" stroke="#475569" strokeWidth="2" />
                    <rect x="70" y="80" width="12" height="5" rx="2" fill="#64748b" />
                    <circle cx="15" cy="135" r="4" fill="#fbbf24" />
                  </svg>
                  {/* Wheel */}
                  <div className="absolute bottom-[2px] left-[35px] w-[34px] h-[34px] bg-gray-900 rounded-full border-[5px] border-gray-300 shadow-md flex items-center justify-center">
                    <div className="w-[12px] h-[12px] bg-gray-500 rounded-full"></div>
                  </div>
                </div>

                {/* Cargo Container (Right) */}
                <div className="flex-1 h-[145px] relative flex flex-col justify-end ml-[-12px] z-10">
                  <div className="w-full h-[125px] bg-white rounded-tr-2xl relative overflow-hidden border-2 border-gray-800 shadow-lg">
                    {/* Background grid */}
                    <div className="absolute inset-0 bg-gray-50 opacity-60"></div>
                    
                    {/* Fill Level */}
                    {selectedVehicleId && mainLoadPercent > 0 ? (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${mainLoadPercent}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className={`absolute top-0 right-0 h-full overflow-hidden shadow-inner flex flex-col items-center justify-center ${
                          mainLoadPercent >= 95 
                            ? 'bg-gradient-to-l from-red-600 to-rose-500' 
                            : mainLoadPercent >= 80 
                            ? 'bg-gradient-to-l from-amber-500 to-orange-400' 
                            : 'bg-gradient-to-l from-blue-600 to-indigo-500'
                        }`}
                      >
                        <div className="relative z-10 flex flex-col items-center justify-center text-white drop-shadow px-3 text-center">
                          <span className="text-2xl sm:text-3xl font-black">
                            {Math.round(mainLoadPercent)}%
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                            Cargado
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                        Camión Vacío
                      </div>
                    )}
                  </div>

                  {/* Trailer Underbody & Wheels */}
                  <div className="w-full h-[14px] bg-gray-800 relative z-20 flex justify-between items-center px-3">
                    <div className="w-2.5 h-3 bg-red-600 rounded-xs absolute right-0 top-[-6px]"></div>
                    <div className="flex gap-2 absolute bottom-[-14px] right-[20px]">
                      <div className="w-[28px] h-[28px] bg-gray-900 rounded-full border-[4px] border-gray-300 shadow-md flex items-center justify-center">
                        <div className="w-[8px] h-[8px] bg-gray-500 rounded-full"></div>
                      </div>
                      <div className="w-[28px] h-[28px] bg-gray-900 rounded-full border-[4px] border-gray-300 shadow-md flex items-center justify-center">
                        <div className="w-[8px] h-[8px] bg-gray-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Weight / Volume labels below graphic */}
            <div className="flex items-center gap-6 mt-4 text-xs font-bold text-gray-600">
              <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                {formatNumber(currentLoadKg, 0)} / {formatNumber(truckCapacityKg, 0)} kg
              </span>
              <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                <Box className="w-3.5 h-3.5 text-indigo-600" />
                {formatNumber(currentLoadM3, 1)} / {formatNumber(truckCapacityM3, 1)} m³
              </span>
            </div>
          </div>

          {/* Circular Gauge Chart */}
          <div className="w-full md:w-1/2 flex justify-center lg:justify-end">
            <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
              {/* Outer Ring & Progress */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle 
                  cx="50" 
                  cy="50" 
                  fill="transparent" 
                  r={gaugeRadius} 
                  stroke="#e2e8f0" 
                  strokeWidth="12" 
                />
                {/* Dynamic Animated Progress Ring */}
                <circle 
                  cx="50" 
                  cy="50" 
                  fill="transparent" 
                  r={gaugeRadius} 
                  stroke={gaugeColor} 
                  strokeWidth="12" 
                  strokeDasharray={gaugeCircumference} 
                  strokeDashoffset={gaugeStrokeOffset} 
                  strokeLinecap="round" 
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              {/* Inner Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                  Capacidad
                </span>
                <span className="text-2xl sm:text-3xl font-black text-gray-900">
                  {mainLoadPercent.toFixed(1)}%
                </span>
                <span className="text-[10px] font-bold text-gray-400 mt-0.5">
                  {currentLoadKg > 0 ? `${formatNumber(currentLoadKg, 0)} kg` : 'Disponible'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Agency Breakdown Mini Cards (if any assigned) */}
        {selectedVehicleId && Object.keys(agencySummary).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 relative z-10">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" /> Distribución por Agencia / Destino
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.keys(agencySummary).map(agency => {
                const ag = agencySummary[agency];
                return (
                  <div key={agency} className="bg-gray-50 border border-gray-200/80 p-3.5 rounded-xl shadow-xs flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-xs text-gray-800 truncate" title={agency}>
                        {agency}
                      </span>
                      <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {ag.count} {ag.count === 1 ? 'ped.' : 'peds.'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 mt-2">
                      <span>{formatNumber(ag.weight, 0)} kg</span>
                      <span>{formatNumber(ag.volume, 2)} m³</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
      {/* END: Vehicle Selection and Visuals Section */}

      {/* BEGIN: Assigned Orders Table Section (Stitch Design) */}
      <section className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-opacity ${!selectedVehicleId ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Section Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-white">
          <div className="flex items-center gap-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wide">
              <Box className="w-5 h-5 text-indigo-600" />
              Pedidos Asignados ({assignedOrders.length})
            </h3>
            {activeDispatch && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${
                activeDispatch.status === 'PENDING' ? 'bg-blue-100 text-blue-700' :
                activeDispatch.status === 'LOADING' ? 'bg-amber-100 text-amber-700' :
                activeDispatch.status === 'IN_TRANSIT' ? 'bg-purple-100 text-purple-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {activeDispatch.status === 'PENDING' ? 'En Carga' :
                 activeDispatch.status === 'LOADING' ? 'Cargado' :
                 activeDispatch.status === 'IN_TRANSIT' ? 'En Tránsito' :
                 activeDispatch.status === 'DELIVERED' ? 'Entregado' : activeDispatch.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeDispatch && assignedOrders.length > 0 && activeDispatch.status === 'PENDING' && (
              <button 
                onClick={handleLoadDispatch}
                disabled={statusLoading}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer"
              >
                {statusLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar Carga
              </button>
            )}
            <button 
              onClick={handleOpenAssign}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Asignar Pedidos
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto table-container">
          {assignedOrders.length === 0 && !nonPendingDispatch ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Package className="w-12 h-12 opacity-20" />
              <p className="font-bold text-sm text-gray-600">No hay pedidos asignados a este vehículo</p>
              <button onClick={handleOpenAssign} className="text-blue-600 font-bold hover:underline text-sm cursor-pointer">
                + Haz clic aquí para agregar el primer pedido
              </button>
            </div>
          ) : assignedOrders.length === 0 && nonPendingDispatch ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Truck className="w-12 h-12 opacity-20" />
              <p className="font-bold text-sm text-gray-600">Esta unidad ya completó su despacho activo</p>
              <p className="text-xs text-gray-500">Puedes consultar los detalles en el "Historial de Cierres" más abajo.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  <th className="px-4 py-3 whitespace-nowrap">ID / Pedido</th>
                  <th className="px-4 py-3 whitespace-nowrap">Cliente</th>
                  <th className="px-4 py-3 whitespace-nowrap">Destino / Agencia</th>
                  <th className="px-4 py-3 whitespace-nowrap text-center">Items</th>
                  <th className="px-4 py-3 whitespace-nowrap text-center">U.M.</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Peso (KG)</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Vol (m³)</th>
                  <th className="px-4 py-3 whitespace-nowrap text-center">Estado</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {assignedOrders.map((o: any, idx: number) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-900 font-bold font-mono">
                      {o.code || (o.docSeries && o.docNumber ? `PED-${o.docSeries}-${o.docNumber}` : `PED-${o.id}`)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-800 font-bold uppercase">
                      {o.customerName || o.customer?.name || 'Cliente Varios'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-600">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                          {o.agency || 'Agencia Asignada'}
                        </span>
                        {o.agencyAddress && (
                          <span className="text-[10px] text-gray-400 truncate max-w-[220px]" title={o.agencyAddress}>
                            {o.agencyAddress}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs font-bold text-blue-600 text-center">
                      {o.qty || 1}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                        {o.unitMeasure || 'UND'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-800 font-semibold text-right">
                      {formatNumber(o.weight, 1)} kg
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-800 font-semibold text-right">
                      {formatNumber(o.volume, 2)} m³
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        {o.status === 'PICKED' ? 'Preparado' : (o.status || 'Pendiente')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                      {activeDispatch?.status === 'PENDING' && (
                        <button 
                          onClick={() => handleRemoveOrder(o.id)}
                          title="Remover pedido del camión"
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      {/* END: Assigned Orders Table Section */}

      {/* BEGIN: Closed Dispatches History (Collapsible) */}
      {selectedVehicleId && closedDispatches.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setShowClosedDispatches(!showClosedDispatches)}
            className="w-full px-6 py-4 flex items-center justify-between bg-gray-50/70 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wide">
              <Truck className="w-4 h-4 text-gray-500" /> Historial de Despachos ({closedDispatches.length})
            </h3>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showClosedDispatches ? '' : '-rotate-90'}`} />
          </button>
          
          {showClosedDispatches && (
            <div className="divide-y divide-gray-100">
              {closedDispatches.map((d: any) => {
                const orderCount = d.mappedOrders?.length || d.orders?.length || 0;
                const totalWeight = d.currentWeight || 0;
                const totalVolume = d.currentVolume || 0;
                return (
                  <div key={d.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                        d.status === 'LOADING' ? 'bg-blue-100 text-blue-700' :
                        d.status === 'IN_TRANSIT' ? 'bg-purple-100 text-purple-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {d.status === 'LOADING' ? 'Cargado' :
                         d.status === 'IN_TRANSIT' ? 'En Tránsito' :
                         d.status === 'DELIVERED' ? 'Entregado' : d.status}
                      </span>
                      <span className="font-bold text-gray-900 text-sm">
                        {d.vehicle?.plate}
                      </span>
                      {d.driverName && (
                        <span className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md">
                          <User className="w-3 h-3" />
                          {d.driverName}
                        </span>
                      )}
                      <span className="font-bold text-gray-700 text-sm">
                        {orderCount} pedido(s)
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(d.createdAt).toLocaleDateString('es-PE', { 
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-600">
                      <span>{formatNumber(totalWeight, 0)} kg</span>
                      <span>{formatNumber(totalVolume, 1)} m³</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
      {/* END: Closed Dispatches History */}

      {/* BEGIN: Assignment Modal */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Asignar Pedidos al Camión</h3>
                  <p className="text-sm text-gray-500 font-medium">
                    Seleccione los pedidos para cargar en la unidad {selectedVehicle?.plate}
                  </p>
                </div>
                <button 
                  onClick={() => setIsAssignModalOpen(false)} 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Controls: Info banner & Over-capacity alert */}
              <div className="px-6 py-2.5 bg-blue-50/60 border-b border-blue-100 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Mostrando pedidos preparados en almacén con agencia de transporte asignada</span>
                </div>
                
                {overCapacity && (
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-xs bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg">
                    <AlertCircle className="w-4 h-4" /> Capacidad máxima del camión excedida
                  </div>
                )}
              </div>

              {/* Driver Selection */}
              <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center gap-4">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" /> Conductor Asignado:
                </label>
                <select
                  value={selectedDriverId}
                  onChange={e => setSelectedDriverId(e.target.value ? Number(e.target.value) : '')}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-2 font-bold text-gray-800 flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
                >
                  <option value="">-- Seleccionar Conductor (Opcional) --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Order List */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-3">
                {loadingOrders ? (
                  <div className="h-full flex items-center justify-center text-gray-400 py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : availableOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center font-bold text-gray-400 py-12">
                    <Package className="w-12 h-12 opacity-20 mb-2" />
                    No hay pedidos disponibles para asignar
                  </div>
                ) : (
                  availableOrders.map(o => {
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
                        className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 shadow-xs ${
                          isSelected 
                            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' 
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-gray-900 text-base">{o.code || `PED-${o.id}`}</h4>
                              <p className="text-xs font-bold text-gray-600 uppercase">{o.customerName || 'Cliente Varios'}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                              o.status === 'PICKED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {o.status === 'PICKED' ? 'Preparado' : o.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                            <div className="bg-gray-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border border-gray-100">
                              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="font-bold text-gray-700 truncate">{o.agency || 'Agencia'}</span>
                            </div>
                            <div className="bg-blue-50/70 px-2 py-1.5 rounded-lg text-center font-bold text-blue-800 border border-blue-100 uppercase">
                              {o.qty || 1} {o.unitMeasure || 'UND'}
                            </div>
                            <div className="bg-gray-50 px-2 py-1.5 rounded-lg text-center font-bold text-gray-700 border border-gray-100">
                              {formatNumber(o.weight, 1)} kg
                            </div>
                            <div className="bg-gray-50 px-2 py-1.5 rounded-lg text-center font-bold text-gray-700 border border-gray-100">
                              {formatNumber(o.volume, 2)} m³
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-gray-100 bg-white flex flex-wrap justify-between items-center gap-4">
                <div className="flex gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Peso a Cargar</p>
                    <p className={`font-black text-base sm:text-lg ${potentialWeight > truckCapacityKg ? 'text-rose-600' : 'text-gray-900'}`}>
                      {formatNumber(potentialWeight, 0)} <span className="text-xs font-normal text-gray-400">/ {formatNumber(truckCapacityKg, 0)} kg</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Volumen a Cargar</p>
                    <p className={`font-black text-base sm:text-lg ${potentialVolume > truckCapacityM3 ? 'text-rose-600' : 'text-gray-900'}`}>
                      {formatNumber(potentialVolume, 1)} <span className="text-xs font-normal text-gray-400">/ {formatNumber(truckCapacityM3, 1)} m³</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsAssignModalOpen(false)} 
                    className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAssignOrders} 
                    disabled={selectedOrderIds.length === 0 || assigning || overCapacity} 
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer ${
                      (selectedOrderIds.length === 0 || overCapacity) 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                    }`}
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

const VehiclesManager: React.FC<{ 
  vehicles: Vehicle[], 
  token: string | null, 
  onRefresh: () => void 
}> = ({ vehicles, token, onRefresh }) => {
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Catálogo de Vehículos</h3>
            <p className="text-sm font-medium text-gray-500">Gestione capacidades, marcas y estados de la flota</p>
          </div>
          <button 
            onClick={() => handleOpen()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shadow-blue-200 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Nuevo Vehículo
          </button>
        </div>
        
        {vehicles.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Truck className="w-16 h-16 opacity-20" />
            <p className="font-bold text-sm text-gray-600">No hay vehículos registrados</p>
            <button onClick={() => handleOpen()} className="text-blue-600 font-bold hover:underline text-sm cursor-pointer">
              Registrar el primer vehículo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map(v => (
              <div key={v.id} className="border border-gray-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all group bg-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 uppercase text-base">{v.plate}</h4>
                      <p className="text-xs font-bold text-gray-500">{v.brand || 'Genérico'} {v.model || ''}</p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    v.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 
                    v.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {v.status === 'ACTIVE' ? 'Activo' : v.status === 'MAINTENANCE' ? 'Mantenimiento' : 'Inactivo'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Capacidad Peso</p>
                    <p className="font-bold text-gray-800 text-sm">{formatNumber(v.capacityWeight, 0)} kg</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Capacidad Volumen</p>
                    <p className="font-bold text-gray-800 text-sm">{formatNumber(v.capacityVolume, 1)} m³</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button 
                    onClick={() => handleOpen(v)} 
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Editar vehículo"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(v.id)} 
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Eliminar vehículo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Vehículo */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Placa *</label>
                    <input 
                      required 
                      value={formData.plate} 
                      onChange={e => setFormData({...formData, plate: e.target.value.toUpperCase()})} 
                      className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-2 bg-gray-50 uppercase font-bold" 
                      placeholder="AAF-759" 
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Estado</label>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-2 bg-gray-50 font-bold text-gray-800 cursor-pointer"
                    >
                      <option value="ACTIVE">Activo</option>
                      <option value="MAINTENANCE">En Mantenimiento</option>
                      <option value="INACTIVE">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Marca</label>
                    <input 
                      value={formData.brand} 
                      onChange={e => setFormData({...formData, brand: e.target.value})} 
                      className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-2" 
                      placeholder="Ej. Hyundai" 
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Modelo</label>
                    <input 
                      value={formData.model} 
                      onChange={e => setFormData({...formData, model: e.target.value})} 
                      className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-2" 
                      placeholder="Ej. A-100" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Capacidad Peso (KG) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      value={formData.capacityWeight} 
                      onChange={e => setFormData({...formData, capacityWeight: e.target.value})} 
                      className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-2 font-semibold" 
                      placeholder="1480" 
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Capacidad Volumen (m³) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      value={formData.capacityVolume} 
                      onChange={e => setFormData({...formData, capacityVolume: e.target.value})} 
                      className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-2 font-semibold" 
                      placeholder="12.5" 
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm shadow-blue-200 flex items-center gap-2 cursor-pointer"
                  >
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

const DriversManager: React.FC<{ 
  drivers: Driver[], 
  token: string | null, 
  onRefresh: () => void 
}> = ({ drivers, token, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    docType: '1',
    docNumber: '',
    name: '',
    licenseNumber: '',
    phone: '',
    email: '',
    status: 'ACTIVE'
  });
  const [loading, setLoading] = useState(false);
  const [consulting, setConsulting] = useState(false);

  const handleOpen = (driver?: Driver) => {
    if (driver) {
      setEditingId(driver.id);
      setFormData({
        docType: driver.docType || '1',
        docNumber: driver.docNumber,
        name: driver.name,
        licenseNumber: driver.licenseNumber || '',
        phone: driver.phone || '',
        email: driver.email || '',
        status: driver.status
      });
    } else {
      setEditingId(null);
      setFormData({
        docType: '1',
        docNumber: '',
        name: '',
        licenseNumber: '',
        phone: '',
        email: '',
        status: 'ACTIVE'
      });
    }
    setIsModalOpen(true);
  };

  const handleConsultReniec = async () => {
    const dni = formData.docNumber.trim();
    if (!dni || dni.length !== 8) {
      alert('Ingrese un número de DNI válido de 8 dígitos');
      return;
    }
    setConsulting(true);
    try {
      const res = await axios.get(`/api/consult/dni/${dni}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        const full = res.data.nombre_completo || `${res.data.nombres || ''} ${res.data.apellido_paterno || ''} ${res.data.apellido_materno || ''}`.trim();
        if (full) {
          setFormData(prev => ({ ...prev, name: full.toUpperCase() }));
        }
      }
    } catch (e: any) {
      alert('No se pudo consultar el DNI en RENIEC. Ingrese el nombre manualmente.');
    } finally {
      setConsulting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await axios.put(`/api/drivers/${editingId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/api/drivers', formData, { headers: { Authorization: `Bearer ${token}` } });
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al guardar el conductor');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que desea eliminar este conductor?')) return;
    try {
      await axios.delete(`/api/drivers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Catálogo de Conductores / Choferes</h3>
            <p className="text-sm font-medium text-gray-500">Gestione choferes, números de licencia (brevete) y datos de contacto</p>
          </div>
          <button 
            onClick={() => handleOpen()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shadow-blue-200 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Nuevo Conductor
          </button>
        </div>
        
        {drivers.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-3">
            <User className="w-16 h-16 opacity-20" />
            <p className="font-bold text-sm text-gray-600">No hay conductores registrados</p>
            <button onClick={() => handleOpen()} className="text-blue-600 font-bold hover:underline text-sm cursor-pointer">
              Registrar el primer conductor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map(d => (
              <div key={d.id} className="border border-gray-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all group bg-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 uppercase text-sm leading-tight">{d.name}</h4>
                      <p className="text-xs font-mono font-bold text-gray-500 mt-0.5">DNI: {d.docNumber}</p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    d.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {d.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Licencia / Brevete</p>
                    <p className="font-bold text-gray-800 uppercase font-mono">{d.licenseNumber || 'SIN REGISTRO'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Teléfono</p>
                    <p className="font-bold text-gray-800">{d.phone || '-'}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button 
                    onClick={() => handleOpen(d)} 
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Editar conductor"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(d.id)} 
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Eliminar conductor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Conductor */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Editar Conductor' : 'Nuevo Conductor'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">DNI / Documento *</label>
                    <div className="relative flex items-center">
                      <input 
                        required 
                        maxLength={11}
                        value={formData.docNumber} 
                        onChange={e => setFormData({...formData, docNumber: e.target.value})} 
                        className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-2 bg-gray-50 font-mono font-bold pr-10" 
                        placeholder="70000000" 
                      />
                      <button 
                        type="button" 
                        onClick={handleConsultReniec} 
                        disabled={consulting} 
                        className="absolute right-2 p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Consultar RENIEC"
                      >
                        {consulting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Estado</label>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-2 bg-gray-50 font-bold text-gray-800 cursor-pointer"
                    >
                      <option value="ACTIVE">Activo</option>
                      <option value="INACTIVE">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Apellidos y Nombres *</label>
                  <input 
                    required
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} 
                    className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-2 uppercase font-bold" 
                    placeholder="CARLOS ALBERTO PÉREZ GÓMEZ" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">N° Licencia (Brevete)</label>
                    <input 
                      value={formData.licenseNumber} 
                      onChange={e => setFormData({...formData, licenseNumber: e.target.value.toUpperCase()})} 
                      className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-2 font-mono uppercase" 
                      placeholder="Q-12345678" 
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Teléfono / Celular</label>
                    <input 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-2 font-mono" 
                      placeholder="999888777" 
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm shadow-blue-200 flex items-center gap-2 cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar Conductor
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
