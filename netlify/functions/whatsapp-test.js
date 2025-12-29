const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');

// Inicializamos los clientes de Supabase y Twilio con las variables de entorno de Netlify
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.handler = async (event) => {
  try {
    // 1. Obtener el día actual (1-31)
    const today = new Date().getDate();
    console.log(`Buscando tarjetas con corte el día: ${today}`);

    // 2. Consultar Supabase buscando tarjetas que cortan hoy
    // Nota: Ajusta 'card_reminders' si tu tabla tiene otro nombre
    const { data: cards, error } = await supabase
      .from('card_reminders')
      .select('*')
      .eq('cut_off_day', today);

    if (error) throw error;

    if (!cards || cards.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: `No hay tarjetas que corten hoy (día ${today}).` }),
      };
    }

    // 3. Enviar un WhatsApp por cada tarjeta encontrada
    const results = await Promise.all(cards.map(async (card) => {
      const mensaje = `🔔 *Recordatorio Infinito*\n\nHoy es el día de corte de tu tarjeta *${card.bank_name}* (terminación ${card.last_4_digits}).\n\n¡Revisa tu app para confirmar el saldo a pagar!`;
      
      return twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: 'whatsapp:+5215566729352', // <-- TU NÚMERO CON EL "1" (como lo calibramos)
        body: mensaje
      });
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: `Se enviaron ${results.length} recordatorios.`,
        details: cards.map(c => c.bank_name)
      }),
    };

  } catch (error) {
    console.error('Error en la función:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};