const twilio = require('twilio');

exports.handler = async (event) => {
  // Solo permitimos ejecutarla si nosotros la llamamos (opcional para pruebas)
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  try {
    const message = await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: 'whatsapp:+521XXXXXXXXXX', // PONE AQUÍ TU NÚMERO (con código de país)
      body: '🚀 ¡Hola! Este es un mensaje de prueba desde tu Netlify Function para Infinito.'
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Mensaje enviado con éxito", sid: message.sid }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};