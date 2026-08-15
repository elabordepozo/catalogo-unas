import { useState, useEffect, useMemo, FormEvent } from 'react';
import Navbar from '../components/Navbar';
import WhatsAppButton from '../components/WhatsAppButton';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Trash2, Plus, Calendar, Clock, X, ChevronLeft, ChevronRight, BookOpen, Scissors, CheckCircle2, Pencil, Loader2, MessageCircle, Bell } from 'lucide-react';

import { supabaseClient } from '../lib/supabaseClient';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'availability' | 'services' | 'bookings' | 'reminders'>('availability');

  // Availability State
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [date, setDate] = useState('');
  const [slotsArray, setSlotsArray] = useState<string[]>([]);
  const [clockHour, setClockHour] = useState<number>(10);
  const [clockMinute, setClockMinute] = useState<string>('00');
  const [clockAmPm, setClockAmPm] = useState<'AM'|'PM'>('AM');
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // Services State
  const [services, setServices] = useState<any[]>([]);
  const [newSrvTitle, setNewSrvTitle] = useState('');
  const [newSrvCategory, setNewSrvCategory] = useState('Clásicas');
  const [newSrvDesc, setNewSrvDesc] = useState('');
  const [newSrvPrice, setNewSrvPrice] = useState('$');
  const [newSrvDur, setNewSrvDur] = useState('');
  const [newSrvImageBase64, setNewSrvImageBase64] = useState<string | null>(null);
  const [editingSrvId, setEditingSrvId] = useState<string | null>(null);
  const [isSavingService, setIsSavingService] = useState(false);

  // Bookings State
  const [bookings, setBookings] = useState<any[]>([]);

  // Reminders State
  const [reminders, setReminders] = useState<any[]>([]);
  const [reminderSent, setReminderSent] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('admin_reminder_sent') || '[]');
    } catch { return []; }
  });

  // Group reminders by date for display
  const groupedReminders = useMemo(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dayAfterStr = dayAfter.toISOString().split('T')[0];
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    if (!reminders || reminders.length === 0) return [];

    const grouped: Record<string, any[]> = {};
    reminders.forEach((r: any) => {
      if (!grouped[r.date]) grouped[r.date] = [];
      grouped[r.date].push(r);
    });

    return Object.entries(grouped).map(([date, items]) => {
      const dateObj = new Date(date + 'T12:00:00');
      const dateLabel = `${dayNames[dateObj.getDay()]} ${dateObj.getDate()} de ${monthNames[dateObj.getMonth()]}`;
      
      let badge = '';
      let badgeClass = 'bg-gray-100 text-gray-600 border-gray-200';
      if (date === tomorrowStr) {
        badge = 'MAÑANA';
        badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
      } else if (date === dayAfterStr) {
        badge = 'PASADO MAÑANA';
        badgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
      }

      return { date, items, dateLabel, badge, badgeClass };
    });
  }, [reminders]);

  const fetchAvailability = async () => {
    if (!supabaseClient) return;
    const { data } = await supabaseClient.from('availabilities').select('*');
    setAvailabilities(data || []);
  };
  const fetchServices = async () => {
    if (!supabaseClient) return;
    const { data } = await supabaseClient.from('services').select('*');
    setServices(data || []);
  };
  const fetchBookings = async () => {
    if (!supabaseClient) return;
    const { data } = await supabaseClient.from('bookings').select('*');
    if (data) {
       data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
       setBookings(data);
    }
  };

  const fetchReminders = async () => {
    try {
      // Try server API first
      const res = await fetch('/api/reminders');
      if (res.ok) {
        const data = await res.json();
        setReminders(data || []);
        return;
      }
    } catch {}
    
    // Fallback: compute reminders from already-fetched bookings (no extra DB call)
    computeRemindersFromBookings(bookings);
  };

  const computeRemindersFromBookings = (data: any[]) => {
    if (!data || data.length === 0) {
      setReminders([]);
      return;
    }
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dayAfterStr = dayAfter.toISOString().split('T')[0];
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekFromNowStr = weekFromNow.toISOString().split('T')[0];

    const upcoming = data.filter((b: any) => {
      return b.date >= tomorrowStr && b.date <= weekFromNowStr;
    }).sort((a: any, b: any) => {
      const dc = a.date.localeCompare(b.date);
      return dc !== 0 ? dc : a.time.localeCompare(b.time);
    }).map((b: any) => {
      const clientPhone = (b.phone || '').replace(/\D/g, '');
      let whatsappReminderUrl = '';
      if (clientPhone) {
        const isTomorrow = b.date === tomorrowStr;
        const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const dateObj = new Date(b.date + 'T12:00:00');
        const dayLabel = isTomorrow ? 'mañana' : `el ${dayNames[dateObj.getDay()]} ${b.date}`;
        const msg = encodeURIComponent(
          `¡Hola ${b.name}! 🙌✨\n\nTe recordamos que tu cita en *D´Uñas* es ${dayLabel} a las *${b.time}*.\n💅 Servicio: ${b.service || 'No especificado'}\n\nSi necesitas reagendar, responde este mensaje. ¡Te esperamos! 😊`
        );
        whatsappReminderUrl = `https://wa.me/${clientPhone}?text=${msg}`;
      }
      return {
        id: `${b.date}-${b.time}-${b.name}`,
        name: b.name,
        phone: b.phone,
        service: b.service,
        date: b.date,
        time: b.time,
        whatsappReminderUrl,
        isTomorrow: b.date === tomorrowStr,
        isDayAfter: b.date === dayAfterStr
      };
    });
    setReminders(upcoming);
  };

  useEffect(() => {
    fetchAvailability();
    fetchServices();
    fetchBookings();
  }, []);

  // When bookings change, update reminders (fallback)
  useEffect(() => {
    if (bookings.length > 0) {
      computeRemindersFromBookings(bookings);
    }
  }, [bookings]);

  // --- Availability Logic ---
  const handlePrevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  const calendarCells = [];
  for (let i = 0; i < offset; i++) calendarCells.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarCells.push(i);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleDateSelect = (dateStr: string) => {
    setDate(dateStr);
    const existing = availabilities.find(a => a.date === dateStr);
    if (existing && existing.slots) {
      setSlotsArray(existing.slots.split(',').map((s: string) => s.trim()).filter(Boolean));
    } else {
      setSlotsArray([]);
    }
  };

  const get12HourFormat = () => `${String(clockHour).padStart(2, '0')}:${clockMinute} ${clockAmPm}`;

  const handleAddTime = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!date) {
      alert('Por favor selecciona un día del calendario antes de añadir turnos.');
      return;
    }

    const timeVal = get12HourFormat();
    
    // 1. Check if already in the list
    if (slotsArray.includes(timeVal)) {
      alert(`El turno de las ${timeVal} ya está asignado o añadido a la lista.`);
      return;
    }
    
    // 2. Check if already booked by a customer
    const isAlreadyBooked = bookings.some(b => b.date === date && b.time === timeVal);
    if (isAlreadyBooked) {
      alert(`¡Alto ahí! El turno de las ${timeVal} para el día ${date} ya está reservado por un cliente.`);
      return;
    }

    const newSlots = [...slotsArray, timeVal].sort((a, b) => new Date(`1970-01-01 ${a}`).getTime() - new Date(`1970-01-01 ${b}`).getTime());
    setSlotsArray(newSlots);
  };

  const handleRemoveTime = (timeToRemove: string) => setSlotsArray(slotsArray.filter(t => t !== timeToRemove));

  const handleSaveAvailability = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabaseClient) return alert("Sin conexión a DB");
    
    const slotsString = slotsArray.join(', ');
    if (!date || !slotsString) return alert("Selecciona una fecha y añade turnos.");
    
    await supabaseClient.from('availabilities').delete().eq('date', date);
    const { error } = await supabaseClient.from('availabilities').insert({ date, slots: slotsString });
    
    if (error) {
       alert('Error de Supabase: ' + error.message);
       return;
    }
    
    setDate(''); setSlotsArray([]); fetchAvailability();
  };

  const handleDeleteAvailability = async (dateToDelete: string) => {
    if (!supabaseClient) return;
    await supabaseClient.from('availabilities').delete().eq('date', dateToDelete);
    fetchAvailability();
  };

  const handleDeleteBooking = async (b: any) => {
    if (!supabaseClient) return;
    if (!confirm(`¿Estás seguro de que deseas cancelar la cita de ${b.name} para el ${b.date} a las ${b.time}? El turno volverá a estar disponible.`)) return;
    
    try {
      await supabaseClient.from('bookings').delete().match({ date: b.date, time: b.time, name: b.name });
      
      const { data: avData } = await supabaseClient.from('availabilities').select('*').eq('date', b.date).single();
      let slotsArray = avData?.slots ? avData.slots.split(',').map((s:string) => s.trim()) : [];
      if (!slotsArray.includes(b.time)) {
        slotsArray.push(b.time);
        slotsArray.sort((x:string, y:string) => new Date(`1970-01-01 ${x}`).getTime() - new Date(`1970-01-01 ${y}`).getTime());
        if (avData) {
          await supabaseClient.from('availabilities').update({ slots: slotsArray.join(', ') }).eq('date', b.date);
        } else {
          await supabaseClient.from('availabilities').insert({ date: b.date, slots: b.time });
        }
      }

      fetchBookings();
      fetchAvailability();
    } catch (err) {
      console.error(err);
      alert('Error al cancelar la cita.');
    }
  };

  // --- Services Logic ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions for compression
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
             ctx.drawImage(img, 0, 0, width, height);
             // Compress to JPEG with 0.7 quality factor
             const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
             setNewSrvImageBase64(compressedBase64);
          } else {
             // Fallback if canvas fails
             setNewSrvImageBase64(reader.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveService = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingService(true);
    
    try {
      let imageUrl = editingSrvId ? services.find(s => s.id === editingSrvId)?.image : 'https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?auto=format&fit=crop&w=800&q=80';
      
      if (newSrvImageBase64 && supabaseClient) {
        try {
          const oldImageUrl = editingSrvId ? services.find(s => s.id === editingSrvId)?.image : undefined;
          
          if (oldImageUrl && oldImageUrl.includes('/catalogo/')) {
            const oldFilename = oldImageUrl.split('/catalogo/').pop();
            if (oldFilename) await supabaseClient.storage.from('catalogo').remove([oldFilename]);
          }

          const cleanTitle = newSrvTitle.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.]/g, '');
          const filename = `${cleanTitle}_${Date.now()}.jpg`;
          const base64Data = newSrvImageBase64.replace(/^data:image\/\w+;base64,/, "");
          
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], {type: 'image/jpeg'});

          const { data, error } = await supabaseClient.storage.from('catalogo').upload(filename, blob, { contentType: 'image/jpeg', upsert: true });
          
          if (!error) {
             const { data: publicUrlData } = supabaseClient.storage.from('catalogo').getPublicUrl(filename);
             imageUrl = publicUrlData.publicUrl;
          }
        } catch (err) {
          console.error("Error al subir imagen", err);
        }
      }

      let updatedServices;
      
      if (editingSrvId) {
        updatedServices = services.map(s => s.id === editingSrvId ? {
          ...s, category: newSrvCategory, title: newSrvTitle, description: newSrvDesc, price: newSrvPrice, duration: newSrvDur, image: imageUrl
        } : s);
      } else {
        const newService = {
          id: Date.now().toString(),
          category: newSrvCategory,
          title: newSrvTitle,
          description: newSrvDesc,
          price: newSrvPrice,
          duration: newSrvDur,
          image: imageUrl
        };
        updatedServices = [...services, newService];
      }
      
      if (supabaseClient) {
        await supabaseClient.from('services').delete().neq('id', 'null');
        const { error } = await supabaseClient.from('services').insert(updatedServices);
        if (error) {
           alert('Hubo un error al guardar o subir el diseño: ' + error.message);
           return;
        }
      }
      
      cancelEditService();
      fetchServices();
    } finally {
      setIsSavingService(false);
    }
  };

  const startEditService = (srv: any) => {
    setEditingSrvId(srv.id);
    setNewSrvTitle(srv.title);
    setNewSrvCategory(srv.category);
    setNewSrvDesc(srv.description);
    setNewSrvPrice(srv.price);
    setNewSrvDur(srv.duration);
    setNewSrvImageBase64(null); // Reset file input
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditService = () => {
    setEditingSrvId(null);
    setNewSrvTitle(''); setNewSrvDesc(''); setNewSrvPrice('$'); setNewSrvDur('');
    setNewSrvImageBase64(null);
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este diseño por completo?')) return;
    const serviceToDelete = services.find(s => s.id === id);
    if (serviceToDelete && serviceToDelete.image && serviceToDelete.image.includes('supabase') && supabaseClient) {
       const filename = serviceToDelete.image.split('/catalogo/').pop();
       if (filename) await supabaseClient.storage.from('catalogo').remove([filename]);
    }
    
    const updatedServices = services.filter(s => s.id !== id);
    
    if (supabaseClient) {
      await supabaseClient.from('services').delete().neq('id', 'null');
      if (updatedServices.length > 0) {
        await supabaseClient.from('services').insert(updatedServices);
      }
    }
    
    fetchServices();
  };

  return (
    <div className="relative bg-[var(--color-bg-primary)] min-h-screen pb-10">
      <Navbar />

      <main className="px-5 py-8 flex flex-col gap-6 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          <div className="p-3.5 rounded-2xl bg-white shadow-sm border border-gray-100 w-fit">
            <Settings size={24} className="text-gray-900" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-medium text-gray-900 leading-tight">Panel de Administración</h1>
            <p className="text-gray-500 text-[13px] mt-1">Gestiona todo tu negocio desde aquí.</p>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar snap-x pb-2 mt-2">
          <button onClick={() => setActiveTab('availability')} className={`snap-start px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'availability' ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}><Calendar size={16}/> Disponibilidad</button>
          <button onClick={() => setActiveTab('bookings')} className={`snap-start px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'bookings' ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}><BookOpen size={16}/> Turnos</button>
          <button onClick={() => setActiveTab('services')} className={`snap-start px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'services' ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}><Scissors size={16}/> Diseños</button>
          <button onClick={() => setActiveTab('reminders')} className={`snap-start px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'reminders' ? 'bg-[#25D366] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}><Bell size={16}/> Recordatorios</button>
        </div>

        <div className="flex flex-col gap-10 mt-2">
          
          {/* TAB: AVAILABILITY */}
          {activeTab === 'availability' && (
            <AnimatePresence mode="popLayout">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                {/* (Availability Code Restored inside Tab) */}
                <h2 className="font-display font-medium text-xl mb-5 flex items-center gap-2">Añadir Disponibilidad</h2>
                <form onSubmit={handleSaveAvailability} className="space-y-5 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-3 block flex items-center gap-2">
                      <Calendar size={14} /> Selecciona Fecha
                    </label>
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 mb-2">
                      <div className="flex justify-between items-center mb-4 px-2">
                        <button type="button" onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"><ChevronLeft size={18} /></button>
                        <span className="font-display font-medium text-[15px] text-gray-900 capitalize">{monthNames[month]} {year}</span>
                        <button type="button" onClick={handleNextMonth} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"><ChevronRight size={18} /></button>
                      </div>
                      <div className="grid grid-cols-7 mb-3 text-center">
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (<span key={i} className="text-[10px] text-gray-400 font-bold uppercase">{d}</span>))}
                      </div>
                      <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center">
                        {calendarCells.map((day, idx) => {
                          if (day === null) return <div key={`empty-${idx}`} />;
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const cellDate = new Date(year, month, day);
                          const isPastDate = cellDate < today;
                          const isSelected = date === dateStr;
                          const hasExistingSlots = availabilities.some(a => a.date === dateStr);
                          return (
                            <button
                              key={dateStr} type="button" disabled={isPastDate} onClick={() => handleDateSelect(dateStr)}
                              className={`h-9 w-9 mx-auto rounded-full flex items-center justify-center text-[13px] transition-all relative ${isPastDate ? 'text-gray-300 opacity-40 cursor-not-allowed' : isSelected ? 'bg-[var(--color-text-primary)] text-white shadow-md font-semibold' : 'hover:bg-gray-200 text-gray-900 font-medium bg-white border border-gray-200'}`}
                            >
                              {day}
                              {hasExistingSlots && !isSelected && !isPastDate && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[var(--color-accent)]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-3 block flex items-center gap-2"><Clock size={14} /> Añadir Horarios (Turnos)</label>
                    <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 mb-4 flex flex-col items-center">
                      <div className="text-center font-display text-4xl tracking-tight font-medium text-gray-900 mb-6 flex items-baseline gap-1">{clockHour}:{clockMinute} <span className="text-lg text-gray-400 font-bold">{clockAmPm}</span></div>
                      <div className="w-56 h-56 rounded-full bg-white border border-gray-200 shadow-inner relative flex-shrink-0 touch-none">
                        <div className="absolute top-1/2 left-1/2 w-2.5 h-2.5 rounded-full bg-[var(--color-text-primary)] z-10" style={{ transform: 'translate(-50%, -50%)' }} />
                        <div className="absolute left-1/2 bottom-1/2 w-[2px] bg-[var(--color-text-primary)] origin-bottom transition-transform duration-300 z-0" style={{ height: '32%', marginLeft: '-1px', transform: `rotate(${clockHour * 30}deg)` }} />
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => {
                          const angle = (h * 30 - 90) * (Math.PI / 180);
                          const x = 50 + 40 * Math.cos(angle);
                          const y = 50 + 40 * Math.sin(angle);
                          return (
                            <button key={h} type="button" onClick={(e) => { e.preventDefault(); setClockHour(h); }} className={`absolute w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all z-10 ${clockHour === h ? 'bg-[var(--color-text-primary)] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`} style={{ top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' }}>{h}</button>
                          );
                        })}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full justify-center">
                        <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-inner overflow-hidden">{['00', '15', '30', '45'].map(m => (<button key={m} type="button" onClick={(e) => { e.preventDefault(); setClockMinute(m); }} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${clockMinute === m ? 'bg-gray-100 shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500'}`}>{m}</button>))}</div>
                        <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-inner overflow-hidden">{['AM', 'PM'].map(a => (<button key={a} type="button" onClick={(e) => { e.preventDefault(); setClockAmPm(a as 'AM'|'PM'); }} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${clockAmPm === a ? 'bg-[var(--color-accent)] shadow-sm text-[var(--color-text-primary)]' : 'text-gray-500'}`}>{a}</button>))}</div>
                      </div>
                      <button type="button" onClick={handleAddTime} className="w-full mt-6 bg-white border border-gray-300 hover:bg-gray-100 text-gray-900 rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 font-semibold text-sm"><Plus size={18} className="text-gray-500" /> Añadir Turno a la Lista</button>
                    </div>
                    {slotsArray.length > 0 ? (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-wrap gap-2.5">
                        <AnimatePresence>
                          {slotsArray.map(t => (
                            <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} key={t} className="bg-white text-gray-900 border border-gray-200 text-sm font-semibold pl-4 pr-1.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">{t}<button type="button" onClick={() => handleRemoveTime(t)} className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-full transition-colors"><X size={14} strokeWidth={3} /></button></motion.span>
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                       <p className="text-[12px] text-gray-400 bg-gray-50 border border-gray-100 border-dashed rounded-xl p-4 text-center">Selecciona una hora arriba y presiona "+" para añadir un turno.</p>
                    )}
                  </div>
                  <button type="submit" className="w-full mt-2 bg-[var(--color-text-primary)] hover:bg-black text-white rounded-full py-3.5 px-6 flex items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-95"><Plus size={16} /><span className="uppercase text-[11px] tracking-widest font-bold">Guardar Fecha</span></button>
                </form>

                <h2 className="font-display font-medium text-xl mt-10 mb-4">Agenda Actual</h2>
                <div className="space-y-4">
                  <AnimatePresence>
                    {availabilities.length === 0 ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-gray-50 border border-gray-200 border-dashed rounded-2xl text-center"><p className="text-gray-500 text-sm">No hay fechas configuradas.</p></motion.div>
                    ) : (
                      availabilities.map(item => (
                        <motion.div key={item.date} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 transition-all">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2"><Calendar size={16} className="text-gray-400" /><h4 className="font-display font-medium text-base text-gray-900">{item.date}</h4></div>
                            <button onClick={() => handleDeleteAvailability(item.date)} className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors bg-red-50/50" title="Eliminar día"><Trash2 size={16} className="fill-red-100/50" /></button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.slots.split(',').map((s: string, i: number) => (<span key={i} className="bg-gray-50 text-gray-700 text-[13px] border border-gray-200 font-medium px-3 py-1 rounded-full">{s.trim()}</span>))}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* TAB: BOOKINGS */}
          {activeTab === 'bookings' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="font-display font-medium text-xl mb-5 flex items-center gap-2">Consultar Turnos Reservados</h2>
              <div className="space-y-4">
                {bookings.length === 0 ? (
                  <div className="p-6 bg-gray-50 border border-gray-200 border-dashed rounded-2xl text-center"><p className="text-gray-500 text-sm">Nadie ha reservado aún.</p></div>
                ) : (
                  bookings.map((b, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-l-[var(--color-text-primary)] border-y border-r border-y-gray-100 border-r-gray-100 flex flex-col gap-3 relative group">
                      <div className="absolute top-4 right-4 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDeleteBooking(b)} className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors bg-red-50/50" title="Cancelar Cita">
                          <Trash2 size={16} className="fill-red-100/50" />
                        </button>
                      </div>
                      <div className="flex justify-between items-start pr-10">
                        <h4 className="font-bold text-gray-900">{b.name}</h4>
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-md">{b.date} • {b.time}</span>
                      </div>
                      <div className="text-sm text-gray-600"><span className="font-semibold text-gray-400 uppercase text-[10px] tracking-widest mr-2">Servicio</span> {b.service}</div>
                      <div className="text-sm text-gray-600"><span className="font-semibold text-gray-400 uppercase text-[10px] tracking-widest mr-2">Teléfono</span> <a href={`tel:${b.phone}`} className="text-blue-600 hover:underline">{b.phone}</a></div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* TAB: SERVICES */}
          {activeTab === 'services' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-display font-medium text-xl flex items-center gap-2">
                  {editingSrvId ? 'Editar Diseño' : 'Añadir Nuevo Diseño'}
                </h2>
                {editingSrvId && (
                  <button type="button" onClick={cancelEditService} className="text-sm border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg font-medium text-gray-600 transition-colors shadow-sm">
                    Cancelar
                  </button>
                )}
              </div>
              <form onSubmit={handleSaveService} className={`space-y-4 bg-white p-5 rounded-3xl shadow-sm mb-10 transition-all border ${editingSrvId ? 'border-blue-300 ring-4 ring-blue-50' : 'border-gray-100'}`}>
                <input type="text" placeholder="Título (ej. Manicura Rusa)" required value={newSrvTitle} onChange={e => setNewSrvTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none text-sm focus:border-gray-900 transition-all" />
                <div className="grid grid-cols-2 gap-4">
                  <select value={newSrvCategory} onChange={e => setNewSrvCategory(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none text-sm focus:border-gray-900 transition-all">
                    <option value="Clásicas">Clásicas</option>
                    <option value="Acrílico">Acrílico</option>
                    <option value="Nail Art">Nail Art</option>
                    <option value="Pedicura">Pedicura</option>
                  </select>
                  <input type="text" placeholder="Precio (ej. $25)" required value={newSrvPrice} onChange={e => setNewSrvPrice(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none text-sm focus:border-gray-900 transition-all" />
                </div>
                <input type="text" placeholder="Duración (ej. 45 min)" required value={newSrvDur} onChange={e => setNewSrvDur(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none text-sm focus:border-gray-900 transition-all" />
                <textarea placeholder="Descripción del diseño..." required value={newSrvDesc} onChange={e => setNewSrvDesc(e.target.value)} className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none text-sm resize-none focus:border-gray-900 transition-all" />

                {/* Image Upload Input */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Imagen del Diseño</label>
                  <div className="flex items-center gap-4">
                    {(newSrvImageBase64 || (editingSrvId && services.find(s => s.id === editingSrvId)?.image)) ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-300">
                        <img src={newSrvImageBase64 || services.find(s => s.id === editingSrvId)?.image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : null}
                    <input 
                      id="image-upload" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[var(--color-text-primary)] file:text-white file:font-semibold hover:file:bg-black cursor-pointer transition-colors" 
                    />
                  </div>
                </div>

                <button type="submit" disabled={isSavingService} className={`w-full flex items-center justify-center text-white rounded-xl py-3.5 font-bold uppercase tracking-widest text-[11px] shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${editingSrvId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[var(--color-text-primary)] hover:bg-black'}`}>
                  {isSavingService ? (
                    <><Loader2 size={16} className="animate-spin mr-2"/> PROCESANDO...</>
                  ) : editingSrvId ? (
                    <><CheckCircle2 size={14} className="inline mr-2"/> Guardar Cambios</>
                  ) : (
                    <><Plus size={14} className="inline mr-2"/> Guardar Diseño</>
                  )}
                </button>
              </form>

              <h2 className="font-display font-medium text-xl mb-4">Catálogo de Diseños</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map(srv => (
                  <div key={srv.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm relative group transition-all border ${editingSrvId === srv.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100'}`}>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button type="button" onClick={() => startEditService(srv)} className="bg-white/90 p-2 rounded-full text-blue-600 hover:bg-blue-50 shadow-sm border border-gray-100"><Pencil size={14}/></button>
                      <button type="button" onClick={() => handleDeleteService(srv.id)} className="bg-white/90 p-2 rounded-full text-red-500 hover:bg-red-50 shadow-sm border border-gray-100"><Trash2 size={14}/></button>
                    </div>
                    <div className="p-4">
                      <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 overflow-hidden border border-gray-200">
                        <img src={srv.image} alt={srv.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="uppercase tracking-widest font-bold text-gray-400 text-[9px] mb-1">{srv.category}</div>
                      <h4 className="font-bold text-gray-900 mb-1 leading-tight">{srv.title}</h4>
                      <div className="text-gray-500 text-xs mb-3 line-clamp-2">{srv.description}</div>
                      <div className="flex justify-between items-center text-xs font-semibold text-gray-900 bg-gray-50 -mx-4 -mb-4 px-4 py-2 border-t border-gray-100">
                        <span>{srv.price}</span>
                        <span className="flex items-center gap-1 text-gray-500"><Clock size={12}/> {srv.duration}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB: REMINDERS */}
          {activeTab === 'reminders' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-medium text-xl flex items-center gap-2">
                  <Bell size={20} /> Recordatorios WhatsApp
                </h2>
                <button 
                  onClick={fetchReminders}
                  className="text-xs border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg font-medium text-gray-600 transition-colors shadow-sm"
                >
                  Actualizar
                </button>
              </div>

              <p className="text-gray-500 text-[13px] mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                🔔 Envía recordatorios automáticos a tus clientes <strong>24 a 48 horas antes</strong> de su cita.
                Haz clic en <strong>"Enviar Recordatorio"</strong> para abrir WhatsApp con un mensaje predefinido.
              </p>

              {reminders.length === 0 ? (
                <div className="p-8 bg-gray-50 border border-gray-200 border-dashed rounded-2xl text-center">
                  <Bell size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm font-medium">No hay citas próximas para recordar.</p>
                  <p className="text-gray-400 text-xs mt-1">Cuando alguien reserve, aparecerá aquí 1-7 días antes.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {groupedReminders.map(({ date, items, dateLabel, badge, badgeClass }) => (
                      <div key={date}>
                        <div className="flex items-center gap-3 mb-3 mt-6 first:mt-0">
                          <Calendar size={16} className="text-gray-400" />
                          <h3 className="font-display font-semibold text-gray-900 capitalize">{dateLabel}</h3>
                          {badge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>{badge}</span>
                          )}
                          <div className="flex-1 border-t border-gray-100" />
                        </div>
                        <div className="space-y-3">
                          {items.map((reminder: any) => {
                            const sent = reminderSent.includes(reminder.id);
                            return (
                              <motion.div
                                key={reminder.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                                  reminder.isTomorrow 
                                    ? 'border-amber-200 ring-1 ring-amber-100' 
                                    : 'border-gray-100'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-bold text-gray-900 truncate">{reminder.name}</h4>
                                      <span className="bg-gray-100 text-gray-600 text-[11px] font-bold px-2 py-0.5 rounded-full">{reminder.time}</span>
                                    </div>
                                    <p className="text-[13px] text-gray-600">
                                      <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-widest mr-1.5">Servicio</span>
                                      {reminder.service || 'No especificado'}
                                    </p>
                                    <p className="text-[13px] text-gray-600 mt-0.5">
                                      <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-widest mr-1.5">Teléfono</span>
                                      {reminder.phone || '—'}
                                    </p>
                                  </div>

                                  <div className="flex flex-col gap-2 flex-shrink-0">
                                    {reminder.whatsappReminderUrl ? (
                                      <a
                                        href={reminder.whatsappReminderUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => {
                                          const updated = [...reminderSent, reminder.id];
                                          setReminderSent(updated);
                                          try { sessionStorage.setItem('admin_reminder_sent', JSON.stringify(updated)); } catch {}
                                        }}
                                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 ${
                                          sent
                                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                            : 'bg-[#25D366] text-white hover:bg-[#1ebe5d] hover:shadow-md hover:shadow-[#25D366]/20'
                                        }`}
                                      >
                                        <MessageCircle size={14} className={sent ? 'fill-green-600' : 'fill-white'} strokeWidth={1.5} />
                                        {sent ? 'Enviado ✓' : 'Recordatorio'}
                                      </a>
                                    ) : (
                                      <span className="text-[11px] text-gray-400 italic">Sin teléfono</span>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

        </div>

        {/* WhatsApp Floating Button */}
        <WhatsAppButton />
      </main>
    </div>
  );
}
