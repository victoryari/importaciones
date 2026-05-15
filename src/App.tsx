import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CategorySection from './components/CategorySection';
import ProductGrid from './components/ProductGrid';
import CategoryCarousel from './components/CategoryCarousel';
import Footer from './components/Footer';
import { motion } from 'motion/react';
import { Truck, ShieldCheck, CreditCard, Clock } from 'lucide-react';
import Admin from './pages/Admin';
import Login from './pages/Login';
import CategoryPage from './pages/CategoryPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import CartDrawer from './components/CartDrawer';
import ScrollToTop from './components/ScrollToTop';


interface Ad {
  id: number;
  title: string;
  imageUrl: string;
  mobileImageUrl?: string;
  link: string;
  position: string;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="h-screen flex items-center justify-center font-bold text-2xl">Cargando sesión...</div>;
  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
}

import AllCategories from './pages/AllCategories';
import ProductsPage from './pages/Products';
import OffersPage from './pages/Offers';

function HomePage() {
  const [promoAd, setPromoAd] = useState<Ad | null>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetch('/api/ads').then(res => res.json()).then(data => {
      if (Array.isArray(data)) {
        const ad = data.find((a: Ad) => a.position === 'home-promotional');
        if (ad) setPromoAd(ad);
      }
    });
    fetch('/api/brands').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setBrands(data.slice(0, 5));
    });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Hero />
      
      {/* Features Bar */}
      <section className="bg-blue-900 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Truck, title: "Envío Nacional", desc: "A todo el Perú" },
              { icon: ShieldCheck, title: "Calidad Garantizada", desc: "Productos premium" },
              { icon: CreditCard, title: "Pago Seguro", desc: "Múltiples medios" },
              { icon: Clock, title: "Atención 24/7", desc: "Vía WhatsApp" },
            ].map((feature, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center md:items-start gap-3 text-center md:text-left text-white/90">
                <feature.icon className="w-8 h-8 text-blue-400" />
                <div>
                  <h4 className="font-bold text-sm">{feature.title}</h4>
                  <p className="text-xs text-white/60">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CategorySection />
      
      {/* Category Carousel + Ofertas */}
      <CategoryCarousel />

      <ProductGrid limit={8} />


      {/* Institutional Catalog Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2 space-y-6">
              <h2 className="text-4xl font-bold">Catálogos 2026</h2>
              <p className="text-slate-400 text-lg">
                Descarga nuestras guías completas de productos para negocios, restaurantes y hotelería. Encuentra todo lo que necesitas con precios especiales por volumen.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: "Vajillas Corona", file: "PDF 12MB" },
                  { name: "Menaje Industrial", file: "PDF 8MB" },
                  { name: "Cristalería Bar", file: "PDF 5MB" },
                  { name: "Hogar y Decoración", file: "PDF 15MB" },
                ].map((cat, i) => (
                  <div key={i} className="bg-white/10 p-4 rounded-xl border border-white/10 flex justify-between items-center group cursor-pointer hover:bg-white/20 transition-colors">
                    <div>
                      <h4 className="font-bold">{cat.name}</h4>
                      <span className="text-xs text-white/40">{cat.file}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Truck className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2 grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-12">
                <img src="https://images.unsplash.com/photo-1544991583-50027010a69a?q=80&w=400&h=600&fit=crop" className="rounded-2xl h-64 w-full object-cover shadow-2xl" alt="Cat 1" />
                <img src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=400&h=400&fit=crop" className="rounded-2xl h-48 w-full object-cover shadow-2xl" alt="Cat 2" />
              </div>
              <div className="space-y-4">
                <img src="https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?q=80&w=400&h=400&fit=crop" className="rounded-2xl h-48 w-full object-cover shadow-2xl" alt="Cat 3" />
                <img src="https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=400&h=600&fit=crop" className="rounded-2xl h-64 w-full object-cover shadow-2xl" alt="Cat 4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brands Section */}
      <section className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h4 className="text-xs uppercase font-black tracking-widest text-slate-400 mb-10">Marcas que Confían en Nosotros</h4>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20">
            {brands.length > 0 ? brands.map(brand => (
              <div key={brand.id} className="h-16 flex items-center grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
                {brand.logo ? (
                  <img src={brand.logo} className="h-full w-auto max-w-40 object-contain" alt={brand.name} />
                ) : (
                  <span className="text-xl font-black text-slate-400">{brand.name}</span>
                )}
              </div>
            )) : (
              ['Vajillas Corona', 'Tramontina', 'KitchenAid', 'Oster', 'Pyrex'].map(brand => (
                <span key={brand} className="text-2xl font-black text-slate-400">{brand}</span>
              ))
            )}
          </div>
        </div>
      </section>
    </motion.main>
  );
}

import { useLocation } from 'react-router-dom';

function AppContent() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin') || location.pathname === '/login';

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      <ScrollToTop />
      {!isAdminPath && <Navbar />}
      {!isAdminPath && <div className="h-20" />} {/* Spacer for fixed navbar */}
      
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/nosotros" element={<div className="py-20 text-center font-bold text-3xl">Página en Construcción</div>} />
        <Route path="/contact" element={<div className="py-20 text-center font-bold text-3xl">Página en Construcción</div>} />
        <Route path="/categories" element={<AllCategories />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/ofertas" element={<OffersPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
      </Routes>

      {!isAdminPath && <Footer />}
      <CartDrawer />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => {
      // Favicon
      if (data.favicon) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = data.favicon;
      }
    });
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <AppContent />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}



