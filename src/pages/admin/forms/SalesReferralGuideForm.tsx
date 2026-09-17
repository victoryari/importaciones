import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, X, Search, Save, Package, Calendar, UserPlus, 
  AlertCircle, RefreshCw, MapPin, Hash, Plus, Trash2, 
  FileText, CheckCircle2, User, ShieldCheck, ArrowRight, Building2,
  Receipt, ShoppingBag, Download, Check, Filter, Layers, ArrowDownRight, Compass
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { DEPARTMENTS, PROVINCES, DISTRICTS, resolveUbigeoInfo } from '../../../lib/ubigeoData';
import { CustomerForm } from './CustomerForm';
import { ProductSearchModal } from './ProductSearchModal';

interface SalesReferralGuideFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newGuide?: any) => void;
  token?: string | null;
  initialOrderId?: number | null;
  orders?: any[];
  warehouses?: any[];
  shippingAgencies?: any[];
  seriesList?: any[];
  invoices?: any[];
  quotations?: any[];
  sellers?: any[];
}

export const SalesReferralGuideForm: React.FC<SalesReferralGuideFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token,
  initialOrderId,
  orders = [],
  warehouses = [],
  shippingAgencies = [],
  seriesList = [],
  invoices = [],
  quotations = [],
  sellers = []
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  
  // Filtros del modal de extracción
  const [extractDocTypeFilter, setExtractDocTypeFilter] = useState<'ALL' | '01' | '03' | 'PED' | 'COT'>('ALL');
  const [extractStartDate, setExtractStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [extractEndDate, setExtractEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [extractSearchTerm, setExtractSearchTerm] = useState('');

  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [productPredictiveResults, setProductPredictiveResults] = useState<any[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [allInvoices, setAllInvoices] = useState<any[]>(invoices);
  const [allQuotations, setAllQuotations] = useState<any[]>(quotations);
  const [allOrders, setAllOrders] = useState<any[]>(orders);
  const [allVehicles, setAllVehicles] = useState<any[]>([]);
  const [allDrivers, setAllDrivers] = useState<any[]>([]);
  const [isDriverConsulting, setIsDriverConsulting] = useState(false);

  // Estado del Formulario
  const [formData, setFormData] = useState<any>({
    documentType: '09',
    series: 'T001',
    number: '',
    issueDate: new Date().toISOString().split('T')[0],
    transferDate: new Date().toISOString().split('T')[0],
    transferReason: '01',
    transferReasonDescription: 'VENTA',
    transportMode: '02', // 01: Público, 02: Privado

    // Destinatario
    customerId: '',
    customerDocType: 'RUC',
    customerDocNumber: '',
    customerName: '',
    customerAddress: '',

    // Partida
    originWarehouseId: '',
    originAddress: '',
    originUbigeo: '150101',
    originSunatCode: '0000',

    // Llegada
    deliveryAddress: '',
    deliveryUbigeo: '150101',
    deliveryDepartment: 'LIMA',
    deliveryProvince: 'LIMA',
    deliveryDistrict: 'LIMA',

    // Transporte Público
    carrierDocType: '6',
    carrierDocNumber: '',
    carrierName: '',
    carrierMtcNumber: '',
    shippingAgencyId: '',
    shippingBranchId: '',

    // Transporte Privado
    driverDocType: '1',
    driverDocNumber: '',
    driverName: '',
    driverLicenseNumber: '',
    vehiclePlate: '',
    vehicleSecondaryPlate: '',

    // Carga
    totalWeight: 1.0,
    weightUnit: 'KGM',
    totalPackages: 1,

    // Docs relacionados
    orderId: '',
    orderNumber: '',
    invoiceId: '',
    invoiceNumber: '',
    relatedDocType: '',
    relatedDocNumber: '',

    notes: 'BIENES TRASLADADOS PARA SU ENTREGA EN EL DESTINO INDICADO.'
  });

  const [items, setItems] = useState<any[]>([]);

  // Series disponibles de Guía (09 / GRM / GRE)
  const guideSeries = useMemo(() => {
    return seriesList.filter(s => ['09', 'GRM', 'GRE', 'GUIA', 'T'].includes(s.documentType) || s.series?.startsWith('T') || s.series?.startsWith('EG'));
  }, [seriesList]);

  // Carga inicial
  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);

  // Si viene con un orderId específico al abrir
  useEffect(() => {
    if (isOpen && initialOrderId && orders.length > 0) {
      const ord = orders.find(o => o.id === initialOrderId);
      if (ord) {
        extractFromDocument({ 
          raw: ord, 
          sourceCategory: 'ORDER', 
          type: 'PED', 
          docNumber: `PED #${ord.id}`, 
          typeLabel: 'PEDIDO',
          customerName: ord.customerName,
          customerDoc: ord.customerDocNumber,
          customerDocType: ord.customerDocType,
          customerAddress: ord.customerAddress,
          destination: ord.customerAddress || ord.consigneeAddress || 'LIMA'
        });
      }
    }
  }, [isOpen, initialOrderId, orders]);

  const fetchInitialData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [pRes, cRes, vRes, dRes] = await Promise.all([
        axios.get('/api/products', config).catch(() => ({ data: [] })),
        axios.get('/api/customers', config).catch(() => ({ data: [] })),
        axios.get('/api/vehicles', config).catch(() => ({ data: [] })),
        axios.get('/api/drivers', config).catch(() => ({ data: [] }))
      ]);
      setAllProducts(Array.isArray(pRes.data) ? pRes.data : []);
      setAllCustomers(Array.isArray(cRes.data) ? cRes.data : []);
      setAllVehicles(Array.isArray(vRes.data) ? vRes.data : []);
      setAllDrivers(Array.isArray(dRes.data) ? dRes.data : []);

      // Auto-seleccionar almacén principal configurado al vendedor o usuario logueado
      let principalWarehouseId: string | null = null;
      if (user) {
        if (user.warehouseId) {
          principalWarehouseId = user.warehouseId.toString();
        } else if (sellers && sellers.length > 0) {
          let matchedSeller = null;
          if (user.email) {
            matchedSeller = sellers.find(s => s.email && s.email.toLowerCase() === user.email.toLowerCase() && s.isActive !== false);
          }
          if (!matchedSeller && user.name) {
            const uName = user.name.toLowerCase().trim();
            matchedSeller = sellers.find(s => s.name && (s.name.toLowerCase().trim() === uName || uName.includes(s.name.toLowerCase().trim()) || s.name.toLowerCase().trim().includes(uName)) && s.isActive !== false);
          }
          if (!matchedSeller && (user as any).dni) {
            matchedSeller = sellers.find(s => s.dni === (user as any).dni && s.isActive !== false);
          }
          if (matchedSeller && matchedSeller.warehouseId) {
            principalWarehouseId = matchedSeller.warehouseId.toString();
          }
        }
      }

      // Si no se detectó por vendedor, buscar almacén con isMain/isDefault o el primero
      if (!principalWarehouseId && warehouses.length > 0) {
        const mainWh = warehouses.find(w => w.isMain || w.isDefault) || warehouses[0];
        if (mainWh) principalWarehouseId = mainWh.id.toString();
      }

      let selectedWh = null;
      if (principalWarehouseId) {
        selectedWh = warehouses.find(w => w.id.toString() === principalWarehouseId);
      }
      if (!selectedWh && warehouses.length > 0) {
        selectedWh = warehouses[0];
      }

      if (selectedWh && !formData.originWarehouseId) {
        setFormData((prev: any) => ({
          ...prev,
          originWarehouseId: selectedWh.id.toString(),
          originAddress: selectedWh.address || prev.originAddress || 'AV. PRINCIPAL 123',
          originUbigeo: selectedWh.ubigeo || prev.originUbigeo || '150101',
          originSunatCode: selectedWh.sunatCode || prev.originSunatCode || '0000'
        }));
      }

      const targetWhId = selectedWh ? selectedWh.id.toString() : formData.originWarehouseId;
      if (guideSeries.length > 0 && !formData.series) {
        const s = guideSeries[0];
        setFormData((prev: any) => ({ ...prev, series: s.series }));
        fetchNextNumber(s.series, targetWhId);
      } else if (formData.series) {
        fetchNextNumber(formData.series, targetWhId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNextNumber = async (seriesCode: string, warehouseId?: string) => {
    if (!seriesCode) return;
    try {
      const targetWh = warehouseId || formData.originWarehouseId || '1';
      const res = await axios.get(`/api/series/next/${targetWh}/09`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.nextNumber) {
        setFormData((prev: any) => ({
          ...prev,
          series: seriesCode,
          number: res.data.nextNumber
        }));
      }
    } catch (e) {
      // Fallback
      setFormData((prev: any) => ({ ...prev, number: prev.number || 1 }));
    }
  };

  const handleWarehouseChange = (whId: string) => {
    const wh = warehouses.find(w => w.id.toString() === whId);
    if (wh) {
      setFormData((prev: any) => ({
        ...prev,
        originWarehouseId: whId,
        originAddress: wh.address || prev.originAddress,
        originUbigeo: wh.ubigeo || prev.originUbigeo,
        originSunatCode: wh.sunatCode || '0000'
      }));
      fetchNextNumber(formData.series, whId);
    }
  };

  // Helpers para Ubigeo de Punto de Llegada (Destino)
  const currentDeptId = useMemo(() => {
    if (!formData.deliveryDepartment) return '';
    const d = DEPARTMENTS.find(dept => 
      dept.name.toUpperCase() === formData.deliveryDepartment.toUpperCase() || 
      dept.id === formData.deliveryDepartment
    );
    return d ? d.id : '';
  }, [formData.deliveryDepartment]);

  const availableProvinces = useMemo(() => {
    return currentDeptId && PROVINCES[currentDeptId] ? PROVINCES[currentDeptId] : [];
  }, [currentDeptId]);

  const currentProvId = useMemo(() => {
    if (!currentDeptId || !formData.deliveryProvince) return '';
    const p = availableProvinces.find((prov: any) => 
      prov.name.toUpperCase() === formData.deliveryProvince.toUpperCase() || 
      prov.id === formData.deliveryProvince
    );
    return p ? p.id : '';
  }, [currentDeptId, availableProvinces, formData.deliveryProvince]);

  const currentFullProvId = currentDeptId && currentProvId ? currentDeptId + currentProvId : '';

  const availableDistricts = useMemo(() => {
    return currentFullProvId && DISTRICTS[currentFullProvId] ? DISTRICTS[currentFullProvId] : [];
  }, [currentFullProvId]);

  const currentDistId = useMemo(() => {
    if (!currentFullProvId || !formData.deliveryDistrict) return '';
    const d = availableDistricts.find((dist: any) => 
      dist.name.toUpperCase() === formData.deliveryDistrict.toUpperCase() || 
      dist.id === formData.deliveryDistrict
    );
    return d ? d.id : '';
  }, [currentFullProvId, availableDistricts, formData.deliveryDistrict]);

  const handleDepartmentChange = (deptId: string) => {
    const dept = DEPARTMENTS.find(d => d.id === deptId);
    if (dept) {
      const provs = PROVINCES[dept.id] || [];
      const firstProv = provs[0];
      const fullProvId = firstProv ? dept.id + firstProv.id : '';
      const dists = fullProvId && DISTRICTS[fullProvId] ? DISTRICTS[fullProvId] : [];
      const firstDist = dists[0];
      const newUbigeo = firstDist ? dept.id + firstProv.id + firstDist.id : `${dept.id}0101`;

      setFormData((prev: any) => ({
        ...prev,
        deliveryDepartment: dept.name.toUpperCase(),
        deliveryProvince: firstProv ? firstProv.name.toUpperCase() : '',
        deliveryDistrict: firstDist ? firstDist.name.toUpperCase() : '',
        deliveryUbigeo: newUbigeo
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        deliveryDepartment: '',
        deliveryProvince: '',
        deliveryDistrict: '',
        deliveryUbigeo: ''
      }));
    }
  };

  const handleProvinceChange = (provId: string) => {
    if (!currentDeptId) return;
    const prov = availableProvinces.find((p: any) => p.id === provId);
    if (prov) {
      const fullProvId = currentDeptId + prov.id;
      const dists = DISTRICTS[fullProvId] || [];
      const firstDist = dists[0];
      const newUbigeo = firstDist ? currentDeptId + prov.id + firstDist.id : `${currentDeptId}${prov.id}01`;

      setFormData((prev: any) => ({
        ...prev,
        deliveryProvince: prov.name.toUpperCase(),
        deliveryDistrict: firstDist ? firstDist.name.toUpperCase() : '',
        deliveryUbigeo: newUbigeo
      }));
    }
  };

  const handleDistrictChange = (distId: string) => {
    if (!currentDeptId || !currentProvId || !currentFullProvId) return;
    const dist = availableDistricts.find((d: any) => d.id === distId);
    if (dist) {
      const newUbigeo = currentDeptId + currentProvId + dist.id;
      setFormData((prev: any) => ({
        ...prev,
        deliveryDistrict: dist.name.toUpperCase(),
        deliveryUbigeo: newUbigeo
      }));
    }
  };

  const handleManualUbigeoChange = (rawCode: string) => {
    const code = rawCode.trim();
    setFormData((prev: any) => ({ ...prev, deliveryUbigeo: code }));

    if (code.length === 6) {
      const dId = code.substring(0, 2);
      const pId = code.substring(2, 4);
      const distId = code.substring(4, 6);

      const dept = DEPARTMENTS.find(d => d.id === dId);
      if (dept) {
        const provs = PROVINCES[dId] || [];
        const prov = provs.find((p: any) => p.id === pId);
        const fullProvId = dId + pId;
        const dists = DISTRICTS[fullProvId] || [];
        const dist = dists.find((d: any) => d.id === distId);

        setFormData((prev: any) => ({
          ...prev,
          deliveryDepartment: dept.name.toUpperCase(),
          deliveryProvince: prov ? prov.name.toUpperCase() : prev.deliveryProvince,
          deliveryDistrict: dist ? dist.name.toUpperCase() : prev.deliveryDistrict,
          deliveryUbigeo: code
        }));
      }
    }
  };

  const handleAgencyChange = (agencyId: string) => {
    const agency = shippingAgencies.find(a => a.id.toString() === agencyId);
    if (agency) {
      const mainBranch = agency.branches?.find((b: any) => b.isMain) || agency.branches?.[0];
      setFormData((prev: any) => ({
        ...prev,
        shippingAgencyId: agencyId,
        shippingBranchId: mainBranch?.id?.toString() || '',
        carrierDocType: '6',
        carrierDocNumber: agency.ruc || prev.carrierDocNumber,
        carrierName: agency.name || prev.carrierName,
        carrierMtcNumber: agency.mtcNumber || prev.carrierMtcNumber
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        shippingAgencyId: '',
        shippingBranchId: ''
      }));
    }
  };

  // Carga y sincronización de Comprobantes, Cotizaciones y Pedidos
  useEffect(() => {
    if (invoices && invoices.length > 0) setAllInvoices(invoices);
    else if (token && isOpen) {
      axios.get('/api/invoices', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setAllInvoices(Array.isArray(res.data) ? res.data : []))
        .catch(err => console.error('Error al cargar facturas/boletas:', err));
    }

    if (quotations && quotations.length > 0) setAllQuotations(quotations);
    else if (token && isOpen) {
      axios.get('/api/quotations', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setAllQuotations(Array.isArray(res.data) ? res.data : []))
        .catch(err => console.error('Error al cargar cotizaciones:', err));
    }

    if (orders && orders.length > 0) setAllOrders(orders);
    else if (token && isOpen) {
      axios.get('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setAllOrders(Array.isArray(res.data) ? res.data : []))
        .catch(err => console.error('Error al cargar pedidos:', err));
    }
  }, [isOpen, invoices, quotations, orders, token]);

  // Lista unificada de documentos candidatos para extracción
  const candidateDocuments = useMemo(() => {
    const list: any[] = [];

    // 1. Facturas y Boletas
    (allInvoices || []).forEach(inv => {
      const isBoleta = inv.documentType === '03' || inv.documentType === 'BOOL' || inv.documentType === 'BOLETA';
      const docType = isBoleta ? '03' : '01';
      const dateStr = inv.issueDate ? inv.issueDate.split('T')[0] : '';
      const docNum = inv.numberFormatted || `${inv.series}-${String(inv.number).padStart(8, '0')}`;
      list.push({
        id: `inv-${inv.id}`,
        rawId: inv.id,
        type: docType,
        typeLabel: isBoleta ? 'BOLETA' : 'FACTURA',
        typeBadgeColor: isBoleta ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200',
        docNumber: docNum,
        date: dateStr,
        customerName: inv.customerName || 'CLIENTE',
        customerDoc: inv.customerDocNumber || '',
        customerDocType: inv.customerDocType || (inv.customerDocNumber?.length === 11 ? 'RUC' : 'DNI'),
        customerAddress: inv.customerAddress || '',
        destination: inv.customerAddress || 'LIMA',
        totalAmount: parseFloat(inv.totalAmount || 0),
        currency: inv.currency === '2' || inv.currency === 'USD' ? 'USD' : 'PEN',
        itemCount: inv.items?.length || 0,
        status: inv.sunatStatus || inv.status || 'EMITIDO',
        warehouseId: inv.warehouseId,
        raw: inv,
        sourceCategory: 'INVOICE'
      });
    });

    // 2. Pedidos de Venta
    (allOrders || []).forEach(ord => {
      const dateStr = ord.createdAt ? ord.createdAt.split('T')[0] : (ord.date ? ord.date.split('T')[0] : '');
      list.push({
        id: `ord-${ord.id}`,
        rawId: ord.id,
        type: 'PED',
        typeLabel: 'PEDIDO',
        typeBadgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        docNumber: `PED #${ord.id}`,
        date: dateStr,
        customerName: ord.customerName || ord.razonSocial || 'CLIENTE',
        customerDoc: ord.customerDocNumber || ord.ruc || '',
        customerDocType: ord.customerDocType || (ord.ruc?.length === 11 ? 'RUC' : 'DNI'),
        customerAddress: ord.customerAddress || ord.address || '',
        destination: ord.customerAddress || ord.address || ord.consigneeAddress || 'LIMA',
        totalAmount: parseFloat(ord.totalAmount || 0),
        currency: ord.currency === '2' || ord.currency === 'USD' ? 'USD' : 'PEN',
        itemCount: ord.items?.length || 0,
        status: ord.status || 'PENDIENTE',
        warehouseId: ord.warehouseId,
        agencyId: ord.agencyId || ord.shippingAgencyId,
        branchId: ord.branchId,
        raw: ord,
        sourceCategory: 'ORDER'
      });
    });

    // 3. Cotizaciones
    (allQuotations || []).forEach(cot => {
      const dateStr = cot.date ? cot.date.split('T')[0] : (cot.createdAt ? cot.createdAt.split('T')[0] : '');
      const cotNum = cot.docSeries && cot.docNumber ? `${cot.docSeries}-${cot.docNumber}` : `COT #${cot.id}`;
      list.push({
        id: `cot-${cot.id}`,
        rawId: cot.id,
        type: 'COT',
        typeLabel: 'COTIZACIÓN',
        typeBadgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        docNumber: cotNum,
        date: dateStr,
        customerName: cot.customerName || cot.razonSocial || 'CLIENTE',
        customerDoc: cot.customerDocNumber || cot.ruc || '',
        customerDocType: cot.customerDocType || (cot.ruc?.length === 11 ? 'RUC' : 'DNI'),
        customerAddress: cot.customerAddress || cot.address || '',
        destination: cot.customerAddress || cot.address || 'LIMA',
        totalAmount: parseFloat(cot.totalAmount || 0),
        currency: cot.currency === '2' || cot.currency === 'USD' ? 'USD' : 'PEN',
        itemCount: cot.items?.length || 0,
        status: cot.status || 'REGISTRADO',
        warehouseId: cot.warehouseId,
        agencyId: cot.agencyId,
        branchId: cot.branchId,
        raw: cot,
        sourceCategory: 'QUOTATION'
      });
    });

    // Ordenar por fecha descendente
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return list;
  }, [allInvoices, allOrders, allQuotations]);

  // Documentos filtrados según selección y búsqueda
  const filteredExtractDocuments = useMemo(() => {
    return candidateDocuments.filter(doc => {
      if (extractDocTypeFilter !== 'ALL' && doc.type !== extractDocTypeFilter) {
        return false;
      }
      if (extractStartDate && doc.date && doc.date < extractStartDate) return false;
      if (extractEndDate && doc.date && doc.date > extractEndDate) return false;
      if (extractSearchTerm.trim()) {
        const q = extractSearchTerm.toLowerCase().trim();
        const matchNum = doc.docNumber?.toLowerCase().includes(q);
        const matchCust = doc.customerName?.toLowerCase().includes(q);
        const matchDoc = doc.customerDoc?.toLowerCase().includes(q);
        const matchDest = doc.destination?.toLowerCase().includes(q);
        if (!matchNum && !matchCust && !matchDoc && !matchDest) return false;
      }
      return true;
    });
  }, [candidateDocuments, extractDocTypeFilter, extractStartDate, extractEndDate, extractSearchTerm]);

  // Función principal de Extracción
  const extractFromDocument = (docItem: any) => {
    if (!docItem || !docItem.raw) return;
    const doc = docItem.raw;

    // Procesar Ítems y Pesos
    const newItems = (doc.items || []).map((it: any) => {
      const prod = it.product || allProducts.find(p => p.id === it.productId);
      const uWeight = prod?.weight ? parseFloat(prod.weight) : 0.5;
      const qty = parseFloat(it.quantity) || 1;
      return {
        productId: it.productId || prod?.id || 0,
        code: prod?.code || it.code || '',
        description: prod?.name || it.description || it.name || 'Producto',
        quantity: qty,
        unitMeasure: it.unitMeasure || prod?.unit?.symbol || prod?.package?.symbol || 'NIU',
        unitWeight: uWeight,
        totalWeight: qty * uWeight,
        lotNumber: it.lotNumber || it.lot || null,
        expiryDate: it.expiryDate || null
      };
    });

    const calculatedWeight = newItems.reduce((acc: number, it: any) => acc + (it.totalWeight || 0), 0);

    // Determinar datos de documento de referencia
    let relDocType = '01';
    let relDocNum = docItem.docNumber;
    let invId: any = undefined;
    let ordId: any = undefined;
    let ordNum: any = undefined;

    if (docItem.sourceCategory === 'INVOICE') {
      relDocType = docItem.type === '03' ? '03' : '01';
      invId = doc.id;
    } else if (docItem.sourceCategory === 'ORDER') {
      relDocType = 'PED';
      ordId = doc.id.toString();
      ordNum = doc.id.toString();
      relDocNum = `PED-${doc.id}`;
    } else if (docItem.sourceCategory === 'QUOTATION') {
      relDocType = 'COT';
      relDocNum = doc.docSeries && doc.docNumber ? `${doc.docSeries}-${doc.docNumber}` : `COT-${doc.id}`;
    }

      // Determinar ubigeo y localización de destino
      const rawDept = doc.department || doc.customerCity || 'LIMA';
      const rawProv = doc.province || 'LIMA';
      const rawDist = doc.district || 'LIMA';
      let derivedUbigeo = doc.ubigeo || doc.deliveryUbigeo || '';
      if (!derivedUbigeo && rawDept) {
        const dept = DEPARTMENTS.find(d => d.name.toUpperCase() === rawDept.toUpperCase());
        if (dept) {
          const provs = PROVINCES[dept.id] || [];
          const prov = provs.find((p: any) => p.name.toUpperCase() === rawProv.toUpperCase()) || provs[0];
          const fullProvId = prov ? dept.id + prov.id : '';
          const dists = fullProvId && DISTRICTS[fullProvId] ? DISTRICTS[fullProvId] : [];
          const dist = dists.find((d: any) => d.name.toUpperCase() === rawDist.toUpperCase()) || dists[0];
          if (dept && prov && dist) {
            derivedUbigeo = dept.id + prov.id + dist.id;
          }
        }
      }

      // Actualizar formulario
      setFormData((prev: any) => ({
        ...prev,
        // Destinatario
        customerId: doc.customerId?.toString() || prev.customerId,
        customerDocType: docItem.customerDocType || prev.customerDocType,
        customerDocNumber: docItem.customerDoc || prev.customerDocNumber,
        customerName: docItem.customerName || prev.customerName,
        customerAddress: docItem.customerAddress || prev.customerAddress,
        
        // Puntos de traslado
        originWarehouseId: doc.warehouseId ? doc.warehouseId.toString() : prev.originWarehouseId,
        deliveryAddress: docItem.destination || prev.deliveryAddress,
        deliveryDepartment: rawDept,
        deliveryProvince: rawProv,
        deliveryDistrict: rawDist,
        deliveryUbigeo: derivedUbigeo || prev.deliveryUbigeo || '150101',

        // Documentos relacionados
        orderId: ordId || prev.orderId,
        orderNumber: ordNum || prev.orderNumber,
        invoiceId: invId || prev.invoiceId,
        invoiceNumber: docItem.sourceCategory === 'INVOICE' ? docItem.docNumber : prev.invoiceNumber,
        relatedDocType: relDocType,
        relatedDocNumber: relDocNum,

        // Carga
        totalWeight: calculatedWeight > 0 ? parseFloat(calculatedWeight.toFixed(2)) : 1.0,
        totalPackages: newItems.length || 1,
        notes: `Traslado de mercadería según ${docItem.typeLabel} ${docItem.docNumber}. ${doc.observation || doc.notes || ''}`.trim()
      }));

      // Sincronizar almacén si aplica
      if (doc.warehouseId) {
        handleWarehouseChange(doc.warehouseId.toString());
      }

      // Sincronizar agencia si aplica
      if (doc.agencyId || doc.shippingAgencyId) {
        handleAgencyChange((doc.agencyId || doc.shippingAgencyId).toString());
      }

      if (newItems.length > 0) {
        setItems(newItems);
      }

      setIsExtractModalOpen(false);
    };

    // Búsqueda de cliente predictiva y SUNAT
    const handleCustomerSearch = (val: string) => {
      setFormData((prev: any) => ({ ...prev, customerDocNumber: val }));
      if (!val.trim()) {
        setCustomerSearchResults([]);
        return;
      }
      const q = val.toLowerCase();
      const res = allCustomers.filter(c => 
        c.docNumber?.toLowerCase().includes(q) || 
        c.name?.toLowerCase().includes(q)
      ).slice(0, 5);
      setCustomerSearchResults(res);
    };

    const selectCustomer = (c: any) => {
      const ubi = resolveUbigeoInfo(c);

      setFormData((prev: any) => ({
        ...prev,
        customerId: c.id.toString(),
        customerDocType: c.docType || (c.docNumber?.length === 11 ? 'RUC' : 'DNI'),
        customerDocNumber: c.docNumber || '',
        customerName: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        customerAddress: c.address || '',
        deliveryAddress: c.address || prev.deliveryAddress,
        deliveryDepartment: ubi.department || prev.deliveryDepartment || 'LIMA',
        deliveryProvince: ubi.province || prev.deliveryProvince || 'LIMA',
        deliveryDistrict: ubi.district || prev.deliveryDistrict || 'LIMA',
        deliveryUbigeo: ubi.ubigeo || prev.deliveryUbigeo || '150101'
      }));
      setCustomerSearchResults([]);
    };

  const consultSunat = async () => {
    const docNum = formData.customerDocNumber?.trim();
    if (!docNum) return;
    setIsConsulting(true);
    setErrorMsg('');
    try {
      const type = docNum.length === 11 ? 'ruc' : 'dni';
      const res = await axios.get(`/api/sunat/consult/${type}/${docNum}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        const d = res.data.data || res.data;
        const name = d.razonSocial || d.nombre || d.name || d.nombre_o_razon_social || '';
        const address = d.direccion || d.direccion_completa || d.address || '';
        const ubi = resolveUbigeoInfo(d);
        setFormData((prev: any) => ({
          ...prev,
          customerDocType: type === 'ruc' ? 'RUC' : 'DNI',
          customerName: name.toUpperCase(),
          customerAddress: address.toUpperCase(),
          deliveryAddress: address.toUpperCase() || prev.deliveryAddress,
          deliveryDepartment: ubi.department || prev.deliveryDepartment || 'LIMA',
          deliveryProvince: ubi.province || prev.deliveryProvince || 'LIMA',
          deliveryDistrict: ubi.district || prev.deliveryDistrict || 'LIMA',
          deliveryUbigeo: ubi.ubigeo || prev.deliveryUbigeo || '150101'
        }));
      }
    } catch (e: any) {
      setErrorMsg('No se pudo consultar el documento en SUNAT/RENIEC');
    } finally {
      setIsConsulting(false);
    }
  };

  const consultDriverSunat = async () => {
    const docNum = formData.driverDocNumber?.trim();
    if (!docNum) return;
    setIsDriverConsulting(true);
    try {
      const type = docNum.length === 11 ? 'ruc' : 'dni';
      const res = await axios.get(`/api/sunat/consult/${type}/${docNum}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        const name = res.data.razonSocial || res.data.nombre || res.data.name || '';
        setFormData((prev: any) => ({
          ...prev,
          driverName: name.toUpperCase()
        }));
      }
    } catch (e: any) {
      console.warn('No se pudo consultar el DNI del chofer:', e);
    } finally {
      setIsDriverConsulting(false);
    }
  };

  // Agregar Ítems
  const handleProductPredictiveSearch = (val: string) => {
    setProductSearchTerm(val);
    if (!val.trim()) {
      setProductPredictiveResults([]);
      return;
    }
    const q = val.toLowerCase();
    const res = allProducts.filter(p => 
      p.code?.toLowerCase().includes(q) || 
      p.name?.toLowerCase().includes(q)
    ).slice(0, 6);
    setProductPredictiveResults(res);
  };

  const addProductToItems = (p: any) => {
    const uWeight = p.weight ? parseFloat(p.weight) : 0.5;
    const existingIdx = items.findIndex(it => it.productId === p.id);
    if (existingIdx >= 0) {
      const updated = [...items];
      updated[existingIdx].quantity += 1;
      updated[existingIdx].totalWeight = updated[existingIdx].quantity * updated[existingIdx].unitWeight;
      setItems(updated);
    } else {
      setItems(prev => [
        ...prev,
        {
          productId: p.id,
          code: p.code || '',
          description: p.name || 'Producto',
          quantity: 1,
          unitMeasure: p.unit?.symbol || 'NIU',
          unitWeight: uWeight,
          totalWeight: uWeight,
          lotNumber: null,
          expiryDate: null
        }
      ]);
    }
    setProductSearchTerm('');
    setProductPredictiveResults([]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unitWeight') {
        const qty = parseFloat(item.quantity) || 0;
        const uW = parseFloat(item.unitWeight) || 0;
        item.totalWeight = parseFloat((qty * uW).toFixed(2));
      }
      updated[index] = item;
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Recalcular peso total de carga cuando cambian los ítems
  useEffect(() => {
    const totalW = items.reduce((acc, it) => acc + (parseFloat(it.totalWeight) || 0), 0);
    if (totalW > 0) {
      setFormData((prev: any) => ({
        ...prev,
        totalWeight: parseFloat(totalW.toFixed(2)),
        totalPackages: items.length || 1
      }));
    }
  }, [items]);

  // Guardar Guía
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerDocNumber || !formData.customerName) {
      setErrorMsg('Por favor ingrese el RUC/DNI y Nombre del Destinatario');
      return;
    }
    if (!formData.deliveryAddress) {
      setErrorMsg('Por favor ingrese el Punto de Llegada (Dirección de Destino)');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Debe agregar al menos un ítem o producto para el traslado');
      return;
    }
    if (formData.transportMode === '02' && !formData.vehiclePlate) {
      setErrorMsg('Para Transporte Privado debe indicar la Placa del Vehículo');
      return;
    }
    if (formData.transportMode === '01' && !formData.carrierDocNumber) {
      setErrorMsg('Para Transporte Público debe indicar el RUC de la Empresa de Transporte');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        ...formData,
        items
      };

      const res = await axios.post('/api/sales-referral-guides', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data) {
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Error al registrar la Guía de Remisión');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center p-1 sm:p-2 overflow-hidden bg-slate-900/40 backdrop-blur-2xs">
      <div className="relative w-full h-full max-w-[99%] max-h-[99%] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 animate-in fade-in zoom-in-95 duration-150">
        
        {/* CABECERA CORPORATIVA ERP (#004A99) */}
        <div className="bg-[#004A99] text-white px-3.5 py-2 flex items-center justify-between shadow-sm shrink-0 border-b border-blue-900">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center text-white border border-white/20">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-white tracking-wide uppercase">
                  REGISTRO DE GUÍA DE REMISIÓN ELECTRÓNICA (REMITENTE)
                </h2>
                <span className="px-1.5 py-0.2 bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 rounded text-[8px] font-black uppercase">
                  GRE - TIPO 09
                </span>
              </div>
              <p className="text-[9px] text-blue-100/90 font-medium">
                Módulo de Logística y Despacho de Mercaderías
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExtractModalOpen(true)}
              className="h-6.5 px-2.5 bg-blue-700/80 hover:bg-blue-600 border border-blue-300/40 text-white rounded text-[9px] font-bold uppercase tracking-tight flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Extraer datos desde Factura, Boleta, Pedido o Cotización"
            >
              <Download className="w-3.5 h-3.5 text-blue-200" />
              Extraer Documento
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-6.5 h-6.5 flex items-center justify-center text-white/80 hover:text-white hover:bg-red-600/80 rounded transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CONTENIDO DEL FORMULARIO */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-slate-50/70 p-2 gap-1.5 custom-scrollbar">
          
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 shrink-0 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* SECCIONES SUPERIORES */}
          <div className="shrink-0 space-y-1.5">
            
            {/* FILA 1: Comprobante, Fechas, Motivo y Modalidad */}
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Doc:</span>
                <div className="h-7 border border-blue-300 bg-blue-50 text-blue-800 rounded px-2 text-[10px] font-black flex items-center uppercase">
                  GUÍA 09
                </div>
                
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0 ml-1">Serie:</span>
                <select
                  value={formData.series}
                  onChange={e => {
                    setFormData({ ...formData, series: e.target.value });
                    fetchNextNumber(e.target.value);
                  }}
                  className="h-7 border border-slate-300 rounded px-2 text-xs font-bold bg-blue-50/80 text-blue-900 focus:border-blue-500 w-20 text-center outline-none uppercase"
                >
                  {guideSeries.length > 0 ? (
                    guideSeries.map(s => <option key={s.id} value={s.series}>{s.series}</option>)
                  ) : (
                    <>
                      <option value="T001">T001</option>
                      <option value="EG01">EG01</option>
                    </>
                  )}
                </select>
                <span className="text-slate-400 font-bold">-</span>
                <div className="relative w-28">
                  <input 
                    type="text" 
                    readOnly
                    value={formData.number ? String(formData.number).padStart(8, '0') : '00000001'} 
                    className="h-7 border border-slate-300 rounded pl-5 pr-2 text-xs font-bold w-full bg-slate-100 text-blue-900 font-mono outline-none" 
                    placeholder="00000001" 
                  />
                  <Hash className="w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 text-blue-700" />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">F. Emisión:</span>
                <input 
                  type="date" 
                  value={formData.issueDate} 
                  onChange={e => setFormData({...formData, issueDate: e.target.value})} 
                  className="h-7 border border-slate-300 rounded px-2 text-xs font-bold w-32 bg-white focus:border-blue-500 outline-none" 
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">F. Traslado:</span>
                <input 
                  type="date" 
                  value={formData.transferDate} 
                  onChange={e => setFormData({...formData, transferDate: e.target.value})} 
                  className="h-7 border border-slate-300 rounded px-2 text-xs font-bold w-32 bg-white focus:border-blue-500 outline-none" 
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Motivo:</span>
                <select 
                  value={formData.transferReason} 
                  onChange={e => {
                    const descMap: any = {
                      '01': 'VENTA',
                      '02': 'COMPRA',
                      '04': 'TRASLADO ENTRE ESTABLECIMIENTOS DE LA MISMA EMPRESA',
                      '13': 'OTROS',
                      '14': 'VENTA SUJETA A CONFIRMACION DEL COMPRADOR',
                      '18': 'TRASLADO EMISOR ITINERANTE DE COMPROBANTES'
                    };
                    setFormData({
                      ...formData, 
                      transferReason: e.target.value,
                      transferReasonDescription: descMap[e.target.value] || 'VENTA'
                    });
                  }} 
                  className="h-7 border border-slate-300 rounded px-1.5 text-xs font-bold bg-white text-slate-800 truncate focus:border-blue-500 outline-none w-44"
                >
                  <option value="01">01 | VENTA</option>
                  <option value="04">04 | TRASLADO ENTRE LOCALES</option>
                  <option value="02">02 | COMPRA</option>
                  <option value="14">14 | VENTA SUJETA A CONFIRMACIÓN</option>
                  <option value="18">18 | EMISOR ITINERANTE</option>
                  <option value="13">13 | OTROS</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Modalidad:</span>
                <select 
                  value={formData.transportMode} 
                  onChange={e => setFormData({...formData, transportMode: e.target.value})} 
                  className="h-7 border border-blue-300 rounded px-1.5 text-xs font-bold bg-blue-50 text-blue-900 focus:border-blue-500 outline-none w-36 uppercase"
                >
                  <option value="02">02 | PRIVADO</option>
                  <option value="01">01 | PÚBLICO</option>
                </select>
              </div>
            </div>

            {/* FILA 2: Destinatario (Cliente) */}
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 w-64">
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">RUC/DNI:</span>
                <div className="relative flex-1 group">
                  <input 
                    type="text" 
                    value={formData.customerDocNumber || ''} 
                    onChange={e => handleCustomerSearch(e.target.value)}
                    className="h-7 w-full border border-slate-300 rounded pl-2 pr-12 text-xs font-bold font-mono uppercase bg-white focus:border-blue-500 outline-none" 
                    placeholder="00000000000" 
                  />
                  {customerSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-70 mt-1 bg-white shadow-2xl border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                      {customerSearchResults.map(c => (
                        <div key={c.id} onClick={() => selectCustomer(c)} className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex flex-col border-b border-slate-100">
                          <span className="font-bold text-slate-800">{c.docNumber}</span>
                          <span className="text-[10px] text-slate-500">{c.name || `${c.firstName} ${c.lastName}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="absolute right-0.5 top-1/2 -translate-y-1/2 flex items-center">
                    <button 
                      type="button" 
                      onClick={() => setIsCustomerModalOpen(true)} 
                      className="p-1 text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer" 
                      title="Registrar Nuevo Cliente"
                    >
                      <UserPlus className="w-3 h-3" />
                    </button>
                    <button 
                      type="button" 
                      onClick={consultSunat} 
                      disabled={isConsulting} 
                      className="p-1 text-slate-500 hover:text-blue-700 transition-colors disabled:opacity-50 cursor-pointer" 
                      title="Consultar SUNAT / RENIEC"
                    >
                      {isConsulting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 flex-1 max-w-xl">
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Destinatario:</span>
                <input 
                  type="text" 
                  value={formData.customerName || ''} 
                  onChange={e => setFormData({...formData, customerName: e.target.value.toUpperCase()})} 
                  className="h-7 w-full border border-blue-200 rounded px-2 text-xs font-bold bg-blue-50/60 text-blue-950 uppercase focus:border-blue-500 outline-none" 
                  placeholder="NOMBRE O RAZÓN SOCIAL DEL DESTINATARIO" 
                />
              </div>

              {formData.orderId && (
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Pedido: #{formData.orderId}</span>
                </div>
              )}
            </div>

            {/* FILA 3: Puntos de Partida y Llegada */}
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
              
              {/* Punto de Partida (Origen) */}
              <div className="space-y-1.5 bg-slate-50/70 p-1.5 rounded border border-slate-200/80">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1 flex-wrap gap-1">
                  <span className="text-[10px] font-bold text-blue-900 uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-700" /> Punto de Partida (Origen)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Almacén:</span>
                    <select 
                      value={formData.originWarehouseId} 
                      onChange={e => handleWarehouseChange(e.target.value)}
                      className="h-6 border border-blue-300 rounded px-1 text-[10px] font-bold bg-white text-blue-950 outline-none uppercase max-w-[190px]"
                    >
                      <option value="">-- SELECCIONAR ALMACÉN --</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name.toUpperCase()} {w.isMain || w.isDefault ? '(PRINCIPAL)' : ''}
                        </option>
                      ))}
                    </select>
                    <span className="text-[9px] font-bold text-slate-500 uppercase ml-1">Cód. SUNAT:</span>
                    <input 
                      type="text" 
                      value={formData.originSunatCode || '0000'} 
                      onChange={e => setFormData({...formData, originSunatCode: e.target.value})} 
                      className="h-6 w-12 border border-slate-300 rounded px-1 text-[10px] text-center font-mono font-bold bg-white outline-none" 
                      placeholder="0000"
                      title="Código de establecimiento SUNAT del punto de partida"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase shrink-0">Dirección:</span>
                  <input 
                    type="text" 
                    value={formData.originAddress || ''} 
                    onChange={e => setFormData({...formData, originAddress: e.target.value.toUpperCase()})} 
                    className="h-6 flex-1 border border-slate-300 rounded px-1.5 text-xs bg-white uppercase outline-none focus:border-blue-500" 
                    placeholder="Dirección fiscal del almacén emisor"
                  />
                  <span className="text-[9px] font-bold text-slate-500 uppercase shrink-0 ml-1">Ubigeo:</span>
                  <input 
                    type="text" 
                    value={formData.originUbigeo || ''} 
                    onChange={e => setFormData({...formData, originUbigeo: e.target.value})} 
                    className="h-6 w-16 border border-slate-300 rounded px-1 text-xs text-center font-mono font-bold bg-white outline-none focus:border-blue-500" 
                    placeholder="150101"
                    title="Código Ubigeo SUNAT de partida (6 dígitos)"
                  />
                </div>
              </div>

              {/* Punto de Llegada (Destino) */}
              <div className="space-y-1.5 bg-slate-50/70 p-1.5 rounded border border-slate-200/80">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1 flex-wrap gap-1">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase flex items-center gap-1">
                    <Compass className="w-3 h-3 text-emerald-700" /> Punto de Llegada (Destino)
                  </span>
                  
                  {/* Selectores de Ubigeo Cascading */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <select 
                      value={currentDeptId} 
                      onChange={e => handleDepartmentChange(e.target.value)}
                      className="h-6 border border-slate-300 rounded px-1 text-[9px] font-bold bg-white text-slate-800 outline-none uppercase max-w-[95px]"
                      title="Departamento de llegada"
                    >
                      <option value="">DEPARTAMENTO</option>
                      {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                    </select>

                    <select 
                      value={currentProvId} 
                      onChange={e => handleProvinceChange(e.target.value)}
                      disabled={!currentDeptId}
                      className="h-6 border border-slate-300 rounded px-1 text-[9px] font-bold bg-white text-slate-800 outline-none uppercase max-w-[95px] disabled:bg-slate-100"
                      title="Provincia de llegada"
                    >
                      <option value="">PROVINCIA</option>
                      {availableProvinces.map((p: any) => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                    </select>

                    <select 
                      value={currentDistId} 
                      onChange={e => handleDistrictChange(e.target.value)}
                      disabled={!currentProvId}
                      className="h-6 border border-slate-300 rounded px-1 text-[9px] font-bold bg-white text-slate-800 outline-none uppercase max-w-[105px] disabled:bg-slate-100"
                      title="Distrito de llegada"
                    >
                      <option value="">DISTRITO</option>
                      {availableDistricts.map((d: any) => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                    </select>

                    <div className="flex items-center gap-0.5">
                      <span className="text-[8px] font-black text-emerald-800 uppercase">UBIGEO:</span>
                      <input 
                        type="text" 
                        value={formData.deliveryUbigeo || ''} 
                        onChange={e => handleManualUbigeoChange(e.target.value)} 
                        maxLength={6}
                        className="h-6 w-16 border border-emerald-300 rounded px-1 text-xs text-center font-mono font-bold bg-emerald-50 text-emerald-950 outline-none focus:border-emerald-500" 
                        placeholder="150101"
                        title="Código Ubigeo SUNAT de llegada (6 dígitos)"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase shrink-0">Dirección:</span>
                  <input 
                    type="text" 
                    value={formData.deliveryAddress || ''} 
                    onChange={e => setFormData({...formData, deliveryAddress: e.target.value.toUpperCase()})} 
                    className="h-6 flex-1 border border-slate-300 rounded px-1.5 text-xs bg-white uppercase outline-none focus:border-emerald-500" 
                    placeholder="Dirección fiscal o local de entrega del destinatario"
                  />
                </div>
              </div>

            </div>

            {/* FILA 4: Transporte, Conductor / Vehículo y Carga */}
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3 text-xs">
              {formData.transportMode === '01' ? (
                /* Transporte Público */
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Agencia:</span>
                    <select 
                      value={formData.shippingAgencyId || ''} 
                      onChange={e => handleAgencyChange(e.target.value)} 
                      className="h-7 border border-slate-300 rounded px-1.5 text-xs font-bold bg-white truncate focus:border-blue-500 outline-none uppercase w-48"
                    >
                      <option value="">-- SELECCIONAR AGENCIA --</option>
                      {shippingAgencies.map(a => <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">RUC Transp:</span>
                    <input 
                      type="text" 
                      value={formData.carrierDocNumber || ''} 
                      onChange={e => setFormData({...formData, carrierDocNumber: e.target.value})} 
                      className="h-7 w-28 border border-slate-300 rounded px-2 text-xs font-mono font-bold uppercase bg-white outline-none" 
                      placeholder="20000000000" 
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Razón Social:</span>
                    <input 
                      type="text" 
                      value={formData.carrierName || ''} 
                      onChange={e => setFormData({...formData, carrierName: e.target.value.toUpperCase()})} 
                      className="h-7 w-full border border-slate-300 rounded px-2 text-xs font-bold uppercase bg-white outline-none" 
                      placeholder="EMPRESA DE TRANSPORTE S.A.C." 
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">N° MTC:</span>
                    <input 
                      type="text" 
                      value={formData.carrierMtcNumber || ''} 
                      onChange={e => setFormData({...formData, carrierMtcNumber: e.target.value})} 
                      className="h-7 w-24 border border-slate-300 rounded px-2 text-xs font-mono uppercase bg-white outline-none" 
                      placeholder="MTC-12345" 
                    />
                  </div>
                </>
              ) : (
                /* Transporte Privado */
                <>
                  {/* Selector de Vehículo de Flota (Config. Logística) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0 flex items-center gap-1">
                      <Truck className="w-3 h-3 text-blue-700" /> Vehículo:
                    </span>
                    {allVehicles.length > 0 && (
                      <select 
                        value={allVehicles.some(v => v.plate === formData.vehiclePlate) ? formData.vehiclePlate : ''}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData((prev: any) => ({ ...prev, vehiclePlate: val }));
                        }}
                        className="h-7 border border-blue-300 rounded px-1.5 text-xs font-bold bg-blue-50/80 text-blue-950 outline-none uppercase max-w-[170px]"
                        title="Seleccionar vehículo registrado de la flota"
                      >
                        <option value="">-- FLOTA EMPRESA --</option>
                        {allVehicles.map(v => (
                          <option key={v.id} value={v.plate}>
                            {v.plate} {v.brand ? `- ${v.brand}` : ''} {v.model || ''}
                          </option>
                        ))}
                      </select>
                    )}
                    <input 
                      type="text" 
                      value={formData.vehiclePlate || ''} 
                      onChange={e => setFormData({...formData, vehiclePlate: e.target.value.toUpperCase()})} 
                      className="h-7 w-20 border border-blue-300 rounded px-1.5 text-xs font-mono font-bold uppercase bg-white text-blue-950 text-center outline-none focus:border-blue-500" 
                      placeholder="PLACA" 
                      title="Placa principal del vehículo"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase shrink-0">Acoplado:</span>
                    <input 
                      type="text" 
                      value={formData.vehicleSecondaryPlate || ''} 
                      onChange={e => setFormData({...formData, vehicleSecondaryPlate: e.target.value.toUpperCase()})} 
                      className="h-7 w-18 border border-slate-300 rounded px-1.5 text-xs font-mono uppercase bg-white text-center outline-none focus:border-blue-500" 
                      placeholder="ACOPLADO" 
                      title="Placa del remolque / semirremolque / acoplado (opcional)"
                    />
                  </div>

                  {/* Selector de Conductor (Config. Logística / Usuarios) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0 flex items-center gap-1">
                      <User className="w-3 h-3 text-emerald-700" /> Chofer:
                    </span>
                    {allDrivers.length > 0 && (
                      <select 
                        value={allDrivers.some(d => d.name?.toUpperCase() === formData.driverName?.toUpperCase()) ? formData.driverName : ''}
                        onChange={e => {
                          const selectedDriver = allDrivers.find(d => d.name === e.target.value);
                          if (selectedDriver) {
                            setFormData((prev: any) => ({
                              ...prev,
                              driverName: selectedDriver.name.toUpperCase(),
                              driverDocNumber: selectedDriver.docNumber || prev.driverDocNumber,
                              driverLicenseNumber: selectedDriver.licenseNumber || prev.driverLicenseNumber
                            }));
                          }
                        }}
                        className="h-7 border border-emerald-300 rounded px-1.5 text-xs font-bold bg-emerald-50/80 text-emerald-950 outline-none uppercase max-w-[150px]"
                        title="Seleccionar conductor registrado en la empresa"
                      >
                        <option value="">-- CHOFER EMPRESA --</option>
                        {allDrivers.map(d => (
                          <option key={d.id} value={d.name}>
                            {d.name.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase shrink-0">DNI:</span>
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        value={formData.driverDocNumber || ''} 
                        onChange={e => setFormData({...formData, driverDocNumber: e.target.value})} 
                        maxLength={11}
                        className="h-7 w-24 border border-slate-300 rounded px-1.5 pr-6 text-xs font-mono font-bold bg-white text-center outline-none focus:border-emerald-500" 
                        placeholder="DNI CHOFER" 
                        title="DNI o Cédula del conductor"
                      />
                      <button 
                        type="button" 
                        onClick={consultDriverSunat} 
                        disabled={isDriverConsulting}
                        className="absolute right-1 text-slate-400 hover:text-emerald-700 disabled:opacity-50 transition-colors"
                        title="Consultar RENIEC / SUNAT"
                      >
                        {isDriverConsulting ? <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" /> : <Search className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 min-w-[140px] max-w-xs">
                    <input 
                      type="text" 
                      value={formData.driverName || ''} 
                      onChange={e => setFormData({...formData, driverName: e.target.value.toUpperCase()})} 
                      className="h-7 w-full border border-slate-300 rounded px-2 text-xs font-bold uppercase bg-white outline-none focus:border-emerald-500" 
                      placeholder="APELLIDOS Y NOMBRES DEL CHOFER" 
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase shrink-0">Licencia:</span>
                    <input 
                      type="text" 
                      value={formData.driverLicenseNumber || ''} 
                      onChange={e => setFormData({...formData, driverLicenseNumber: e.target.value.toUpperCase()})} 
                      className="h-7 w-24 border border-slate-300 rounded px-1.5 text-xs font-mono font-bold uppercase bg-white text-center outline-none focus:border-emerald-500" 
                      placeholder="BREVETE" 
                      title="Número de licencia de conducir / brevete"
                    />
                  </div>
                </>
              )}

              {/* Peso y Bultos */}
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Peso Total (Kg):</span>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.totalWeight || ''} 
                  onChange={e => setFormData({...formData, totalWeight: e.target.value})} 
                  className="h-7 w-20 border border-slate-300 rounded px-2 text-xs font-mono font-bold text-right bg-yellow-50 text-slate-800 outline-none" 
                  placeholder="0.00" 
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Bultos:</span>
                <input 
                  type="number" 
                  min="1" 
                  value={formData.totalPackages || ''} 
                  onChange={e => setFormData({...formData, totalPackages: e.target.value})} 
                  className="h-7 w-16 border border-slate-300 rounded px-2 text-xs font-bold text-center bg-white outline-none" 
                  placeholder="1" 
                />
              </div>
            </div>

          </div>

          {/* GRILLA DE BIENES / MERCADERÍA A TRASLADAR (Maximizada) */}
          <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-lg border border-slate-200 shadow-2xs">
            
            {/* Buscador de productos */}
            <div className="p-2 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-1 max-w-xl relative">
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    value={productSearchTerm}
                    onChange={e => handleProductPredictiveSearch(e.target.value)}
                    className="h-7.5 w-full border border-slate-300 rounded pl-8 pr-2 text-xs font-bold uppercase bg-white focus:border-blue-500 outline-none"
                    placeholder="BUSCAR PRODUCTO POR CÓDIGO O DESCRIPCIÓN..."
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />

                  {productPredictiveResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-70 mt-1 bg-white shadow-2xl border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                      {productPredictiveResults.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => addProductToItems(p)} 
                          className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex items-center justify-between border-b border-slate-100"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{p.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Cód: {p.code || '-'} | Stock: {p.stock || 0}</span>
                          </div>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {p.weight ? `${p.weight} Kg` : '0.5 Kg'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  type="button" 
                  onClick={() => setIsProductModalOpen(true)} 
                  className="h-7.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold uppercase tracking-tight flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Catálogo
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                <span>Total Ítems: <strong className="text-blue-900">{items.length}</strong></span>
                <span>Peso Total Estimado: <strong className="text-blue-900">{formData.totalWeight} Kg</strong></span>
              </div>
            </div>

            {/* Tabla de ítems */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#004A99] text-white text-[10px] uppercase font-bold sticky top-0 z-10 select-none">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">#</th>
                    <th className="py-2 px-3 w-28 text-center">Código</th>
                    <th className="py-2 px-3">Descripción de los Bienes</th>
                    <th className="py-2 px-3 w-24 text-center">Cantidad</th>
                    <th className="py-2 px-3 w-20 text-center">U.M.</th>
                    <th className="py-2 px-3 w-28 text-right">Peso Unit (Kg)</th>
                    <th className="py-2 px-3 w-28 text-right">Peso Total (Kg)</th>
                    <th className="py-2 px-3 w-28 text-center">Lote / Venc.</th>
                    <th className="py-2 px-3 w-12 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-60" />
                        <p className="font-semibold text-xs text-slate-500">No hay bienes agregados a la guía de remisión</p>
                        <p className="text-[10px] text-slate-400">Utilice el buscador superior o importe un pedido de venta</p>
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-1 px-3 text-center font-bold text-slate-500 text-[10px]">{idx + 1}</td>
                        <td className="py-1 px-3 text-center font-mono font-bold text-slate-700 text-[11px]">{it.code || '-'}</td>
                        <td className="py-1 px-3 font-semibold text-slate-800">{it.description}</td>
                        <td className="py-1 px-3 text-center">
                          <input 
                            type="number" 
                            min="0.01" 
                            step="0.01" 
                            value={it.quantity} 
                            onChange={e => updateItem(idx, 'quantity', e.target.value)} 
                            className="h-7 w-20 text-center font-bold border border-slate-300 rounded bg-white text-xs outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="py-1 px-3 text-center">
                          <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700 uppercase">
                            {it.unitMeasure || 'NIU'}
                          </span>
                        </td>
                        <td className="py-1 px-3 text-right">
                          <input 
                            type="number" 
                            step="0.001" 
                            value={it.unitWeight} 
                            onChange={e => updateItem(idx, 'unitWeight', e.target.value)} 
                            className="h-7 w-20 text-right font-mono border border-slate-300 rounded bg-white text-xs px-1 outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="py-1 px-3 text-right font-mono font-bold text-blue-900">
                          {(parseFloat(it.totalWeight) || 0).toFixed(2)}
                        </td>
                        <td className="py-1 px-3 text-center text-[10px] font-mono text-slate-500">
                          {it.lotNumber || '-'}
                        </td>
                        <td className="py-1 px-3 text-center">
                          <button 
                            type="button" 
                            onClick={() => removeItem(idx)} 
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" 
                            title="Eliminar ítem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* FILA INFERIOR: Observación y Botones de Acción */}
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-3xl">
              <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Obs/Glosa:</span>
              <input 
                type="text" 
                value={formData.notes || ''} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                className="h-7 flex-1 border border-slate-300 rounded px-2 text-xs bg-white outline-none focus:border-blue-500" 
                placeholder="Observaciones de despacho o entrega de mercadería..." 
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 select-none cursor-pointer bg-slate-100/80 hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors">
                <input 
                  type="checkbox" 
                  checked={formData.sendToSunatImmediately !== false} 
                  onChange={e => setFormData({...formData, sendToSunatImmediately: e.target.checked})} 
                  className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer" 
                />
                <span className="text-[10px] uppercase font-bold text-blue-900">Enviar a SUNAT al Emitir</span>
              </label>

              <button 
                type="button" 
                onClick={onClose} 
                disabled={loading}
                className="h-8 px-4 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded font-bold uppercase text-[11px] tracking-wide transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button 
                type="submit" 
                disabled={loading}
                className="h-8 px-6 bg-[#004A99] hover:bg-blue-800 text-white rounded font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Emitir Guía de Remisión
              </button>
            </div>
          </div>

        </form>

      </div>

      {/* MODAL DE EXTRACCIÓN DE COMPROBANTES / DOCUMENTOS DE VENTA */}
      {isExtractModalOpen && (
        <div className="absolute inset-0 z-130 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Cabecera del Modal de Extracción */}
            <div className="bg-[#004A99] text-white px-4 py-2.5 flex items-center justify-between shadow-sm shrink-0 border-b border-blue-900">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center text-white border border-white/20">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-white">
                    Extraer Información de Documento de Venta
                  </h3>
                  <p className="text-[9px] text-blue-100 uppercase font-medium">
                    Facturas (01), Boletas (03), Pedidos (PED) y Cotizaciones (COT)
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsExtractModalOpen(false)} 
                className="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white hover:bg-red-600/80 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
              <div className="flex items-center gap-2 flex-1 max-w-sm relative">
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    value={extractSearchTerm} 
                    onChange={e => setExtractSearchTerm(e.target.value)} 
                    className="h-8 w-full border border-slate-300 rounded-lg pl-8 pr-3 text-xs font-medium uppercase outline-none focus:border-blue-500 bg-white" 
                    placeholder="BUSCAR POR N° COMPROBANTE, CLIENTE, RUC..." 
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Tipo:</span>
                  <select 
                    value={extractDocTypeFilter} 
                    onChange={e => setExtractDocTypeFilter(e.target.value as any)} 
                    className="h-8 border border-slate-300 rounded-lg px-2 text-xs font-bold bg-white outline-none uppercase"
                  >
                    <option value="ALL">TODOS LOS TIPOS</option>
                    <option value="01">FACTURA (01)</option>
                    <option value="03">BOLETA (03)</option>
                    <option value="PED">PEDIDO (PED)</option>
                    <option value="COT">COTIZACIÓN (COT)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Desde:</span>
                  <input 
                    type="date" 
                    value={extractStartDate} 
                    onChange={e => setExtractStartDate(e.target.value)} 
                    className="h-8 border border-slate-300 rounded-lg px-2 text-xs font-medium bg-white outline-none" 
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Hasta:</span>
                  <input 
                    type="date" 
                    value={extractEndDate} 
                    onChange={e => setExtractEndDate(e.target.value)} 
                    className="h-8 border border-slate-300 rounded-lg px-2 text-xs font-medium bg-white outline-none" 
                  />
                </div>

                <button 
                  type="button" 
                  onClick={() => {
                    setExtractSearchTerm('');
                    setExtractDocTypeFilter('ALL');
                  }} 
                  className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  title="Limpiar filtros"
                >
                  Limpiar
                </button>
              </div>
            </div>

            {/* Tabla de Documentos Encontrados */}
            <div className="flex-1 overflow-auto bg-white p-1 custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#004A99] text-white text-[10px] uppercase font-bold tracking-wider select-none sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-2.5 w-8 text-center">#</th>
                    <th className="py-2 px-2.5 w-24 text-center">Tipo</th>
                    <th className="py-2 px-2.5 w-28 text-center">Comprobante</th>
                    <th className="py-2 px-2.5 w-24 text-center">F. Emisión</th>
                    <th className="py-2 px-3">Destinatario / Razón Social</th>
                    <th className="py-2 px-2.5 w-28">RUC / DNI</th>
                    <th className="py-2 px-3">Dirección / Destino</th>
                    <th className="py-2 px-2.5 w-20 text-right">Total</th>
                    <th className="py-2 px-2 text-center w-16">Ítems</th>
                    <th className="py-2 px-2.5 text-center w-24">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExtractDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-xs text-slate-600">No se encontraron documentos con los filtros seleccionados</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Pruebe ampliando el rango de fechas o cambiando el filtro de tipo</p>
                      </td>
                    </tr>
                  ) : (
                    filteredExtractDocuments.map((doc, idx) => (
                      <tr 
                        key={doc.id} 
                        onDoubleClick={() => extractFromDocument(doc)}
                        className="hover:bg-blue-50/70 cursor-pointer transition-colors group select-none"
                        title="Haga doble clic para extraer todos los datos a la Guía"
                      >
                        <td className="py-2 px-2.5 text-center font-bold text-slate-400 text-[10px]">
                          {idx + 1}
                        </td>

                        <td className="py-2 px-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase inline-block border ${doc.typeBadgeColor}`}>
                            {doc.typeLabel}
                          </span>
                        </td>

                        <td className="py-2 px-2.5 text-center font-mono font-bold text-blue-900 text-xs">
                          {doc.docNumber}
                        </td>

                        <td className="py-2 px-2.5 text-center font-mono text-slate-600 text-[11px]">
                          {doc.date || '-'}
                        </td>

                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-800 text-xs truncate max-w-xs">{doc.customerName}</div>
                        </td>

                        <td className="py-2 px-2.5 font-mono text-slate-600 text-xs">
                          {doc.customerDoc || '-'}
                        </td>

                        <td className="py-2 px-3 text-slate-600 text-[11px] truncate max-w-xs">
                          {doc.destination || '-'}
                        </td>

                        <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 text-xs">
                          {doc.currency === 'USD' ? '$' : 'S/'} {doc.totalAmount?.toFixed(2)}
                        </td>

                        <td className="py-2 px-2 text-center font-bold text-blue-700 text-xs">
                          {doc.itemCount}
                        </td>

                        <td className="py-2 px-2.5 text-center">
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              extractFromDocument(doc);
                            }}
                            className="h-6 px-2 bg-[#004A99] hover:bg-blue-800 text-white rounded text-[10px] font-bold uppercase tracking-tight flex items-center gap-1 mx-auto transition-colors cursor-pointer shadow-2xs"
                          >
                            <Download className="w-2.5 h-2.5" /> Extraer
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pie del modal con ayuda de uso */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="text-[10px] font-semibold">
                Mostrando <strong className="text-slate-800">{filteredExtractDocuments.length}</strong> documento(s) encontrados.
              </span>
              <span className="text-[10px] font-medium text-blue-800 italic flex items-center gap-1">
                💡 Tip: Puede dar doble clic sobre cualquier fila para extraer automáticamente todos sus datos.
              </span>
              <button 
                type="button" 
                onClick={() => setIsExtractModalOpen(false)} 
                className="h-7 px-3 border border-slate-300 rounded font-bold text-slate-600 hover:bg-white transition-colors cursor-pointer text-xs"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE BÚSQUEDA DE PRODUCTOS DEL CATÁLOGO */}
      {isProductModalOpen && (
        <ProductSearchModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          onSelect={(p) => {
            addProductToItems(p);
            setIsProductModalOpen(false);
          }}
          token={token || ''}
          allowZeroStock={true}
          selectedWarehouseId={formData.originWarehouseId}
          warehouses={warehouses}
        />
      )}

      {/* MODAL DE NUEVO CLIENTE */}
      {isCustomerModalOpen && (
        <div className="absolute inset-0 z-130 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden">
            <div className="bg-[#004A99] text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Registrar Nuevo Destinatario
              </h3>
              <button 
                type="button" 
                onClick={() => setIsCustomerModalOpen(false)} 
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase">Tipo Documento:</span>
                <select 
                  value={formData.customerDocType} 
                  onChange={e => setFormData({...formData, customerDocType: e.target.value})} 
                  className="h-8 w-full border border-slate-300 rounded px-2 font-bold bg-white outline-none"
                >
                  <option value="RUC">RUC</option>
                  <option value="DNI">DNI</option>
                  <option value="CE">CARNET EXTRANJERÍA</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase">N° Documento:</span>
                <input 
                  type="text" 
                  value={formData.customerDocNumber} 
                  onChange={e => setFormData({...formData, customerDocNumber: e.target.value})} 
                  className="h-8 w-full border border-slate-300 rounded px-2 font-mono font-bold bg-white outline-none" 
                  placeholder="00000000000"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase">Razón Social / Nombre:</span>
                <input 
                  type="text" 
                  value={formData.customerName} 
                  onChange={e => setFormData({...formData, customerName: e.target.value.toUpperCase()})} 
                  className="h-8 w-full border border-slate-300 rounded px-2 font-bold bg-white uppercase outline-none" 
                  placeholder="NOMBRE DEL CLIENTE"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase">Dirección:</span>
                <input 
                  type="text" 
                  value={formData.customerAddress} 
                  onChange={e => setFormData({...formData, customerAddress: e.target.value.toUpperCase(), deliveryAddress: e.target.value.toUpperCase()})} 
                  className="h-8 w-full border border-slate-300 rounded px-2 bg-white uppercase outline-none" 
                  placeholder="DIRECCIÓN FISCAL"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsCustomerModalOpen(false)} 
                  className="h-8 px-3 border border-slate-300 rounded font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cerrar
                </button>
                <button 
                  type="button" 
                  onClick={async () => {
                    if (!formData.customerDocNumber || !formData.customerName) {
                      alert('Ingrese documento y nombre');
                      return;
                    }
                    try {
                      const res = await axios.post('/api/customers', {
                        docType: formData.customerDocType,
                        docNumber: formData.customerDocNumber,
                        name: formData.customerName,
                        address: formData.customerAddress,
                        personType: formData.customerDocType === 'RUC' ? 'JURIDICA' : 'NATURAL',
                        country: 'PERU'
                      }, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      if (res.data) {
                        setAllCustomers(prev => [res.data, ...prev]);
                        selectCustomer(res.data);
                      }
                      setIsCustomerModalOpen(false);
                    } catch (e: any) {
                      alert(e.response?.data?.error || 'Error al registrar cliente');
                    }
                  }} 
                  className="h-8 px-4 bg-[#004A99] hover:bg-blue-800 text-white rounded font-bold"
                >
                  Guardar Destinatario
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
