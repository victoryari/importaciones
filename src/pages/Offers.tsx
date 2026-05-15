import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles, ShoppingCart, Tag, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';

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
  const { addToCart } = useCart();

  useEffect(() => {
    fetch('/api/products/offers')
      .then(res => res.json())
      .then(data => {
        setProducts(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const getDiscountedPrice = (price: any, discount?: any) => {
    const numPrice = parseFloat(price) || 0;
    const numDiscount = parseFloat(discount) || 0;
    if (numDiscount <= 0) return numPrice;
    return numPrice * (1 - numDiscount / 100);
  };

  const formatPrice = (n: any) => {
    const num = parseFloat(n) || 0;
    return num.toFixed(2);
  };

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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product, index) => {
                const discounted = getDiscountedPrice(product.salePrice, product.discountPercent);
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group border border-slate-100"
                  >
                    {/* Image */}
                    <div className="relative aspect-square bg-slate-50 overflow-hidden">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                          <Tag className="w-12 h-12" />
                        </div>
                      )}
                      {/* Discount Badge */}
                      {product.discountPercent && (
                        <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                          -{product.discountPercent}%
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4 space-y-2">
                      {product.category && (
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                          {product.category.name}
                        </span>
                      )}
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                      {product.brand && (
                        <span className="text-[10px] text-blue-600 font-bold">{product.brand.name}</span>
                      )}

                      {/* Prices */}
                      <div className="flex items-end gap-2 pt-1">
                        <span className="text-xl font-black text-red-600">
                          S/ {formatPrice(discounted)}
                        </span>
                        {product.discountPercent && product.discountPercent > 0 && (
                          <span className="text-sm text-slate-400 line-through">
                            S/ {formatPrice(product.salePrice)}
                          </span>
                        )}
                      </div>

                      {/* Add to cart */}
                      <button
                        onClick={() => addToCart({
                          id: product.id,
                          name: product.name,
                          price: discounted,
                          image: product.images?.[0] || '',
                          quantity: 1
                        })}
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Agregar al Carrito
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
