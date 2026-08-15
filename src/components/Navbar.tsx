import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home as HomeIcon, Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="glass-nav sticky top-0 z-50 bg-white/90">
      {/* Header Bar */}
      <div className="px-5 py-4 flex justify-between items-center transition-all">
        <Link to="/" onClick={() => setIsOpen(false)} className="text-xl tracking-widest uppercase font-display font-medium text-[var(--color-text-primary)]">
          D´Uñas
        </Link>
        <div className="flex items-center">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 -mr-2 text-[var(--color-text-primary)] hover:opacity-70 transition-opacity"
          >
            {isOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Hamburger Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="absolute top-full left-0 w-full bg-white border-b border-gray-100 shadow-xl overflow-hidden"
          >
            <div className="flex flex-col px-5 py-4 gap-2">
              <Link 
                to="/" 
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${
                  location.pathname === '/' 
                  ? 'bg-gray-50 text-gray-900 font-semibold' 
                  : 'text-gray-500 font-medium active:bg-gray-50'
                }`}
              >
                <HomeIcon size={18} />
                Catálogo de Servicios
              </Link>
              <Link 
                to="/admin" 
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${
                  location.pathname === '/admin' 
                  ? 'bg-gray-50 text-gray-900 font-semibold' 
                  : 'text-gray-500 font-medium active:bg-gray-50'
                }`}
              >
                <Settings size={18} />
                Panel de Administración
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
