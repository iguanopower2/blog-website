const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');
const { schedule } = require('@netlify/functions'); // Nueva herramienta

// 1. Inicialización (Igual que antes)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// 2. La lógica principal (La movemos a una función interna)
const checkAndSendReminders = async (event) => {
  try {
    const hoyEnCDMX = new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      timeZone: 'America/Mexico_City'
    }).format(new Date());

    const today = parseInt(hoyEnCDMX);
    console.log(`[AUTOMÁTICO] Revisando día: ${today}`);

    const { data: cards, error } = await supabase
      .from('card_reminders')
      .select('*')
      .eq('cut_off_day', today);

    if (error) throw error;

    if (cards && cards.length > 0) {
      await Promise.all(cards.map(async (card) => {
        const mensaje = `🔔 *Recordatorio Infinito*\n\nHoy es el día de corte de tu tarjeta *${card.bank_name}* (terminación ${card.last_four_digits}).\n\n¡Revisa tu app para confirmar el saldo a pagar!`;
        
        return twilioClient.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: 'whatsapp:+5215566729352', // <-- TU NÚMERO
          body: mensaje
        });
      }));
      console.log(`Enviados ${cards.length} mensajes.`);
    }

    return { statusCode: 200 };
  } catch (err) {
    console.error("Error en automático:", err);
    return { statusCode: 500 };
  }
};

// 3. ESTA ES LA MAGIA: Le dice a Netlify que ejecute la función cada día
// El formato '0 14 * * *' significa: Minuto 0, Hora 14 (UTC), Todos los días.
exports.handler = schedule('0 14 * * *', checkAndSendReminders);