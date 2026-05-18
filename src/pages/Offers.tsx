import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles, Tag, ArrowLeft } from 'lucide-react';
import ProductCard from '../components/ProductCard';

interface Product {
  id: number;
  name: string;
  slug: string;
  code?: string;
  images?: string[];
  salePrice: number;
  discountPercent?: number;
  category?: { name: string };
  brand?: { name: string };
  unit?: { symbol: string };
}

export default function OffersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cols, setCols] = useState(3);

  useEffect(() => {
    fetch('/api/products/offers')
      .then(res => res.json())
      .then(data => {
        setProducts(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        const val = parseInt(data.products_per_page, 10);
        if (val >= 2 && val <= 6) setCols(val);
      })
      .catch(() => {});
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-50"
    >
      {/* Hero Banner */}
      <section className="bg-linear-to-r from-red-600 via-orange-500 to-amber-500 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-bold">Ofertas Exclusivas</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-3">
              🔥 Ofertas y Descuentos
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              Aprovecha nuestros precios especiales en productos seleccionados. ¡Ofertas por tiempo limitado!
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver al Inicio
        </Link>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Tag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-700 mb-2">No hay ofertas disponibles</h2>
            <p className="text-slate-500 mb-6">Vuelve pronto, estamos preparando descuentos increíbles para ti.</p>
            <Link to="/products" className="bg-blue-600 text-white font-bold px-8 py-3 rounded-full hover:bg-blue-700 transition-colors">
              Ver todos los productos
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 font-bold mb-6">
              {products.length} producto{products.length !== 1 ? 's' : ''} en oferta
            </p>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-8 ${cols === 2 ? 'lg:grid-cols-2' : cols === 3 ? 'lg:grid-cols-3' : cols === 4 ? 'lg:grid-cols-4' : cols === 5 ? 'lg:grid-cols-5' : cols === 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-3'}`}>
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  index={index}
                  product={{
                    ...product,
                    price: product.salePrice,
                    image: product.images?.[0] || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop',
                    category: product.category?.name || 'Varios',
                    isOnSale: true
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
