import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import { 
  BarChart3, Search, Package, AlertTriangle, X, 
  ArrowUpRight, ArrowDownLeft, Edit2, Filter, 
  ChevronLeft, ChevronRight, RefreshCcw, Download, ArrowRightLeft,
  History, Boxes, Calendar, FileText, MapPin, Lock,
  FileInput, FileOutput, Plus, Bell, Truck, Eye, Trash2, Save
} from 'lucide-react';
import { formatNumber, ENTRY_NOTE_STATUSES } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { EntryNoteList } from './forms/EntryNoteList';
import { EntryNoteForm } from './forms/EntryNoteForm';
import { ExitNoteList } from './forms/ExitNoteList';
import { ExitNoteForm } from './forms/ExitNoteForm';
import { PaginationBar } from '../../components/PaginationBar';

interface Product {
  id: number;
  code?: string;
  name: string;
  stock: number;
  images?: string[];
  category?: { name: string };
  unit?: { name?: string; symbol?: string };
  package?: { name?: string; symbol?: string };
  subPackage?: { name?: string; symbol?: string };
  quantityPerPackage?: number;
  quantityPerSubPackage?: number;
  isActive: boolean;
}

interface InventoryModuleProps {
  products: Product[];
  stockDetails: any[];
  movements: any[];
  onUpdateStock: (productId: number, newStock: number) => void;
  onEdit: (product: Product) => void;
  onOpenAssistant?: () => void;
  token?: string;
  onRefresh?: () => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  products,
  stockDetails,
  movements,
  onUpdateStock,
  onEdit,
  onOpenAssistant,
  token,
  onRefresh
}) => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission?.('WRITE_INVENTORY') || hasPermission?.('ALL');
  const canTransfer = canWrite || hasPermission?.('WRITE_TRANSFERS');
  const canWriteEntryNotes = canWrite || hasPermission?.('WRITE_ENTRY_NOTES');
  const canWriteExitNotes = canWrite || hasPermission?.('WRITE_EXIT_NOTES');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'assistant' | 'history' | 'entryNotes' | 'exitNotes'>('stock');
  const [entryNotes, setEntryNotes] = useState<any[]>([]);
  const [loadingEntryNotes, setLoadingEntryNotes] = useState(false);
  const [entryNotesError, setEntryNotesError] = useState<string | null>(null);
  const [isEntryNoteFormOpen, setIsEntryNoteFormOpen] = useState(false);
  const [editingEntryNote, setEditingEntryNote] = useState<any>(null);
  const [exitNotes, setExitNotes] = useState<any[]>([]);
  const [loadingExitNotes, setLoadingExitNotes] = useState(false);
  const [exitNotesError, setExitNotesError] = useState<string | null>(null);
  const [isExitNoteFormOpen, setIsExitNoteFormOpen] = useState(false);
  const [editingExitNote, setEditingExitNote] = useState<any>(null);
  const [pendingGuides, setPendingGuides] = useState<any[]>([]);
  const [loadingPendingGuides, setLoadingPendingGuides] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(10);
  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(10);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyTypeFilter, setHistoryTypeFilter] = useState('');
  const [historyWarehouseFilter, setHistoryWarehouseFilter] = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [viewingMovement, setViewingMovement] = useState<any | null>(null);
  const [editingMovement, setEditingMovement] = useState<any | null>(null);
  const [editMovForm, setEditMovForm] = useState({ observation: '', lotNumber: '' });
  const [savingMovement, setSavingMovement] = useState(false);

  useEffect(() => {
    setPendingPage(1);
  }, [pendingPageSize, pendingSearch]);

  useEffect(() => {
    setStockPage(1);
    setHistoryPage(1);
  }, [searchTerm, stockPageSize, historyPageSize, historyTypeFilter, historyWarehouseFilter, historyDateFrom, historyDateTo]);

  const loadPendingGuides = async () => {
    if (!token) return;
    setLoadingPendingGuides(true);
    try {
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + 1);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 90);
      const paramsBase = {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0]
      };
      const [guiasRes, comprasRes] = await Promise.all([
        axios.get('/api/movements/sources', {
          params: { ...paramsBase, type: 'GUIA' },
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/movements/sources', {
          params: { ...paramsBase, type: 'COMPRA' },
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const combined = [
        ...(Array.isArray(guiasRes.data) ? guiasRes.data : []),
        ...(Array.isArray(comprasRes.data) ? comprasRes.data : [])
      ];
      const uniqueById = Array.from(new Map(combined.map((item: any) => [item.id, item])).values());
      const inTransit = uniqueById.filter(
        (g: any) =>
          g.sourceKind === 'SALES_REFERRAL_GUIDE' ||
          g.warehouseId === 6 ||
          (g.warehouse?.name || '').toUpperCase().includes('COMPRAS')
      );
      inTransit.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPendingGuides(inTransit);
    } catch {
      setPendingGuides([]);
    } finally {
      setLoadingPendingGuides(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadPendingGuides();
    }
  }, [token, stockDetails]);

  useEffect(() => {
    if (activeSubTab === 'entryNotes' && token) {
      loadEntryNotes();
    }
    if (activeSubTab === 'exitNotes' && token) {
      loadExitNotes();
    }
    if (activeSubTab === 'assistant' && token) {
      loadPendingGuides();
    }
  }, [activeSubTab, token]);

  const loadEntryNotes = async () => {
    setLoadingEntryNotes(true);
    setEntryNotesError(null);
    try {
      const res = await axios.get('/api/entry-notes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntryNotes(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Error desconocido';
      setEntryNotesError(msg);
      setEntryNotes([]);
    } finally {
      setLoadingEntryNotes(false);
    }
  };

  const handleNewEntryNote = () => {
    setEditingEntryNote(null);
    setIsEntryNoteFormOpen(true);
  };

  const handleEditEntryNote = (note: any) => {
    setEditingEntryNote(note);
    setIsEntryNoteFormOpen(true);
  };

  const handleCloseEntryNoteForm = () => {
    setIsEntryNoteFormOpen(false);
    setEditingEntryNote(null);
  };

  const handleDeleteEntryNote = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar esta nota de ingreso?')) return;
    try {
      await axios.delete(`/api/entry-notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadEntryNotes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al eliminar nota de ingreso');
    }
  };

  const handleApproveEntryNote = async (id: number) => {
    if (!window.confirm('¿Está seguro de aprobar esta nota de ingreso? Se actualizará el stock.')) return;
    try {
      await axios.post(`/api/entry-notes/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadEntryNotes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al aprobar nota de ingreso');
    }
  };

  const handleAnnulEntryNote = async (id: number) => {
    if (!window.confirm('¿Está seguro de anular esta nota de ingreso? Se revertirá el stock.')) return;
    try {
      await axios.post(`/api/entry-notes/${id}/annul`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadEntryNotes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al anular nota de ingreso');
    }
  };

  const loadExitNotes = async () => {
    setLoadingExitNotes(true);
    setExitNotesError(null);
    try {
      const res = await axios.get('/api/exit-notes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExitNotes(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Error desconocido';
      setExitNotesError(msg);
      setExitNotes([]);
    } finally {
      setLoadingExitNotes(false);
    }
  };

  const handleNewExitNote = () => {
    setEditingExitNote(null);
    setIsExitNoteFormOpen(true);
  };

  const handleEditExitNote = (note: any) => {
    setEditingExitNote(note);
    setIsExitNoteFormOpen(true);
  };

  const handleCloseExitNoteForm = () => {
    setIsExitNoteFormOpen(false);
    setEditingExitNote(null);
  };

  const handleDeleteExitNote = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar esta nota de salida?')) return;
    try {
      await axios.delete(`/api/exit-notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadExitNotes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al eliminar nota de salida');
    }
  };

  const handleApproveExitNote = async (id: number) => {
    if (!window.confirm('¿Está seguro de aprobar esta nota de salida? Se descontará del stock.')) return;
    try {
      await axios.post(`/api/exit-notes/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadExitNotes();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al aprobar nota de salida');
    }
  };

  const handleAnnulExitNote = async (id: number) => {
    if (!window.confirm('¿Está seguro de anular esta nota de salida? Se revertirá el stock si ya fue descontado.')) return;
    try {
      await axios.post(`/api/exit-notes/${id}/annul`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadExitNotes();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al anular nota de salida');
    }
  };

  const isTransitoryWarehouse = (s: any) => {
    const wType = (s.warehouse?.type || '').toUpperCase();
    const wName = (s.warehouse?.name || '').toUpperCase();
    return (
      s.warehouseId === 6 ||
      ['TRANSITORIO', 'DESPACHO', 'COMPROBANTES', 'SISTEMA'].includes(wType) ||
      ['EXISTENCIAS', 'COMPROBANTE', 'DESPACHO', 'COMPRAS NAC./IMP.'].includes(wName) ||
      wName.includes('COMPRAS')
    );
  };

  const mainStockDetails = stockDetails.filter(s => !isTransitoryWarehouse(s) && Number(s.quantity) > 0);
  const transitStockDetails = stockDetails.filter(s =>
    (s.warehouseId === 6 ||
      (s.warehouse?.type || '').toUpperCase() === 'TRANSITORIO' ||
      (s.warehouse?.name || '').toUpperCase().includes('COMPRAS')) &&
    Number(s.quantity) > 0
  );
  const pendingGuidesCount = pendingGuides.length > 0 ? pendingGuides.length : transitStockDetails.length;

  const filteredStock = mainStockDetails
    .filter(s => 
      s.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.product?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.warehouse?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.zone?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.zone?.floor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.lotNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const wA = (a.warehouse?.name || '').localeCompare(b.warehouse?.name || '');
      if (wA !== 0) return wA;
      const fA = (a.zone?.floor?.name || '').localeCompare(b.zone?.floor?.name || '');
      if (fA !== 0) return fA;
      const zA = (a.zone?.name || '').localeCompare(b.zone?.name || '');
      if (zA !== 0) return zA;
      const pA = (a.product?.name || '').localeCompare(b.product?.name || '');
      if (pA !== 0) return pA;
      return (a.lotNumber || '').localeCompare(b.lotNumber || '');
    });

  const historyWarehouses = Array.from(new Set(
    movements.flatMap(m => [m.fromWarehouse?.name, m.toWarehouse?.name]).filter(Boolean)
  )).sort() as string[];

  const filteredMovements = movements.filter(m => {
    if (m.status === 'ANNULLED') return false;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      const matchesText =
        m.product?.name?.toLowerCase().includes(term) ||
        m.product?.code?.toLowerCase().includes(term) ||
        m.observation?.toLowerCase().includes(term) ||
        m.lotNumber?.toLowerCase().includes(term) ||
        m.supplierName?.toLowerCase().includes(term) ||
        m.fromWarehouse?.name?.toLowerCase().includes(term) ||
        m.toWarehouse?.name?.toLowerCase().includes(term);
      if (!matchesText) return false;
    }
    if (historyTypeFilter && m.type !== historyTypeFilter) return false;
    if (historyWarehouseFilter && m.fromWarehouse?.name !== historyWarehouseFilter && m.toWarehouse?.name !== historyWarehouseFilter) return false;
    if (historyDateFrom || historyDateTo) {
      const movDate = new Date(m.createdAt).toISOString().split('T')[0];
      if (historyDateFrom && movDate < historyDateFrom) return false;
      if (historyDateTo && movDate > historyDateTo) return false;
    }
    return true;
  });

  const filteredPendingGuides = pendingGuides.filter((g: any) => {
    const term = pendingSearch.trim().toLowerCase();
    if (!term) return true;
    const doc = `${g.docSigla || g.docType || ''} ${g.docSeries || ''}-${g.docNumber || ''}`.toLowerCase();
    const supplier = (g.supplier?.name || g.supplierName || '').toLowerCase();
    return doc.includes(term) || supplier.includes(term);
  });

  const paginate = <T,>(items: T[], page: number, size: number) => {
    const totalPages = Math.max(1, Math.ceil(items.length / size));
    const safePage = Math.min(page, totalPages);
    return items.slice((safePage - 1) * size, safePage * size);
  };

  const paginatedStock = paginate(filteredStock, stockPage, stockPageSize);
  const paginatedPendingGuides = paginate(filteredPendingGuides, pendingPage, pendingPageSize);
  const paginatedMovements = paginate(filteredMovements, historyPage, historyPageSize);

  const getStockBreakdown = (s: any) => {
    const qty = Number(s.quantity || 0);
    const hasPkg = !!(s.product?.packageId || s.product?.package);
    const hasSub = !!(s.product?.subPackageId || s.product?.subPackage);
    if (hasPkg) {
      const packages = Math.floor(qty);
      const remainderPkg = qty - packages;
      if (remainderPkg <= 0) {
        return { packages, subPackages: 0, units: 0 };
      }
      const perSub = s.product?.quantityPerSubPackage > 0 ? s.product.quantityPerSubPackage : 1;
      const perPkg = s.product?.quantityPerPackage > 0 ? s.product.quantityPerPackage : 1;
      const totalRemainderUnits = Math.round(remainderPkg * perPkg * perSub);
      const subPackages = hasSub ? Math.floor(totalRemainderUnits / perSub) : 0;
      const units = hasSub ? totalRemainderUnits % perSub : totalRemainderUnits;
      return { packages, subPackages, units };
    }
    if (hasSub) {
      const subPackages = Math.floor(qty);
      const remainderSub = qty - subPackages;
      const perSub = s.product?.quantityPerSubPackage > 0 ? s.product.quantityPerSubPackage : 1;
      const units = remainderSub > 0 ? Math.round(remainderSub * perSub) : 0;
      return { packages: 0, subPackages, units };
    }
    return { packages: 0, subPackages: 0, units: qty };
  };

  const groupedStock = (() => {
    const warehousesMap = new Map<string, {
      name: string;
      totals: { packages: number; subPackages: number; units: number };
      floors: Map<string, {
        name: string;
        zones: Map<string, {
          name: string;
          items: any[];
          totals: { packages: number; subPackages: number; units: number };
        }>;
      }>;
    }>();

    for (const s of paginatedStock) {
      const whName = s.warehouse?.name || 'SIN ALMACÉN';
      const floorName = s.zone?.floor?.name || 'SIN PISO';
      const zoneName = s.zone?.name || 'SIN ZONA';
      const bd = getStockBreakdown(s);

      if (!warehousesMap.has(whName)) {
        warehousesMap.set(whName, {
          name: whName,
          totals: { packages: 0, subPackages: 0, units: 0 },
          floors: new Map(),
        });
      }
      const whGroup = warehousesMap.get(whName)!;
      whGroup.totals.packages += bd.packages;
      whGroup.totals.subPackages += bd.subPackages;
      whGroup.totals.units += bd.units;

      if (!whGroup.floors.has(floorName)) {
        whGroup.floors.set(floorName, { name: floorName, zones: new Map() });
      }
      const floorGroup = whGroup.floors.get(floorName)!;

      if (!floorGroup.zones.has(zoneName)) {
        floorGroup.zones.set(zoneName, {
          name: zoneName,
          items: [],
          totals: { packages: 0, subPackages: 0, units: 0 },
        });
      }
      const zoneGroup = floorGroup.zones.get(zoneName)!;
      zoneGroup.items.push({ ...s, breakdown: bd });
      zoneGroup.totals.packages += bd.packages;
      zoneGroup.totals.subPackages += bd.subPackages;
      zoneGroup.totals.units += bd.units;
    }

    return Array.from(warehousesMap.values()).map(wh => ({
      ...wh,
      floors: Array.from(wh.floors.values()).map(fl => ({
        ...fl,
        zones: Array.from(fl.zones.values()),
      })),
    }));
  })();

  const handleDeleteMovement = async (movementId: number) => {
    if (!window.confirm('¿Está seguro de eliminar este movimiento? Si está activo, el stock será revertido automáticamente.')) return;
    try {
      await axios.delete(`/api/movements/${movementId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al eliminar movimiento');
    }
  };

  const handleOpenEditMovement = (mov: any) => {
    setEditingMovement(mov);
    setEditMovForm({
      observation: mov.observation || '',
      lotNumber: mov.lotNumber || ''
    });
  };

  const handleSaveEditMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovement) return;
    setSavingMovement(true);
    try {
      await axios.put(`/api/movements/${editingMovement.id}`, editMovForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingMovement(null);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al actualizar movimiento');
    } finally {
      setSavingMovement(false);
    }
  };

  const handleAnnul = async (movementId: number) => {
    if (!window.confirm('¿Está seguro de anular este movimiento? Esta acción revertirá el stock a su estado anterior.')) return;
    try {
      await axios.post(`/api/movements/${movementId}/annul`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al anular movimiento');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8"
    >
      {/* Tab Switcher Interno */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit flex-wrap">
        <button 
          onClick={() => setActiveSubTab('stock')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeSubTab === 'stock' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Boxes className="w-4 h-4" />
          STOCK ACTUAL
        </button>
        <button 
          onClick={() => setActiveSubTab('assistant')}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeSubTab === 'assistant' ? 'bg-[#004A99] text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          ASISTENTE DE MOVIMIENTOS
          {pendingGuidesCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm animate-pulse">
              {pendingGuidesCount}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeSubTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <History className="w-4 h-4" />
          HISTORIAL
        </button>
        <button 
          onClick={() => setActiveSubTab('entryNotes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeSubTab === 'entryNotes' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <FileInput className="w-4 h-4" />
          NOTAS DE INGRESO
        </button>
        <button 
          onClick={() => setActiveSubTab('exitNotes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeSubTab === 'exitNotes' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <FileOutput className="w-4 h-4" />
          NOTAS DE SALIDA
        </button>
      </div>

      {activeSubTab === 'stock' && (
        <>
          {/* Main Table Container */}
          <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Buscar por producto o almacén..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button className="text-xs font-black uppercase text-blue-600 hover:text-blue-700 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-blue-50 transition-all">
                  <Download className="w-4 h-4" />
                  Exportar Inventario
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600">
                    <th className="px-4 py-3.5">Código</th>
                    <th className="px-4 py-3.5">Descripción</th>
                    <th className="px-4 py-3.5">Lote</th>
                    <th className="px-4 py-3.5 text-center">Fecha Lot.</th>
                    <th className="px-4 py-3.5 text-right">Empaque</th>
                    <th className="px-4 py-3.5 text-right">Sub. Empq.</th>
                    <th className="px-4 py-3.5 text-right">Unidades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {groupedStock.map((wh) => (
                    <React.Fragment key={wh.name}>
                      {/* Nivel 1: Almacén */}
                      <tr className="bg-blue-50/70 border-t border-blue-100">
                        <td colSpan={7} className="px-4 py-2 font-black text-xs text-[#004A99] uppercase tracking-tight">
                          Almacén: <span className="ml-1">{wh.name}</span>
                        </td>
                      </tr>

                      {wh.floors.map((fl) => (
                        <React.Fragment key={`${wh.name}-${fl.name}`}>
                          {/* Nivel 2: Piso */}
                          <tr className="bg-slate-50/70">
                            <td colSpan={7} className="pl-8 pr-4 py-1.5 font-bold text-[11px] text-slate-700 uppercase">
                              Piso: <span className="ml-1">{fl.name}</span>
                            </td>
                          </tr>

                          {fl.zones.map((zn) => (
                            <React.Fragment key={`${wh.name}-${fl.name}-${zn.name}`}>
                              {/* Nivel 3: Zona */}
                              <tr className="bg-white">
                                <td colSpan={7} className="pl-12 pr-4 py-1.5 font-bold text-[11px] text-slate-600 uppercase border-b border-slate-100">
                                  Zona: <span className="ml-1 text-slate-800">{zn.name}</span>
                                </td>
                              </tr>

                              {/* Ítems de la Zona */}
                              {zn.items.map((s: any) => {
                                const pkgLabel = s.product?.package?.symbol || s.product?.package?.name || 'CAJ';
                                const subLabel = s.product?.subPackage?.symbol || s.product?.subPackage?.name || 'BOX';
                                const unitLabel = s.product?.unit?.symbol || s.product?.unit?.name || 'UND';
                                return (
                                  <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-4 py-2.5 font-mono font-bold text-slate-700 whitespace-nowrap">
                                      {s.product?.code || '-'}
                                    </td>
                                    <td className="px-4 py-2.5 font-bold text-slate-900 uppercase">
                                      {s.product?.name}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                                      {s.lotNumber || 'SIN LOTE'}
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-mono text-slate-600 whitespace-nowrap">
                                      {s.expiryDate ? new Date(s.expiryDate).toLocaleDateString('es-PE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                                      {formatNumber(s.breakdown.packages, 0)} <span className="text-[10px] font-semibold text-slate-500 uppercase">{pkgLabel}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap">
                                      {formatNumber(s.breakdown.subPackages, 0)} <span className="text-[10px] font-semibold text-slate-500 uppercase">{subLabel}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap">
                                      {formatNumber(s.breakdown.units, 0)} <span className="text-[10px] font-semibold text-slate-500 uppercase">{unitLabel}</span>
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* Subtotal Zona */}
                              <tr className="bg-slate-50/80 border-t border-slate-200">
                                <td colSpan={4} className="px-4 py-2 text-right font-black text-[11px] text-slate-700 uppercase">
                                  TOTALES:
                                </td>
                                <td className="px-4 py-2 text-right font-black text-slate-900 tabular-nums border-t-2 border-slate-400">
                                  {formatNumber(zn.totals.packages, 2)}
                                </td>
                                <td className="px-4 py-2 text-right font-black text-slate-900 tabular-nums border-t-2 border-slate-400">
                                  {formatNumber(zn.totals.subPackages, 2)}
                                </td>
                                <td className="px-4 py-2 text-right font-black text-slate-900 tabular-nums border-t-2 border-slate-400">
                                  {formatNumber(zn.totals.units, 0)}
                                </td>
                              </tr>
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      ))}

                      {/* Total Almacén */}
                      <tr className="bg-blue-50/40 border-t border-b-2 border-blue-200">
                        <td colSpan={4} className="px-4 py-2.5 text-right font-black text-[11px] text-[#004A99] uppercase">
                          TOTAL ALMACÉN:
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-[#004A99] tabular-nums">
                          {formatNumber(wh.totals.packages, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-[#004A99] tabular-nums">
                          {formatNumber(wh.totals.subPackages, 2)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-[#004A99] tabular-nums">
                          {formatNumber(wh.totals.units, 2)}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                  {filteredStock.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-20 text-center text-slate-400 italic">No hay stock registrado en ubicaciones</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar
              totalItems={filteredStock.length}
              currentPage={stockPage}
              pageSize={stockPageSize}
              onPageChange={setStockPage}
              onPageSizeChange={setStockPageSize}
            />
          </div>
        </>
      )}

      {activeSubTab === 'assistant' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-50 text-[#004A99] rounded-xl">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Asistente de Movimientos y Transferencias
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transfiere mercadería recibida en almacén transitorio (Compras Nac./Imp.) hacia tus almacenes principales o registra ingresos y salidas.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadPendingGuides}
                className="h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${loadingPendingGuides ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
              {canTransfer ? (
                <button
                  type="button"
                  onClick={onOpenAssistant}
                  className="h-9 px-5 bg-[#004A99] hover:bg-blue-800 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Abrir Asistente de Movimientos
                </button>
              ) : (
                <div className="h-9 px-4 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold uppercase flex items-center gap-2 cursor-not-allowed">
                  <Lock className="w-3.5 h-3.5" />
                  Sin permisos de escritura
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className={`w-4 h-4 ${pendingGuidesCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  Compras y Guías Pendientes de Transferencia a Almacén Principal
                </h4>
                {pendingGuidesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                    {pendingGuidesCount} pendiente{pendingGuidesCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar guía, doc o proveedor..."
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-[#004A99] text-xs font-medium outline-none transition-colors"
                />
              </div>
            </div>

            {filteredPendingGuides.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-3">Documento / Guía</th>
                      <th className="px-6 py-3">Fecha</th>
                      <th className="px-6 py-3">Proveedor</th>
                      <th className="px-6 py-3 text-center">Ítems</th>
                      <th className="px-6 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedPendingGuides.map((g: any) => (
                      <tr key={g.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-6 py-3 font-mono font-bold text-[#004A99]">
                          {g.docSigla || (g.docType === '50' ? 'DUA' : g.docType === '09' ? 'GRM' : g.docType)} · {g.docSeries}-{g.docNumber}
                        </td>
                        <td className="px-6 py-3 text-slate-600 font-medium">
                          {g.date ? new Date(g.date).toLocaleDateString('es-PE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-6 py-3 font-bold text-slate-800 uppercase">
                          {g.supplier?.name || g.supplierName || 'PROVEEDOR'}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px]">
                            {g.items?.length || 0} ítem(s)
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          {canTransfer && (
                            <button
                              type="button"
                              onClick={onOpenAssistant}
                              className="h-8 px-3.5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              Transferir a Almacén
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : transitStockDetails.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-3">Producto</th>
                      <th className="px-6 py-3">Almacén Transitorio</th>
                      <th className="px-6 py-3 text-center">Cantidad</th>
                      <th className="px-6 py-3">Lote / Guía</th>
                      <th className="px-6 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {transitStockDetails.map((s: any) => (
                      <tr key={s.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-6 py-3 font-bold text-slate-800 uppercase">
                          {s.product?.name}
                          <span className="block text-[10px] font-mono text-slate-400">{s.product?.code}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[11px]">
                            {s.warehouse?.name}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center font-black text-slate-900">
                          {formatNumber(s.quantity, 0)}
                        </td>
                        <td className="px-6 py-3 font-mono text-slate-600">
                          {s.lotNumber || 'SIN LOTE'}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {canTransfer && (
                            <button
                              type="button"
                              onClick={onOpenAssistant}
                              className="h-8 px-3.5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              Transferir a Almacén
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                {pendingSearch ? 'No se encontraron documentos que coincidan con la búsqueda.' : 'No hay guías de compra pendientes de transferencia a almacén principal.'}
              </div>
            )}

            <PaginationBar
              totalItems={filteredPendingGuides.length}
              currentPage={pendingPage}
              pageSize={pendingPageSize}
              onPageChange={setPendingPage}
              onPageSizeChange={setPendingPageSize}
            />
          </div>
        </div>
      )}

      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-2.5">
            <div className="flex flex-col lg:flex-row gap-2 justify-between items-stretch lg:items-center">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Buscar producto, lote, proveedor, almacén, glosa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:border-blue-500 outline-none"
                  />
                </div>
                <select
                  value={historyTypeFilter}
                  onChange={e => setHistoryTypeFilter(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="">Todos los tipos</option>
                  <option value="INPUT">Ingreso</option>
                  <option value="OUTPUT">Salida</option>
                  <option value="TRANSFER">Transferencia</option>
                </select>
                <select
                  value={historyWarehouseFilter}
                  onChange={e => setHistoryWarehouseFilter(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 outline-none focus:border-blue-500 max-w-[190px]"
                >
                  <option value="">Todos los almacenes</option>
                  {historyWarehouses.map(wh => <option key={wh} value={wh}>{wh}</option>)}
                </select>
                <input
                  type="date"
                  value={historyDateFrom}
                  onChange={e => setHistoryDateFrom(e.target.value)}
                  title="Desde"
                  className="h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                />
                <input
                  type="date"
                  value={historyDateTo}
                  onChange={e => setHistoryDateTo(e.target.value)}
                  title="Hasta"
                  className="h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                />
                {(searchTerm || historyTypeFilter || historyWarehouseFilter || historyDateFrom || historyDateTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setHistoryTypeFilter('');
                      setHistoryWarehouseFilter('');
                      setHistoryDateFrom('');
                      setHistoryDateTo('');
                    }}
                    className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Limpiar
                  </button>
                )}
              </div>
              {canTransfer ? (
                <button 
                  onClick={onOpenAssistant}
                  className="h-8 bg-[#004A99] hover:bg-blue-800 text-white text-xs font-bold uppercase flex items-center justify-center gap-1.5 px-4 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Nuevo Movimiento
                </button>
              ) : (
                <div className="h-8 flex items-center gap-1.5 bg-slate-100 text-slate-400 text-xs font-bold uppercase px-4 rounded-lg cursor-not-allowed shrink-0">
                  <Lock className="w-3.5 h-3.5" />
                  Nuevo Movimiento
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Tipo</th>
                  <th className="px-3 py-2.5">Producto</th>
                  <th className="px-3 py-2.5">Proveedor</th>
                  <th className="px-3 py-2.5">Ruta / Almacén</th>
                  <th className="px-3 py-2.5 text-center">Cant.</th>
                  <th className="px-3 py-2.5">Glosa / Observación</th>
                  <th className="px-3 py-2.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedMovements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{new Date(mov.createdAt).toLocaleDateString('es-PE')}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{new Date(mov.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        mov.type === 'INPUT' ? 'bg-emerald-100 text-emerald-700' :
                        mov.type === 'OUTPUT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {mov.type === 'INPUT' ? 'INGRESO' : mov.type === 'OUTPUT' ? 'SALIDA' : 'TRANSFER.'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 uppercase">{mov.product?.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{mov.lotNumber ? `Lote: ${mov.lotNumber}` : 'Sin Lote'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[11px] font-bold text-slate-700 uppercase line-clamp-2 max-w-[180px]" title={mov.supplierName || ''}>
                        {mov.supplierName || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {mov.fromWarehouse && (
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600 whitespace-nowrap">{mov.fromWarehouse.name}</span>
                            {mov.fromZone && <span className="text-[9px] text-slate-400 font-medium ml-1">📍 {mov.fromZone.name}</span>}
                          </div>
                        )}
                        {(mov.fromWarehouse && mov.toWarehouse) && <ArrowRightLeft className="w-3 h-3 text-slate-300 shrink-0" />}
                        {mov.toWarehouse && (
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold bg-blue-50 px-2 py-0.5 rounded text-blue-700 whitespace-nowrap">{mov.toWarehouse.name}</span>
                            {mov.toZone && <span className="text-[9px] text-blue-500 font-medium ml-1">📍 {mov.toZone.name}</span>}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums">
                      <span className="text-xs font-black text-slate-800">{mov.quantity}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className={`text-[11px] font-medium italic truncate max-w-[200px] ${mov.status === 'ANNULLED' ? 'text-red-400 line-through' : 'text-slate-500'}`} title={mov.observation || ''}>
                        {mov.status === 'ANNULLED' ? `[ANULADO] ${mov.observation}` : mov.observation}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingMovement(mov)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                          title="Visualizar Movimiento"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {canTransfer && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditMovement(mov)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Editar Movimiento"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMovement(mov.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Eliminar y Revertir Stock"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 italic text-xs">No hay movimientos registrados con los filtros actuales</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationBar
            totalItems={filteredMovements.length}
            currentPage={historyPage}
            pageSize={historyPageSize}
            onPageChange={setHistoryPage}
            onPageSizeChange={setHistoryPageSize}
          />
        </div>
      )}

      {/* Modal Visualizar Movimiento */}
      {viewingMovement && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 overflow-hidden">
          <div onClick={() => setViewingMovement(null)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[90vh]">
            <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white border-b border-blue-900">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-200" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-tight">Detalle de Movimiento #{viewingMovement.id}</h3>
                  <p className="text-[9px] text-blue-200 uppercase font-medium">Historial de Inventario / Stock</p>
                </div>
              </div>
              <button onClick={() => setViewingMovement(null)} className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-2.5 bg-slate-50/70 overflow-y-auto text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Fecha y Hora</span>
                  <span className="font-bold text-slate-800">{new Date(viewingMovement.createdAt).toLocaleString('es-PE')}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Tipo / Cantidad</span>
                  <span className="font-bold text-slate-800">
                    {viewingMovement.type === 'INPUT' ? 'INGRESO' : viewingMovement.type === 'OUTPUT' ? 'SALIDA' : 'TRANSFERENCIA'} · {viewingMovement.quantity}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Producto</span>
                  <span className="font-bold text-slate-900 uppercase">{viewingMovement.product?.name}</span>
                  {viewingMovement.product?.code && <span className="ml-2 font-mono text-[10px] text-slate-500">({viewingMovement.product.code})</span>}
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Proveedor / Entidad</span>
                  <span className="font-bold text-slate-800 uppercase">{viewingMovement.supplierName || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Origen</span>
                  <span className="font-bold text-slate-700">{viewingMovement.fromWarehouse?.name || '-'}{viewingMovement.fromZone ? ` (${viewingMovement.fromZone.name})` : ''}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Destino</span>
                  <span className="font-bold text-blue-700">{viewingMovement.toWarehouse?.name || '-'}{viewingMovement.toZone ? ` (${viewingMovement.toZone.name})` : ''}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Lote</span>
                  <span className="font-mono font-bold text-slate-800">{viewingMovement.lotNumber || 'SIN LOTE'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Estado</span>
                  <span className="font-bold text-emerald-700">{viewingMovement.status}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Glosa / Observación</span>
                  <p className="text-slate-700 mt-0.5">{viewingMovement.observation || '-'}</p>
                </div>
              </div>
            </div>
            <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button type="button" onClick={() => setViewingMovement(null)} className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs cursor-pointer">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Movimiento */}
      {editingMovement && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 overflow-hidden">
          <div onClick={() => setEditingMovement(null)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300">
            <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white border-b border-blue-900">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-200" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-tight">Editar Movimiento #{editingMovement.id}</h3>
                  <p className="text-[9px] text-blue-200 uppercase font-medium">{editingMovement.product?.name}</p>
                </div>
              </div>
              <button onClick={() => setEditingMovement(null)} className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form id="edit-movement-form" onSubmit={handleSaveEditMovement} className="p-3 space-y-2.5 bg-slate-50/70">
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Lote</label>
                  <input
                    type="text"
                    value={editMovForm.lotNumber}
                    onChange={e => setEditMovForm({ ...editMovForm, lotNumber: e.target.value.toUpperCase() })}
                    className="w-full h-8 px-2.5 rounded border border-slate-300 text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                    placeholder="SIN LOTE"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Glosa / Observación</label>
                  <textarea
                    rows={3}
                    value={editMovForm.observation}
                    onChange={e => setEditMovForm({ ...editMovForm, observation: e.target.value })}
                    className="w-full p-2 rounded border border-slate-300 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                    placeholder="Detalle u observación del movimiento..."
                  />
                </div>
              </div>
            </form>
            <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <button type="button" onClick={() => setEditingMovement(null)} className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer">
                <X className="w-3.5 h-3.5 text-red-500" /> Cancelar
              </button>
              <button type="submit" form="edit-movement-form" disabled={savingMovement} className="h-8 px-5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                <Save className="w-3.5 h-3.5" /> {savingMovement ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'entryNotes' && (
        <div className="relative min-h-[600px]">
          {entryNotesError ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-4xl border border-red-200 shadow-sm">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-red-600 mb-2">Error al cargar notas de ingreso</h3>
              <p className="text-sm text-red-400 font-medium mb-4 max-w-md text-center">{entryNotesError}</p>
              <p className="text-xs text-slate-400 mb-6">Si el servidor no tiene los endpoints actualizados, reinicia el servidor backend.</p>
              <button onClick={loadEntryNotes} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-colors">
                <RefreshCcw className="w-4 h-4" /> Reintentar
              </button>
            </div>
          ) : !isEntryNoteFormOpen ? (
                <EntryNoteList
                  notes={entryNotes}
                  loading={loadingEntryNotes}
                  canWrite={canWriteEntryNotes}
                  onNew={handleNewEntryNote}
                  onEdit={handleEditEntryNote}
                  onDelete={handleDeleteEntryNote}
                  onApprove={handleApproveEntryNote}
                  onAnnul={handleAnnulEntryNote}
                  onRefresh={loadEntryNotes}
                />
              ) : (
                <EntryNoteForm
                  isOpen={isEntryNoteFormOpen}
                  onClose={handleCloseEntryNoteForm}
                  editingNote={editingEntryNote}
                  token={token}
                  onSuccess={() => {
                    loadEntryNotes();
                    handleCloseEntryNoteForm();
                  }}
                />
              )}
        </div>
      )}

      {activeSubTab === 'exitNotes' && (
        <div className="relative min-h-[600px]">
          {exitNotesError ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-4xl border border-red-200 shadow-sm">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-red-600 mb-2">Error al cargar notas de salida</h3>
              <p className="text-sm text-red-400 font-medium mb-4 max-w-md text-center">{exitNotesError}</p>
              <button onClick={loadExitNotes} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-colors">
                <RefreshCcw className="w-4 h-4" /> Reintentar
              </button>
            </div>
          ) : !isExitNoteFormOpen ? (
            <ExitNoteList
              notes={exitNotes}
              loading={loadingExitNotes}
              canWrite={canWriteExitNotes}
              onNew={handleNewExitNote}
              onEdit={handleEditExitNote}
              onDelete={handleDeleteExitNote}
              onApprove={handleApproveExitNote}
              onAnnul={handleAnnulExitNote}
            />
          ) : (
            <ExitNoteForm
              isOpen={isExitNoteFormOpen}
              onClose={handleCloseExitNoteForm}
              editingNote={editingExitNote}
              token={token}
              onSuccess={() => {
                loadExitNotes();
                if (onRefresh) onRefresh();
                handleCloseExitNoteForm();
              }}
            />
          )}
        </div>
      )}
    </motion.div>
  );
};

const PlusCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
