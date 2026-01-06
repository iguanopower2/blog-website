//Inicialización
document.addEventListener('DOMContentLoaded', initDashboard);

async function initDashboard() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();

  if (error || !user) {
    console.warn('No authenticated user');
    return;
  }

  setWelcomeMessage(user);
  setupCreditCardForm();
  loadCreditCards();
}

//UI helpers
function setWelcomeMessage(user) {
  const name = user.email.split('@')[0];
  document.getElementById('welcome-user').textContent = `Hola, ${name}`;
}

//Data layer (Supabase aislado)
async function fetchCreditCards() {
  const { data, error } = await supabaseClient
    .from('credit_cards')
    .select('*')
    .in('status', ['active', 'paused'])
    .order('cut_off_day');

  if (error) throw error;
  return data;
}

async function insertCreditCard(cardData) {
  const { error } = await supabaseClient
    .from('credit_cards')
    .insert(cardData);

  if (error) throw error;
}

// Form setup
function setupCreditCardForm() {
  const form = document.getElementById('credit-card-form');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cardData = await getCreditCardFormData();

    try {
      await insertCreditCard(cardData);
      form.reset();
      loadCreditCards();
    } catch (err) {
      alert('Error al guardar la tarjeta');
      console.error(err);
    }
  });
}

async function getCreditCardFormData() {
  const { data: { user } } = await supabaseClient.auth.getUser();

  return {
    user_id: user.id, // 👈 CLAVE
    bank_name: document.getElementById('bank_name').value.trim(),
    last_four_digits: document.getElementById('last_four_digits').value.trim(),
    cut_off_day: Number(document.getElementById('cut_off_day').value),
    payment_due_day: Number(document.getElementById('payment_due_day').value),
    status: 'active',
    is_active: true,
    is_paid_current_cycle: false
  };
}

//Render principal

async function loadCreditCards() {
  try {
    const cards = await fetchCreditCards();
    renderCreditCards(cards);
  } catch (err) {
    console.error('Error loading cards:', err.message);
  }
}

//Render grid
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

//Crear tarjeta individual
function createCreditCardElement(card) {
  const div = document.createElement('div');
  div.className = `card-alert ${card.is_paid_current_cycle ? 'status-paid' : 'status-pending'}`;

  const remainingDays = calculateRemainingDays(card);
  const isPaused = card.status === 'paused';

  div.innerHTML = `
    <div class="card-info">
      <span class="bank-badge">${card.bank_name}</span>
      <h3>**** ${card.last_four_digits}</h3>
      <p>${remainingDays}</p>
    </div>
    <button 
      class="btn-pay" 
      ${card.is_paid_current_cycle ? 'disabled' : ''}
      onclick="markCardAsPaid('${card.id}')">
      ${card.is_paid_current_cycle ? 'Pagado' : 'Ya pagué'}
    </button>
    <button 
        class="btn-toggle"
        onclick="toggleCardStatus('${card.id}', '${card.status}')">
        ${isPaused ? 'Reactivar' : 'Pausar'}
    </button>
    <button 
        class="btn-close"
        onclick="closeCard('${card.id}')">
        Cerrar
    </button>
  `;

  return div;
}

//Lógica de negocio (aislada)
function calculateRemainingDays(card) {
  const today = new Date().getDate();
  const limitDay = card.payment_due_day;
  const remaining = limitDay - today;

  if (card.is_paid_current_cycle) return '✅ Pago registrado';
  if (remaining > 0) return `⏳ Quedan ${remaining} días`;
  if (remaining === 0) return '⚠️ Hoy es el último día';
  if (card.status === 'paused') return '⏸ Tarjeta pausada';
  if (card.is_paid_current_cycle) return '✅ Pago registrado';
  return '❌ Pago vencido';
}

//Update seguro (RLS protege)
async function markCardAsPaid(cardId) {
  try {
    const { error } = await supabaseClient
      .from('credit_cards')
      .update({
        is_paid_current_cycle: true,
        last_paid_at: new Date()
      })
      .eq('id', cardId);

    if (error) throw error;

    loadCreditCards();
  } catch (err) {
    alert('No se pudo actualizar la tarjeta');
  }
}

async function updateCardStatus(cardId, newStatus) {
  const { error } = await supabaseClient
    .from('credit_cards')
    .update({ status: newStatus })
    .eq('id', cardId);

  if (error) throw error;
}

async function toggleCardStatus(cardId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'paused' : 'active';

  try {
    await updateCardStatus(cardId, newStatus);
    loadCreditCards();
  } catch (err) {
    alert('No se pudo cambiar el estado de la tarjeta');
    console.error(err);
  }
}

async function closeCard(cardId) {
  if (!confirm('¿Seguro que deseas cerrar esta tarjeta?')) return;

  try {
    await updateCardStatus(cardId, 'closed');
    loadCreditCards();
  } catch (err) {
    alert('No se pudo cerrar la tarjeta');
    console.error(err);
  }
}
