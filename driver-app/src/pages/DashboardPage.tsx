import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '../auth'
import api from '../api'

interface Vehicle {
  plate: string
  brand: string | null
  model: string | null
}

interface DispatchData {
  id: number
  status: string
  vehicle: Vehicle
  totalOrders: number
  deliveredOrders: number
  orders: any[]
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dispatch, setDispatch] = useState<DispatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const fetchDispatch = async () => {
    try {
      const res = await api.get('/mobile/dispatch')
      setDispatch(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDispatch()
    const interval = setInterval(fetchDispatch, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleDepart = async () => {
    if (!dispatch) return
    setUpdating(true)
    try {
      await api.put(`/mobile/dispatch/${dispatch.id}/status`, { status: 'IN_TRANSIT' })
      setDispatch(prev => prev ? { ...prev, status: 'IN_TRANSIT' } : null)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al actualizar')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">Conductor</p>
            <h1 className="text-white text-lg font-black">{user?.name || 'Usuario'}</h1>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="text-blue-200 text-xs font-bold hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-white/5"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {loading ? (
          <div className="text-center py-20 text-slate-400 font-bold">Cargando...</div>
        ) : !dispatch ? (
          /* No active dispatch */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-lg font-black text-slate-500">Sin despacho activo</p>
            <p className="text-sm text-slate-400 font-medium mt-1">Espera a que te asignen un vehículo</p>
          </motion.div>
        ) : (
          <>
            {/* Vehicle Card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Vehículo Asignado</p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">{dispatch.vehicle.plate}</h2>
                  <p className="text-sm font-bold text-slate-500">{dispatch.vehicle.brand} {dispatch.vehicle.model}</p>
                </div>
              </div>
            </motion.div>

            {/* Status + Progress */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                  dispatch.status === 'LOADING' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {dispatch.status === 'LOADING' ? 'EN ALMACÉN' : 'EN TRÁNSITO'}
                </span>
                <span className="text-sm font-bold text-slate-500">
                  {dispatch.deliveredOrders}/{dispatch.totalOrders} entregados
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    dispatch.totalOrders > 0 && dispatch.deliveredOrders === dispatch.totalOrders
                      ? 'bg-emerald-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${dispatch.totalOrders > 0 ? (dispatch.deliveredOrders / dispatch.totalOrders) * 100 : 0}%` }}
                />
              </div>
            </motion.div>

            {/* Depart Button (only if LOADING) */}
            {dispatch.status === 'LOADING' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                onClick={handleDepart}
                disabled={updating}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-200 text-base uppercase tracking-widest transition-all flex items-center justify-center gap-3"
              >
                {updating ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
                {updating ? 'Actualizando...' : 'Salir de Almacén'}
              </motion.button>
            )}

            {/* Orders list preview */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div
                onClick={() => navigate('/orders')}
                className="p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="font-black text-slate-700">Ver Pedidos</p>
                  <p className="text-xs font-bold text-slate-400">{dispatch.totalOrders} pedido(s) en ruta</p>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Mini list of pending orders */}
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {dispatch.orders.filter((o: any) => o.status !== 'DELIVERED').slice(0, 3).map((o: any) => (
                  <div key={o.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-700">{o.code}</p>
                      <p className="text-xs text-slate-400">{o.customerName}</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase">
                      Pendiente
                    </span>
                  </div>
                ))}
                {dispatch.orders.filter((o: any) => o.status !== 'DELIVERED').length === 0 && (
                  <div className="px-4 py-3 text-center text-sm font-bold text-emerald-600">
                    ✓ Todos los pedidos entregados
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}
