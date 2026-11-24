import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Play,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search
} from 'lucide-react';
import { formatNumber } from '../../../lib/utils';

interface EntryNoteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EntryNoteImportModal: React.FC<EntryNoteImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const token = localStorage.getItem('token');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [reasonCode, setReasonCode] = useState('SALDO_INICIAL');
  const [initialLoadType, setInitialLoadType] = useState('CONTABLE');
  const [description, setDescription] = useState('CARGA DE SALDOS INICIALES');
  const [exchangeRate, setExchangeRate] = useState('1.000');
  const [supplierId, setSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total: 0, valid: 0, errors: 0 });
  const [hasExistingInitial, setHasExistingInitial] = useState(false);

  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setFileName('');
    setRawRows([]);
    setPreviewRows([]);
    setSummary({ total: 0, valid: 0, errors: 0 });
    setHasExistingInitial(false);
    setErrorMsg('');
    const authCfg = { headers: { Authorization: `Bearer ${token}` } };
    const today = new Date().toISOString().split('T')[0];

    axios
      .get('/api/suppliers', authCfg)
      .then((res) => setSuppliers(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});

    axios
      .get(`/api/exchange-rates/fetch-by-date/${today}`, authCfg)
      .then((res) => {
        const rate = res.data?.sell_rate ?? res.data?.buy_rate;
        if (rate && Number(rate) > 0) {
          setExchangeRate(String(rate));
          return;
        }
        return axios.get('/api/exchange-rates', authCfg).then((allRes) => {
          const first = Array.isArray(allRes.data) ? allRes.data[0] : null;
          const fallbackRate = first?.sell_rate ?? first?.buy_rate;
          if (fallbackRate && Number(fallbackRate) > 0) {
            setExchangeRate(String(fallbackRate));
          }
        });
      })
      .catch(() => {});
  }, [isOpen]);

  const handleDownloadTemplate = () => {
    const sample = [
      {
        SiglasAlmacen: 'A1.P1.A',
        FechaIngreso: '01/01/2026',
        CodProducto: 'AL00-Z001.A',
        Cantidad: '26000.00',
        Costo: '5.354924',
        Lote: 'CN23-020A',
        FechaLote: '24/01/2024',
        'U.MED': 'KILOGRAMOS',
        Pedido: '',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Saldos_Iniciales');
    XLSX.writeFile(wb, 'Plantilla_Ingresos_Almacen.xlsx');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrorMsg('');
    setPreviewRows([]);
    setSummary({ total: 0, valid: 0, errors: 0 });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

      // Detectar fila de encabezados (fila 0 o fila 1 si fila 0 es título)
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(5, matrix.length); i++) {
        const joined = matrix[i].map((c) => String(c || '').toUpperCase()).join('|');
        if (joined.includes('SIGLAS') || joined.includes('PRODUCTO') || joined.includes('COSTO') || joined.includes('LOTE')) {
          headerRowIdx = i;
          break;
        }
      }

      const headers = (matrix[headerRowIdx] || []).map((h) => String(h || '').trim());
      const parsed: any[] = [];
      for (let r = headerRowIdx + 1; r < matrix.length; r++) {
        const rowArr = matrix[r];
        if (!rowArr || rowArr.every((v) => String(v ?? '').trim() === '')) continue;

        const mapByHeader = (patterns: string[]) => {
          const idx = headers.findIndex((h) => {
            const up = h.toUpperCase();
            return patterns.some((p) => up.includes(p));
          });
          return idx >= 0 ? rowArr[idx] : undefined;
        };

        // Si las columnas siguen el orden exacto de la plantilla (A..I), usar fallback por índice
        const siglasAlmacen = mapByHeader(['SIGLA', 'ALMAC']) ?? rowArr[0];
        const entryDate = mapByHeader(['FECHA INGR', 'FECHAINGR']) ?? rowArr[1];
        const codProducto = mapByHeader(['COD', 'PRODUCT']) ?? rowArr[2];
        const quantity = mapByHeader(['CANT', 'UNIDAD', 'NIDADES']) ?? rowArr[3];
        const unitCost = mapByHeader(['COSTO']) ?? rowArr[4];
        const lotNumber = mapByHeader(['LOTE']) ?? rowArr[5];
        const lotDate = mapByHeader(['FECHA LOTE', 'FECHALOTE']) ?? rowArr[6];
        const unitName = mapByHeader(['U.MED', 'UMED', 'MEDIDA', 'UNIDAD']) ?? rowArr[7];
        const orderNumber = mapByHeader(['PEDIDO']) ?? rowArr[8];

        parsed.push({
          siglasAlmacen,
          entryDate,
          codProducto,
          quantity,
          unitCost,
          lotNumber,
          lotDate,
          unitName,
          orderNumber,
        });
      }

      setRawRows(parsed);
      if (parsed.length === 0) {
        setErrorMsg('El archivo no contiene filas de datos válidas.');
      }
    } catch (err: any) {
      setErrorMsg('No se pudo leer el archivo Excel: ' + (err.message || 'Formato inválido'));
    }
  };

  const handleExtractPreview = async () => {
    if (rawRows.length === 0) {
      setErrorMsg('Primero selecciona un archivo Excel con datos.');
      return;
    }
    setValidating(true);
    setErrorMsg('');
    try {
      const res = await axios.post(
        '/api/entry-notes/import-preview',
        { rows: rawRows, reasonCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPreviewRows(res.data.rows || []);
      setSummary(res.data.summary || { total: 0, valid: 0, errors: 0 });
      setHasExistingInitial(Boolean(res.data.hasExistingInitialBalance));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Error al validar los registros.');
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    const validRows = previewRows.filter((r) => r.status === 'OK');
    if (validRows.length === 0) {
      setErrorMsg('No hay filas válidas para importar.');
      return;
    }
    if (reasonCode === 'SALDO_INICIAL' && hasExistingInitial) {
      setErrorMsg(
        'Ya existe una Nota de Ingreso aprobada de SALDO INICIAL. Cambia el Motivo a REGULARIZACION o AJUSTE_INVENTARIO para continuar.'
      );
      return;
    }

    setImporting(true);
    setErrorMsg('');
    try {
      await axios.post(
        '/api/entry-notes/import',
        {
          reasonCode,
          initialLoadType,
          description,
          exchangeRate,
          supplierId: supplierId || null,
          rows: validRows,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Error al procesar la importación.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 overflow-hidden">
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
            className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[92vh]"
          >
            {/* Cabecera ERP */}
            <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white/10 rounded">
                  <FileSpreadsheet className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-tight">
                    Asistente de Importación — Saldos Iniciales y Regularización
                  </h2>
                  <p className="text-[9px] text-blue-200 uppercase font-medium">
                    Módulo de Notas de Ingreso a Almacén
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/70">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {reasonCode === 'SALDO_INICIAL' && hasExistingInitial && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Ya existe una carga de SALDO INICIAL aprobada. Si deseas ingresar diferencias o inventario físico posterior, cambia el Motivo a REGULARIZACION o AJUSTE_INVENTARIO.
                  </span>
                </div>
              )}

              {/* Configuración y Archivo */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">
                    Archivo y Parámetros de Carga
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="h-7 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    Descargar Plantilla
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-5 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Archivo Excel (.xlsx / .csv)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={fileName}
                        placeholder="Seleccione la plantilla de ingresos..."
                        className="h-8 flex-1 px-2.5 rounded border border-slate-300 text-xs bg-slate-50 text-slate-700"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Buscar
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Glosa / Observación</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-8 w-full px-2.5 rounded border border-slate-300 text-xs font-medium bg-white outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="md:col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">T.C.</label>
                    <input
                      type="number"
                      step="0.001"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      className="h-8 w-full px-2 rounded border border-slate-300 text-xs font-mono font-bold text-right bg-white outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="md:col-span-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleExtractPreview}
                      disabled={validating || rawRows.length === 0}
                      className="h-8 flex-1 px-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-bold uppercase flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      Extraer Data
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Motivo</label>
                    <select
                      value={reasonCode}
                      onChange={(e) => setReasonCode(e.target.value)}
                      className="h-8 w-full px-2 rounded border border-slate-300 text-xs font-bold bg-white outline-none focus:border-blue-600"
                    >
                      <option value="SALDO_INICIAL">SALDO INICIAL</option>
                      <option value="REGULARIZACION">REGULARIZACIÓN DE STOCK</option>
                      <option value="AJUSTE_INVENTARIO">AJUSTE POR INVENTARIO FÍSICO</option>
                      <option value="OTROS">OTROS INGRESOS</option>
                    </select>
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Tipo Carga Inicial</label>
                    <select
                      value={initialLoadType}
                      onChange={(e) => setInitialLoadType(e.target.value)}
                      disabled={reasonCode !== 'SALDO_INICIAL'}
                      className="h-8 w-full px-2 rounded border border-slate-300 text-xs font-bold bg-white outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="CONTABLE">Contable</option>
                      <option value="ADMINISTRATIVO">Administrativo</option>
                    </select>
                  </div>

                  <div className="md:col-span-5 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Proveedor (Opcional)</label>
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="h-8 w-full px-2 rounded border border-slate-300 text-xs font-medium bg-white outline-none focus:border-blue-600"
                    >
                      <option value="">-- Sin Proveedor --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.docNumber ? `${s.docNumber} | ` : ''}{s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Vista Previa */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-700 uppercase">Vista Previa de Registros</span>
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="text-slate-600">Registros: {summary.total || rawRows.length}</span>
                    <span className="text-emerald-700">Correctos: {summary.valid}</span>
                    <span className="text-red-600">Errores: {summary.errors}</span>
                  </div>
                </div>

                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="py-2 px-2.5">Estado</th>
                        <th className="py-2 px-2.5">SiglasAlmacen</th>
                        <th className="py-2 px-2.5">FechaIngreso</th>
                        <th className="py-2 px-2.5">CodProducto</th>
                        <th className="py-2 px-2.5 text-right">CantUnd</th>
                        <th className="py-2 px-2.5 text-right">Costo</th>
                        <th className="py-2 px-2.5">U.MED</th>
                        <th className="py-2 px-2.5">Lote</th>
                        <th className="py-2 px-2.5">FechaLote</th>
                        <th className="py-2 px-2.5">Pedido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewRows.map((row) => (
                        <tr key={row.rowNumber} className={row.status === 'OK' ? 'hover:bg-emerald-50/30' : 'bg-red-50/50'}>
                          <td className="py-1.5 px-2.5 whitespace-nowrap">
                            {row.status === 'OK' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 font-bold" title={row.errorMessage}>
                                <AlertCircle className="w-3.5 h-3.5" /> {row.errorMessage}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono font-bold">{row.siglasAlmacen}</td>
                          <td className="py-1.5 px-2.5 font-mono">{row.entryDate}</td>
                          <td className="py-1.5 px-2.5 font-mono font-bold text-slate-800">{row.codProducto}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold">{formatNumber(row.quantity, 2)}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono">{Number(row.unitCost || 0).toFixed(4)}</td>
                          <td className="py-1.5 px-2.5 uppercase">{row.unitSymbol}</td>
                          <td className="py-1.5 px-2.5 font-mono">{row.lotNumber || '—'}</td>
                          <td className="py-1.5 px-2.5 font-mono">{row.lotDate || '—'}</td>
                          <td className="py-1.5 px-2.5 font-mono">{row.orderNumber || '—'}</td>
                        </tr>
                      ))}
                      {previewRows.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-10 text-center text-slate-400 italic">
                            {rawRows.length > 0
                              ? `Archivo cargado (${rawRows.length} filas). Haz clic en "Extraer Data" para validar.`
                              : 'Selecciona una plantilla Excel y presiona "Extraer Data".'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || summary.valid === 0}
                className="h-8 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Comenzar ({summary.valid})
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
