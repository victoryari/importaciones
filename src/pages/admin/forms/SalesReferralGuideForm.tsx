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
  const [extractDocTypeFilter, setExtractDocTypeFilter] = useState<'INVOICES' | 'ALL' | '01' | '03' | 'PED' | 'COT'>('INVOICES');
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
  const [allCarriers, setAllCarriers] = useState<any[]>([]);
  const [showCarrierLookup, setShowCarrierLookup] = useState(false);
  const [isCarrierConsulting, setIsCarrierConsulting] = useState(false);
  const [isDriverConsulting, setIsDriverConsulting] = useState(false);

  const getInitialFormData = () => {
    const today = new Date().toISOString().split('T')[0];
    return {
      documentType: '09',
      series: 'T001',
      number: '',
      issueDate: today,
      transferDate: today,
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
      deliveryWarehouseId: '',
      deliveryAddress: '',
      deliveryUbigeo: '150101',
      deliverySunatCode: '0000',
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
      agencyRuc: '',
      agencyAddress: '',

      // Transporte Privado
      driverDocType: '1',
      driverDocNumber: '',
      driverName: '',
      driverLicenseNumber: '',
      vehiclePlate: '',
      vehicleSecondaryPlate: '',
      vehicleBrand: '',
      vehicleTuce: '',
      vehicleMtc: '',

      // Indicadores Normativos SUNAT
      returnEmptyContainers: false,
      transshipment: false,
      vehicleCategoryM1OrL: false,
      returnEmptyVehicle: false,
      fullDamOrDsTransfer: false,

      // Carga
      totalWeight: 0,
      weightUnit: 'KGM',
      totalPackages: 0,

      // Docs relacionados
      orderId: '',
      orderNumber: '',
      invoiceId: '',
      invoiceNumber: '',
      relatedDocType: '',
      relatedDocNumber: '',

      notes: 'BIENES TRASLADADOS PARA SU ENTREGA EN EL DESTINO INDICADO.'
    };
  };

  // Estado del Formulario
  const [formData, setFormData] = useState<any>(getInitialFormData);

  const [items, setItems] = useState<any[]>([]);

  // Series disponibles de Guía (09 / GRM / GRE)
  const guideSeries = useMemo(() => {
    return seriesList.filter(s => ['09', 'GRM', 'GRE', 'GUIA', 'T'].includes(s.documentType) || s.series?.startsWith('T') || s.series?.startsWith('EG'));
  }, [seriesList]);

  // Carga inicial y limpieza al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setItems([]);
      setErrorMsg('');
      setProductSearchTerm('');
      setProductPredictiveResults([]);
      setCustomerSearchResults([]);
      setIsExtractModalOpen(false);
      setIsProductModalOpen(false);
      fetchInitialData();
    } else {
      setFormData(getInitialFormData());
      setItems([]);
      setErrorMsg('');
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

  const getCarrierUpdatesForMode = (
    mode: string,
    carriersList: any[],
    vehiclesList: any[],
    driversList: any[],
    currentAgencyRuc?: string
  ) => {
    const activeCarriers = carriersList.filter((c: any) => c.isActive !== false);
    let matchedCarrier: any = null;
    if (mode === '02') {
      matchedCarrier = activeCarriers.find((c: any) => Boolean(c.isOwnFleet));
    } else {
      const publicCarriers = activeCarriers.filter((c: any) => !c.isOwnFleet);
      matchedCarrier =
        (currentAgencyRuc ? publicCarriers.find((c: any) => c.ruc === currentAgencyRuc) : null) ||
        publicCarriers[0] ||
        null;
    }

    if (!matchedCarrier) return null;

    if (mode === '02') {
      const carrierVehicles = (matchedCarrier.vehicles && matchedCarrier.vehicles.length > 0)
        ? matchedCarrier.vehicles
        : vehiclesList.filter((v: any) => v.carrierId === matchedCarrier.id && v.status !== 'INACTIVE');
      const carrierDrivers = (matchedCarrier.drivers && matchedCarrier.drivers.length > 0)
        ? matchedCarrier.drivers
        : driversList.filter((d: any) => d.carrierId === matchedCarrier.id && d.status !== 'INACTIVE');

      const firstVeh = carrierVehicles[0] || vehiclesList[0];
      const firstDrv = carrierDrivers[0] || driversList[0];

      return {
        carrierDocType: '6',
        carrierDocNumber: matchedCarrier.ruc || '',
        carrierName: matchedCarrier.name || '',
        carrierMtcNumber: matchedCarrier.mtcNumber || '',
        vehicleMtc: firstVeh?.mtcNumber || matchedCarrier.mtcNumber || '',
        vehiclePlate: firstVeh?.plate || '',
        vehicleBrand: firstVeh?.brand || '',
        vehicleTuce: firstVeh?.tuce || '',
        driverDocNumber: firstDrv?.docNumber || '',
        driverName: firstDrv?.name || '',
        driverLicenseNumber: firstDrv?.licenseNumber || '',
        authorizationEntity: matchedCarrier.authorizationEntity || '',
        authorizationNumber: matchedCarrier.authorizationNumber || '',
      };
    }

    return {
      carrierDocType: '6',
      carrierDocNumber: matchedCarrier.ruc || '',
      carrierName: matchedCarrier.name || '',
      carrierMtcNumber: matchedCarrier.mtcNumber || '',
      authorizationEntity: matchedCarrier.authorizationEntity || '',
      authorizationNumber: matchedCarrier.authorizationNumber || '',
    };
  };

  const fetchInitialData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [pRes, cRes, vRes, dRes, carRes] = await Promise.all([
        axios.get('/api/products', config).catch(() => ({ data: [] })),
        axios.get('/api/customers', config).catch(() => ({ data: [] })),
        axios.get('/api/vehicles', config).catch(() => ({ data: [] })),
        axios.get('/api/drivers', config).catch(() => ({ data: [] })),
        axios.get('/api/carriers', config).catch(() => ({ data: [] }))
      ]);
      const loadedVehicles = Array.isArray(vRes.data) ? vRes.data : [];
      const loadedDrivers = Array.isArray(dRes.data) ? dRes.data : [];
      const loadedCarriers = Array.isArray(carRes.data) ? carRes.data : [];
      setAllProducts(Array.isArray(pRes.data) ? pRes.data : []);
      setAllCustomers(Array.isArray(cRes.data) ? cRes.data : []);
      setAllVehicles(loadedVehicles);
      setAllDrivers(loadedDrivers);
      setAllCarriers(loadedCarriers);

      const defaultCarrierUpdates = getCarrierUpdatesForMode(
        formData.transportMode || '02',
        loadedCarriers,
        loadedVehicles,
        loadedDrivers,
        formData.agencyRuc
      );
      if (defaultCarrierUpdates) {
        setFormData((prev: any) => ({
          ...prev,
          ...(prev.carrierDocNumber ? {} : defaultCarrierUpdates),
        }));
      }

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

  const handleDeliveryWarehouseChange = (whId: string) => {
    const wh = warehouses.find(w => w.id.toString() === whId);
    if (!wh) {
      setFormData((prev: any) => ({ ...prev, deliveryWarehouseId: '' }));
      return;
    }
    const ubigeo = wh.ubigeo || '150101';
    const dId = ubigeo.substring(0, 2);
    const pId = ubigeo.substring(2, 4);
    const distId = ubigeo.substring(4, 6);
    const dept = DEPARTMENTS.find((d: any) => d.id === dId);
    const prov = ((PROVINCES as any)[dId] || []).find((p: any) => p.id === pId);
    const dist = ((DISTRICTS as any)[ubigeo.substring(0, 4)] || []).find((d: any) => d.id === distId);
    setFormData((prev: any) => ({
      ...prev,
      deliveryWarehouseId: whId,
      deliveryAddress: wh.address || prev.deliveryAddress,
      deliveryUbigeo: ubigeo,
      deliverySunatCode: wh.sunatCode || '0000',
      deliveryDepartment: dept ? dept.name.toUpperCase() : prev.deliveryDepartment,
      deliveryProvince: prov ? prov.name.toUpperCase() : prev.deliveryProvince,
      deliveryDistrict: dist ? dist.name.toUpperCase() : prev.deliveryDistrict
    }));
  };

  // Helpers para Ubigeo de Punto de Partida (Origen) derivados de originUbigeo
  const originUbi = (formData.originUbigeo || '150101').padEnd(6, '0');
  const originDeptId = originUbi.substring(0, 2);
  const originProvId = originUbi.substring(2, 4);
  const originDistId = originUbi.substring(4, 6);
  const originAvailableProvinces = useMemo(() => (PROVINCES as any)[originDeptId] || [], [originDeptId]);
  const originAvailableDistricts = useMemo(() => (DISTRICTS as any)[`${originDeptId}${originProvId}`] || [], [originDeptId, originProvId]);

  const handleOriginDeptChange = (deptId: string) => {
    const provs = (PROVINCES as any)[deptId] || [];
    const firstProv = provs[0];
    const pId = firstProv ? firstProv.id : '01';
    const dists = (DISTRICTS as any)[`${deptId}${pId}`] || [];
    const firstDist = dists[0];
    const dId = firstDist ? firstDist.id : '01';
    setFormData((prev: any) => ({ ...prev, originUbigeo: `${deptId}${pId}${dId}` }));
  };

  const handleOriginProvChange = (provId: string) => {
    const dists = (DISTRICTS as any)[`${originDeptId}${provId}`] || [];
    const firstDist = dists[0];
    const dId = firstDist ? firstDist.id : '01';
    setFormData((prev: any) => ({ ...prev, originUbigeo: `${originDeptId}${provId}${dId}` }));
  };

  const handleOriginDistChange = (distId: string) => {
    setFormData((prev: any) => ({ ...prev, originUbigeo: `${originDeptId}${originProvId}${distId}` }));
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

  const handleAgencyChange = (agencyId: string, branchIdOverride?: string) => {
    const agency = shippingAgencies.find(a => a.id.toString() === agencyId);
    if (agency) {
      const chosenBranch = branchIdOverride
        ? agency.branches?.find((b: any) => b.id.toString() === branchIdOverride)
        : (agency.branches?.find((b: any) => b.isMain) || agency.branches?.[0]);
      setFormData((prev: any) => ({
        ...prev,
        shippingAgencyId: agencyId,
        shippingBranchId: chosenBranch?.id?.toString() || '',
        agencyRuc: agency.ruc || '',
        agencyAddress: chosenBranch?.address || agency.address || agency.legalAddress || '',
        ...(prev.transportMode === '01' ? {
          carrierDocType: '6',
          carrierDocNumber: agency.ruc || prev.carrierDocNumber,
          carrierName: agency.name || prev.carrierName,
          carrierMtcNumber: agency.mtcNumber || prev.carrierMtcNumber
        } : {})
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        shippingAgencyId: '',
        shippingBranchId: '',
        agencyRuc: '',
        agencyAddress: ''
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
      if (extractDocTypeFilter === 'INVOICES') {
        if (doc.type !== '01' && doc.type !== '03') return false;
      } else if (extractDocTypeFilter !== 'ALL' && doc.type !== extractDocTypeFilter) {
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

      // Determinar ubigeo y localización de destino (desde doc, cliente registrado o dirección destino)
      const matchedCustomer = allCustomers.find(
        (c: any) =>
          (doc.customerId && String(c.id) === String(doc.customerId)) ||
          (docItem.customerDoc && c.docNumber === docItem.customerDoc)
      );

      let parsedDept = doc.department || matchedCustomer?.department || doc.customerCity || '';
      let parsedProv = doc.province || matchedCustomer?.province || '';
      let parsedDist = doc.district || matchedCustomer?.district || '';
      const rawUbiCode = doc.ubigeo || doc.deliveryUbigeo || matchedCustomer?.ubigeo || '';

      if ((!parsedDept || !parsedProv || !parsedDist) && docItem.destination) {
        const parts = String(docItem.destination).split(' - ').map((s: string) => s.trim()).filter(Boolean);
        if (parts.length >= 4) {
          parsedDept = parsedDept || parts[parts.length - 3];
          parsedProv = parsedProv || parts[parts.length - 2];
          parsedDist = parsedDist || parts[parts.length - 1];
        }
      }

      const normStr = (v: string) =>
        String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

      let ubi = resolveUbigeoInfo({
        ubigeo: rawUbiCode || undefined,
        department: parsedDept || undefined,
        province: parsedProv || undefined,
        district: parsedDist || undefined,
      });

      // Fallback si el distrito en dirección omite artículo (ej. "BANDA DE SHILCAYO" vs "LA BANDA DE SHILCAYO")
      if (ubi.deptId && ubi.provId && parsedDist) {
        const dists = DISTRICTS[ubi.deptId + ubi.provId] || [];
        const targetNorm = normStr(parsedDist);
        const exactDist = dists.find((d: any) => normStr(d.name) === targetNorm);
        if (!exactDist) {
          const partialDist = dists.find((d: any) =>
            normStr(d.name).includes(targetNorm) || targetNorm.includes(normStr(d.name))
          );
          if (partialDist) {
            ubi = {
              ...ubi,
              distId: partialDist.id,
              district: partialDist.name.toUpperCase(),
              ubigeo: ubi.deptId + ubi.provId + partialDist.id,
            };
          }
        }
      }

      const rawDept = ubi.department || 'LIMA';
      const rawProv = ubi.province || 'LIMA';
      const rawDist = ubi.district || 'LIMA';
      const derivedUbigeo = ubi.ubigeo || '150101';

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
        relatedDocDate: doc.issueDate || doc.date || doc.createdAt || prev.relatedDocDate || '',

        // Carga
        totalWeight: calculatedWeight > 0 ? parseFloat(calculatedWeight.toFixed(2)) : 1.0,
        totalPackages: newItems.length || 1,
        notes: `Traslado de mercadería según ${docItem.typeLabel} ${docItem.docNumber}. ${doc.observation || doc.notes || ''}`.trim()
      }));

      // Sincronizar almacén si aplica
      if (doc.warehouseId) {
        handleWarehouseChange(doc.warehouseId.toString());
      }

      // Sincronizar agencia si aplica (directa del doc, o desde el pedido/cotización asociado a la factura)
      const linkedOrder = doc.order || (doc.orderId ? (allOrders.find((o: any) => o.id === doc.orderId) || orders.find((o: any) => o.id === doc.orderId)) : null);
      const linkedQuotation = linkedOrder?.quotationId ? quotations.find((q: any) => q.id === linkedOrder.quotationId) : null;
      const sourceAgencyId = doc.agencyId || doc.shippingAgencyId || linkedOrder?.agencyId || linkedQuotation?.agencyId;
      const sourceBranchId = doc.branchId || doc.shippingBranchId || linkedOrder?.branchId || linkedQuotation?.branchId;
      if (sourceAgencyId) {
        handleAgencyChange(sourceAgencyId.toString(), sourceBranchId ? sourceBranchId.toString() : undefined);
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

  const getOriginStockInfo = (p: any) => {
    const records = Array.isArray(p?.stockRecords) ? p.stockRecords : [];
    const whId = formData.originWarehouseId ? String(formData.originWarehouseId) : '';
    const excludedTypes = ['TRANSITORIO', 'DESPACHO', 'COMPROBANTES', 'SISTEMA'];
    const matching = records.filter((s: any) => {
      if (Number(s.quantity) <= 0) return false;
      if (whId) return String(s.warehouseId) === whId;
      return !excludedTypes.includes((s.warehouse?.type || '').toUpperCase());
    });
    const totalStock = matching.reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0);
    const lots = matching.map((s: any) => ({
      lotNumber: s.lotNumber || '',
      expiryDate: s.expiryDate || null,
      quantity: Number(s.quantity) || 0,
      zoneName: s.zone?.name || ''
    }));
    const unitLabel = p?.package?.symbol || p?.subPackage?.symbol || p?.unit?.symbol || 'UND';
    return { totalStock, lots, unitLabel };
  };

  const addProductToItems = (p: any) => {
    const uWeight = p.weight ? parseFloat(p.weight) : 0.5;
    const { lots, unitLabel } = getOriginStockInfo(p);
    const firstLot = lots.find((l: any) => l.lotNumber) || lots[0];
    const existingIdx = items.findIndex(it => it.productId === p.id && (it.lotNumber || '') === (firstLot?.lotNumber || ''));
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
          unitMeasure: unitLabel || p.unit?.symbol || 'NIU',
          unitWeight: uWeight,
          totalWeight: uWeight,
          lotNumber: firstLot?.lotNumber || null,
          expiryDate: firstLot?.expiryDate || null
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
    if (formData.transferReason === '04') {
      if (!formData.originWarehouseId || !formData.deliveryWarehouseId) {
        setErrorMsg('Normativa SUNAT: En traslados entre establecimientos (Motivo 04), debe seleccionar Almacén de Partida y Almacén de Llegada.');
        return;
      }
      if (String(formData.originWarehouseId) === String(formData.deliveryWarehouseId)) {
        setErrorMsg('Normativa SUNAT: El Almacén de Llegada debe ser distinto al Almacén de Partida.');
        return;
      }
      const oCode = String(formData.originSunatCode || '').trim();
      const dCode = String(formData.deliverySunatCode || '').trim();
      if (!/^\d{4}$/.test(oCode) || !/^\d{4}$/.test(dCode)) {
        setErrorMsg('Normativa SUNAT: En traslados entre establecimientos (Motivo 04), ambos puntos deben tener Código de Establecimiento SUNAT de 4 dígitos.');
        return;
      }
      if (oCode === dCode && formData.originAddress.trim().toUpperCase() === formData.deliveryAddress.trim().toUpperCase()) {
        setErrorMsg('Normativa SUNAT: En traslados entre establecimientos (Motivo 04), el Punto de Llegada debe ser distinto al Punto de Partida.');
        return;
      }
    }
    if (formData.originWarehouseId) {
      for (const it of items) {
        const prod = allProducts.find(p => p.id === it.productId);
        if (prod) {
          const { lots, totalStock } = getOriginStockInfo(prod);
          const matchingLot = it.lotNumber ? lots.find((l: any) => l.lotNumber === it.lotNumber) : null;
          const avail = matchingLot ? matchingLot.quantity : totalStock;
          if ((parseFloat(it.quantity) || 0) > avail) {
            setErrorMsg(`Stock insuficiente en almacén de partida para "${it.description}"${it.lotNumber ? ` (Lote: ${it.lotNumber})` : ''}. Disponible: ${avail}, Solicitado: ${it.quantity}.`);
            return;
          }
        }
      }
    }
    if (formData.transportMode === '02' && !formData.vehicleCategoryM1OrL) {
      if (!formData.vehiclePlate?.trim()) {
        setErrorMsg('Para Transporte Privado debe indicar la Placa del Vehículo');
        return;
      }
      if (!formData.driverDocNumber?.trim() || !formData.driverName?.trim()) {
        setErrorMsg('Para Transporte Privado debe indicar el DNI y Nombre del Conductor');
        return;
      }
    }
    if (formData.transportMode === '01') {
      if (!/^\d{11}$/.test(String(formData.carrierDocNumber || '').trim())) {
        setErrorMsg('Normativa SUNAT (Transporte Público): Debe ingresar un RUC válido de 11 dígitos numéricos para la empresa transportista');
        return;
      }
      if (!formData.carrierName?.trim()) {
        setErrorMsg('Normativa SUNAT (Transporte Público): Debe ingresar la Razón Social de la empresa transportista');
        return;
      }
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
                  GRM
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
                    const descMap: Record<string, string> = {
                      '01': 'VENTA',
                      '02': 'COMPRA',
                      '03': 'VENTA CON ENTREGA A TERCEROS',
                      '04': 'TRASLADO ENTRE ESTABLECIMIENTOS DE LA MISMA EMPRESA',
                      '05': 'CONSIGNACION',
                      '06': 'DEVOLUCION',
                      '07': 'RECOJO DE BIENES TRANSFORMADOS',
                      '08': 'IMPORTACION',
                      '09': 'EXPORTACION',
                      '13': 'OTROS',
                      '14': 'VENTA SUJETA A CONFIRMACION DEL COMPRADOR',
                      '17': 'TRASLADO DE BIENES PARA TRANSFORMACION',
                      '18': 'TRASLADO EMISOR ITINERANTE CP'
                    };
                    setFormData({
                      ...formData, 
                      transferReason: e.target.value,
                      transferReasonDescription: descMap[e.target.value] || 'VENTA'
                    });
                  }} 
                  className="h-7 border border-slate-300 rounded px-1.5 text-xs font-bold bg-white text-slate-800 truncate focus:border-blue-500 outline-none w-52"
                >
                  <option value="01">01 | VENTA</option>
                  <option value="02">02 | COMPRA</option>
                  <option value="03">03 | VENTA CON ENTREGA A TERCEROS</option>
                  <option value="04">04 | TRASLADO ENTRE ESTABLECIMIENTOS</option>
                  <option value="05">05 | CONSIGNACIÓN</option>
                  <option value="06">06 | DEVOLUCIÓN</option>
                  <option value="07">07 | RECOJO DE BIENES TRANSFORMADOS</option>
                  <option value="08">08 | IMPORTACIÓN</option>
                  <option value="09">09 | EXPORTACIÓN</option>
                  <option value="14">14 | VENTA SUJETA A CONFIRMACIÓN</option>
                  <option value="17">17 | TRASLADO PARA TRANSFORMACIÓN</option>
                  <option value="18">18 | EMISOR ITINERANTE CP</option>
                  <option value="13">13 | OTROS</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">Modalidad:</span>
                <select 
                  value={formData.transportMode} 
                  onChange={e => {
                    const newMode = e.target.value;
                    const carrierUpdates = getCarrierUpdatesForMode(
                      newMode,
                      allCarriers,
                      allVehicles,
                      allDrivers,
                      formData.agencyRuc
                    );
                    setFormData((prev: any) => ({
                      ...prev,
                      transportMode: newMode,
                      ...(carrierUpdates || { carrierDocNumber: '', carrierName: '', carrierMtcNumber: '' })
                    }));
                  }} 
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

            {/* FILA 3: Puntos de Partida y Llegada (Uniformes) */}
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
              
              {/* Punto de Partida (Origen) */}
              <div className="space-y-1.5 bg-slate-50/70 p-2 rounded border border-slate-200/80">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1 flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold text-blue-900 uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-700" /> Punto de Partida (Origen)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Almacén:</span>
                    <select 
                      value={formData.originWarehouseId} 
                      onChange={e => handleWarehouseChange(e.target.value)}
                      className="h-6 border border-blue-300 rounded px-1.5 text-[10px] font-bold bg-white text-blue-950 outline-none uppercase max-w-[165px]"
                    >
                      <option value="">-- SELECCIONAR --</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name.toUpperCase()} {w.isMain || w.isDefault ? '(PRINCIPAL)' : ''}
                        </option>
                      ))}
                    </select>
                    <span className="text-[9px] font-bold text-blue-900 uppercase">Cód. SUNAT:</span>
                    <input 
                      type="text" 
                      maxLength={4}
                      value={formData.originSunatCode || '0000'} 
                      onChange={e => setFormData({...formData, originSunatCode: e.target.value.replace(/\D/g, '').slice(0, 4)})} 
                      className="h-6 w-12 border border-blue-300 rounded px-1 text-xs text-center font-mono font-bold bg-blue-50 text-blue-950 outline-none focus:border-blue-500" 
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
                </div>

                {/* Distribución de Ubigeo (Partida) */}
                <div className="flex items-center gap-1 flex-wrap">
                  <select 
                    value={originDeptId} 
                    onChange={e => handleOriginDeptChange(e.target.value)}
                    className="h-6 border border-slate-300 rounded px-1 text-[9px] font-bold bg-white text-slate-800 outline-none uppercase flex-1 min-w-[90px]"
                    title="Departamento de partida"
                  >
                    <option value="">DEPARTAMENTO</option>
                    {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                  </select>

                  <select 
                    value={originProvId} 
                    onChange={e => handleOriginProvChange(e.target.value)}
                    disabled={!originDeptId}
                    className="h-6 border border-slate-300 rounded px-1 text-[9px] font-bold bg-white text-slate-800 outline-none uppercase flex-1 min-w-[90px] disabled:bg-slate-100"
                    title="Provincia de partida"
                  >
                    <option value="">PROVINCIA</option>
                    {originAvailableProvinces.map((p: any) => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                  </select>

                  <select 
                    value={originDistId} 
                    onChange={e => handleOriginDistChange(e.target.value)}
                    disabled={!originProvId}
                    className="h-6 border border-slate-300 rounded px-1 text-[9px] font-bold bg-white text-slate-800 outline-none uppercase flex-1 min-w-[100px] disabled:bg-slate-100"
                    title="Distrito de partida"
                  >
                    <option value="">DISTRITO</option>
                    {originAvailableDistricts.map((d: any) => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                  </select>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[8px] font-black text-blue-900 uppercase">UBIGEO:</span>
                    <input 
                      type="text" 
                      maxLength={6}
                      value={formData.originUbigeo || ''} 
                      onChange={e => setFormData({...formData, originUbigeo: e.target.value.replace(/\D/g, '').slice(0, 6)})} 
                      className="h-6 w-16 border border-blue-300 rounded px-1 text-xs text-center font-mono font-bold bg-blue-50 text-blue-950 outline-none focus:border-blue-500" 
                      placeholder="150101"
                      title="Código Ubigeo SUNAT de partida (6 dígitos)"
                    />
                  </div>
                </div>
              </div>

              {/* Punto de Llegada (Destino) */}
              <div className="space-y-1.5 bg-slate-50/70 p-2 rounded border border-slate-200/80">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1 flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase flex items-center gap-1">
                    <Compass className="w-3 h-3 text-emerald-700" /> Punto de Llegada (Destino)
                  </span>

                  <div className="flex items-center gap-1.5">
                    {formData.transferReason === '04' && (
                      <>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Almacén:</span>
                        <select
                          value={formData.deliveryWarehouseId || ''}
                          onChange={e => handleDeliveryWarehouseChange(e.target.value)}
                          className="h-6 border border-emerald-300 rounded px-1.5 text-[10px] font-bold bg-white text-emerald-950 outline-none uppercase max-w-[165px]"
                        >
                          <option value="">-- SELECCIONAR --</option>
                          {warehouses
                            .filter(w => w.id.toString() !== formData.originWarehouseId && !['TRANSITORIO', 'DESPACHO', 'COMPROBANTES', 'SISTEMA'].includes((w.type || '').toUpperCase()))
                            .map(w => (
                              <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>
                            ))}
                        </select>
                      </>
                    )}
                    <span className="text-[9px] font-bold text-emerald-900 uppercase">Cód. SUNAT:</span>
                    <input 
                      type="text" 
                      value={formData.deliverySunatCode || '0000'} 
                      onChange={e => setFormData({...formData, deliverySunatCode: e.target.value.replace(/\D/g, '').slice(0, 4)})} 
                      maxLength={4}
                      className="h-6 w-12 border border-emerald-300 rounded px-1 text-xs text-center font-mono font-bold bg-emerald-50 text-emerald-950 outline-none focus:border-emerald-500" 
                      placeholder="0000"
                      title="Código de Establecimiento Anexo SUNAT de llegada (4 dígitos)"
                    />
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

                {/* Distribución de Ubigeo (Llegada) */}
                <div className="flex items-center gap-1 flex-wrap">
                  <select 
                    value={currentDeptId} 
                    onChange={e => handleDepartmentChange(e.target.value)}
                    className="h-6 border border-slate-300 rounded px-1 text-[9px] font-bold bg-white text-slate-800 outline-none uppercase flex-1 min-w-[90px]"
                    title="Departamento de llegada"
                  >
                    <option value="">DEPARTAMENTO</option>
                    {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                  </select>

                  <select 
                    value={currentProvId} 
                    onChange={e => handleProvinceChange(e.target.value)}
                    disabled={!currentDeptId}
                    className="h-6 border border-slate-300 rounded px-1 text-[9px] font-bold bg-white text-slate-800 outline-none uppercase flex-1 min-w-[90px] disabled:bg-slate-100"
                    title="Provincia de llegada"
                  >
                    <option value="">PROVINCIA</option>
                    {availableProvinces.map((p: any) => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                  </select>

                  <select 
                    value={currentDistId} 
                    onChange={e => handleDistrictChange(e.target.value)}
                    disabled={!currentProvId}
                    className="h-6 border border-slate-300 rounded px-1 text-[9px] font-bold bg-white text-slate-800 outline-none uppercase flex-1 min-w-[100px] disabled:bg-slate-100"
                    title="Distrito de llegada"
                  >
                    <option value="">DISTRITO</option>
                    {availableDistricts.map((d: any) => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                  </select>

                  <div className="flex items-center gap-1 shrink-0">
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

            </div>

            {/* FILA 4: Datos del Transporte (Transportista + Datos Agencia Transporte + Indicadores SUNAT) */}
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs space-y-2 text-xs">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-2.5">
                {/* Bloque Izquierdo: Transportista / Vehículo / Conductor */}
                <div className="xl:col-span-8 bg-slate-50/70 p-2 rounded border border-slate-200/80 space-y-1.5">
                  <div className="text-[10px] font-bold text-blue-900 uppercase border-b border-slate-200 pb-0.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3 text-blue-700" />
                      {formData.transportMode === '01' ? 'Transportista (Transporte Público)' : 'Transportista (Transporte Privado)'}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                      <label className="flex items-center gap-1">
                        <span>Peso (Kg):</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.totalWeight ?? 0}
                          onChange={e => setFormData({ ...formData, totalWeight: e.target.value })}
                          className="h-5 w-16 border border-slate-300 rounded px-1 text-[11px] font-mono font-bold text-right bg-yellow-50 text-slate-800 outline-none"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span>Bultos:</span>
                        <input
                          type="number"
                          min="0"
                          value={formData.totalPackages ?? 0}
                          onChange={e => setFormData({ ...formData, totalPackages: e.target.value })}
                          className="h-5 w-12 border border-slate-300 rounded px-1 text-[11px] font-bold text-center bg-white text-slate-800 outline-none"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Fila 1: RUC (+ Lupita) | Razón Social | Registro MTC */}
                  <div className="grid grid-cols-12 gap-1.5 items-center">
                    <div className="col-span-12 sm:col-span-4 flex items-center gap-1 relative">
                      <span className="text-[9px] font-bold text-slate-600 uppercase w-16 shrink-0">RUC:</span>
                      <div className="relative flex-1 flex items-center">
                        <input
                          type="text"
                          maxLength={11}
                          value={formData.carrierDocNumber || ''}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                            const matched = val.length === 11 ? allCarriers.find(c => c.ruc === val) : null;
                            if (matched) {
                              const firstVeh = matched.vehicles?.[0];
                              const firstDrv = matched.drivers?.[0];
                              setFormData((prev: any) => ({
                                ...prev,
                                carrierDocNumber: matched.ruc,
                                carrierName: matched.name,
                                carrierMtcNumber: matched.mtcNumber || prev.carrierMtcNumber,
                                vehicleMtc: firstVeh?.mtcNumber || matched.mtcNumber || prev.vehicleMtc,
                                vehiclePlate: firstVeh?.plate || prev.vehiclePlate,
                                vehicleBrand: firstVeh?.brand || prev.vehicleBrand,
                                vehicleTuce: firstVeh?.tuce || prev.vehicleTuce,
                                driverDocNumber: firstDrv?.docNumber || prev.driverDocNumber,
                                driverName: firstDrv?.name || prev.driverName,
                                driverLicenseNumber: firstDrv?.licenseNumber || prev.driverLicenseNumber
                              }));
                            } else {
                              setFormData({ ...formData, carrierDocNumber: val });
                            }
                          }}
                          className="h-6.5 w-full border border-slate-300 rounded px-1.5 pr-6 text-xs font-mono font-bold bg-white outline-none focus:border-blue-500"
                          placeholder="20126500603"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const ruc = String(formData.carrierDocNumber || '').trim();
                            const matched = ruc.length === 11 ? allCarriers.find(c => c.ruc === ruc) : null;
                            if (matched) {
                              const firstVeh = matched.vehicles?.[0];
                              const firstDrv = matched.drivers?.[0];
                              setFormData((prev: any) => ({
                                ...prev,
                                carrierDocNumber: matched.ruc,
                                carrierName: matched.name,
                                carrierMtcNumber: matched.mtcNumber || prev.carrierMtcNumber,
                                vehicleMtc: firstVeh?.mtcNumber || matched.mtcNumber || prev.vehicleMtc,
                                vehiclePlate: firstVeh?.plate || prev.vehiclePlate,
                                vehicleBrand: firstVeh?.brand || prev.vehicleBrand,
                                vehicleTuce: firstVeh?.tuce || prev.vehicleTuce,
                                driverDocNumber: firstDrv?.docNumber || prev.driverDocNumber,
                                driverName: firstDrv?.name || prev.driverName,
                                driverLicenseNumber: firstDrv?.licenseNumber || prev.driverLicenseNumber
                              }));
                              setShowCarrierLookup(false);
                              return;
                            }
                            if (ruc.length === 11) {
                              setIsCarrierConsulting(true);
                              try {
                                const res = await axios.get(`/api/consult/ruc/${ruc}`, { headers: { Authorization: `Bearer ${token}` } });
                                if (res.data) {
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    carrierName: (res.data.razonSocial || res.data.nombre || prev.carrierName || '').toUpperCase()
                                  }));
                                }
                              } catch {
                                setShowCarrierLookup(prev => !prev);
                              } finally {
                                setIsCarrierConsulting(false);
                              }
                            } else {
                              setShowCarrierLookup(prev => !prev);
                            }
                          }}
                          className="absolute right-1 text-slate-400 hover:text-blue-700 cursor-pointer"
                          title="Buscar transportista o consultar SUNAT"
                        >
                          {isCarrierConsulting ? <RefreshCw className="w-3 h-3 animate-spin text-blue-600" /> : <Search className="w-3 h-3" />}
                        </button>
                      </div>

                      {showCarrierLookup && (
                        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-2xl z-70 max-h-52 overflow-y-auto">
                          <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase">
                            <span>Transportistas Registrados</span>
                            <button type="button" onClick={() => setShowCarrierLookup(false)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          {allCarriers.length > 0 ? allCarriers.map(c => (
                            <div
                              key={c.id}
                              onClick={() => {
                                const firstVeh = c.vehicles?.[0];
                                const firstDrv = c.drivers?.[0];
                                setFormData((prev: any) => ({
                                  ...prev,
                                  carrierDocNumber: c.ruc,
                                  carrierName: c.name,
                                  carrierMtcNumber: c.mtcNumber || prev.carrierMtcNumber,
                                  vehicleMtc: firstVeh?.mtcNumber || c.mtcNumber || prev.vehicleMtc,
                                  vehiclePlate: firstVeh?.plate || prev.vehiclePlate,
                                  vehicleBrand: firstVeh?.brand || prev.vehicleBrand,
                                  vehicleTuce: firstVeh?.tuce || prev.vehicleTuce,
                                  driverDocNumber: firstDrv?.docNumber || prev.driverDocNumber,
                                  driverName: firstDrv?.name || prev.driverName,
                                  driverLicenseNumber: firstDrv?.licenseNumber || prev.driverLicenseNumber
                                }));
                                setShowCarrierLookup(false);
                              }}
                              className="px-2.5 py-1.5 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                            >
                              <div className="text-[11px] font-bold text-slate-800 truncate">{c.name}</div>
                              <div className="text-[10px] font-mono text-slate-500">RUC: {c.ruc}</div>
                            </div>
                          )) : (
                            <div className="p-3 text-center text-[11px] text-slate-400">No hay transportistas registrados.</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="col-span-12 sm:col-span-5 flex items-center gap-1">
                      <span className="text-[9px] font-bold text-slate-600 uppercase shrink-0">Razón Social:</span>
                      <input
                        type="text"
                        value={formData.carrierName || ''}
                        onChange={e => setFormData({ ...formData, carrierName: e.target.value.toUpperCase() })}
                        className="h-6.5 w-full border border-slate-300 rounded px-1.5 text-xs font-bold uppercase bg-white outline-none focus:border-blue-500"
                        placeholder="RAZÓN SOCIAL DEL TRANSPORTISTA"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-3 flex items-center gap-1">
                      <span className="text-[9px] font-bold text-slate-600 uppercase shrink-0">Reg. MTC:</span>
                      <input
                        type="text"
                        value={(formData.transportMode === '01' ? formData.carrierMtcNumber : formData.vehicleMtc) || ''}
                        onChange={e => {
                          const val = e.target.value.toUpperCase();
                          setFormData({
                            ...formData,
                            ...(formData.transportMode === '01' ? { carrierMtcNumber: val } : { vehicleMtc: val })
                          });
                        }}
                        className="h-6.5 w-full border border-slate-300 rounded px-1.5 text-xs font-mono uppercase bg-white outline-none focus:border-blue-500"
                        placeholder="MTC"
                      />
                    </div>
                  </div>

                  {/* Fila 2 y 3 (Solo Transporte Privado 02) */}
                  {formData.transportMode !== '01' && (
                    <>
                      {/* Fila 2: Vehículos | Marca | Nro. de TUCE */}
                      <div className="grid grid-cols-12 gap-1.5 items-center">
                        <div className="col-span-12 sm:col-span-4 flex items-center gap-1">
                          <span className="text-[9px] font-bold text-slate-600 uppercase w-16 shrink-0">Vehículos:</span>
                          {allVehicles.length > 0 && (
                            <select
                              value={allVehicles.some(v => v.plate === formData.vehiclePlate) ? formData.vehiclePlate : ''}
                              onChange={e => {
                                const val = e.target.value;
                                if (!val) {
                                  setFormData((prev: any) => ({ ...prev, vehiclePlate: '' }));
                                  return;
                                }
                                const veh = allVehicles.find(v => v.plate === val);
                                setFormData((prev: any) => ({
                                  ...prev,
                                  vehiclePlate: val,
                                  vehicleBrand: veh?.brand ? String(veh.brand).toUpperCase() : prev.vehicleBrand,
                                  vehicleMtc: veh?.mtcNumber || prev.vehicleMtc,
                                  vehicleTuce: veh?.tuce || prev.vehicleTuce
                                }));
                              }}
                              className="h-6.5 flex-1 min-w-0 border border-blue-300 rounded px-1 text-xs font-bold bg-blue-50/80 text-blue-950 outline-none uppercase"
                              title="Seleccionar vehículo registrado"
                            >
                              <option value="">-- OTRO / MANUAL --</option>
                              {allVehicles.map(v => (
                                <option key={v.id} value={v.plate}>{v.plate}</option>
                              ))}
                            </select>
                          )}
                          {(!allVehicles.some(v => v.plate === formData.vehiclePlate) || allVehicles.length === 0) && (
                            <input
                              type="text"
                              value={formData.vehiclePlate || ''}
                              onChange={e => setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() })}
                              className="h-6.5 w-20 border border-blue-300 rounded px-1 text-xs font-mono font-bold uppercase bg-white text-blue-950 text-center outline-none"
                              placeholder="PLACA"
                            />
                          )}
                        </div>

                        <div className="col-span-6 sm:col-span-5 flex items-center gap-1">
                          <span className="text-[9px] font-bold text-slate-600 uppercase shrink-0">Marca:</span>
                          <input
                            type="text"
                            value={formData.vehicleBrand || ''}
                            onChange={e => setFormData({ ...formData, vehicleBrand: e.target.value.toUpperCase() })}
                            className="h-6.5 flex-1 border border-slate-300 rounded px-1.5 text-xs font-bold uppercase bg-white outline-none focus:border-blue-500"
                            placeholder="HYUNDAI"
                          />
                          <input
                            type="text"
                            value={formData.vehicleSecondaryPlate || ''}
                            onChange={e => setFormData({ ...formData, vehicleSecondaryPlate: e.target.value.toUpperCase() })}
                            className="h-6.5 w-20 border border-slate-300 rounded px-1 text-[10px] font-mono uppercase bg-white text-center outline-none"
                            placeholder="ACOPLADO"
                            title="Placa de acoplado (opcional)"
                          />
                        </div>

                        <div className="col-span-6 sm:col-span-3 flex items-center gap-1">
                          <span className="text-[9px] font-bold text-slate-600 uppercase shrink-0">Nro. TUCE:</span>
                          <input
                            type="text"
                            value={formData.vehicleTuce || ''}
                            onChange={e => setFormData({ ...formData, vehicleTuce: e.target.value.toUpperCase() })}
                            className="h-6.5 w-full border border-slate-300 rounded px-1.5 text-xs font-mono uppercase bg-white outline-none focus:border-blue-500"
                            placeholder="TUCE"
                          />
                        </div>
                      </div>

                      {/* Fila 3: Conductor Principal | DNI/Nombre (solo si es manual) | Brevete */}
                      <div className="grid grid-cols-12 gap-1.5 items-center">
                        <div className={`${allDrivers.some(d => d.name?.toUpperCase() === formData.driverName?.toUpperCase()) ? 'col-span-12 sm:col-span-9' : 'col-span-12 sm:col-span-4'} flex items-center gap-1`}>
                          <span className="text-[9px] font-bold text-slate-600 uppercase w-16 shrink-0">Conductor:</span>
                          {allDrivers.length > 0 ? (
                            <select
                              value={allDrivers.some(d => d.name?.toUpperCase() === formData.driverName?.toUpperCase()) ? formData.driverName : ''}
                              onChange={e => {
                                if (!e.target.value) {
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    driverName: '',
                                    driverDocNumber: '',
                                    driverLicenseNumber: ''
                                  }));
                                  return;
                                }
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
                              className="h-6.5 flex-1 min-w-0 border border-emerald-300 rounded px-1 text-xs font-bold bg-emerald-50/80 text-emerald-950 outline-none uppercase"
                              title="Seleccionar conductor registrado"
                            >
                              <option value="">-- OTRO / MANUAL --</option>
                              {allDrivers.map(d => (
                                <option key={d.id} value={d.name}>{d.name.toUpperCase()}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={formData.driverName || ''}
                              onChange={e => setFormData({ ...formData, driverName: e.target.value.toUpperCase() })}
                              className="h-6.5 flex-1 border border-slate-300 rounded px-1.5 text-xs font-bold uppercase bg-white outline-none"
                              placeholder="APELLIDOS Y NOMBRES"
                            />
                          )}
                        </div>

                        {!allDrivers.some(d => d.name?.toUpperCase() === formData.driverName?.toUpperCase()) && (
                          <div className="col-span-7 sm:col-span-5 flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-600 uppercase shrink-0">DNI:</span>
                            <div className="relative flex items-center w-24 shrink-0">
                              <input
                                type="text"
                                value={formData.driverDocNumber || ''}
                                onChange={e => setFormData({ ...formData, driverDocNumber: e.target.value })}
                                maxLength={11}
                                className="h-6.5 w-full border border-slate-300 rounded px-1.5 pr-5 text-xs font-mono font-bold bg-white text-center outline-none focus:border-emerald-500"
                                placeholder="DNI"
                              />
                              <button
                                type="button"
                                onClick={consultDriverSunat}
                                disabled={isDriverConsulting}
                                className="absolute right-1 text-slate-400 hover:text-emerald-700 cursor-pointer"
                                title="Consultar RENIEC"
                              >
                                {isDriverConsulting ? <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" /> : <Search className="w-3 h-3" />}
                              </button>
                            </div>
                            <input
                              type="text"
                              value={formData.driverName || ''}
                              onChange={e => setFormData({ ...formData, driverName: e.target.value.toUpperCase() })}
                              className="h-6.5 flex-1 min-w-0 border border-slate-300 rounded px-1.5 text-xs font-bold uppercase bg-white outline-none focus:border-emerald-500"
                              placeholder="APELLIDOS Y NOMBRES DEL CHOFER"
                            />
                          </div>
                        )}

                        <div className="col-span-5 sm:col-span-3 flex items-center gap-1">
                          <span className="text-[9px] font-bold text-slate-600 uppercase shrink-0">Brevete:</span>
                          <input
                            type="text"
                            value={formData.driverLicenseNumber || ''}
                            onChange={e => setFormData({ ...formData, driverLicenseNumber: e.target.value.toUpperCase() })}
                            className="h-6.5 w-full border border-slate-300 rounded px-1.5 text-xs font-mono font-bold uppercase bg-white text-center outline-none focus:border-emerald-500"
                            placeholder="BREVETE"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Bloque Derecho: Datos Agencia Transporte (siempre visible y editable) */}
                <div className="xl:col-span-4 bg-slate-50/70 p-2 rounded border border-slate-200/80 space-y-1.5 flex flex-col justify-between">
                  <div className="text-[10px] font-bold text-slate-700 uppercase border-b border-slate-200 pb-0.5 flex items-center justify-between">
                    <span>Datos Agencia Transporte</span>
                    {formData.shippingAgencyId && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 rounded border border-emerald-200">
                        Vinculada
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 flex flex-col justify-center">
                    <div className="grid grid-cols-12 gap-1.5 items-center">
                      <div className="col-span-7 flex items-center gap-1 min-w-0">
                        <span className="text-[9px] font-bold text-slate-600 uppercase shrink-0">Agencia:</span>
                        <select
                          value={formData.shippingAgencyId || ''}
                          onChange={e => handleAgencyChange(e.target.value)}
                          className="h-6.5 flex-1 min-w-0 border border-slate-300 rounded px-1.5 text-xs font-bold bg-white truncate focus:border-blue-500 outline-none uppercase"
                        >
                          <option value="">-- SELECCIONAR --</option>
                          {shippingAgencies.map(a => (
                            <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-5 flex items-center gap-1 min-w-0">
                        <span className="text-[9px] font-bold text-slate-600 uppercase shrink-0">RUC:</span>
                        <input
                          type="text"
                          value={formData.agencyRuc || ''}
                          onChange={e => setFormData({ ...formData, agencyRuc: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                          className="h-6.5 w-full border border-slate-300 rounded px-1.5 text-xs font-mono font-bold bg-white outline-none focus:border-blue-500"
                          placeholder="RUC Agencia"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-600 uppercase shrink-0">Dirección:</span>
                      <input
                        type="text"
                        value={formData.agencyAddress || ''}
                        onChange={e => setFormData({ ...formData, agencyAddress: e.target.value.toUpperCase() })}
                        className="h-6.5 flex-1 border border-slate-300 rounded px-1.5 text-xs bg-white uppercase outline-none focus:border-blue-500"
                        placeholder="Dirección de la agencia de transporte"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Indicadores Normativos SUNAT GRE */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 border-t border-slate-100 text-[10px] font-semibold text-slate-700">
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.returnEmptyContainers)}
                    onChange={e => setFormData({ ...formData, returnEmptyContainers: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#004A99] focus:ring-0"
                  />
                  <span>Retorno de vehículo con env./embalajes vacíos</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.transshipment)}
                    onChange={e => setFormData({ ...formData, transshipment: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#004A99] focus:ring-0"
                  />
                  <span>Realiza Transbordo</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.vehicleCategoryM1OrL)}
                    onChange={e => setFormData({ ...formData, vehicleCategoryM1OrL: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#004A99] focus:ring-0"
                  />
                  <span>Traslado de vehículo en categoría M1 o L</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.returnEmptyVehicle)}
                    onChange={e => setFormData({ ...formData, returnEmptyVehicle: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#004A99] focus:ring-0"
                  />
                  <span>Retorno de Vehículo Vacío</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.fullDamOrDsTransfer)}
                    onChange={e => setFormData({ ...formData, fullDamOrDsTransfer: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#004A99] focus:ring-0"
                  />
                  <span>Indicador Traslado Total DAM o DS</span>
                </label>
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
                      {productPredictiveResults.map(p => {
                        const { totalStock, lots, unitLabel } = getOriginStockInfo(p);
                        const lotSummary = lots
                          .filter((l: any) => l.lotNumber)
                          .map((l: any) => `${l.lotNumber} (${l.quantity})`)
                          .join(', ');
                        return (
                          <div 
                            key={p.id} 
                            onClick={() => addProductToItems(p)} 
                            className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex items-center justify-between border-b border-slate-100"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{p.name}</span>
                              <span className="text-[10px] font-mono text-slate-500">
                                Cód: {p.code || '-'} |{' '}
                                <strong className={totalStock > 0 ? 'text-emerald-700' : 'text-red-600'}>
                                  Stock Origen: {totalStock} {unitLabel}
                                </strong>
                                {lotSummary ? ` · Lotes: ${lotSummary}` : ''}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded shrink-0 ml-2">
                              {p.weight ? `${p.weight} Kg` : '0.5 Kg'}
                            </span>
                          </div>
                        );
                      })}
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
                          {(() => {
                            const prod = allProducts.find(p => p.id === it.productId);
                            const { lots } = prod ? getOriginStockInfo(prod) : { lots: [] };
                            const namedLots = lots.filter((l: any) => l.lotNumber);
                            if (namedLots.length > 0) {
                              return (
                                <select
                                  value={it.lotNumber || ''}
                                  onChange={e => {
                                    const chosen = namedLots.find((l: any) => l.lotNumber === e.target.value);
                                    updateItem(idx, 'lotNumber', e.target.value || null);
                                    if (chosen?.expiryDate) updateItem(idx, 'expiryDate', chosen.expiryDate);
                                  }}
                                  className="h-7 border border-blue-200 rounded px-1.5 text-[10px] font-mono font-bold bg-blue-50/50 text-blue-900 outline-none"
                                >
                                  {namedLots.map((l: any, lIdx: number) => (
                                    <option key={lIdx} value={l.lotNumber}>
                                      {l.lotNumber} ({l.quantity})
                                    </option>
                                  ))}
                                </select>
                              );
                            }
                            return it.lotNumber || '-';
                          })()}
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
                    <option value="INVOICES">FACTURA / BOLETA</option>
                    <option value="01">FACTURA (01)</option>
                    <option value="03">BOLETA (03)</option>
                    <option value="PED">PEDIDO (PED)</option>
                    <option value="COT">COTIZACIÓN (COT)</option>
                    <option value="ALL">TODOS LOS TIPOS</option>
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
