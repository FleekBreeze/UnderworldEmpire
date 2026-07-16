'use strict';

/* ======================================================================
   BLACKLIST CITY — js/state.js
   Estado central do jogador, persistência (localStorage) e XP/level up.
   ====================================================================== */

const SAVE_KEY = 'blacklist_city_save_v1';

function createNewState() {
  return {
    name: 'Sem Nome',
    avatar: 'avatar-strategist',
    day: 1,
    level: 1,
    xp: 0,
    xpToNext: 100,
    cash: 250,
    power: 10,
    energy: 20,
    energyMax: 20,
    respect: 0,
    inventory: [], // array of shop item ids owned

    jailDaysLeft: 0,

    labLevel: 0,
    components: {},   // { weed_seeds: 0, coca_leaves: 0, chem_precursor: 0 }
    drugs: {},        // { weed: 0, coke: 0, meth: 0, heroin: 0 }
    drugPrices: initialDrugPrices(),

    // Edifícios: { type: 'disco', level: 1, inactive: false } por unidade possuída.
    buildings: [],

    // Heat: 0-100. Sobe com atividade criminosa, desce lentamente com o tempo.
    // Heat alto aumenta risco de prisão e de rusgas; heat baixo dá pequenos bónus.
    heat: 0,

    // Marca se o jogador realizou alguma ação ilegal desde o último avanço de dia.
    // Usado para calcular o decay de heat (ficar quieto desce heat mais rápido).
    actedThisTurn: false,

    // Timestamp (ms) da última vez que a regeneração passiva de energia foi calculada.
    // Usado para repor energia mesmo se o browser estiver fechado (cálculo retroativo).
    lastEnergyTick: Date.now(),

    // Conquistas permanentes já desbloqueadas (array de ids).
    unlockedAchievements: [],

    // Contadores cumulativos usados pelas condições das conquistas.
    // Nunca diminuem (exceto reset total do jogo).
    stats: {
      successfulRobberies: 0,
      timesJailed: 0,
      bribesPaid: 0,
      drugUnitsSold: 0,
      raidsSurvived: 0,
    },
  };
}

function initialDrugPrices() {
  const prices = {};
  DRUGS.forEach(d => { prices[d.id] = d.basePrice; });
  return prices;
}

let state = createNewState();

/* ---------------------------------------------------------------------
   PERSISTÊNCIA
   --------------------------------------------------------------------- */

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    toast('Jogo guardado.', 'success');
  } catch (e) {
    toast('Falha ao guardar.', 'fail');
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      toast('Não há nenhum save guardado.', 'fail');
      return;
    }
    const loaded = JSON.parse(raw);
    state = Object.assign(createNewState(), loaded);
    applyOfflineEnergyRegen();
    renderAll();
    toast('Jogo carregado.', 'success');
  } catch (e) {
    toast('Save corrompido.', 'fail');
  }
}

function resetGame() {
  showConfirmModal({
    title: 'Reiniciar Jogo',
    message: 'Todo o progresso atual será perdido permanentemente. Tens a certeza?',
    confirmLabel: 'Reiniciar',
    cancelLabel: 'Cancelar',
    onConfirm: () => {
      state = createNewState();
      renderAll();
      toast('Jogo reiniciado.', 'success');
    },
  });
}

/* ---------------------------------------------------------------------
   XP / LEVEL UP
   --------------------------------------------------------------------- */

function gainXP(amount) {
  state.xp += amount;
  while (state.xp >= state.xpToNext) {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.xpToNext = Math.round(state.xpToNext * 1.35);
    state.energyMax += 4;
    state.energy = state.energyMax; // level up restaura energia
    toast(`Subiste para o nível ${state.level}!`, 'success');
  }
}
