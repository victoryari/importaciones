import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Package, Save, Image as ImageIcon, Settings as SettingsIcon, LogOut, Trash2, X, CheckCircle, FileText, BarChart3, Star, ShoppingCart, Truck, DollarSign, User, MapPin, Hash } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ExchangeRateModule } from './admin/ExchangeRateModule';
import { LogisticsModule } from './admin/LogisticsModule';
import { QuotationModule } from './admin/QuotationModule';
import { ProductModule } from './admin/ProductModule';
import { OrderModule } from './admin/OrderModule';
import { InventoryModule } from './admin/InventoryModule';
import { CustomerModule } from './admin/CustomerModule';
import { DashboardModule } from './admin/DashboardModule';
import { SellerModule } from './admin/SellerModule';
import { WarehouseModule } from './admin/WarehouseModule';
import { SeriesModule } from './admin/SeriesModule';
import { CustomerForm } from './admin/forms/CustomerForm';
import { ProductForm } from './admin/forms/ProductForm';
import { QuotationForm } from './admin/forms/QuotationForm';
import { SimpleForm } from './admin/forms/SimpleForm';
import { SellerForm } from './admin/forms/SellerForm';
import { AgencyForm } from './admin/forms/AgencyForm';
import { SeriesForm } from './admin/forms/SeriesForm';
import { WarehouseForm } from './admin/forms/WarehouseForm';
import axios from 'axios';
import { getDeptId, getProvId, getDistId } from '../lib/ubigeoData';

// --- Interfaces Globales Estrictas ---
interface Category { id: number; name: string; slug: string; image?: string; isFeatured: boolean; _count?: { products: number }; }
interface Brand { id: number; name: string; logo?: string; _count?: { products: number }; }
interface Unit { id: number; name: string; symbol: string; }
interface Product { id: number; code?: string; name: string; slug: string; weight?: string; description?: string; features?: string; sanitaryRegister?: string; certificate?: string; igv: number; costPrice: number; salePrice: number; minSalePrice?: number; maxSalePrice?: number; stock: number; images?: string[]; isActive: boolean; categoryId: number; category?: { name: string }; brandId?: number; brand?: { name: string }; unitId?: number; unit?: { name: string; symbol: string }; }
interface Order { id: number; customerName: string; customerEmail?: string; customerPhone: string; totalAmount: number; status: string; createdAt: string; items: any[]; paymentStatus: string; }
interface Customer { id: number; code?: string; name: string; personType: string; docType: string; docNumber: string; address?: string; phone?: string; email?: string; country: string; department?: string; province?: string; district?: string; firstName?: string; lastName?: string; }
interface Quotation { id: number; customerName: string; totalAmount: number; status: string; createdAt: string; items: any[]; exchangeRate: number; docSeries?: string; docNumber?: string; customerDocNumber?: string; customerPhone?: string; currency?: string; }

