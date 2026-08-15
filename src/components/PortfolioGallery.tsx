import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PortfolioItem {
  id: string;
  imageUrl: string;
  title: string;
  category: string;
}

const PORTFOLIO_ITEMS: PortfolioItem[] = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
    title: 'Acrílicas Esculpidas',
    category: 'Acrílico'
  },
  {
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=800&q=80',
    title: 'Baby Boomer',
    category: 'Acrílico'
  },
  {
    id: '3',
    imageUrl: 'https://images.unsplash.com/photo-1632870198032-475306fd1d93?auto=format&fit=crop&w=800&q=80',
    title: 'Nail Art 3D',
    category: 'Nail Art'
  },
  {
    id: '4',
    imageUrl: 'https://images.unsplash.com/photo-1599419163071-2edca5ba93de?auto=format&fit=crop&w=800&q=80',
    title: 'Diseño Minimalista',
    category: 'Nail Art'
  },
  {
    id: '5',
    imageUrl: 'https://images.unsplash.com/photo-1516975080661-46bfa2c554af?auto=format&fit=crop&w=800&q=80',
    title: 'Pedicura Spa',
    category: 'Pedicura'
  },
  {
    id: '6',
    imageUrl: 'https://images.unsplash.com/photo-1595868426543-9892c902377b?auto=format&fit=crop&w=800&q=80',
    title: 'Esmaltado Semi-permanente',
    category: 'Clásicas'
  }
];

export default function PortfolioGallery() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handlePrev = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? PORTFOLIO_ITEMS.length - 1 : selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === PORTFOLIO_ITEMS.length - 1 ? 0 : selectedIndex + 1);
    }
  };

  return (
    <section className="py-10 border-t border-gray-100">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-medium text-gray-900 mb-2">Nuestros Trabajos</h2>
        <p className="text-[var(--color-text-secondary)] text-[15px] font-light">
          Descubre nuestra galería de diseños y estilos.
        </p>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PORTFOLIO_ITEMS.map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedIndex(index)}
            className="relative aspect-square rounded-2xl overflow-hidden group"
          >
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <p className="text-white text-xs font-medium">{item.title}</p>
              <p className="text-white/70 text-[10px]">{item.category}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setSelectedIndex(null)}
          >
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10"
            >
              <X size={28} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-4 text-white/80 hover:text-white transition-colors z-10"
            >
              <ChevronLeft size={32} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-4 text-white/80 hover:text-white transition-colors z-10"
            >
              <ChevronRight size={32} />
            </button>

            <motion.div
              key={selectedIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={PORTFOLIO_ITEMS[selectedIndex].imageUrl}
                alt={PORTFOLIO_ITEMS[selectedIndex].title}
                className="w-full rounded-2xl shadow-2xl"
              />
              <div className="mt-4 text-center">
                <h3 className="text-white font-medium text-lg">{PORTFOLIO_ITEMS[selectedIndex].title}</h3>
                <p className="text-white/60 text-sm">{PORTFOLIO_ITEMS[selectedIndex].category}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
