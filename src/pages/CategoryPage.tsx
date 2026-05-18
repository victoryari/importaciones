import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductGrid from '../components/ProductGrid';
import { motion } from 'motion/react';
import { ChevronRight, Home } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  image?: string;
  description?: string;
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        const found = data.find((c: Category) => c.slug === slug);
        setCategory(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="py-40 text-center font-bold text-2xl animate-pulse">Cargando categoría...</div>;

  if (!category) return (
    <div className="py-40 text-center space-y-4">
      <h2 className="text-3xl font-bold">Categoría no encontrada</h2>
      <Link to="/" className="text-blue-600 font-bold hover:underline">Volver al inicio</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Category Banner */}
      <section className="relative h-[40vh] min-h-75 bg-slate-900 flex items-center justify-center overflow-hidden">
        <img 
          src={category.image || "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2000&auto=format&fit=crop"} 
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          alt={category.name}
        />
        <div className="relative z-10 text-center text-white px-4">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-5xl md:text-7xl font-black mb-4"
          >
            {category.name}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-300 max-w-2xl mx-auto font-medium"
          >
            {category.description || `Explora nuestra exclusiva colección de ${category.name.toLowerCase()} seleccionada para ti.`}
          </motion.p>
        </div>
      </section>

      {/* Products list - We'll filter via query param for now or update ProductGrid */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8 border-b pb-4">
            <h3 className="text-xl font-bold text-slate-900">Mostrando productos de {category.name}</h3>
            <span className="text-sm text-slate-500 font-medium">Resultados filtrados</span>
          </div>
        </div>
        
        {/* We reuse ProductGrid but we need to tell it to filter by category slug */}
        <ProductGrid forceCategory={category.name} hideHeader />
      </div>
    </div>
  );
}