export default function Admin() {
  const { token, logout, user } = useAuth();
  
  // Estados de Datos
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shippingAgencies, setShippingAgencies] = useState<any[]>([]);
  const [shippingZones, setShippingZones] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [sunatCurrencies, setSunatCurrencies] = useState<any[]>([]);
  const [sunatPaymentConditions, setSunatPaymentConditions] = useState<any[]>([]);
  const [sunatOperationTypes, setSunatOperationTypes] = useState<any[]>([]);
  const [sunatIgvAffectations, setSunatIgvAffectations] = useState<any[]>([]);
  const [sunatDocTypes, setSunatDocTypes] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Estados de UI
  const [view, setView] = useState<'dashboard' | 'products' | 'categories' | 'brands' | 'units' | 'ads' | 'orders' | 'settings' | 'inventory' | 'customers' | 'quotations' | 'exchange-rates' | 'logistics' | 'sellers' | 'warehouses' | 'series'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isSimpleModalOpen, setIsSimpleModalOpen] = useState(false);
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [simpleModalType, setSimpleModalType] = useState<'categories' | 'brands' | 'units' | 'warehouses'>('categories');
  const [logisticsTab, setLogisticsTab] = useState<'agencies' | 'zones'>('agencies');

  // Formularios iniciales
  const initialSellerData = { name: '', dni: '', phone: '', email: '', isActive: true };
  const initialProductData = { code: '', name: '', slug: '', weight: '', description: '', features: '', sanitaryRegister: '', certificate: '', igv: 18, costPrice: 0, salePrice: 0, minSalePrice: 0, maxSalePrice: 0, stock: 0, categoryId: '', brandId: '', unitId: '', images: [], isActive: true, isFeatured: false };
  const initialQuotationData = { 
    igvPercent: 18,
    docType: 'COT',
    docSeries: '0005',
    docNumber: '',
    internalCode: '',
    date: new Date().toISOString().split('T')[0], 
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    exchangeRate: 1.0,
    ruc: '',
    razonSocial: '',
    address: '',
    customerId: '', 
    sellerId: '',
    paymentCondition: 'CONTADO',
    currency: '1', 
    sellerName: user?.name || '',
    observation: '',
    globalDiscount: 0,
    billingStatus: 'SIN FACTURAR',
    agencyId: '',
    purchaseOrder: '',
    requirementNumber: '',
    priceIncludesIgv: true,
    operationType: '10',
    pickupPlace: '',
    flete: 0,
    includeIgv: true 
  };
  const initialCustomerData = { personType: 'NATURAL', docType: 'DNI', docNumber: '', firstName: '', secondName: '', lastName: '', surname: '', name: '', email: '', phone: '', address: '', country: 'PERU', department: '', province: '', district: '' };
  const initialSimpleData = { name: '', slug: '', image: '', logo: '', symbol: '' };
  const initialAgencyData = { name: '', ruc: '', address: '', legalAddress: '', phone: '', email: '', contact: '', department: '', province: '', district: '', zoneId: '', isActive: true, branches: [] };
  const initialSeriesData = { documentType: 'COT', series: '', currentNumber: 0, warehouseId: '', isActive: true };
  const initialWarehouseData = { code: '', name: '', commercialName: '', address: '', ruc: '', ubigeo: '', observation: '', phones: '', type: '', validateStock: true, isActive: true, floors: [] };

  const [agencyFormData, setAgencyFormData] = useState(initialAgencyData);
  const [warehouseFormData, setWarehouseFormData] = useState(initialWarehouseData);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);

  const [sellerFormData, setSellerFormData] = useState(initialSellerData);
  const [productFormData, setProductFormData] = useState(initialProductData);
  const [customerFormData, setCustomerFormData] = useState(initialCustomerData);
  const [seriesFormData, setSeriesFormData] = useState(initialSeriesData);
  const [quotationFormData, setQuotationFormData] = useState<any>(initialQuotationData);
  const [simpleFormData, setSimpleFormData] = useState(initialSimpleData);
  const [quotationItems, setQuotationItems] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [quotationTotal, setQuotationTotal] = useState(0);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const total = quotationItems.reduce((acc, item) => acc + (item.price * item.quantity * (1 - (item.discount || 0) / 100)), 0);
    setQuotationTotal(total);
  }, [quotationItems]);

  useEffect(() => {
    if (view === 'quotations' && isQuotationModalOpen && quotationFormData.date) {
      axios.get(`/api/exchange-rates/fetch-by-date/${quotationFormData.date}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (res.data) setQuotationFormData((prev: any) => ({ ...prev, exchangeRate: res.data.sell_rate }));
        }).catch(err => console.error("TC by date error:", err));
    }
  }, [quotationFormData.date, isQuotationModalOpen, view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoints = [
        '/api/categories', '/api/brands', '/api/units', '/api/products', 
        '/api/orders', '/api/quotations', '/api/customers', '/api/shipping-agencies', 
        '/api/shipping-zones', '/api/sunat/document_type', '/api/stats', '/api/exchange-rates',
        '/api/sellers', '/api/warehouses', '/api/sunat/currency', 
        '/api/sunat/payment_condition', '/api/sunat/operation_type', '/api/sunat/igv_affectation_type', '/api/sunat/doc_type', '/api/series'
      ];
      const responses = await Promise.all(endpoints.map(url => axios.get(url, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))));
      setCategories(responses[0].data); setBrands(responses[1].data); setUnits(responses[2].data); setProducts(responses[3].data); setOrders(responses[4].data); setQuotations(responses[5].data); setCustomers(responses[6].data); setShippingAgencies(responses[7].data); setShippingZones(responses[8].data); setDocumentTypes(responses[9].data); setStats(responses[10].data); setExchangeRates(responses[11].data);
      const warehousesData = responses[13].data;
      setWarehouses(warehousesData);
      
      // Actualizar datos del modal de almacén si está abierto
      if (isWarehouseModalOpen && (warehouseFormData as any)?.id) {
        const current = warehousesData.find((w: any) => w.id === (warehouseFormData as any).id);
        if (current) setWarehouseFormData(current);
      }
      
      setSunatCurrencies(responses[14].data);
      setSunatPaymentConditions(responses[15].data);
      setSunatOperationTypes(responses[16].data);
      setSunatIgvAffectations(responses[17].data);
      setSunatDocTypes(responses[18].data);
      setSeries(responses[19].data);
      
      const todayRate = responses[11].data[0]?.sell_rate;
      if (todayRate) setQuotationFormData((prev: any) => ({ ...prev, exchangeRate: todayRate }));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };
  const handleFileUpload = async (file: File) => {
    const fd = new FormData(); fd.append('image', file);
    const res = await axios.post('/api/upload', fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
    return res.data.url;
  };

  const openForm = (type: string, item: any = null) => {
    setEditingItem(item);
    if (type === 'products') { setProductFormData(item || initialProductData); setIsProductModalOpen(true); }
    else if (['categories', 'brands', 'units'].includes(type)) { 
      setSimpleModalType(type as any);
      setSimpleFormData(item || initialSimpleData);
      setIsSimpleModalOpen(true); 
    }
    else if (type === 'warehouses') {
      setWarehouseFormData(item || initialWarehouseData);
      setIsWarehouseModalOpen(true);
    }
    else if (type === 'customers') { 
      setCustomerFormData(item || initialCustomerData); 
      setIsCustomerModalOpen(true); 
    }
    else if (type === 'sellers') { setSellerFormData(item || initialSellerData); setIsSellerModalOpen(true); }
    else if (type === 'shipping-agencies') {
      setAgencyFormData(item || initialAgencyData);
      setIsAgencyModalOpen(true);
    }
    else if (type === 'series') {
      setSeriesFormData(item || initialSeriesData);
      setIsSeriesModalOpen(true);
    }
    else if (type === 'quotations') { 
      if (item) {
        setQuotationFormData({
          ...item,
          docType: type === 'quotations' ? 'COT' : (type === 'orders' ? 'PED' : item.docType),
          date: item.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          expiryDate: item.dueDate?.split('T')[0] || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        setQuotationItems(item.items?.map((i: any) => ({
          productId: i.productId,
          name: i.product?.name || 'Producto',
          code: i.product?.code || '',
          price: i.price,
          quantity: i.quantity,
          discount: i.discount || 0,
          unit: i.product?.unit
        })) || []);
      } else {
        setQuotationFormData({
          ...initialQuotationData,
          docType: type === 'quotations' ? 'COT' : (type === 'orders' ? 'PED' : 'COT')
        });
        setQuotationItems([]);
      }
      setIsQuotationModalOpen(true); 
    }
  };

  const handleDelete = async (type: string, id: number | string) => {
    if (!confirm('¿Seguro que desea eliminar?')) return;
    try { 
      await axios.delete(`/api/${type}/${id}`, { headers: { Authorization: `Bearer ${token}` } }); 
      showSuccess('Eliminado'); 
      fetchData(); 
    } catch (err: any) { 
      alert(err.response?.data?.error || 'Error al eliminar'); 
    }
  };

  const handleSubmitSimple = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const url = editingItem ? `/api/${simpleModalType}/${editingItem.id}` : `/api/${simpleModalType}`;
      await axios({ method: editingItem ? 'PUT' : 'POST', url, data: simpleFormData, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Guardado correctamente'); setIsSimpleModalOpen(false); fetchData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmitProduct = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const url = editingItem ? `/api/products/${editingItem.id}` : '/api/products';
      await axios({ method: editingItem ? 'PUT' : 'POST', url, data: productFormData, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Guardado'); setIsProductModalOpen(false); fetchData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmitSeller = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const url = editingItem ? `/api/sellers/${editingItem.id}` : '/api/sellers';
      await axios({ method: editingItem ? 'PUT' : 'POST', url, data: sellerFormData, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Vendedor guardado'); setIsSellerModalOpen(false); fetchData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmitWarehouse = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const url = editingItem ? `/api/warehouses/${editingItem.id}` : '/api/warehouses';
      const res = await axios({ method: editingItem ? 'PUT' : 'POST', url, data: warehouseFormData, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Almacén guardado'); 
      if (!editingItem) {
        setIsWarehouseModalOpen(false);
      } else {
        // Actualizar el form data con la respuesta (que incluye IDs nuevos)
        setWarehouseFormData(res.data);
      }
      fetchData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmitAgency = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const url = editingItem ? `/api/shipping-agencies/${editingItem.id}` : '/api/shipping-agencies';
      await axios({ method: editingItem ? 'PUT' : 'POST', url, data: agencyFormData, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Agencia guardada'); setIsAgencyModalOpen(false); fetchData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmitQuotation = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const selectedCustomer = customers.find(c => c.id === parseInt(quotationFormData.customerId));
      const selectedSeller = sellers.find(s => s.id === parseInt(quotationFormData.sellerId));
      const payload = { 
        ...quotationFormData, 
        customerName: selectedCustomer ? (selectedCustomer.name || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`) : (quotationFormData.razonSocial || ''),
        customerDocNumber: selectedCustomer?.docNumber || quotationFormData.ruc || '',
        customerPhone: selectedCustomer?.phone || '',
        customerEmail: selectedCustomer?.email || '',
        customerAddress: selectedCustomer?.address || quotationFormData.address || '',
        customerDocType: selectedCustomer?.docType || (quotationFormData.ruc?.length === 11 ? 'RUC' : 'DNI'),
        sellerName: selectedSeller?.name || quotationFormData.sellerName,
        dueDate: quotationFormData.expiryDate,
        items: quotationItems, 
        totalAmount: quotationTotal 
      };
      const url = editingItem ? `/api/quotations/${editingItem.id}` : '/api/quotations';
      await axios({ method: editingItem ? 'PUT' : 'POST', url, data: payload, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Cotización guardada'); setIsQuotationModalOpen(false); fetchData();
    } catch (err: any) { 
      console.error(err);
      alert(err.response?.data?.error || 'Error al guardar la cotización'); 
    } finally { setLoading(false); }
  };

  const handleSubmitSeries = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const url = editingItem ? `/api/series/${editingItem.id}` : '/api/series';
      await axios({ method: editingItem ? 'PUT' : 'POST', url, data: seriesFormData, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Serie guardada'); setIsSeriesModalOpen(false); fetchData();
    } catch (err: any) { 
      console.error(err);
      alert(err.response?.data?.error || 'Error al guardar la serie'); 
    } finally { setLoading(false); }
  };

  const handleSubmitCustomer = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const url = editingItem ? `/api/customers/${editingItem.id}` : '/api/customers';
      const res = await axios({ method: editingItem ? 'PUT' : 'POST', url, data: customerFormData, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Guardado'); 
      setIsCustomerModalOpen(false); 
      await fetchData();
      
      // Si estamos en el modal de cotización, seleccionar automáticamente al nuevo cliente
      if (isQuotationModalOpen && !editingItem) {
        setQuotationFormData((prev: any) => ({
          ...prev,
          customerId: res.data.id.toString(),
          ruc: res.data.docNumber,
          razonSocial: res.data.name || `${res.data.firstName} ${res.data.lastName}`,
          address: res.data.address || ''
        }));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleConsultDocument = async () => {
    if (!customerFormData.docNumber) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/consult/${customerFormData.docType.toLowerCase()}/${customerFormData.docNumber.trim()}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = res.data;
      
      // La API devuelve el objeto directamente (ruc, razonSocial, nombres, etc.)
      if (d.ruc || d.dni || d.razonSocial || d.nombres || d.nombre_o_razon_social || d.success) {
        // Normalizar respuesta si viene envuelta en .data
        const data = d.data || d;
        
        if (customerFormData.docType === 'RUC') {
          const dName = data.departamento || data.department || '';
          const pName = data.provincia || data.province || '';
          const diName = data.distrito || data.district || '';
          
          const deptId = getDeptId(dName);
          const provId = getProvId(deptId, pName);
          const distId = getDistId(provId, diName);

          setCustomerFormData({ 
            ...customerFormData, 
            name: data.razonSocial || data.nombre_o_razon_social || '', 
            address: data.direccion || data.direccion_completa || '', 
            department: deptId,
            province: provId,
            district: distId
          });
        } else {
          // Para DNI, manejar camelCase y snake_case, y separar nombres
          const rawNames = data.nombres || '';
          const nameParts = rawNames.trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const secondName = nameParts.slice(1).join(' ') || '';
          
          const apePat = data.apellidoPaterno || data.apellido_paterno || '';
          const apeMat = data.apellidoMaterno || data.apellido_materno || '';
          
          const dName = data.departamento || data.department || '';
          const pName = data.provincia || data.province || '';
          const diName = data.distrito || data.district || '';
          
          const deptId = getDeptId(dName);
          const provId = getProvId(deptId, pName);
          const distId = getDistId(provId, diName);

          setCustomerFormData({ 
            ...customerFormData, 
            firstName: firstName,
            secondName: secondName,
            lastName: apePat,
            surname: apeMat,
            name: data.razonSocial || `${rawNames} ${apePat} ${apeMat}`.trim(),
            address: data.direccion || data.direccion_completa || '',
            department: deptId,
            province: provId,
            district: distId
          });
        }
        showSuccess('Datos recuperados correctamente');
      } else {
        alert('No se encontró información para el número ingresado');
      }
    } catch (err) { 
      console.error(err);
      alert('Error en el servicio de consulta. Verifique que el número de documento sea válido.');
    } finally { setLoading(false); }
  };

  const handleConsultForQuotation = async (type: string, number: string) => {
    try {
      const res = await axios.get(`/api/consult/${type.toLowerCase()}/${number}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = res.data;
      // Validar si la respuesta tiene datos válidos
      if (d && (d.ruc || d.dni || d.razonSocial || d.nombres || d.nombre_o_razon_social || d.success)) {
        return d.data || d;
      }
      return null;
    } catch (err) { 
      console.error("Consult error:", err);
      return null; 
    }
  };

  const handleQuickRegisterCustomer = async (data: any) => {
    setLoading(true);
    try {
      const res = await axios.post('/api/customers', data, { headers: { Authorization: `Bearer ${token}` } });
      await fetchData();
      setQuotationFormData((prev: any) => ({ ...prev, customerId: res.data.id.toString() }));
      showSuccess('Cliente registrado y seleccionado');
    } catch (err) { alert('Error al registrar'); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <AnimatePresence>{successMsg && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 right-10 z-50 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2"><CheckCircle className="w-5 h-5" /> <span className="font-bold">{successMsg}</span></motion.div>}</AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 space-y-2">
          <div className="px-4 py-4 mb-4 bg-blue-900 text-white rounded-3xl shadow-lg shadow-blue-100"><div className="flex items-center gap-3 mb-1"><div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">C</div><span className="font-bold text-lg">Panel Admin</span></div><p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest pl-11">{user?.name || 'Administrador'}</p></div>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Resumen' }, 
            { id: 'products', icon: Package, label: 'Productos' }, 
            { id: 'quotations', icon: FileText, label: 'Cotizaciones' }, 
            { id: 'orders', icon: ShoppingCart, label: 'Pedidos' }, 
            { id: 'inventory', icon: BarChart3, label: 'Almacén' }, 
            { id: 'logistics', icon: Truck, label: 'Logística' },
            { id: 'warehouses', icon: MapPin, label: 'Puntos Recojo' },
            { id: 'customers', icon: Star, label: 'Clientes' }, 
            { id: 'sellers', icon: User, label: 'Vendedores' },
            { id: 'exchange-rates', icon: DollarSign, label: 'T. Cambio' }, 
            { id: 'series', icon: Hash, label: 'Series' }, 
            { id: 'settings', icon: SettingsIcon, label: 'Ajustes' },
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id as any)} className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${view === item.id || (item.id === 'products' && ['categories', 'brands', 'units'].includes(view)) ? 'bg-blue-100 text-blue-900 font-bold scale-105 shadow-sm' : 'hover:bg-slate-100'}`}><item.icon className="w-5 h-5" /> {item.label}</button>
          ))}
          <div className="pt-8 mt-8 border-t border-slate-100"><button onClick={logout} className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-red-600 hover:bg-red-50 transition-colors"><LogOut className="w-5 h-5" />Cerrar Sesión</button></div>
        </aside>

        <main className="flex-1 min-w-0">
          {view === 'dashboard' && <DashboardModule stats={stats} onNavigate={(v: any) => setView(v)} />}
          {['products', 'categories', 'brands', 'units'].includes(view) && <ProductModule products={products} categories={categories} brands={brands} units={units} onDelete={(t,id)=>handleDelete(t,id)} onEdit={openForm} onNew={openForm} />}
          {view === 'quotations' && <QuotationModule quotations={quotations} onEdit={(q) => openForm('quotations', q)} onNew={() => openForm('quotations')} onDelete={(id) => handleDelete('quotations', id)} onConvertToOrder={() => {}} />}
          {view === 'orders' && <OrderModule orders={orders} onUpdateStatus={(id, s) => axios.put(`/api/orders/${id}/status`, {status:s}, {headers:{Authorization:`Bearer ${token}`}}).then(fetchData)} onDelete={(id) => handleDelete('orders', id)} onViewGuide={() => {}} onEdit={(o) => openForm('orders', o)} />}
          {view === 'inventory' && <InventoryModule products={products} onUpdateStock={(pid, s) => axios.put(`/api/products/${pid}/stock`, {stock:s}, {headers:{Authorization:`Bearer ${token}`}}).then(fetchData)} onEdit={(p) => openForm('products', p)} />}
          {view === 'customers' && <CustomerModule customers={customers} onEdit={(c) => openForm('customers', c)} onNew={() => openForm('customers')} onDelete={(id) => handleDelete('customers', id)} departments={[]} />}
          {view === 'exchange-rates' && <ExchangeRateModule token={token} exchangeRates={exchangeRates} onDelete={(id) => handleDelete('exchange-rates', id)} onSave={(d) => axios.post('/api/exchange-rates', d, {headers:{Authorization:`Bearer ${token}`}}).then(fetchData)} loading={loading} />}
          {view === 'logistics' && <LogisticsModule logisticsTab={logisticsTab} setLogisticsTab={setLogisticsTab} shippingAgencies={shippingAgencies} shippingZones={shippingZones} openEditModal={(item) => openForm(logisticsTab === 'agencies' ? 'shipping-agencies' : 'shipping-zones', item)} handleDelete={(t,id) => handleDelete(t,id)} />}
          {view === 'sellers' && <SellerModule sellers={sellers} onEdit={(s) => openForm('sellers', s)} onNew={() => openForm('sellers')} onDelete={(id) => handleDelete('sellers', id)} />}
          {view === 'warehouses' && <WarehouseModule warehouses={warehouses} onEdit={(w) => openForm('warehouses', w)} onNew={() => openForm('warehouses')} onDelete={(id) => handleDelete('warehouses', id)} />}
          {view === 'series' && <SeriesModule series={series} warehouses={warehouses} onEdit={(s) => openForm('series', s)} onNew={() => openForm('series')} onDelete={(id) => handleDelete('series', id)} />}
          
          <QuotationForm 
            isOpen={isQuotationModalOpen} 
            onClose={() => setIsQuotationModalOpen(false)} 
            onSubmit={handleSubmitQuotation} 
            formData={quotationFormData} 
            setFormData={setQuotationFormData} 
            editingItem={editingItem} 
            loading={loading} 
            customers={customers} 
            sellers={sellers}
            warehouses={warehouses}
            shippingAgencies={shippingAgencies}
            sunatCurrencies={sunatCurrencies}
            sunatPaymentConditions={sunatPaymentConditions}
            sunatOperationTypes={sunatOperationTypes}
            searchResults={searchResults} 
            handleSearchProduct={(q) => { if(q.length > 1) axios.get(`/api/products/search?q=${q}`, {headers:{Authorization:`Bearer ${token}`}}).then(r=>setSearchResults(r.data)) }} 
            quotationItems={quotationItems} 
            addQuotationItem={(p) => { if(!quotationItems.find(i=>i.productId===p.id)) setQuotationItems([...quotationItems, {productId:p.id, name:p.name, code:p.code, price:p.salePrice, quantity:1, discount:0, unit:p.unit}]); setSearchResults([]); }} 
            updateQuotationItem={(id, f, v) => setQuotationItems(quotationItems.map(i=>i.productId===id?{...i,[f]:v}:i))} 
            removeQuotationItem={(id) => setQuotationItems(quotationItems.filter(i=>i.productId!==id))} 
            quotationTotal={quotationTotal} 
            handleConsultCustomer={handleConsultForQuotation}
            handleQuickRegister={handleQuickRegisterCustomer}
            onOpenCustomerForm={(doc) => {
              setCustomerFormData({ 
                ...initialCustomerData, 
                docNumber: doc,
                docType: doc.length === 11 ? 'RUC' : 'DNI',
                personType: doc.length === 11 ? 'JURIDICA' : 'NATURAL'
              });
              setIsCustomerModalOpen(true);
            }}
            token={token}
            sunatIgvAffectations={sunatIgvAffectations}
            sunatDocTypes={sunatDocTypes}
          />
          <ProductForm isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSubmit={handleSubmitProduct} formData={productFormData} setFormData={setProductFormData} editingItem={editingItem} loading={loading} categories={categories} brands={brands} units={units} handleFileUpload={handleFileUpload} setLoading={setLoading} />
          <AgencyForm isOpen={isAgencyModalOpen} onClose={() => setIsAgencyModalOpen(false)} onSubmit={handleSubmitAgency} formData={agencyFormData} setFormData={setAgencyFormData} editingItem={editingItem} loading={loading} shippingZones={shippingZones} handleConsultDocument={handleConsultForQuotation} />
          <WarehouseForm isOpen={isWarehouseModalOpen} onClose={() => setIsWarehouseModalOpen(false)} onSubmit={handleSubmitWarehouse} formData={warehouseFormData} setFormData={setWarehouseFormData} loading={loading} token={token} refreshData={fetchData} />
          <CustomerForm isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} onSubmit={handleSubmitCustomer} formData={customerFormData} setFormData={setCustomerFormData} editingItem={editingItem} loading={loading} documentTypes={documentTypes} handleConsultDocument={handleConsultDocument} />
          <SellerForm isOpen={isSellerModalOpen} onClose={() => setIsSellerModalOpen(false)} onSubmit={handleSubmitSeller} formData={sellerFormData} setFormData={setSellerFormData} loading={loading} isEditing={!!editingItem} />
          <SimpleForm isOpen={isSimpleModalOpen} onClose={() => setIsSimpleModalOpen(false)} onSubmit={handleSubmitSimple} formData={simpleFormData} setFormData={setSimpleFormData} type={simpleModalType} loading={loading} handleFileUpload={handleFileUpload} />
          <SeriesForm 
            isOpen={isSeriesModalOpen}
            onClose={() => setIsSeriesModalOpen(false)}
            onSubmit={handleSubmitSeries}
            formData={seriesFormData}
            setFormData={setSeriesFormData}
            loading={loading}
            warehouses={warehouses}
          />
        </main>
      </div>
    </div>
  );
}
