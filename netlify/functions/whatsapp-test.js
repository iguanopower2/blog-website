const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');
const { schedule } = require('@netlify/functions'); // Nueva herramienta

// 1. Inicialización (Igual que antes)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// 2. La lógica principal (La movemos a una función interna)
// netlify/functions/whatsapp-test.js
const checkAndSendReminders = async (event) => {
  try {
    const ahora = new Date();
    const hoyEnCDMX = new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'America/Mexico_City'
    }).formatToParts(ahora);

    const diaActual = parseInt(hoyEnCDMX.find(p => p.type === 'day').value);
    const mesActual = parseInt(hoyEnCDMX.find(p => p.type === 'month').value);

    // Consultamos solo los activos que coincidan con el día de hoy
    const { data: items, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_active', true)
      .eq('due_day', diaActual);

    if (error) throw error;

    // Filtro de frecuencia
    const aNotificar = items.filter(item => {
      if (item.frequency === 'monthly' || !item.frequency) return true;
      
      if (item.frequency === 'bimonthly') {
        // Ejemplo: Si target_month es 1 (enero), notificará en 1, 3, 5, 7, 9, 11
        return (mesActual % 2) === (item.target_month % 2);
      }
      
      if (item.frequency === 'annually') {
        return mesActual === item.target_month;
      }
      
      return false;
    });

    // Enviar WhatsApps
    for (const item of aNotificar) {
        const msg = `🔔 *Infinito: Recordatorio*\n\nHoy vence/corta: *${item.title}*\nInfo: ${item.description || ''}\n\n¡No olvides registrar tu pago!`;
        await twilioClient.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: 'whatsapp:+521...', // Tu número
            body: msg
        });
    }

    // RESET MENSUAL: Si es día 1, ponemos todos los del mes en false
    if (diaActual === 1) {
        await supabase.from('reminders').update({ is_paid_this_month: false }).eq('frequency', 'monthly');
    }

    return { statusCode: 200 };
  } catch (err) {
    console.error(err);
    return { statusCode: 500 };
  }
};
// 3. ESTA ES LA MAGIA: Le dice a Netlify que ejecute la función cada día
// El formato '0 14 * * *' significa: Minuto 0, Hora 14 (UTC), Todos los días.
exports.handler = schedule('0 14 * * *', checkAndSendReminders);