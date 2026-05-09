import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Ad {
  id: number;
  title: string;
  imageUrl: string;
  mobileImageUrl?: string;
  position: string;
  link?: string;
  isActive?: boolean;
}

export default function Hero() {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [ads, setAds] = useState<Ad[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetch('/api/ads').then(res => res.json()).then(data => {
      const heroAds = data.filter((ad: Ad) => ad.position === 'home-hero' && ad.isActive !== false);
      setAds(heroAds);
    });
    fetch('/api/settings').then(res => res.json()).then(setSettings);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-play logic
  useEffect(() => {
    if (ads.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [ads.length]);

  const currentAd = ads[currentAdIndex];
  const adImg = isMobile && currentAd?.mobileImageUrl ? currentAd.mobileImageUrl : currentAd?.imageUrl;
  const bgImage = adImg || settings['home-bg-desktop'] || 'https://images.unsplash.com/photo-1541675154750-0444c7d51e8e?q=80&w=2000&auto=format&fit=crop';

  return (
    <section className="relative h-150 w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div 
          key={bgImage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgImage})` }}
        >
          {/* Only show heavy gradient if it's NOT an ad banner */}
          {!currentAd && (
            <div className="absolute inset-0 bg-linear-to-r from-blue-900/90 via-blue-900/40 to-transparent" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* If it's an ad with a link, wrap everything in a link */}
      {currentAd?.link ? (
        <a href={currentAd.link} className="absolute inset-0 z-10 block" aria-label={currentAd.title} />
      ) : null}

      {!currentAd && (
        <div className="relative max-w-7xl mx-auto px-4 h-full flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-xl text-white"
          >
            <span className="inline-block px-4 py-1 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 rounded-full text-blue-200 text-sm font-bold mb-6 tracking-wider uppercase">
              Importaciones Carmelita del Norte
            </span>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Calidad que Transforma tu Hogar
            </h1>
            <p className="text-lg md:text-xl text-slate-200 mb-10 leading-relaxed max-w-md">
              Somos los principales proveedores de menaje, cristalería y artículos del hogar en el norte del país. Precios mayoristas a tu alcance.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/category/menaje" 
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-full flex items-center gap-2 transition-all transform hover:scale-105"
              >
                Ver Catálogo
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      )}

      {currentAd && settings['show-ad-text'] === 'true' && (
        <div className="relative max-w-7xl mx-auto px-4 h-full flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-xl text-white pointer-events-none"
          >
            <span className="inline-block px-4 py-1 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 rounded-full text-blue-200 text-sm font-bold mb-6 tracking-wider uppercase">
              Oferta Especial
            </span>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              {currentAd.title}
            </h1>
          </motion.div>
        </div>
      )}

      {ads.length > 1 && (
        <div className="absolute bottom-10 right-10 flex gap-2">
          {ads.map((_, i) => (
            <button 
              key={i} 
              onClick={() => setCurrentAdIndex(i)}
              className={`h-2 transition-all rounded-full ${i === currentAdIndex ? 'bg-blue-600 w-8' : 'bg-white/30 w-4'}`} 
            />
          ))}
        </div>
      )}
    </section>
  );
}

