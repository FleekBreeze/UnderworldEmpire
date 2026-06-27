'use strict';

/* ======================================================================
   CRIM CITY — js/main.js
   Eventos aleatórios, ciclo de dia, render do estado global, init.
   ====================================================================== */

const RANDOM_EVENTS = [
  { text: 'Inspeção policial na cidade: assaltos mais arriscados hoje.', effect: null },
  { text: 'Festa rave em CrimCity: ambiente calmo, sem incidentes.', effect: null },
  { text: 'Chegou um novo lote de armas ao mercado negro.', effect: null },
  { text: 'A imprensa fala de ti: ligeiro aumento de respeito.', effect: (s) => { s.respect += 5; } },
  { text: 'Dia tranquilo em CrimCity.', effect: null },
];

/* ---------------------------------------------------------------------
   AVANÇAR DIA
   --------------------------------------------------------------------- */

function nextDay() {
  // Avisa o jogador se vai perder energia não utilizada (a menos que esteja preso,
  // onde a energia já só recupera parcialmente por design).
  if (state.jailDaysLeft === 0 && state.energy > 0) {
    const confirmed = confirm(
      `Tens ${state.energy} de energia não usada. Ela NÃO acumula para o dia seguinte.\n\nAvançar o dia mesmo assim?`
    );
    if (!confirmed) return;
  }

  state.day += 1;

  if (state.jailDaysLeft > 0) {
    state.jailDaysLeft -= 1;
    // Preso: sem recuperação total de energia, só parcial.
    state.energy = Math.min(state.energyMax, state.energy + Math.round(state.energyMax * 0.3));
  } else {
    state.energy = state.energyMax;
  }

  decayHeatForNewDay(state.actedThisTurn);
  state.actedThisTurn = false;

  produceDrugs();
  fluctuateDrugPrices();
  collectDailyBuildingIncome();

  const raidResult = maybeTriggerRaid();

  const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
  if (event.effect) event.effect(state);

  let eventText = event.text;
  if (state.jailDaysLeft > 0) {
    eventText += ` Ainda preso por ${state.jailDaysLeft} dia(s).`;
  }
  if (raidResult) {
    const dragsPart = raidResult.lostDrugLines.length > 0 ? ` Perdeste: ${raidResult.lostDrugLines.join(', ')}.` : '';
    eventText += ` RUSGA: a polícia confiscou ${formatNumber(raidResult.cashLost)} em dinheiro.${dragsPart}`;
    toast(`Rusga! -${formatNumber(raidResult.cashLost)} dinheiro.${dragsPart}`, 'fail');
  }

  showDayBanner(state.day, eventText);
  renderAll();
}

function showDayBanner(day, eventText) {
  const banner = document.getElementById('day-banner');
  document.getElementById('day-number').textContent = `Dia ${day}`;
  document.getElementById('day-event').textContent = eventText;
  banner.classList.remove('hidden');
}

/* ---------------------------------------------------------------------
   RENDER: STATUS BAR E PERFIL
   --------------------------------------------------------------------- */

function renderStatusBar() {
  document.getElementById('stat-cash').textContent = formatNumber(state.cash);
  document.getElementById('stat-power').textContent = formatNumber(state.power);
  document.getElementById('stat-energy').textContent = state.energy;
  document.getElementById('stat-energy-max').textContent = state.energyMax;
  document.getElementById('stat-respect').textContent = formatNumber(state.respect);
  document.getElementById('stat-level').textContent = state.level;

  const xpPct = Math.min(100, Math.round((state.xp / state.xpToNext) * 100));
  document.getElementById('xp-fill').style.width = xpPct + '%';
  document.getElementById('xp-label').textContent = `${state.xp} / ${state.xpToNext} XP`;

  const jailNav = document.getElementById('nav-jail');
  jailNav.classList.toggle('nav-btn-alert', state.jailDaysLeft > 0);

  const heatFill = document.getElementById('heat-fill');
  const heatLabel = document.getElementById('heat-label');
  if (heatFill && heatLabel) {
    heatFill.style.width = state.heat + '%';
    heatFill.className = 'heat-fill ' + heatLevelClass();
    heatLabel.textContent = `Calor: ${heatLevelLabel()} (${Math.round(state.heat)})`;
  }
}

function renderProfile() {
  document.getElementById('prof-name').textContent = state.name;
  document.getElementById('prof-level').textContent = state.level;
  document.getElementById('prof-day').textContent = state.day;
  document.getElementById('prof-cash').textContent = formatNumber(state.cash);
  document.getElementById('prof-power').textContent = formatNumber(state.power);
  document.getElementById('prof-respect').textContent = formatNumber(state.respect);
  document.getElementById('prof-energy-max').textContent = state.energyMax;

  const invList = document.getElementById('prof-inventory');
  invList.innerHTML = '';
  if (state.inventory.length === 0) {
    invList.innerHTML = '<div class="inventory-empty">Sem equipamento.</div>';
  } else {
    state.inventory.forEach(itemId => {
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) return;
      const el = document.createElement('div');
      el.className = 'inventory-item';
      el.innerHTML = `<svg class="icon"><use href="#${item.icon}"/></svg> ${item.name}`;
      invList.appendChild(el);
    });
  }
}

function renderAll() {
  renderStatusBar();
  renderRobberies();
  renderShop();
  renderProfile();
  renderJail();
  renderDrugLab();
  renderBuildings();
}

/* ---------------------------------------------------------------------
   INIT
   --------------------------------------------------------------------- */

function init() {
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  document.getElementById('btn-next-day').addEventListener('click', nextDay);
  document.getElementById('btn-save').addEventListener('click', saveGame);
  document.getElementById('btn-load').addEventListener('click', loadGame);
  document.getElementById('btn-reset').addEventListener('click', resetGame);

  // Tenta carregar save automaticamente ao abrir.
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    try {
      state = Object.assign(createNewState(), JSON.parse(raw));
    } catch (e) { /* save inválido, usa estado novo */ }
  }

  applyOfflineEnergyRegen();
  startEnergyTickLoop();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
