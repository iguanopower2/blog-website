// infinito/js/app-logic.js

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