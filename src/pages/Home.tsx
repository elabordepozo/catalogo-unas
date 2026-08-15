import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import WhatsAppButton from '../components/WhatsAppButton';
import PortfolioGallery from '../components/PortfolioGallery';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Clock, ChevronLeft, ChevronRight, CheckCircle, MessageCircle } from 'lucide-react';
import { supabaseClient } from '../lib/supabaseClient';

const CATEGORIES = ['Todos', 'Clásicas', 'Acrílico', 'Nail Art', 'Pedicura'];

const DEFAULT_SERVICES = [
  { id: 'rusa', category: 'Clásicas', title: 'Manicura Rusa', description: 'Limpieza profunda de cutícula con fresno para un acabado impecable y mayor durabilidad.', price: '$25', duration: '45 min', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?auto=format&fit=crop&w=800&q=80' },
  { id: 'acrilicas', category: 'Acrílico', title: 'Acrílicas Esculpidas', description: 'Extensión de uñas esculpidas a medida, adaptadas a la forma natural de tus manos.', price: '$45', duration: '2 Horas', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80' },
  { id: 'babyboomer', category: 'Acrílico', title: 'Baby Boomer', description: 'Elegante difuminado en tonos nude y blanco, el clásico reinventado de las uñas francesas.', price: '$50', duration: '2 Horas', image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=800&q=80' },
  { id: 'nailart3d', category: 'Nail Art', title: 'Nail Art 3D Extremo', description: 'Diseños florales y figuras tridimensionales, incrustaciones de cristalería y joyas.', price: 'Desde $15', duration: '+30 min', image: 'https://images.unsplash.com/photo-1632870198032-475306fd1d93?auto=format&fit=crop&w=800&q=80' },
  { id: 'minimalista', category: 'Nail Art', title: 'Diseño Minimalista', description: 'Trazos finos, puntos sutiles, o pequeños detalles en pan de oro sobre base neutra.', price: 'Desde $10', duration: '+20 min', image: 'https://images.unsplash.com/photo-1599419163071-2edca5ba93de?auto=format&fit=crop&w=800&q=80' },
  { id: 'pedicuraspa', category: 'Pedicura', title: 'Pedicura Spa', description: 'Sumérgete en la relajación profunda con exfoliación, masaje y esmaltado perfecto.', price: '$35', duration: '1 Hora', image: 'https://images.unsplash.com/photo-1516975080661-46bfa2c554af?auto=format&fit=crop&w=800&q=80' },
  { id: 'semi', category: 'Clásicas', title: 'Esmaltado Semi-permanente', description: 'Brillo duradero y color intacto por semanas con nuestro sistema en gel protector.', price: '$20', duration: '40 min', image: 'https://images.unsplash.com/photo-1595868426543-9892c902377b?auto=format&fit=crop&w=800&q=80' }
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [activeService, setActiveService] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [bookingSuccessModal, setBookingSuccessModal] = useState<{name: string, serviceTitle: string, date: string, time: string, email: string} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const bookingRef = useRef<HTMLDivElement>(null);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('');
      return true;
    }
    if (!isValidEmail(value)) {
      setEmailError('Email inválido. Ejemplo: correo@ejemplo.com');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Phone validation function (international format)
  const isValidPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    // Accept 8-15 digits (international format)
    return cleaned.length >= 8 && cleaned.length <= 15;
  };

  const validatePhone = (value: string) => {
    if (!value) {
      setPhoneError('');
      return true;
    }
    if (!isValidPhone(value)) {
      setPhoneError('Teléfono inválido. Ejemplo: +54 11 1234-5678');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const loadAvailabilities = async () => {
    if (!supabaseClient) return;
    const { data } = await supabaseClient.from('availabilities').select('*');
    setAvailabilities(data || []);
  };

  useEffect(() => {
    const init = async () => {
      if (!supabaseClient) {
        setServices(DEFAULT_SERVICES);
        setActiveService(DEFAULT_SERVICES[1]);
        return;
      }
      
      loadAvailabilities();
      
      const { data } = await supabaseClient.from('services').select('*');
      if (data && data.length > 0) {
        setServices(data);
        setActiveService(data[0]);
      } else {
        setServices(DEFAULT_SERVICES);
        setActiveService(DEFAULT_SERVICES[1]);
      }
    };
    init();
  }, []);

  const handlePrevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));

  // Calendar Helpers
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Start on Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  const calendarCells = [];
  for (let i = 0; i < offset; i++) calendarCells.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarCells.push(i);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleServiceSelect = (service: any) => {
    setActiveService(service);
    if (window.innerWidth < 1024) {
      bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const [whatsappSent, setWhatsappSent] = useState(false);

  const handleBooking = async () => {
    if (isSubmitting) return;
    
    // Validate all fields first
    if (!selectedDate || !selectedTime || !name || !phone) {
      alert('Por favor completa todos los campos para reservar tu cita.');
      return;
    }
    
    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      setEmailError('Email inválido. Ejemplo: correo@ejemplo.com');
      return;
    }
    
    // Validate phone format
    if (!isValidPhone(phone)) {
      setPhoneError('Teléfono inválido. Ejemplo: +54 11 1234-5678');
      return;
    }
    
    // Show confirmation step
    setShowConfirmation(true);
  };

  const confirmBooking = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowConfirmation(false);
    
    try {
      
      if (!supabaseClient) throw new Error("Sin conexión a base de datos");

      // 1. Insert Booking
      const { error: insertError } = await supabaseClient.from('bookings').insert({
        service: activeService.title,
        date: selectedDate,
        time: selectedTime,
        name,
        phone,
        email: email || null
      });
      if (insertError) throw insertError;

      // 2. Remove availability
      const existingAv = availabilities.find(a => a.date === selectedDate);
      if (existingAv && existingAv.slots) {
         let currentSlots = existingAv.slots.split(',').map((s: string) => s.trim());
         currentSlots = currentSlots.filter((timer: string) => timer !== selectedTime);
         
         if (currentSlots.length > 0) {
           await supabaseClient.from('availabilities').update({ slots: currentSlots.join(', ') }).eq('date', selectedDate);
         } else {
           await supabaseClient.from('availabilities').delete().eq('date', selectedDate);
         }
      }
      
      setBookingSuccessModal({
        name,
        serviceTitle: activeService.title,
        date: selectedDate,
        time: selectedTime,
        email
      });

      setName('');
      setPhone('');
      setEmail('');
      setSelectedTime('');
      setSelectedDate('');
      setEmailError('');
      
      loadAvailabilities();

      // 3. Auto-open WhatsApp notifications (immediately to avoid popup blockers)
      let openedCount = 0;
      
      // 3a. Notify admin
      const adminPhone = process.env.WHATSAPP_NUMBER?.replace(/\D/g, '') || '';
      if (adminPhone) {
        const adminMsg = encodeURIComponent(
          `🆕 *Nueva Reserva - D´Uñas* 🏠✨\n\n👤 Cliente: ${name}\n📞 Tel: ${phone}\n💅 Servicio: ${activeService.title}\n📅 Fecha: ${selectedDate}\n⏰ Hora: ${selectedTime}`
        );
        window.open(`https://wa.me/${adminPhone}?text=${adminMsg}`, '_blank');
        openedCount++;
      }

      // 3b. Client confirmation (opens chat with their own number as a comprobante)
      const clientPhone = phone.replace(/\D/g, '');
      if (clientPhone) {
        const clientMsg = encodeURIComponent(
          `🎉 *Reserva Confirmada - D´Uñas* 🙌✨\n\n¡Hola ${name}! ✅ Tu cita está agendada:\n💅 *${activeService.title}*\n📅 *${selectedDate}*\n⏰ *${selectedTime}*\n\n📞 Si necesitas cancelar o reagendar, contáctanos. ¡Te esperamos! 😊`
        );
        window.open(`https://wa.me/${clientPhone}?text=${clientMsg}`, '_blank');
        openedCount++;
      }

      if (openedCount > 0) setWhatsappSent(true);

      // 4. Send automatic email notifications (fire & forget — no need to wait)
      fetch('/api/send-booking-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          serviceTitle: activeService.title,
          selectedDate,
          selectedTime,
        }),
      }).catch(() => {}); // Ignorar errores (el API puede no estar disponible en GitHub Pages)

    } catch(err: any) {
      alert('Ocurrió un error al procesar tu reserva: ' + (err.message || JSON.stringify(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const rawSlots = availabilities.find(a => a.date === selectedDate)?.slots?.split(',') || [];
  const availableSlots = [...new Set(rawSlots.map((s: string) => s.trim()).filter(Boolean))]
    .sort((a: string, b: string) => {
      const timeA = new Date(`1970-01-01 ${a}`).getTime();
      const timeB = new Date(`1970-01-01 ${b}`).getTime();
      return timeA - timeB;
    });

  const filteredServices = activeCategory === 'Todos'  
    ? services 
    : services.filter(s => s.category === activeCategory);

  return (
    <div className="relative bg-white selection:bg-[var(--color-accent)] selection:text-white pb-10">
      <Navbar />

      <main className="px-5 py-8 flex flex-col gap-10">
        
        {/* Confirmation Modal */}
        <AnimatePresence>
          {showConfirmation && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-5"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col text-gray-900 border border-gray-100"
              >
                <h3 className="text-xl font-display font-medium mb-4 text-center">Confirma tu Reserva</h3>
                
                <div className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-4 border border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Servicio</span>
                    <span className="text-sm font-semibold text-right">{activeService?.title}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Precio</span>
                    <span className="text-sm font-semibold text-right">{activeService?.price}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Fecha</span>
                    <span className="text-sm font-semibold text-right">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Hora</span>
                    <span className="text-sm font-semibold text-right">{selectedTime}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cliente</span>
                      <span className="text-sm font-semibold text-right">{name}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Teléfono</span>
                      <span className="text-sm text-right">{phone}</span>
                    </div>
                    {email && (
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Email</span>
                        <span className="text-sm text-right">{email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 bg-gray-100 text-gray-700 font-bold tracking-widest uppercase text-xs py-4 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={confirmBooking}
                    disabled={isSubmitting}
                    className="flex-1 bg-[var(--color-text-primary)] text-white font-bold tracking-widest uppercase text-xs py-4 rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Procesando...
                      </>
                    ) : (
                      <>Confirmar</>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Modal */}
        <AnimatePresence>
          {bookingSuccessModal && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-5"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center text-gray-900 border border-gray-100"
              >
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-2xl font-display font-medium mb-2">¡Reserva Exitosa!</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Hola <span className="font-semibold text-gray-800">{bookingSuccessModal.name}</span>, hemos agendado tu cita correctamente.
                </p>
                {bookingSuccessModal.email && (
                  <div className="w-full mb-4 bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-gray-700 leading-relaxed text-left">
                      📧 Te enviaremos un <strong>comprobante por email</strong> a <strong>{bookingSuccessModal.email}</strong>
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 w-full rounded-2xl p-4 mb-6 text-left border border-gray-100 space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Servicio</span>
                    <p className="text-sm font-semibold">{bookingSuccessModal.serviceTitle}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Día</span>
                    <p className="text-sm font-semibold">{bookingSuccessModal.date}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Hora</span>
                    <p className="text-sm font-semibold">{bookingSuccessModal.time}</p>
                  </div>
                </div>
                {/* WhatsApp Notification Status */}
                <AnimatePresence>
                  {whatsappSent && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full mb-4 bg-[#25D366]/10 border border-[#25D366]/20 rounded-2xl p-3 flex items-center gap-2"
                    >
                      <MessageCircle size={16} className="text-[#25D366] shrink-0 fill-[#25D366]/30" strokeWidth={1.5} />
                      <p className="text-xs text-gray-700 leading-relaxed text-left">
                        📲 Se abrió WhatsApp para notificar al <strong>administrador</strong> y guardar tu <strong>comprobante</strong>. Presiona <strong>Enviar</strong> 📤
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={() => {
                    setBookingSuccessModal(null);
                    setWhatsappSent(false);
                  }}
                  className="w-full bg-gray-900 text-white font-bold tracking-widest uppercase text-xs py-4 rounded-xl hover:bg-black transition-colors"
                >
                  Entendido
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WhatsApp Floating Button */}
        <WhatsAppButton />

        {/* Header Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <h1 className="text-4xl font-display font-light leading-[1.1] tracking-tight">
            Eleva tu <br/> 
            <span className="font-semibold text-gray-900">estilo personal</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-[15px] font-light max-w-[280px]">
            Arte en uñas, cuidado profundo y una experiencia de lujo solo para ti.
          </p>
        </motion.div>

        {/* Categories (Sticky below navbar) */}
        <div className="sticky top-[60px] z-40 bg-white/95 backdrop-blur-md py-3 -mx-5 px-5 border-b border-gray-100 shadow-sm">
          <div className="flex gap-2.5 overflow-x-auto hide-scrollbar snap-x">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`category-pill snap-start whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border border-gray-200 ${
                  activeCategory === cat ? 'active shadow-md' : 'text-gray-600 bg-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Catalog */}
        <motion.div layout className="flex flex-col gap-5">
          <AnimatePresence mode="popLayout">
            {filteredServices.map((srv) => (
              <motion.button
                key={srv.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                onClick={() => handleServiceSelect(srv)}
                className={`group text-left rounded-3xl overflow-hidden bg-gray-50 border transition-all duration-300 ${
                  activeService.id === srv.id 
                    ? 'border-[var(--color-text-primary)] ring-1 ring-[var(--color-text-primary)] bg-white shadow-xl' 
                    : 'border-transparent active:scale-[0.98]'
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img 
                    src={srv.image} 
                    alt={srv.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-800">
                    {srv.category}
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="font-display font-medium text-lg mb-1 text-gray-900">{srv.title}</h3>
                  <p className="text-gray-500 text-[13px] leading-relaxed mb-5 line-clamp-2">
                    {srv.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-0.5">Precio</span>
                      <span className="font-semibold text-gray-900 text-sm">{srv.price}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-0.5">Tiempo</span>
                      <span className="text-gray-600 text-[13px] flex items-center justify-end gap-1 font-medium">
                        <Clock size={12} /> {srv.duration}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Portfolio Gallery */}
        <PortfolioGallery />

        {/* Booking Widget */}
        <div ref={bookingRef} className="mt-4 pt-10 border-t border-gray-100 scroll-mt-[60px]">
          {activeService && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[var(--color-bg-primary)] p-6 rounded-[32px] border border-gray-100 shadow-[0_4px_40px_rgba(0,0,0,0.03)]"
            >
              {/* Active Service Summary */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="uppercase tracking-widest text-[10px] font-bold text-gray-400 mb-2">Reservando</div>
                <h2 className="font-display text-xl font-semibold text-gray-900 mb-1">{activeService.title}</h2>
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <span>{activeService.price}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {activeService.duration}</span>
                </div>
              </div>

              <div className="space-y-8">
              {/* Step 1 Date (Calendar) */}
              <div>
                <label className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-4 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-[10px]">1</span> 
                  Selecciona Fecha
                </label>

                <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-sm mb-2">
                  <div className="flex justify-between items-center mb-3 sm:mb-4 px-1 sm:px-2">
                    <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors">
                      <ChevronLeft size={18} />
                    </button>
                    <span className="font-display font-medium text-[14px] sm:text-[15px] text-gray-900 capitalize">
                      {monthNames[month]} {year}
                    </span>
                    <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 mb-2 sm:mb-3 text-center">
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                      <span key={`${d}-${i}`} className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase">{d}</span>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-y-1.5 sm:gap-y-2 gap-x-0.5 sm:gap-x-1 text-center">
                    {calendarCells.map((day, idx) => {
                      if (day === null) return <div key={`empty-${idx}`} />;
                      
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const cellDate = new Date(year, month, day);
                      const isPastDate = cellDate < today;
                      const isAvailable = availabilities.some(a => a.date === dateStr) && !isPastDate;
                      const isSelected = selectedDate === dateStr;

                      return (
                        <button
                          key={dateStr}
                          disabled={!isAvailable}
                          onClick={() => {
                            setSelectedDate(dateStr);
                            setSelectedTime('');
                          }}
                          className={`h-8 w-8 sm:h-9 sm:w-9 mx-auto rounded-full flex items-center justify-center text-[12px] sm:text-[13px] transition-all relative ${
                            isSelected 
                              ? 'bg-[var(--color-text-primary)] text-white shadow-md font-semibold' 
                              : isAvailable 
                                ? 'hover:bg-gray-100 text-gray-900 font-medium bg-gray-50 border border-gray-100' 
                                : 'text-gray-300 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          {day}
                          {isAvailable && !isSelected && (
                            <span className="absolute bottom-0.5 sm:bottom-1 w-1 h-1 rounded-full bg-[var(--color-accent)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Step 2 Time */}
              <AnimatePresence>
                {selectedDate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-4 flex items-center gap-2 pt-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-[10px]">2</span> 
                      Selecciona Hora
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableSlots.length > 0 ? availableSlots.map((time: string, idx: number) => (
                        <button
                          key={`${time}-${idx}`}
                          onClick={() => setSelectedTime(time)}
                          className={`px-4 py-2 rounded-full text-sm font-medium time-btn ${selectedTime === time.trim() ? 'selected shadow-md' : 'bg-white text-gray-600 shadow-sm'}`}
                        >
                          {time.trim()}
                        </button>
                      )) : (
                        <p className="text-xs text-gray-400 italic">No hay horarios.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 3 Form */}
              <AnimatePresence>
                {selectedTime && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden space-y-4 pt-4 border-t border-gray-200"
                  >
                    <label className="text-[11px] uppercase tracking-widest text-gray-500 font-bold block mb-4 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-text-primary)] text-white text-[10px]">3</span> 
                      Tus Datos
                    </label>
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        placeholder="Nombre completo" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 focus:ring-1 focus:ring-[var(--color-text-primary)] focus:border-[var(--color-text-primary)] outline-none text-sm placeholder:text-gray-400 transition-all shadow-sm"
                      />
                      <div className="relative">
                        <input 
                          type="tel" 
                          placeholder="+54 11 1234-5678" 
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            validatePhone(e.target.value);
                          }}
                          onBlur={() => validatePhone(phone)}
                          className={`w-full bg-white border rounded-xl px-4 py-3.5 focus:ring-1 focus:ring-[var(--color-text-primary)] focus:border-[var(--color-text-primary)] outline-none text-sm placeholder:text-gray-400 transition-all shadow-sm ${phoneError ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                        />
                        {phoneError && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-red-500">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-[11px] font-medium">{phoneError}</span>
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <input 
                          type="email" 
                          placeholder="Email (para recibir comprobante)" 
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            validateEmail(e.target.value);
                          }}
                          onBlur={() => validateEmail(email)}
                          className={`w-full bg-white border rounded-xl px-4 py-3.5 focus:ring-1 focus:ring-[var(--color-text-primary)] focus:border-[var(--color-text-primary)] outline-none text-sm placeholder:text-gray-400 transition-all shadow-sm ${emailError ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                        />
                        {emailError && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-red-500">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-[11px] font-medium">{emailError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleBooking}
                      disabled={isSubmitting || !!emailError || !!phoneError}
                      className={`w-full mt-6 rounded-full py-4 px-6 flex items-center justify-center gap-2 transition-all duration-300 shadow-lg ${
                        isSubmitting || emailError || phoneError 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-[var(--color-text-primary)] hover:bg-black active:scale-95'
                      } text-white`}
                    >
                      <span className="uppercase text-xs tracking-widest font-bold">Revisar Reserva</span>
                      <ArrowRight size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
          )}
        </div>

      </main>
    </div>
  );
}
