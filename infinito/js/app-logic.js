// infinito/js/app-logic.js
// Configuración de Supabase (Frontend)
const SUPABASE_URL = 'https://frluxcthpwhkxoiygihn.supabase.co'; // La misma que usaste en Netlify
const SUPABASE_ANON_KEY = 'sb_publishable_fiwkSgrbFrQjownPSGTbMw_9gTPeRoP'; // ¡Usa la PUBLIC, no la Service Role!

// Inicializamos el cliente con un nombre específico
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar si hay un usuario conectado usando supabaseClient
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
        console.log("No hay sesión activa");
        return;
    }

    // Mostramos el correo del usuario (sin el @dominio.com)
    document.getElementById('welcome-user').textContent = `Hola, ${user.email.split('@')[0]}`;
    
    // 2. Cargar tus tarjetas y calcular el Estado Global
    cargarDashboard(user.id);
});

async function cargarDashboard(userId) {
    // CAMBIO CLAVE: Usamos supabaseClient
    const { data: tarjetas, error } = await supabaseClient
        .from('card_reminders')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error("Error cargando tarjetas:", error.message);
        return;
    }

    // 📊 PROPUESTA 1: ESTADO GLOBAL
    renderizarResumenGlobal(tarjetas);

    // 🃏 RENDERIZAR TARJETAS
    const grid = document.getElementById('cards-grid');
    grid.innerHTML = '';

    if (tarjetas.length === 0) {
        grid.innerHTML = '<p>No tienes tarjetas registradas. ¡Agrega la primera!</p>';
    } else {
        tarjetas.forEach(tarjeta => {
            grid.appendChild(crearTarjetaHTML(tarjeta));
        });
    }
}

function renderizarResumenGlobal(tarjetas) {
    const pendientes = tarjetas.filter(t => !t.is_paid_this_month).length;
    const pagadas = tarjetas.filter(t => t.is_paid_this_month).length;
    
    const header = document.querySelector('.app-header');
    let resumen = document.getElementById('global-status-bar');
    
    if (!resumen) {
        resumen = document.createElement('div');
        resumen.id = 'global-status-bar';
        resumen.className = 'global-status-bar';
        header.appendChild(resumen);
    }

    resumen.innerHTML = `
        <div class="stat"><span>Pendientes:</span> <strong>${pendientes}</strong></div>
        <div class="stat"><span>Pagadas:</span> <strong>${pagadas}</strong></div>
        <div class="stat"><span>Salud:</span> <strong>${pendientes === 0 ? '✅ Todo Pagado' : '⚠️ Pendientes'}</strong></div>
    `;
}

function crearTarjetaHTML(t) {
    const div = document.createElement('div');
    // Si está pagada, le ponemos una clase suave, si no, una de alerta
    div.className = `card-alert ${t.is_paid_this_month ? 'status-paid' : 'status-pending'}`;

    // 🧠 PROPUESTA 2: DÍAS DE GRACIA INTELIGENTES
    // Obtenemos el día actual (Hoy es 27)
    const hoy = new Date().getDate();
    
    // Cálculo simplificado: Día de corte + días para pagar
    let fechaLimite = t.cut_off_day + t.payment_deadline_days;
    let diasRestantes = fechaLimite - hoy;
    
    let mensajeGracia = "";
    if (t.is_paid_this_month) {
        mensajeGracia = `<span class="text-success">¡Listo! Pago registrado.</span>`;
    } else if (diasRestantes > 0) {
        mensajeGracia = `Quedan <strong>${diasRestantes} días</strong> para pagar sin recargos.`;
    } else if (diasRestantes === 0) {
        mensajeGracia = `<span class="text-warning">¡Hoy es el último día de pago!</span>`;
    } else {
        mensajeGracia = `<span class="text-danger">Fecha límite vencida. Revisa tu estado.</span>`;
    }

    div.innerHTML = `
        <div class="card-info">
            <span class="bank-badge">${t.bank_name || 'Banco'}</span>
            <h3>**** ${t.last_four_digits}</h3>
            <div class="card-details">
                <p>Corte: Día ${t.cut_off_day}</p>
                <p class="gracia-info">${mensajeGracia}</p>
            </div>
        </div>
        <div class="card-actions">
            <button class="btn-pay" onclick="marcarComoPagada('${t.id}')" ${t.is_paid_this_month ? 'disabled' : ''}>
                ${t.is_paid_this_month ? '<i class="fas fa-check"></i>' : 'Ya pagué'}
            </button>
        </div>
    `;
    return div;
}

async function marcarComoPagada(tarjetaId) {
    const { error } = await supabaseClient
        .from('card_reminders')
        .update({ is_paid_this_month: true })
        .eq('id', tarjetaId);

    if (error) {
        alert("Error al actualizar: " + error.message);
    } else {
        location.reload(); // Recarga para ver el cambio de color y estado
    }
}

document.getElementById('card-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const bank_name = document.getElementById('bank_name').value;
    const last_four_digits = document.getElementById('last_four_digits').value;
    const cut_off_day = parseInt(document.getElementById('cut_off_day').value);

    try {
        // USAMOS supabaseClient en lugar de supabase
        const { data, error } = await supabaseClient
            .from('card_reminders')
            .insert([
                { 
                    bank_name: bank_name, 
                    last_four_digits: last_four_digits, 
                    cut_off_day: cut_off_day,
                    // Si no tienes autenticación aún, puedes comentar la línea de user_id temporalmente
                    // user_id: (await supabaseClient.auth.getUser()).data.user?.id 
                }
            ]);

        if (error) throw error;

        alert('¡Tarjeta agregada con éxito!');
        document.getElementById('card-form').reset();
        if (typeof loadCards === 'function') loadCards(); 

    } catch (error) {
        console.error('Error al guardar:', error);
        alert('Error al guardar la tarjeta: ' + error.message);
    }
});