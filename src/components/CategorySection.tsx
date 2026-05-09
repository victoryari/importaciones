import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES as STATIC_CATEGORIES } from '../constants';
import { motion } from 'motion/react';

export default function CategorySection() {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Priority: isFeatured categories first
          const featured = data.filter((c: any) => c.isFeatured);
          if (featured.length > 0) {
            setCategories(featured.slice(0, 4));
          } else {
            setCategories(data.slice(0, 4));
          }
        } else {
          setCategories(STATIC_CATEGORIES.slice(0, 4));
        }
      })
      .catch(() => setCategories(STATIC_CATEGORIES.slice(0, 4)));
  }, []);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Nuestras Categorías</h2>
            <div className="h-1 w-20 bg-blue-600" />
          </div>
          <Link to="/categories" className="text-blue-600 font-bold hover:underline">
            Ver todas las categorías
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.slice(0, 4).map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative h-64 rounded-2xl overflow-hidden cursor-pointer"
            >
              <Link to={`/category/${category.slug || category.name.toLowerCase()}`}>
                <img 
                  src={category.image || "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop"} 
                  alt={category.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-900/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-6">
                  <h3 className="text-xl font-bold text-white mb-1">{category.name}</h3>
                  <span className="text-blue-300 text-sm font-semibold transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    Explorar ahora →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
