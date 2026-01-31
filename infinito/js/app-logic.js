// Inicialización
document.addEventListener('DOMContentLoaded', initDashboard);

async function initDashboard() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();

  if (error || !user) {
    console.warn('No authenticated user');
    window.location.href = 'index.html'; // Redirigir si no hay sesión
    return;
  }

  setWelcomeMessage(user);
  loadSubscriptionInfo(user.id); // Nueva función para ver el plan
  setupCreditCardForm();
  loadCreditCards();
}

// UI helpers
function setWelcomeMessage(user) {
  const name = user.email.split('@')[0];
  document.getElementById('welcome-user').textContent = `Hola, ${name}`;
}

// NUEVA: Cargar info de suscripción y plan
async function loadSubscriptionInfo(userId) {
  try {
    const { data, error } = await supabaseClient
      .from('customer_subscription')
      .select('status, subscription_plans(plan_name, max_active_cards)')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    const plan = data.subscription_plans;
    document.getElementById('account-type').textContent = 
      `${plan.plan_name.toUpperCase()} (${plan.max_active_cards} tarjetas)`;
  } catch (err) {
    console.error('Error loading subscription:', err);
  }
}

// Data layer: Notar el cambio a 'credit_cards_information'
async function fetchCreditCards() {
  const { data, error } = await supabaseClient
    .from('credit_cards_information') // 👈 Nombre actualizado
    .select('*')
    .eq('is_closed', false) // Solo las que no han sido eliminadas lógicamente
    .order('cut_off_day');

  if (error) throw error;
  return data;
}

// Lógica de inserción con validación de límite
async function insertCreditCard(cardData) {
  // 1. Verificar límite antes de insertar
  const { data: cards } = await supabaseClient
    .from('credit_cards_information')
    .select('id')
    .eq('user_id', cardData.user_id)
    .eq('is_active', true)
    .eq('is_closed', false);

  // Aquí consultamos el plan (simplificado para el ejemplo)
  const { data: sub } = await supabaseClient
    .from('customer_subscription')
    .select('subscription_plans(max_active_cards)')
    .eq('user_id', cardData.user_id)
    .single();

  if (cards.length >= sub.subscription_plans.max_active_cards) {
    throw new Error(`Límite alcanzado. Tu plan permite max ${sub.subscription_plans.max_active_cards} tarjetas activas.`);
  }

  const { error } = await supabaseClient
    .from('credit_cards_information')
    .insert(cardData);

  if (error) throw error;
}

// Form setup
function setupCreditCardForm() {
  const form = document.getElementById('credit-card-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;

    try {
      const cardData = await getCreditCardFormData();
      await insertCreditCard(cardData);
      form.reset();
      loadCreditCards();
      alert('Tarjeta guardada con éxito');
    } catch (err) {
      alert(err.message || 'Error al guardar la tarjeta');
      console.error(err);
    } finally {
      btn.disabled = false;
    }
  });
}

async function getCreditCardFormData() {
  const { data: { user } } = await supabaseClient.auth.getUser();

  return {
    user_id: user.id,
    bank_name: document.getElementById('bank_name').value.trim(),
    last_four_digits: document.getElementById('last_four_digits').value.trim(),
    cut_off_day: Number(document.getElementById('cut_off_day').value),
    payment_due_day: Number(document.getElementById('payment_due_day').value),
    status: 'active', // 👈 Nuevo campo
    is_active: true,
    is_paid_current_cycle: false
  };
}

async function loadCreditCards() {
  try {
    const cards = await fetchCreditCards();
    renderCreditCards(cards);
  } catch (err) {
    console.error('Error loading cards:', err.message);
  }
}

function renderCreditCards(cards) {
  const grid = document.getElementById('cards-grid');
  grid.innerHTML = '';

  if (!cards.length) {
    grid.innerHTML = '<p>No tienes tarjetas registradas.</p>';
    return;
  }

  cards.forEach(card => {
    grid.appendChild(createCreditCardElement(card));
  });
}

function createCreditCardElement(card) {
  const div = document.createElement('div');
  // Usar el nuevo campo 'status' para la clase visual
  div.className = `card-alert status-${card.status} ${card.is_paid_current_cycle ? 'paid-border' : ''}`;

  const remainingDaysText = calculateRemainingDays(card);
  const isPaused = card.status === 'paused';

  div.innerHTML = `
    <div class="card-info">
      <span class="bank-badge">${card.bank_name}</span>
      <h3>**** ${card.last_four_digits}</h3>
      <p class="status-text">${remainingDaysText}</p>
    </div>
    <div class="card-actions">
        <button 
          class="btn-pay" 
          ${card.is_paid_current_cycle ? 'disabled' : ''}
          onclick="markCardAsPaid('${card.id}')">
          <i class="fas fa-check"></i> ${card.is_paid_current_cycle ? 'Pagado' : 'Ya pagué'}
        </button>
        <button 
            class="btn-toggle"
            onclick="toggleCardStatus('${card.id}', '${card.status}')">
            <i class="fas ${isPaused ? 'fa-play' : 'fa-pause'}"></i>
        </button>
        <button 
            class="btn-close"
            onclick="closeCard('${card.id}')">
            <i class="fas fa-trash"></i>
        </button>
    </div>
  `;

  return div;
}

function calculateRemainingDays(card) {
  if (card.status === 'paused') return '⏸ Pausada';
  if (card.is_paid_current_cycle) return '✅ Ciclo pagado';

  const today = new Date().getDate();
  const limitDay = card.payment_due_day;
  
  // Lógica simple de días restantes para el mes actual
  let remaining = limitDay - today;
  
  if (remaining > 0) return `⏳ Faltan ${remaining} días para pago`;
  if (remaining === 0) return '⚠️ ¡Hoy es el último día!';
  return '❌ Pago vencido';
}

async function markCardAsPaid(cardId) {
  try {
    const { error } = await supabaseClient
      .from('credit_cards_information')
      .update({ is_paid_current_cycle: true })
      .eq('id', cardId);

    if (error) throw error;
    loadCreditCards();
  } catch (err) {
    alert('Error al actualizar pago');
  }
}

async function toggleCardStatus(cardId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'paused' : 'active';
  const isActive = newStatus === 'active';

  try {
    const { error } = await supabaseClient
      .from('credit_cards_information')
      .update({ 
        status: newStatus,
        is_active: isActive 
      })
      .eq('id', cardId);

    if (error) throw error;
    loadCreditCards();
  } catch (err) {
    alert('Error al cambiar estado');
  }
}

async function closeCard(cardId) {
  if (!confirm('¿Deseas eliminar esta tarjeta de tu lista?')) return;

  try {
    const { error } = await supabaseClient
      .from('credit_cards_information')
      .update({ 
        is_closed: true,
        is_active: false,
        status: 'paused'
      })
      .eq('id', cardId);

    if (error) throw error;
    loadCreditCards();
  } catch (err) {
    alert('Error al eliminar');
  }
}