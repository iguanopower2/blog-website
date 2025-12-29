const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');

// 1. Inicialización de clientes con variables de entorno
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.handler = async (event) => {
  try {
    // 2. Obtener el día actual forzando la zona horaria de México (CDMX)
    // Esto evita que después de las 6:00 PM detecte el día de mañana (UTC)
    const hoyEnCDMX = new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      timeZone: 'America/Mexico_City'
    }).format(new Date());

    const today = parseInt(hoyEnCDMX);
    console.log(`Ejecutando revisión para el día: ${today}`);

    // 3. Consultar en Supabase las tarjetas que cortan hoy
    const { data: cards, error } = await supabase
      .from('card_reminders')
      .select('*')
      .eq('cut_off_day', today);

    if (error) throw error;

    // 4. Si no hay tarjetas, respondemos con éxito pero sin enviar mensajes
    if (!cards || cards.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: `No hay tarjetas que corten hoy (día ${today} en CDMX).`,
          timezone_check: new Date().toISOString()
        }),
      };
    }

    // 5. Enviar un WhatsApp por cada tarjeta encontrada
    const results = await Promise.all(cards.map(async (card) => {
      const mensaje = `🔔 *Recordatorio Infinito*\n\nHoy es el día de corte de tu tarjeta *${card.bank_name}* (terminación ${card.last_4_digits}).\n\n¡Revisa tu app para confirmar el saldo a pagar!`;
      
      return twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: 'whatsapp:+521XXXXXXXXXX', // <-- ASEGÚRATE DE QUE TENGA EL "1" DESPUÉS DEL +52
        body: mensaje
      });
    }));

    // 6. Respuesta final exitosa
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: `Se enviaron ${results.length} recordatorios correctamente.`,
        cards_processed: cards.map(c => c.bank_name)
      }),
    };

  } catch (error) {
    // 7. Captura de errores
    console.error('Error detallado:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Hubo un error al procesar la función",
        details: error.message 
      }),
    };
  }
};