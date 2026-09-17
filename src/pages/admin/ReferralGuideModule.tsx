import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, Search, Filter, RefreshCw, Printer, 
  FileText, Calendar, MapPin, Eye, Trash2, CheckCircle2, 
  AlertCircle, Clock, Check, X, ArrowUpRight, Building2, Package
} from 'lucide-react';
import axios from 'axios';
import { SalesReferralGuideForm } from './forms/SalesReferralGuideForm';
import { generateReferralGuidePDF } from '../../lib/pdfGenerator';

interface ReferralGuideModuleProps {
  token?: string | null;
  orders?: any[];
  warehouses?: any[];
  shippingAgencies?: any[];
  seriesList?: any[];
  onNew?: () => void;
  refreshTrigger?: number;
}

export const ReferralGuideModule: React.FC<ReferralGuideModuleProps> = ({
  token,
  orders = [],
  warehouses = [],
  shippingAgencies = [],
  seriesList = [],
  onNew,
  refreshTrigger
}) => {
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrderIdForGuide, setSelectedOrderIdForGuide] = useState<number | null>(null);
  const [selectedGuideForDetail, setSelectedGuideForDetail] = useState<any | null>(null);

  useEffect(() => {
    fetchGuides();
  }, [statusFilter, warehouseFilter, startDate, endDate, refreshTrigger]);

  const fetchGuides = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (warehouseFilter) params.warehouseId = warehouseFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (searchTerm) params.search = searchTerm;

      const res = await axios.get('/api/sales-referral-guides', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setGuides(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error al obtener guías de remisión:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGuides();
  };

  const handlePrint = (guide: any) => {
    generateReferralGuidePDF(guide, guide.items || [], 'print');
  };

  const handleDownloadPDF = (guide: any) => {
    generateReferralGuidePDF(guide, guide.items || [], 'save');
  };

  const handleVoidGuide = async (id: number) => {
    if (!confirm('¿Está seguro de anular esta Guía de Remisión?')) return;
    try {
      await axios.put(`/api/sales-referral-guides/${id}/status`, { status: 'VOIDED' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGuides();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al anular la guía de remisión');
    }
  };

  // KPIs
  const totalGuides = guides.length;
  const activeGuides = guides.filter(g => g.status === 'ACTIVE').length;
  const deliveredGuides = guides.filter(g => g.status === 'DELIVERED').length;
  const sunatAccepted = guides.filter(g => g.sunatStatus === 'ACCEPTED').length;

  return (
    <div className="relative flex flex-col gap-4 pb-8 min-h-[600px]">
      
      {/* TARJETAS DE RESUMEN KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Guías</p>
            <h3 className="text-xl font-black text-slate-800">{totalGuides}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Emitidas / Activas</p>
            <h3 className="text-xl font-black text-blue-700">{activeGuides}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entregadas</p>
            <h3 className="text-xl font-black text-slate-700">{deliveredGuides}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aceptadas SUNAT</p>
            <h3 className="text-xl font-black text-emerald-600">{sunatAccepted}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* CABECERA PRINCIPAL Y BOTÓN DE ACCIÓN */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#004A99] text-white flex items-center justify-center shadow-sm">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Guías de Remisión de Venta (GRE - Remitente)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Control logístico de traslados, despachos de pedidos y emisión electrónica
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={() => {
              if (onNew) {
                onNew();
              } else {
                setSelectedOrderIdForGuide(null);
                setIsFormOpen(true);
              }
            }} 
            className="h-8 px-4 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nueva Guía de Remisión
          </button>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md relative">
          <div className="relative flex-1">
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="h-8 w-full border border-slate-300 rounded-lg pl-8 pr-3 text-xs font-medium uppercase outline-none focus:border-blue-500" 
              placeholder="BUSCAR POR N° GUÍA, CLIENTE, PLACA, PEDIDO..." 
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <button 
            type="submit" 
            className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors cursor-pointer"
          >
            Buscar
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Almacén:</span>
            <select 
              value={warehouseFilter} 
              onChange={e => setWarehouseFilter(e.target.value)} 
              className="h-8 border border-slate-300 rounded-lg px-2 text-xs font-semibold bg-white outline-none uppercase"
            >
              <option value="">TODOS LOS ALMACENES</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Estado:</span>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)} 
              className="h-8 border border-slate-300 rounded-lg px-2 text-xs font-semibold bg-white outline-none uppercase"
            >
              <option value="ALL">TODOS LOS ESTADOS</option>
              <option value="ACTIVE">ACTIVO / EMITIDO</option>
              <option value="IN_TRANSIT">EN TRÁNSITO</option>
              <option value="DELIVERED">ENTREGADO</option>
              <option value="VOIDED">ANULADO</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Desde:</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="h-8 border border-slate-300 rounded-lg px-2 text-xs font-medium bg-white outline-none" 
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Hasta:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="h-8 border border-slate-300 rounded-lg px-2 text-xs font-medium bg-white outline-none" 
            />
          </div>

          <button 
            type="button" 
            onClick={fetchGuides} 
            disabled={loading}
            className="h-8 w-8 bg-slate-100 hover:bg-blue-50 border border-slate-300 text-slate-600 hover:text-blue-700 rounded-lg flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE GUÍAS DE REMISIÓN */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#004A99] text-white text-[10px] uppercase font-bold tracking-wider select-none">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 w-28 text-center">Comprobante</th>
                <th className="py-2.5 px-3 w-24 text-center">F. Emisión</th>
                <th className="py-2.5 px-3 w-24 text-center">F. Traslado</th>
                <th className="py-2.5 px-3">Destinatario (Cliente)</th>
                <th className="py-2.5 px-3">Punto Llegada</th>
                <th className="py-2.5 px-3 w-32">Modalidad</th>
                <th className="py-2.5 px-3 w-24 text-center">Doc. Ref.</th>
                <th className="py-2.5 px-3 w-24 text-right">Peso / Bultos</th>
                <th className="py-2.5 px-3 w-24 text-center">Estado</th>
                <th className="py-2.5 px-3 w-28 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="font-semibold text-xs">Cargando guías de remisión...</p>
                  </td>
                </tr>
              ) : guides.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-xs text-slate-600">No se encontraron guías de remisión</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Haga clic en "+ Nueva Guía de Remisión" para registrar una</p>
                  </td>
                </tr>
              ) : (
                guides.map((g, idx) => (
                  <tr key={g.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-2 px-3 text-center font-bold text-slate-400 text-[10px]">{idx + 1}</td>
                    
                    <td className="py-2 px-3 text-center">
                      <div className="font-mono font-bold text-blue-900 text-xs">
                        {g.numberFormatted || `${g.series}-${String(g.number).padStart(8, '0')}`}
                      </div>
                      <span className="text-[9px] text-slate-400 font-semibold uppercase">Tipo 09</span>
                    </td>

                    <td className="py-2 px-3 text-center font-mono font-medium text-slate-600 text-[11px]">
                      {g.issueDate?.split('T')[0] || '-'}
                    </td>

                    <td className="py-2 px-3 text-center font-mono font-medium text-slate-600 text-[11px]">
                      {g.transferDate?.split('T')[0] || g.issueDate?.split('T')[0] || '-'}
                    </td>

                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-800 text-xs">{g.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{g.customerDocType || 'RUC'}: {g.customerDocNumber}</div>
                    </td>

                    <td className="py-2 px-3">
                      <div className="text-slate-700 truncate max-w-xs text-[11px]">
                        {g.deliveryAddress || '-'}
                      </div>
                      <div className="text-[9px] text-slate-400 uppercase font-semibold">
                        {g.deliveryDistrict || g.deliveryDepartment || 'LIMA'} (Ubigeo: {g.deliveryUbigeo || '150101'})
                      </div>
                    </td>

                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block ${g.transportMode === '01' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                        {g.transportMode === '01' ? 'PÚBLICO' : 'PRIVADO'}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[120px]">
                        {g.transportMode === '01' ? (g.carrierName || g.carrierDocNumber || '-') : (g.vehiclePlate || 'S/ PLACA')}
                      </div>
                    </td>

                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 text-xs">
                      {g.orderId ? (
                        <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[10px]">
                          Ped #{g.orderId}
                        </span>
                      ) : (g.invoiceNumber || '-')}
                    </td>

                    <td className="py-2 px-3 text-right">
                      <div className="font-mono font-bold text-slate-800 text-xs">
                        {parseFloat(g.totalWeight || 0).toFixed(2)} Kg
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold">
                        {g.totalPackages || g.items?.length || 1} Bultos
                      </div>
                    </td>

                    <td className="py-2 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span 
                          onClick={() => setSelectedGuideForDetail(g)}
                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                            g.sunatStatus === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200' :
                            g.sunatStatus === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200' :
                            'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                          }`} 
                          title="Clic para ver constancia de recepción (CDR) y detalles SUNAT"
                        >
                          {g.sunatStatus === 'ACCEPTED' && <Check className="w-2.5 h-2.5 text-emerald-700" />}
                          {g.sunatStatus === 'REJECTED' && <AlertCircle className="w-2.5 h-2.5 text-rose-700" />}
                          {g.sunatStatus === 'PENDING' && <Clock className="w-2.5 h-2.5 text-amber-700" />}
                          {g.sunatStatus === 'ACCEPTED' ? 'Aceptado SUNAT' : (g.sunatStatus === 'REJECTED' ? 'Rechazado' : 'Pendiente')}
                        </span>
                        {g.sunatStatus !== 'ACCEPTED' && g.status !== 'VOIDED' && (
                          <button 
                            type="button" 
                            onClick={async () => {
                              try {
                                const res = await axios.post(`/api/sales-referral-guides/${g.id}/send-sunat`, {}, {
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                if (res.data) {
                                  alert(`SUNAT: ${res.data.sunatResponse || 'Guía procesada correctamente'}`);
                                  fetchGuides();
                                }
                              } catch (err: any) {
                                alert(err.response?.data?.error || 'Error al enviar guía a SUNAT');
                              }
                            }}
                            className="text-[9px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition-colors flex items-center gap-0.5 cursor-pointer"
                            title="Enviar Guía de Remisión a SUNAT"
                          >
                            <ArrowUpRight className="w-2.5 h-2.5" /> Enviar SUNAT
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          type="button" 
                          onClick={() => handlePrint(g)} 
                          className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors" 
                          title="Imprimir Guía"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleDownloadPDF(g)} 
                          className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors" 
                          title="Descargar PDF"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {g.status !== 'VOIDED' && (
                          <button 
                            type="button" 
                            onClick={() => handleVoidGuide(g.id)} 
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" 
                            title="Anular Guía"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE REGISTRO DE GUÍA (Fallback si no se controla desde el router) */}
      {!onNew && (
        <SalesReferralGuideForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            fetchGuides();
            setIsFormOpen(false);
          }}
          token={token}
          initialOrderId={selectedOrderIdForGuide}
          orders={orders}
          warehouses={warehouses}
          shippingAgencies={shippingAgencies}
          seriesList={seriesList}
        />
      )}

      {/* MODAL DETALLES SUNAT / CDR DE GUÍA DE REMISIÓN */}
      {selectedGuideForDetail && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 overflow-hidden">
          <div 
            onClick={() => setSelectedGuideForDetail(null)} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" 
          />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 z-10">
            <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white border-b border-blue-900">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-200" />
                <h3 className="text-xs font-bold uppercase tracking-tight">
                  Constancia SUNAT: {selectedGuideForDetail.numberFormatted || `${selectedGuideForDetail.series}-${selectedGuideForDetail.number}`}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedGuideForDetail(null)} 
                className="hover:bg-red-600 p-1 rounded text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Estado SUNAT:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    selectedGuideForDetail.sunatStatus === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                    selectedGuideForDetail.sunatStatus === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {selectedGuideForDetail.sunatStatus === 'ACCEPTED' ? 'ACEPTADO CON CDR' : (selectedGuideForDetail.sunatStatus || 'PENDIENTE')}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Punto de Partida:</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">
                    [{selectedGuideForDetail.originSunatCode || selectedGuideForDetail.originWarehouse?.sunatCode || '0000'}] {selectedGuideForDetail.originAddress || selectedGuideForDetail.originWarehouse?.address || 'Principal'}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Firma Electrónica / Hash:</span>
                  <span className="font-mono text-[10px] text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedGuideForDetail.sunatHashCode || 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">F. Emisión / Traslado:</span>
                  <span className="font-mono text-slate-700">
                    {selectedGuideForDetail.issueDate?.split('T')[0]} / {selectedGuideForDetail.transferDate?.split('T')[0]}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-blue-600" /> Mensaje Oficial SUNAT:
                </p>
                <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-100 text-slate-800 font-mono text-[11px]">
                  {selectedGuideForDetail.sunatResponse || 'Guía registrada electrónicamente según normativa UBL 2.1.'}
                </div>
              </div>

              {selectedGuideForDetail.sunatQr && (
                <div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Cadena Código QR SUNAT:</p>
                  <div className="bg-slate-100 p-2 rounded border border-slate-200 font-mono text-[9px] text-slate-600 break-all">
                    {selectedGuideForDetail.sunatQr}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedGuideForDetail(null)}
                  className="px-4 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePrint(selectedGuideForDetail);
                  }}
                  className="px-4 h-8 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Guía
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
