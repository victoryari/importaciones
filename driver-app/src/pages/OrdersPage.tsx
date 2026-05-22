import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import api from '../api'

interface OrderItem {
  id: number
  code: string
  customerName: string
  customerAddress: string | null
  customerPhone: string | null
  weight: number
  volume: number
  qty: number
  status: string
  deliveredAt: string | null
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deliveringId, setDeliveringId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered'>('pending')

  const fetchOrders = async () => {
    try {
      const statusParam = filter === 'all' ? '' : `?status=${filter}`
      const res = await api.get(`/mobile/orders${statusParam}`)
      setOrders(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [filter])

  const handleDeliver = async (orderId: number) => {
    setDeliveringId(orderId)
    try {
      await api.put(`/mobile/orders/${orderId}/deliver`)
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, status: 'DELIVERED', deliveredAt: new Date().toISOString() } : o
      ))
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al entregar pedido')
    } finally {
      setDeliveringId(null)
    }
  }

  const pendingOrders = orders.filter(o => o.status !== 'DELIVERED')
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-blue-200 p-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-white text-lg font-black">Pedidos</h1>
            <p className="text-blue-200 text-xs font-bold">{pendingOrders.length} pendientes · {deliveredOrders.length} entregados</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex gap-2">
        {(['pending', 'all', 'delivered'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              filter === f ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {f === 'pending' ? 'Pendientes' : f === 'delivered' ? 'Entregados' : 'Todos'}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-3">
        {loading ? (
          <div className="text-center py-20 text-slate-400 font-bold">Cargando...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold">Sin pedidos</div>
        ) : (
          orders.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
                o.status === 'DELIVERED' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-black text-slate-800">{o.code}</h3>
                    <p className="text-sm font-bold text-slate-600">{o.customerName}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    o.status === 'DELIVERED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {o.status === 'DELIVERED' ? 'Entregado' : 'Pendiente'}
                  </span>
                </div>

                {o.customerAddress && (
                  <p className="text-xs text-slate-400 font-medium mb-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {o.customerAddress}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-500 font-bold">
                  <span>{o.qty} und.</span>
                  <span>{o.weight.toFixed(1)} kg</span>
                  {o.customerPhone && <span>📞 {o.customerPhone}</span>}
                </div>
              </div>

              {o.status !== 'DELIVERED' && (
                <div className="px-4 pb-4">
                  <button
                    onClick={() => handleDeliver(o.id)}
                    disabled={deliveringId === o.id}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl text-sm uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {deliveringId === o.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {deliveringId === o.id ? 'Entregando...' : 'Marcar como Entregado'}
                  </button>
                </div>
              )}

              {o.deliveredAt && (
                <div className="bg-emerald-50 px-4 py-2 border-t border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600">
                    Entregado {new Date(o.deliveredAt).toLocaleString('es-PE')}
                  </p>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
