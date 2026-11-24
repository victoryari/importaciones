import React, { useMemo, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Search,
  Warehouse,
  Calendar,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  DollarSign,
  Download,
  FileDown
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../../lib/utils';
import { generateKardexPDF } from '../../lib/pdfGenerator';

interface KardexModuleProps {
  token: string | null;
  products?: any[];
  warehouses?: any[];
}

export const KardexModule: React.FC<KardexModuleProps> = ({
  token,
  products = [],
  warehouses = [],
}) => {
  const [activeTab, setActiveTab] = useState<'valued' | 'physical'>('valued');
  const [productQuery, setProductQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [warehouseId, setWarehouseId] = useState<string>('ALL');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [kardexData, setKardexData] = useState<any>(null);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter(
        (p) =>
          (p.code || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [products, productQuery]);

  const fetchKardex = async (tabOverride?: 'valued' | 'physical', prodOverride?: string) => {
    const prodId = prodOverride || selectedProductId;
    if (!prodId) {
      setErrorMsg('Selecciona un producto para generar el Kardex.');
      return;
    }
    const mode = tabOverride || activeTab;
    setLoading(true);
    setErrorMsg('');
    try {
      const endpoint = mode === 'valued' ? '/api/kardex/valued' : '/api/kardex/physical';
      const res = await axios.get(endpoint, {
        params: {
          productId: prodId,
          warehouseId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      setKardexData(res.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Error al consultar Kardex.');
      setKardexData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (prod: any) => {
    const idStr = String(prod.id);
    setSelectedProductId(idStr);
    setProductQuery(`${prod.code ? `[${prod.code}] ` : ''}${prod.name}`);
    setShowProductDropdown(false);
    fetchKardex(activeTab, idStr);
  };

  const handleTabChange = (tab: 'valued' | 'physical') => {
    setActiveTab(tab);
    if (selectedProductId) {
      fetchKardex(tab, selectedProductId);
    }
  };

  const rows: any[] = kardexData?.rows || [];

  const handleExportExcel = () => {
    if (!kardexData) return;
    const isValued = activeTab === 'valued';
    const estName = kardexData.warehouse ? kardexData.warehouse.name : 'GENERAL (TODOS LOS ALMACENES)';
    const headerRows: any[][] = [
      [isValued ? 'FORMATO 13.1: REGISTRO DE INVENTARIO PERMANENTE VALORIZADO' : 'FORMATO 12.1: REGISTRO DE INVENTARIO PERMANENTE EN UNIDADES FÍSICAS'],
      [`PERIODO: ${kardexData.period?.startDate || 'INICIO'} AL ${kardexData.period?.endDate || 'HOY'}`, '', `ESTABLECIMIENTO: ${estName}`],
      [`PRODUCTO: [${kardexData.product?.code || '-'}] ${kardexData.product?.name || ''}`, '', `U.M.: ${kardexData.product?.unitSymbol || 'UND'}`, '', 'MÉTODO: PROMEDIO PONDERADO'],
      [],
    ];

    if (isValued) {
      headerRows.push([
        'FECHA', 'TIPO', 'SERIE', 'NÚMERO', 'OP. SUNAT (12)',
        'ENT. CANT.', 'ENT. C. UNIT', 'ENT. C. TOTAL',
        'SAL. CANT.', 'SAL. C. UNIT', 'SAL. C. TOTAL',
        'SALDO CANT.', 'SALDO C. PROM.', 'SALDO TOTAL'
      ]);
      headerRows.push([
        '', '', '', '', 'SALDO INICIAL',
        '', '', '',
        '', '', '',
        Number(kardexData.initialBalance?.quantity || 0),
        Number(kardexData.initialBalance?.unitCost || 0),
        Number(kardexData.initialBalance?.totalCost || 0),
      ]);
      for (const r of rows) {
        headerRows.push([
          r.date, r.docType, r.docSeries || '', r.docNumber || '', r.sunatOperationCode,
          r.inQty > 0 ? r.inQty : '', r.inQty > 0 ? r.inUnitCost : '', r.inQty > 0 ? r.inTotalCost : '',
          r.outQty > 0 ? r.outQty : '', r.outQty > 0 ? r.outUnitCost : '', r.outQty > 0 ? r.outTotalCost : '',
          r.balanceQty, r.balanceUnitCost, r.balanceTotalCost,
        ]);
      }
      headerRows.push([
        '', '', '', '', 'TOTALES / SALDO FINAL',
        Number(kardexData.totals?.inQty || 0), '', Number(kardexData.totals?.inTotalCost || 0),
        Number(kardexData.totals?.outQty || 0), '', Number(kardexData.totals?.outTotalCost || 0),
        Number(kardexData.finalBalance?.quantity || 0),
        Number(kardexData.finalBalance?.unitCost || 0),
        Number(kardexData.finalBalance?.totalCost || 0),
      ]);
    } else {
      headerRows.push(['FECHA', 'TIPO', 'SERIE', 'NÚMERO', 'OP. SUNAT (12)', 'LOTE', 'DETALLE / ALMACÉN', 'ENTRADA', 'SALIDA', 'SALDO']);
      headerRows.push(['', '', '', '', 'SALDO INICIAL', '', '', '', '', Number(kardexData.initialBalance?.quantity || 0)]);
      for (const r of rows) {
        headerRows.push([
          r.date, r.docType, r.docSeries || '', r.docNumber || '', r.sunatOperationCode,
          r.lotNumber || '', r.observation || r.warehouseName || '',
          r.inQty > 0 ? r.inQty : '', r.outQty > 0 ? r.outQty : '', r.balanceQty,
        ]);
      }
      headerRows.push([
        '', '', '', '', 'TOTALES / SALDO FINAL', '', '',
        Number(kardexData.totals?.inQty || 0), Number(kardexData.totals?.outQty || 0),
        Number(kardexData.finalBalance?.quantity || 0),
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(headerRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isValued ? 'Formato_13_1' : 'Formato_12_1');
    const slug = (kardexData.product?.code || 'PROD').replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `Kardex_${isValued ? '13.1_Valorizado' : '12.1_Fisico'}_${slug}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-[#004A99] rounded-xl border border-blue-100">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">
              Kardex SUNAT (Físico y Valorizado)
            </h2>
            <p className="text-xs text-slate-500">
              Formato 13.1 (Valorizado — Costo Promedio Ponderado) y Formato 12.1 (Unidades Físicas), Por Almacén o General.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handleTabChange('valued')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                activeTab === 'valued'
                  ? 'bg-[#004A99] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Valorizado (13.1)
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('physical')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                activeTab === 'physical'
                  ? 'bg-[#004A99] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Físico (12.1)
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!kardexData}
            className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            type="button"
            onClick={() => kardexData && generateKardexPDF(kardexData, activeTab, 'save')}
            disabled={!kardexData}
            className="h-9 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-red-600" />
            PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5 space-y-1 relative">
            <label className="text-[10px] font-bold text-slate-600 uppercase">Producto *</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productQuery}
                onFocus={() => setShowProductDropdown(true)}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setShowProductDropdown(true);
                }}
                placeholder="Buscar por código o nombre del producto..."
                className="h-9 w-full pl-8 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-[#004A99] focus:bg-white"
              />
            </div>

            {showProductDropdown && filteredProducts.length > 0 && (
              <div className="absolute z-40 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-100 last:border-0 text-xs flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-[#004A99] mr-2">{p.code || 'S/C'}</span>
                      <span className="font-semibold text-slate-800 truncate">{p.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 shrink-0">
                      Stock: {formatNumber(p.stock || 0, 2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
              <Warehouse className="w-3 h-3" /> Alcance / Almacén
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="h-9 w-full px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-[#004A99]"
            >
              <option value="ALL">GENERAL (TODOS LOS ALMACENES)</option>
              {warehouses
                .filter((w) => w.isActive !== false)
                .map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name.toUpperCase()}
                  </option>
                ))}
            </select>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-full px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-[#004A99]"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Hasta
            </label>
            <div className="flex gap-1.5">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 flex-1 min-w-0 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-[#004A99]"
              />
              <button
                type="button"
                onClick={() => fetchKardex()}
                disabled={loading}
                className="h-9 px-3 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                title="Consultar Kardex"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-2 rounded-lg">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Resumen del Periodo */}
      {kardexData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Saldo Inicial</p>
            <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
              {formatNumber(kardexData.initialBalance?.quantity || 0, 3)}{' '}
              <span className="text-xs text-slate-500">{kardexData.product?.unitSymbol}</span>
            </p>
            {activeTab === 'valued' && (
              <p className="text-xs font-semibold text-slate-600 mt-0.5 tabular-nums">
                Valor: {formatCurrency(kardexData.initialBalance?.totalCost || 0)}
              </p>
            )}
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5" /> Total Entradas
            </p>
            <p className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
              +{formatNumber(kardexData.totals?.inQty || 0, 3)}{' '}
              <span className="text-xs">{kardexData.product?.unitSymbol}</span>
            </p>
            {activeTab === 'valued' && (
              <p className="text-xs font-semibold text-emerald-700 mt-0.5 tabular-nums">
                Valor: {formatCurrency(kardexData.totals?.inTotalCost || 0)}
              </p>
            )}
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> Total Salidas
            </p>
            <p className="text-xl font-bold text-amber-700 mt-1 tabular-nums">
              -{formatNumber(kardexData.totals?.outQty || 0, 3)}{' '}
              <span className="text-xs">{kardexData.product?.unitSymbol}</span>
            </p>
            {activeTab === 'valued' && (
              <p className="text-xs font-semibold text-amber-700 mt-0.5 tabular-nums">
                Valor: {formatCurrency(kardexData.totals?.outTotalCost || 0)}
              </p>
            )}
          </div>

          <div className="bg-[#004A99] p-4 rounded-xl text-white border border-blue-900 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" /> Saldo Final
            </p>
            <p className="text-xl font-bold mt-1 tabular-nums">
              {formatNumber(kardexData.finalBalance?.quantity || 0, 3)}{' '}
              <span className="text-xs text-blue-200">{kardexData.product?.unitSymbol}</span>
            </p>
            {activeTab === 'valued' && (
              <p className="text-xs font-semibold text-blue-100 mt-0.5 tabular-nums">
                {formatCurrency(kardexData.finalBalance?.totalCost || 0)} (Prom:{' '}
                {Number(kardexData.finalBalance?.unitCost || 0).toFixed(4)})
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabla Kardex */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {!kardexData ? (
          <div className="py-16 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-bold uppercase tracking-wider">
              Selecciona un producto y rango de fechas para visualizar el Kardex
            </p>
          </div>
        ) : activeTab === 'valued' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase text-center">
                  <th colSpan={5} className="py-2 px-2 border-r border-slate-300">Documento / Operación SUNAT</th>
                  <th colSpan={3} className="py-2 px-2 border-r border-slate-300 bg-emerald-50 text-emerald-800">Entradas</th>
                  <th colSpan={3} className="py-2 px-2 border-r border-slate-300 bg-amber-50 text-amber-800">Salidas</th>
                  <th colSpan={3} className="py-2 px-2 bg-blue-50 text-[#004A99]">Saldo Final</th>
                </tr>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <th className="py-2 px-2">Fecha</th>
                  <th className="py-2 px-2 text-center">Tipo</th>
                  <th className="py-2 px-2 text-center">Serie</th>
                  <th className="py-2 px-2">Número</th>
                  <th className="py-2 px-2 text-center border-r border-slate-200">Op. 12</th>
                  <th className="py-2 px-2 text-right">Cant.</th>
                  <th className="py-2 px-2 text-right">C. Unit</th>
                  <th className="py-2 px-2 text-right border-r border-slate-200">C. Total</th>
                  <th className="py-2 px-2 text-right">Cant.</th>
                  <th className="py-2 px-2 text-right">C. Unit</th>
                  <th className="py-2 px-2 text-right border-r border-slate-200">C. Total</th>
                  <th className="py-2 px-2 text-right">Cant.</th>
                  <th className="py-2 px-2 text-right">C. Prom</th>
                  <th className="py-2 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr className="bg-slate-50/70 font-bold text-slate-700">
                  <td colSpan={11} className="py-2 px-2.5 text-right uppercase text-[10px] border-r border-slate-200">
                    Saldo Inicial al {startDate || 'inicio'}:
                  </td>
                  <td className="py-2 px-2 text-right">{formatNumber(kardexData.initialBalance?.quantity || 0, 2)}</td>
                  <td className="py-2 px-2 text-right">{Number(kardexData.initialBalance?.unitCost || 0).toFixed(4)}</td>
                  <td className="py-2 px-2 text-right text-[#004A99]">{formatNumber(kardexData.initialBalance?.totalCost || 0, 2)}</td>
                </tr>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 whitespace-nowrap">{r.date}</td>
                    <td className="py-1.5 px-2 text-center">{r.docType}</td>
                    <td className="py-1.5 px-2 text-center">{r.docSeries || '—'}</td>
                    <td className="py-1.5 px-2">{r.docNumber || '—'}</td>
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 font-bold">{r.sunatOperationCode}</td>
                    <td className="py-1.5 px-2 text-right text-emerald-700">{r.inQty > 0 ? formatNumber(r.inQty, 2) : ''}</td>
                    <td className="py-1.5 px-2 text-right text-emerald-700">{r.inQty > 0 ? Number(r.inUnitCost).toFixed(4) : ''}</td>
                    <td className="py-1.5 px-2 text-right text-emerald-700 border-r border-slate-200">{r.inQty > 0 ? formatNumber(r.inTotalCost, 2) : ''}</td>
                    <td className="py-1.5 px-2 text-right text-amber-700">{r.outQty > 0 ? formatNumber(r.outQty, 2) : ''}</td>
                    <td className="py-1.5 px-2 text-right text-amber-700">{r.outQty > 0 ? Number(r.outUnitCost).toFixed(4) : ''}</td>
                    <td className="py-1.5 px-2 text-right text-amber-700 border-r border-slate-200">{r.outQty > 0 ? formatNumber(r.outTotalCost, 2) : ''}</td>
                    <td className="py-1.5 px-2 text-right font-bold text-slate-900">{formatNumber(r.balanceQty, 2)}</td>
                    <td className="py-1.5 px-2 text-right text-slate-600">{Number(r.balanceUnitCost).toFixed(4)}</td>
                    <td className="py-1.5 px-2 text-right font-bold text-[#004A99]">{formatNumber(r.balanceTotalCost, 2)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={14} className="py-10 text-center font-sans text-slate-400 italic">
                      No hay movimientos registrados en el rango de fechas seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3 text-center">Doc.</th>
                  <th className="py-2.5 px-3 text-center">Op. 12</th>
                  <th className="py-2.5 px-3">Lote</th>
                  <th className="py-2.5 px-3">Almacén / Detalle</th>
                  <th className="py-2.5 px-3 text-right text-emerald-700">Entrada</th>
                  <th className="py-2.5 px-3 text-right text-amber-700">Salida</th>
                  <th className="py-2.5 px-3 text-right text-[#004A99]">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50/70 font-bold text-slate-700">
                  <td colSpan={7} className="py-2 px-3 text-right uppercase text-[10px]">
                    Saldo Inicial Físico al {startDate || 'inicio'}:
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-[#004A99]">
                    {formatNumber(kardexData.initialBalance?.quantity || 0, 2)}
                  </td>
                </tr>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 font-mono whitespace-nowrap">{r.date}</td>
                    <td className="py-1.5 px-3 text-center font-mono">
                      {r.docType} {r.docSeries ? `${r.docSeries}-` : ''}{r.docNumber || '—'}
                    </td>
                    <td className="py-1.5 px-3 text-center font-mono font-bold">{r.sunatOperationCode}</td>
                    <td className="py-1.5 px-3 font-mono text-slate-600">{r.lotNumber || '—'}</td>
                    <td className="py-1.5 px-3 text-slate-700 truncate max-w-64">{r.observation || r.warehouseName || '—'}</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {r.inQty > 0 ? `+${formatNumber(r.inQty, 2)}` : ''}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-amber-700">
                      {r.outQty > 0 ? `-${formatNumber(r.outQty, 2)}` : ''}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-[#004A99]">
                      {formatNumber(r.balanceQty, 2)}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 italic">
                      No hay movimientos físicos en el rango de fechas seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
