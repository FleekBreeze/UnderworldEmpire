'use strict';

/* ======================================================================
   BLACKLIST CITY — js/main.js
   Eventos aleatórios, ciclo de dia, render do estado global, init.
   ====================================================================== */

const RANDOM_EVENTS = [
  { text: 'Inspeção policial na cidade: assaltos mais arriscados hoje.', effect: null },
  { text: 'Festa numa boate clandestina: ambiente calmo, sem incidentes.', effect: null },
  { text: 'Chegou um novo lote de armas ao mercado negro.', effect: null },
  { text: 'A imprensa fala de ti: ligeiro aumento de respeito.', effect: (s) => { s.respect += 5; } },
  { text: 'Dia tranquilo no submundo.', effect: null },
];

/* ---------------------------------------------------------------------
   AVANÇAR DIA
   --------------------------------------------------------------------- */

function nextDay() {
  // Avisa o jogador se vai perder energia não utilizada (a menos que esteja preso,
  // onde a energia já só recupera parcialmente por design).
  if (state.jailDaysLeft === 0 && state.energy > 0) {
    showConfirmModal({
      title: 'Energia não utilizada',
      message: `Tens ${state.energy} de energia não usada. Ela não acumula para o dia seguinte. Avançar o dia mesmo assim?`,
      confirmLabel: 'Avançar Dia',
      cancelLabel: 'Cancelar',
      onConfirm: executeNextDay,
    });
    return;
  }

  executeNextDay();
}

function executeNextDay() {
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

  checkAchievements();
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

  renderIdentityCard();

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
  renderAchievements();
}

/* ---------------------------------------------------------------------
   INIT
   --------------------------------------------------------------------- */

function init() {
  initConfirmModal();
  initSeedModal();
  initTutorial();

  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
      if (btn.dataset.view === 'achievements') {
        document.getElementById('nav-achievements').classList.remove('nav-btn-alert');
      }
    });
  });

  document.getElementById('btn-next-day').addEventListener('click', nextDay);
  document.getElementById('btn-reset').addEventListener('click', resetGame);

  document.getElementById('btn-save-name').addEventListener('click', savePlayerName);
  document.querySelectorAll('.avatar-option').forEach(btn => {
    btn.addEventListener('click', () => selectAvatar(btn.dataset.avatar));
  });

  // Nota: o jogo já não persiste automaticamente entre sessões — usa o
  // botão "Seed" para exportar/importar o progresso manualmente.
  applyOfflineEnergyRegen();
  startEnergyTickLoop();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
