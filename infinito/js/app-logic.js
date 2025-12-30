// infinito/js/app-logic.js

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
        console.log("No hay sesión activa");
        return;
    }

    document.getElementById('welcome-user').textContent = `Hola, ${user.email.split('@')[0]}`;
    
    // Llamamos a la función con el ID del usuario
    cargarDashboard(user.id);
});

async function cargarDashboard(userId) {
    const { data: tarjetas, error } = await supabaseClient
        .from('card_reminders')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error("Error cargando tarjetas:", error.message);
        return;
    }

    renderizarResumenGlobal(tarjetas);

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
            <span class="bank-badge">${t.title || 'Banco'}</span>
            <h3>**** ${t.description}</h3>
            <div class="card-details">
                <p>Corte: Día ${t.due_day}</p>
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
    try {
        // 1. Obtenemos el usuario actual para asegurar que solo edite sus propias tarjetas
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) {
            alert("Sesión expirada. Por favor, inicia sesión de nuevo.");
            return;
        }

        // 2. Ejecutamos la actualización
        const { error } = await supabaseClient
            .from('card_reminders')
            .update({ is_paid_this_month: true })
            .eq('id', tarjetaId)
            .eq('user_id', user.id); // Seguridad extra: solo si le pertenece al usuario

        if (error) throw error;

        // 3. Feedback visual inmediato
        console.log("Pago registrado con éxito");
        
        // 4. En lugar de location.reload(), recargamos solo los datos para que sea más rápido
        cargarDashboard(user.id);

    } catch (error) {
        console.error("Error al marcar como pagada:", error.message);
        alert("No se pudo actualizar el estado de pago.");
    }
}

// CORRECCIÓN DEL FORMULARIO
document.getElementById('card-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const bank_name = document.getElementById('bank_name').value;
    const last_four_digits = document.getElementById('last_four_digits').value;
    const cut_off_day = parseInt(document.getElementById('cut_off_day').value);

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (!user) throw new Error("No hay usuario autenticado");

        const { data, error } = await supabaseClient
            .from('card_reminders')
            .insert([
                { 
                    bank_name: bank_name, 
                    last_four_digits: last_four_digits, 
                    cut_off_day: cut_off_day,
                    user_id: user.id 
                }
            ]);

        if (error) throw error;

        alert('¡Tarjeta agregada con éxito!');
        document.getElementById('card-form').reset();
        
        // CORRECCIÓN: Llamamos a cargarDashboard, no a loadCards
        cargarDashboard(user.id); 

    } catch (error) {
        console.error('Error al guardar:', error);
        alert('Error al guardar la tarjeta: ' + error.message);
    }
});