import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Initial default data if completely empty
const DEFAULT_SERVICES = [
  { id: 'rusa', category: 'Clásicas', title: 'Manicura Rusa', description: 'Limpieza profunda de cutícula con fresno para un acabado impecable y mayor durabilidad.', price: '$25', duration: '45 min', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?auto=format&fit=crop&w=800&q=80' },
  { id: 'acrilicas', category: 'Acrílico', title: 'Acrílicas Esculpidas', description: 'Extensión de uñas esculpidas a medida, adaptadas a la forma natural de tus manos.', price: '$45', duration: '2 Horas', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80' },
  { id: 'babyboomer', category: 'Acrílico', title: 'Baby Boomer', description: 'Elegante difuminado en tonos nude y blanco, el clásico reinventado de las uñas francesas.', price: '$50', duration: '2 Horas', image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=800&q=80' },
  { id: 'nailart3d', category: 'Nail Art', title: 'Nail Art 3D Extremo', description: 'Diseños florales y figuras tridimensionales, incrustaciones de cristalería y joyas.', price: 'Desde $15', duration: '+30 min', image: 'https://images.unsplash.com/photo-1632870198032-475306fd1d93?auto=format&fit=crop&w=800&q=80' },
  { id: 'minimalista', category: 'Nail Art', title: 'Diseño Minimalista', description: 'Trazos finos, puntos sutiles, o pequeños detalles en pan de oro sobre base neutra.', price: 'Desde $10', duration: '+20 min', image: 'https://images.unsplash.com/photo-1599419163071-2edca5ba93de?auto=format&fit=crop&w=800&q=80' },
  { id: 'pedicuraspa', category: 'Pedicura', title: 'Pedicura Spa', description: 'Sumérgete en la relajación profunda con exfoliación, masaje y esmaltado perfecto.', price: '$35', duration: '1 Hora', image: 'https://images.unsplash.com/photo-1516975080661-46bfa2c554af?auto=format&fit=crop&w=800&q=80' },
  { id: 'semi', category: 'Clásicas', title: 'Esmaltado Semi-permanente', description: 'Brillo duradero y color intacto por semanas con nuestro sistema en gel protector.', price: '$20', duration: '40 min', image: 'https://images.unsplash.com/photo-1595868426543-9892c902377b?auto=format&fit=crop&w=800&q=80' }
];

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (!supabase) {
  console.log("⚠️ Supabase no está configurado. La app funcionará en modo lectura (con datos mock) hasta que se añadan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.");
} else {
  console.log("✅ Servidor conectado a Supabase");
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

// --- API Routes ---
  app.get('/api/services', async (req, res) => {
    try {
      if (!supabase) return res.json(DEFAULT_SERVICES);
      
      const { data, error } = await supabase.from('services').select('*');
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return res.json(DEFAULT_SERVICES);
      }
      res.json(data);
    } catch (err) {
      console.error(err);
      res.json(DEFAULT_SERVICES); // Fallback to avoid breaking frontend
    }
  });

  app.post('/api/upload', async (req, res) => {
    try {
      const { title, imageBase64, oldImageUrl } = req.body;
      if (!title || !imageBase64) return res.status(400).json({error: 'Missing file'});
      
      if (supabase && oldImageUrl && oldImageUrl.includes('/catalogo/')) {
        // Extract the filename from the end of the URL
        const oldFilename = oldImageUrl.split('/catalogo/').pop();
        if (oldFilename) {
           await supabase.storage.from('catalogo').remove([oldFilename]);
        }
      }

      const cleanTitle = title.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.]/g, '');
      const filename = `${cleanTitle}_${Date.now()}.jpg`;
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      
      if (supabase) {
        const buffer = Buffer.from(base64Data, 'base64');
        const { data, error } = await supabase.storage
          .from('catalogo')
          .upload(filename, buffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (error) {
           console.error("Supabase Storage Error:", error);
           throw error;
        }

        const { data: publicUrlData } = supabase.storage
          .from('catalogo')
          .getPublicUrl(filename);
          
        return res.json({ url: publicUrlData.publicUrl });
      }

      // Fallback for local dev if Supabase is missing (does not physically write anywhere now)
      res.json({ url: `https://via.placeholder.com/800x600?text=${encodeURIComponent(cleanTitle)}` });
    } catch (e) {
      console.error(e);
      res.status(500).json({error: 'Upload failed'});
    }
  });

  app.delete('/api/upload', async (req, res) => {
    try {
      const { imageUrl } = req.body;
      if (supabase && imageUrl && imageUrl.includes('/catalogo/')) {
        const filename = imageUrl.split('/catalogo/').pop();
        if (filename) {
           await supabase.storage.from('catalogo').remove([filename]);
        }
      }
      res.json({ success: true });
    } catch(e) {
      console.error(e);
      res.status(500).json({error: 'Delete image failed'});
    }
  });

  app.post('/api/services', async (req, res) => {
    try {
      if (!supabase) return res.json({ success: true, message: 'Simulated locally' });
      
      // Clean target sync (Delete all and insert new ones)
      const { error: deleteError } = await supabase.from('services').delete().neq('id', 'null');
      if (deleteError) {
         console.error("Delete Existing Services Error:", deleteError);
         throw deleteError;
      }
      
      if (req.body && req.body.length > 0) {
         const { error: insertError } = await supabase.from('services').insert(req.body);
         if (insertError) {
            console.error("Insert New Services Error:", insertError);
            throw insertError;
         }
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      const errorMessage = typeof err === 'object' ? JSON.stringify(err) : err.toString();
      res.status(500).json({ error: err.message || err.details || errorMessage || 'Failed to sync services' });
    }
  });

  app.get('/api/bookings', async (req, res) => {
    try {
      if (!supabase) return res.json([]);
      const { data, error } = await supabase.from('bookings').select('*');
      if (error) throw error;
      
      // sort from newest to oldest date roughly
      (data || []).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(data || []);
    } catch (err) {
      console.error(err);
      res.json([]);
    }
  });

  app.get('/api/availability', async (req, res) => {
    try {
      if (!supabase) return res.json([]);
      const { data, error } = await supabase.from('availabilities').select('*');
      if (error) throw error;
      
      // Post-process to ensure no duplicate slots in response
      const cleanedData = (data || []).map(row => {
        if (row.slots) {
          const slotsArray = row.slots.split(',').map((s: string) => s.trim()).filter(Boolean);
          row.slots = [...new Set(slotsArray)].join(', ');
        }
        return row;
      });

      res.json(cleanedData);
    } catch (err) {
      console.error(err);
      res.json([]);
    }
  });

  app.post('/api/availability', async (req, res) => {
    try {
      let { date, slots } = req.body;
      if (!date || slots === undefined) {
        return res.status(400).json({ error: 'Missing date or slots' });
      }

      if (!supabase) return res.json({ message: 'Dummy response', data: [] });

      // Clean slots (remove duplicates and empty strings)
      if (typeof slots === 'string') {
        const slotsArray = slots.split(',').map(s => s.trim()).filter(Boolean);
        slots = [...new Set(slotsArray)].join(', ');
      }

      const { error: upsertError } = await supabase.from('availabilities').upsert({ date, slots }, { onConflict: 'date' });
      if (upsertError) {
         console.error("Supabase Upsert Error:", upsertError);
         throw upsertError;
      }
      
      const { data, error: selectError } = await supabase.from('availabilities').select('*');
      if (selectError) throw selectError;

      // Sort by date
      if (data) data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      res.json({ message: 'Availability updated successfully', data });
    } catch (err: any) {
      console.error(err);
      const errorMessage = typeof err === 'object' ? JSON.stringify(err) : err.toString();
      res.status(500).json({ error: err.message || err.details || errorMessage || 'Failed to update availability' });
    }
  });

  app.delete('/api/availability', async (req, res) => {
    try {
      const { date } = req.query;
      if (!date) return res.status(400).json({ error: 'Missing date' });

      if (supabase) {
         await supabase.from('availabilities').delete().eq('date', date);
      }
      
      const { data } = supabase ? await supabase.from('availabilities').select('*') : { data: [] };
      res.json({ message: 'Availability removed successfully', data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to remove availability' });
    }
  });

  app.post('/api/book', async (req, res) => {
    try {
      const { selectedDate, selectedTime, name, phone, serviceTitle } = req.body;

      if (!selectedDate || !selectedTime || !name || !phone) {
         return res.status(400).json({ error: 'Missing booking details' });
      }

      if (supabase) {
        // Find availability for this date
        const { data: avData, error: singleError } = await supabase.from('availabilities').select('*').eq('date', selectedDate).single();
        
        let targetSlots = '';
        if (avData) {
          targetSlots = avData.slots;
        } else if (singleError && singleError.code === 'PGRST116') {
          // Multiple rows encountered for the same date. We must recover by fetching all, merging, and cleaning up.
          const { data: allAvs } = await supabase.from('availabilities').select('*').eq('date', selectedDate);
          if (allAvs && allAvs.length > 0) {
             const allSlots = allAvs.map(a => a.slots).join(', ');
             const uniqueSlots = [...new Set(allSlots.split(',').map(s => s.trim()).filter(Boolean))];
             targetSlots = uniqueSlots.join(', ');
             await supabase.from('availabilities').delete().eq('date', selectedDate); // wipe duplicates
             await supabase.from('availabilities').insert({ date: selectedDate, slots: targetSlots }); // recreate cleanly
          }
        }
        
        if (targetSlots) {
           const slotsArray = targetSlots.split(',').map((s: string) => s.trim());
           const newSlotsArray = slotsArray.filter((s: string) => s !== selectedTime);
           
           if (newSlotsArray.length === 0) {
              const { error: delErr } = await supabase.from('availabilities').delete().eq('date', selectedDate);
              if (delErr) { console.error("Del avErr:", delErr); throw delErr; }
           } else {
              const { error: upErr } = await supabase.from('availabilities').update({ slots: newSlotsArray.join(', ') }).eq('date', selectedDate);
              if (upErr) { console.error("Up avErr:", upErr); throw upErr; }
           }
        }

        // Insert booking
        const { error: insertError } = await supabase.from('bookings').insert({
           date: selectedDate,
           time: selectedTime,
           name,
           phone,
           service: serviceTitle || ''
        });
        if (insertError) {
          console.error("Supabase Bookings Error:", insertError);
          throw insertError;
        }
      }

      // WhatsApp notification for admin
      let whatsappAdminUrl = '';
      if (phone) {
        const clientPhone = phone.replace(/\D/g, '');
        const adminMessage = encodeURIComponent(
          `🆕 Hola ${name}, soy de D´Uñas 🏠✨\n\nTe confirmo tu reserva:\n💅 Servicio: ${serviceTitle || 'No especificado'}\n📅 Fecha: ${selectedDate}\n⏰ Hora: ${selectedTime}\n\n¿Todo bien? ¡Te esperamos! 😊`
        );
        whatsappAdminUrl = `https://wa.me/${clientPhone}?text=${adminMessage}`;
        console.log(`\n📲 NUEVA RESERVA:`);
        console.log(`   👤 ${name}`);
        console.log(`   📞 ${phone}`);
        console.log(`   💅 ${serviceTitle || 'No especificado'}`);
        console.log(`   📅 ${selectedDate} a las ${selectedTime}`);
        console.log(`   🔗 Contactar cliente: ${whatsappAdminUrl}`);
      }

      res.json({ 
        success: true, 
        message: 'Reservation confirmed',
        whatsappAdminUrl
      });
    } catch (err: any) {
      console.error(err);
      const errorMessage = typeof err === 'object' ? JSON.stringify(err) : err.toString();
      res.status(500).json({ error: err.message || err.details || errorMessage || 'Failed to complete booking' });
    }
  });

  // --- Email notifications ---
  async function sendBookingEmails(params: {
    name: string;
    phone: string;
    email: string;
    serviceTitle: string;
    selectedDate: string;
    selectedTime: string;
  }) {
    const { name, phone, email, serviceTitle, selectedDate, selectedTime } = params;
    
    const smtpEmail = process.env.SMTP_EMAIL || '';
    const smtpPassword = process.env.SMTP_PASSWORD || '';
    const adminEmail = process.env.ADMIN_EMAIL || '';
    
    if (!smtpEmail || !smtpPassword || !adminEmail) {
      console.log('⚠️ Email no configurado. Faltan SMTP_EMAIL, SMTP_PASSWORD o ADMIN_EMAIL');
      return { success: false, error: 'Email not configured' };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    });

    // 1. Email to ADMIN
    const adminHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f9f9f9; border-radius: 16px; overflow: hidden;">
        <div style="background: #111827; padding: 24px; text-align: center;">
          <h1 style="color: #E5C3C6; margin: 0; font-size: 22px; letter-spacing: 2px;">D´UÑAS</h1>
          <p style="color: #9CA3AF; margin: 4px 0 0; font-size: 13px;">Nueva Reserva Recibida ✨</p>
        </div>
        <div style="padding: 28px 24px; background: white;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Cliente</td><td style="padding: 8px 0; font-size: 15px; font-weight: 600; text-align: right;">${name}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; border-top: 1px solid #f3f4f6;">Teléfono</td><td style="padding: 8px 0; font-size: 15px; text-align: right; border-top: 1px solid #f3f4f6;">${phone}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; border-top: 1px solid #f3f4f6;">Servicio</td><td style="padding: 8px 0; font-size: 15px; font-weight: 500; text-align: right; border-top: 1px solid #f3f4f6;">${serviceTitle}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; border-top: 1px solid #f3f4f6;">Fecha</td><td style="padding: 8px 0; font-size: 15px; font-weight: 600; text-align: right; border-top: 1px solid #f3f4f6;">${selectedDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; border-top: 1px solid #f3f4f6;">Hora</td><td style="padding: 8px 0; font-size: 15px; font-weight: 600; text-align: right; border-top: 1px solid #f3f4f6;">${selectedTime}</td></tr>
          </table>
        </div>
        <div style="background: #f3f4f6; padding: 16px 24px; text-align: center; font-size: 12px; color: #9CA3AF;">
          Notificación automática — D´Uñas Nail Studio
        </div>
      </div>
    `;

    // 2. Email to CLIENT
    const clientHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f9f9f9; border-radius: 16px; overflow: hidden;">
        <div style="background: #111827; padding: 24px; text-align: center;">
          <div style="width: 48px; height: 48px; background: #10B981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <span style="color: white; font-size: 24px;">✅</span>
          </div>
          <h1 style="color: #E5C3C6; margin: 0; font-size: 20px; letter-spacing: 1px;">Reserva Confirmada</h1>
          <p style="color: #9CA3AF; margin: 4px 0 0; font-size: 13px;">¡Gracias por elegir D´Uñas, ${name}! 🙌</p>
        </div>
        <div style="padding: 28px 24px; background: white;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Servicio</td><td style="padding: 8px 0; font-size: 15px; font-weight: 500; text-align: right;">${serviceTitle}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; border-top: 1px solid #f3f4f6;">Día</td><td style="padding: 8px 0; font-size: 15px; font-weight: 600; text-align: right; border-top: 1px solid #f3f4f6;">${selectedDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; border-top: 1px solid #f3f4f6;">Hora</td><td style="padding: 8px 0; font-size: 15px; font-weight: 600; text-align: right; border-top: 1px solid #f3f4f6;">${selectedTime}</td></tr>
          </table>
          <div style="margin-top: 24px; padding: 16px; background: #f3f4f6; border-radius: 12px; font-size: 13px; color: #6B7280; text-align: center;">
            📞 Si necesitas cancelar o reagendar, contáctanos al <strong style="color: #111827;">${process.env.WHATSAPP_NUMBER || 'nuestro WhatsApp'}</strong>
          </div>
        </div>
        <div style="background: #f3f4f6; padding: 16px 24px; text-align: center; font-size: 12px; color: #9CA3AF;">
          D´Uñas Nail Studio 💅✨
        </div>
      </div>
    `;

    try {
      // Send to admin
      if (adminEmail) {
        await transporter.sendMail({
          from: `"D´Uñas" <${smtpEmail}>`,
          to: adminEmail,
          subject: `🆕 Nueva Reserva — ${name} — ${serviceTitle}`,
          html: adminHtml,
        });
        console.log(`✅ Email de notificación enviado al admin: ${adminEmail}`);
      }

      // Send to client
      if (email) {
        try {
          await transporter.sendMail({
            from: `"D´Uñas" <${smtpEmail}>`,
            to: email,
            subject: `✅ Reserva Confirmada — D´Uñas — ${serviceTitle}`,
            html: clientHtml,
          });
          console.log(`✅ Comprobante enviado al cliente: ${email}`);
        } catch (clientErr: any) {
          console.error(`❌ Error al enviar email al cliente ${email}:`, clientErr.message);
        }
      }
      
      console.log(`\n📧 NOTIFICACIONES EMAIL:`);
      console.log(`   📨 Admin: ${adminEmail} ✅`);
      console.log(`   📨 Cliente: ${email || 'No proporcionó email'} ${email ? '✅' : '⏭️'}`);
      
      return { success: true, adminNotified: true };
    } catch (err: any) {
      console.error('❌ Error al enviar email:', err.message);
      return { success: false, error: err.message };
    }
  }

  app.post('/api/send-booking-emails', async (req, res) => {
    try {
      const { name, phone, email, serviceTitle, selectedDate, selectedTime } = req.body;
      
      if (!name || !phone || !selectedDate || !selectedTime) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await sendBookingEmails({
        name,
        phone,
        email: email || '',
        serviceTitle: serviceTitle || 'No especificado',
        selectedDate,
        selectedTime,
      });

      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to send emails' });
    }
  });

  app.get('/api/reminders', async (req, res) => {
    try {
      if (!supabase) return res.json([]);
      
      const { data } = await supabase.from('bookings').select('*');
      if (!data) return res.json([]);

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      // Tomorrow and day after tomorrow
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const dayAfter = new Date(now);
      dayAfter.setDate(dayAfter.getDate() + 2);
      const dayAfterStr = dayAfter.toISOString().split('T')[0];

      // Weekly group: up to 7 days from now
      const weekFromNow = new Date(now);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const weekFromNowStr = weekFromNow.toISOString().split('T')[0];

      // Filter upcoming bookings (from tomorrow up to 7 days)
      const upcoming = data.filter((b: any) => {
        const bookingDate = b.date;
        return bookingDate >= tomorrowStr && bookingDate <= weekFromNowStr;
      });

      // Sort by date then time
      upcoming.sort((a: any, b: any) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });

      // Generate WhatsApp reminder URLs for each booking
      const reminders = upcoming.map((b: any) => {
        const clientPhone = (b.phone || '').replace(/\D/g, '');
        let whatsappReminderUrl = '';
        
        if (clientPhone) {
          const isToday = b.date === todayStr;
          const isTomorrow = b.date === tomorrowStr;
          
          let dayLabel = '';
          if (isToday) dayLabel = 'hoy';
          else if (isTomorrow) dayLabel = 'mañana';
          else {
            const dateObj = new Date(b.date + 'T12:00:00');
            const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
            dayLabel = `el ${dayNames[dateObj.getDay()]} ${b.date}`;
          }

          const message = encodeURIComponent(
            `¡Hola ${b.name}! 🙌✨\n\nTe recordamos que tu cita en *D´Uñas* es ${dayLabel} a las *${b.time}*.\n💅 Servicio: ${b.service || 'No especificado'}\n\nSi necesitas reagendar o cancelar, responde este mensaje. ¡Te esperamos! 😊`
          );
          whatsappReminderUrl = `https://wa.me/${clientPhone}?text=${message}`;
        }
        
        return {
          id: b.id || `${b.date}-${b.time}-${b.name}`,
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

      res.json(reminders);
    } catch (err) {
      console.error(err);
      res.json([]);
    }
  });

  app.delete('/api/bookings', async (req, res) => {
    try {
      const { date, time, name } = req.body;
      if (!date || !time || !name) {
        return res.status(400).json({ error: 'Missing booking identifiers' });
      }

      if (supabase) {
        // 1. Remove from bookings
        await supabase.from('bookings').delete().match({ date, time, name });

        // 2. Reactivate time slot in availability
        const { data: avData, error: singleError } = await supabase.from('availabilities').select('*').eq('date', date).single();
        
        let existingSlotsString = '';
        if (avData) {
          existingSlotsString = avData.slots || '';
        } else if (singleError && singleError.code === 'PGRST116') {
          const { data: allAvs } = await supabase.from('availabilities').select('*').eq('date', date);
          if (allAvs && allAvs.length > 0) {
             const allSlots = allAvs.map(a => a.slots).join(', ');
             const uniqueSlots = [...new Set(allSlots.split(',').map(s => s.trim()).filter(Boolean))];
             existingSlotsString = uniqueSlots.join(', ');
             // Clean duplicates beforehand
             await supabase.from('availabilities').delete().eq('date', date);
             await supabase.from('availabilities').insert({ date, slots: existingSlotsString });
          }
        }
        
        let hasData = !!avData || (singleError && singleError.code === 'PGRST116');

        if (hasData) {
          let slotsArray = existingSlotsString ? existingSlotsString.split(',').map((s: string) => s.trim()) : [];
          if (!slotsArray.includes(time)) {
            slotsArray.push(time);
            slotsArray.sort((a: string, b: string) => new Date(`1970-01-01 ${a}`).getTime() - new Date(`1970-01-01 ${b}`).getTime());
            await supabase.from('availabilities').update({ slots: slotsArray.join(', ') }).eq('date', date);
          }
        } else {
          // Create availability if it didn't exist
          await supabase.from('availabilities').insert({ date, slots: time });
        }
      }

      res.json({ success: true, message: 'Reservation deleted and slot reactivated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  });

  // --- Automatic Email Reminders ---
  async function sendReminderEmails() {
    const smtpEmail = process.env.SMTP_EMAIL || '';
    const smtpPassword = process.env.SMTP_PASSWORD || '';
    const adminEmail = process.env.ADMIN_EMAIL || '';
    
    if (!smtpEmail || !smtpPassword || !adminEmail || !supabase) {
      console.log('⚠️ No se pueden enviar recordatorios. Faltan configuraciones.');
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    });

    try {
      const { data: bookings } = await supabase.from('bookings').select('*');
      if (!bookings || bookings.length === 0) return;

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Find bookings for tomorrow
      const tomorrowBookings = bookings.filter((b: any) => b.date === tomorrowStr);

      if (tomorrowBookings.length === 0) {
        console.log('📅 No hay reservas para mañana.');
        return;
      }

      console.log(`\n📧 ENVIANDO RECORDATORIOS PARA MAÑANA (${tomorrowStr}):`);

      for (const booking of tomorrowBookings) {
        const clientPhone = (booking.phone || '').replace(/\D/g, '');
        
        // Email reminder to client
        if (booking.email) {
          const clientReminderHtml = `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f9f9f9; border-radius: 16px; overflow: hidden;">
              <div style="background: #111827; padding: 24px; text-align: center;">
                <div style="width: 48px; height: 48px; background: #F59E0B; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                  <span style="color: white; font-size: 24px;">⏰</span>
                </div>
                <h1 style="color: #E5C3C6; margin: 0; font-size: 20px; letter-spacing: 1px;">Recordatorio de Cita</h1>
                <p style="color: #9CA3AF; margin: 4px 0 0; font-size: 13px;">¡Hola ${booking.name}, te esperamos mañana!</p>
              </div>
              <div style="padding: 28px 24px; background: white;">
                <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                  Te recordamos que tienes una cita programada para <strong>mañana</strong>:
                </p>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Servicio</td><td style="padding: 8px 0; font-size: 15px; font-weight: 500; text-align: right;">${booking.service || 'No especificado'}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; border-top: 1px solid #f3f4f6;">Hora</td><td style="padding: 8px 0; font-size: 15px; font-weight: 600; text-align: right; border-top: 1px solid #f3f4f6;">${booking.time}</td></tr>
                </table>
                <div style="margin-top: 24px; padding: 16px; background: #FEF3C7; border-radius: 12px; font-size: 13px; color: #92400E; text-align: center;">
                  📞 Si necesitas cancelar o reagendar, contáctanos al <strong>${process.env.WHATSAPP_NUMBER || 'nuestro WhatsApp'}</strong>
                </div>
              </div>
              <div style="background: #f3f4f6; padding: 16px 24px; text-align: center; font-size: 12px; color: #9CA3AF;">
                D´Uñas Nail Studio 💅✨
              </div>
            </div>
          `;

          try {
            await transporter.sendMail({
              from: `"D´Uñas" <${smtpEmail}>`,
              to: booking.email,
              subject: `⏰ Recordatorio: Tu cita es mañana — D´Uñas`,
              html: clientReminderHtml,
            });
            console.log(`   ✅ Recordatorio enviado a: ${booking.email}`);
          } catch (emailErr: any) {
            console.error(`   ❌ Error al enviar email a ${booking.email}:`, emailErr.message);
          }
        }

        // Also send reminder to admin
        const adminReminderHtml = `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f9f9f9; border-radius: 16px; overflow: hidden;">
            <div style="background: #111827; padding: 24px; text-align: center;">
              <h1 style="color: #E5C3C6; margin: 0; font-size: 22px; letter-spacing: 2px;">D´UÑAS</h1>
              <p style="color: #F59E0B; margin: 4px 0 0; font-size: 13px;">📅 Recordatorio de Citas para Mañana</p>
            </div>
            <div style="padding: 28px 24px; background: white;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Cliente</td><td style="padding: 8px 0; font-size: 15px; font-weight: 600; text-align: right;">${booking.name}</td></tr>
                <tr><td style="padding: 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; border-top: 1px solid #f3f4f6;">Teléfono</td><td style="padding: 8px 0; font-size: 15px; text-align: right; border-top: 1px solid #f3f4f6;">${booking.phone}</td></tr>
                <tr><td style="padding: 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; border-top: 1px solid #f3f4f6;">Servicio</td><td style="padding: 8px 0; font-size: 15px; font-weight: 500; text-align: right; border-top: 1px solid #f3f4f6;">${booking.service || 'No especificado'}</td></tr>
                <tr><td style="padding: 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; border-top: 1px solid #f3f4f6;">Hora</td><td style="padding: 8px 0; font-size: 15px; font-weight: 600; text-align: right; border-top: 1px solid #f3f4f6;">${booking.time}</td></tr>
              </table>
              ${clientPhone ? `
              <a href="https://wa.me/${clientPhone}?text=${encodeURIComponent(`¡Hola ${booking.name}! 🙌 Te recordamos que tu cita en D´Uñas es mañana a las ${booking.time}. ¡Te esperamos! 😊`)}" style="display: block; margin-top: 20px; padding: 14px; background: #25D366; color: white; text-align: center; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px;">
                📲 Enviar Recordatorio por WhatsApp
              </a>
              ` : ''}
            </div>
            <div style="background: #f3f4f6; padding: 16px 24px; text-align: center; font-size: 12px; color: #9CA3AF;">
              Notificación automática — D´Uñas Nail Studio
            </div>
          </div>
        `;

        try {
          await transporter.sendMail({
            from: `"D´Uñas" <${smtpEmail}>`,
            to: adminEmail,
            subject: `📅 Recordatorio: Cita de ${booking.name} mañana a las ${booking.time}`,
            html: adminReminderHtml,
          });
          console.log(`   ✅ Recordatorio enviado al admin para: ${booking.name}`);
        } catch (emailErr: any) {
          console.error(`   ❌ Error al enviar recordatorio al admin:`, emailErr.message);
        }
      }

      console.log(`\n✅ Recordatorios procesados para ${tomorrowBookings.length} reserva(s).\n`);
    } catch (err: any) {
      console.error('❌ Error al procesar recordatorios:', err.message);
    }
  }

  // Manual trigger for reminders (admin can call this endpoint)
  app.post('/api/send-reminders', async (req, res) => {
    try {
      await sendReminderEmails();
      res.json({ success: true, message: 'Recordatorios procesados' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to send reminders' });
    }
  });

  // Schedule automatic reminders (runs daily at 8 PM)
  function scheduleReminders() {
    const now = new Date();
    const scheduled = new Date(now);
    scheduled.setHours(20, 0, 0, 0); // 8:00 PM
    
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    
    const delay = scheduled.getTime() - now.getTime();
    
    console.log(`\n⏰ Recordatorios automáticos programados para: ${scheduled.toLocaleString()}`);
    
    setTimeout(async () => {
      console.log('\n🔔 Ejecutando recordatorios automáticos...');
      await sendReminderEmails();
      scheduleReminders(); // Reschedule for next day
    }, delay);
  }

  // Start the reminder scheduler
  scheduleReminders();

// Export app for Serverless environments like Vercel
export default app;

// Vite integration
if (process.env.NODE_ENV !== 'production') {
  createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  }).then(vite => {
    app.use(vite.middlewares);
    if (!process.env.VERCEL) {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}
