import { MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '';

export default function WhatsAppButton() {
  const phone = WHATSAPP_NUMBER.replace(/\D/g, '');
  if (!phone) return null;

  const message = encodeURIComponent(
    '¡Hola! 👋 Me gustaría consultar sobre los servicios de uñas. ¿Podrían darme más información?'
  );

  const whatsappUrl = `https://wa.me/${phone}?text=${message}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Tooltip label */}
      <motion.a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, x: 20, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="group flex items-center gap-2 bg-white px-4 py-2.5 rounded-full shadow-lg border border-gray-100 text-sm font-medium text-gray-700 hover:text-gray-900 transition-all hover:shadow-xl"
      >
        <span className="hidden sm:inline">Contáctanos</span>
        <span className="text-[#25D366] font-bold">WhatsApp</span>
        <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
      </motion.a>

      {/* WhatsApp Circle Button */}
      <motion.a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 15 }}
        whileHover={{ scale: 1.1, boxShadow: '0 8px 30px rgba(37, 211, 102, 0.4)' }}
        whileTap={{ scale: 0.9 }}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 hover:shadow-xl hover:shadow-[#25D366]/40 transition-all duration-300"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle size={28} className="fill-white" strokeWidth={1.5} />
      </motion.a>
    </div>
  );
}
