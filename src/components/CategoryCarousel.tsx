import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  image?: string;
  description?: string;
  isFeatured?: boolean;
  _count?: { products: number };
}

export default function CategoryCarousel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Solo categorías con imagen
          const withImage = data.filter((c: Category) => c.image && c.isFeatured !== false);
          setCategories(withImage.length > 0 ? withImage : data.filter((c: Category) => c.image).slice(0, 6));
        }
      });
  }, []);

  // Auto-rotación cada 5 segundos
  useEffect(() => {
    if (categories.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % categories.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [categories.length]);

  const goTo = useCallback((index: number) => setCurrent(index), []);
  const goPrev = useCallback(() => setCurrent(prev => (prev - 1 + categories.length) % categories.length), [categories.length]);
  const goNext = useCallback(() => setCurrent(prev => (prev + 1) % categories.length), [categories.length]);

  if (categories.length === 0) return null;

  const cat = categories[current];

  return (
    <section className="px-4 py-10">
      <div className="max-w-7xl mx-auto h-64 md:h-80 rounded-3xl overflow-hidden relative group">
        {/* Background Image with Crossfade */}
        <AnimatePresence mode="wait">
          <motion.img
            key={cat.id}
            src={cat.image}
            alt={cat.name}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        </AnimatePresence>

        {/* Overlay */}
        <div className="absolute inset-0 bg-linear-to-r from-slate-900/80 via-slate-900/50 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-12 text-white z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-xs uppercase font-black tracking-widest text-blue-300 mb-2 block">
                Categoría Destacada
              </span>
              <h3 className="text-3xl md:text-4xl font-bold mb-3">{cat.name}</h3>
              {cat.description && (
                <p className="text-base md:text-lg mb-5 text-white/70 max-w-lg line-clamp-2">
                  {cat.description}
                </p>
              )}
              {!cat.description && (
                <p className="text-base md:text-lg mb-5 text-white/70">
                  Descubre los mejores productos en esta categoría con ofertas exclusivas.
                </p>
              )}
              <Link
                to="/ofertas"
                className="inline-flex items-center gap-2 bg-white text-blue-600 font-black py-3 px-8 rounded-full hover:bg-blue-50 hover:scale-105 transition-all shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                Explorar Ofertas
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Arrows */}
        {categories.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {categories.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {categories.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
