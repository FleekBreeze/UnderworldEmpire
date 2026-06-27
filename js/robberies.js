'use strict';

/* ======================================================================
   CRIM CITY — js/robberies.js
   Dados e lógica dos assaltos: dificuldade, sucesso, recompensas, prisão.
   ====================================================================== */

// jailChance: probabilidade de ires preso quando o assalto falha (antes de modificadores de heat).
// jailDays: dias de prisão se fores apanhado.
// heatGain: quanto heat ganhas ao tentar este assalto (sucesso ou falha).
// componentDrop: { id, min, max } — chance de ganhar componentes de droga no sucesso (opcional).
const ROBBERIES = [
  { id: 'pickpocket',   name: 'Carteirista',        difficulty: 10,   energyCost: 4,  cashMin: 8,    cashMax: 18,    xp: 3,  unlockLevel: 1,  jailChance: 8,  jailDays: 1, heatGain: 1 },
  { id: 'shoplift',     name: 'Furto em Loja',      difficulty: 22,   energyCost: 5,  cashMin: 18,   cashMax: 38,    xp: 5,  unlockLevel: 1,  jailChance: 12, jailDays: 1, heatGain: 2 },
  { id: 'mugging',      name: 'Assalto à Mão Armada', difficulty: 40, energyCost: 6,  cashMin: 35,   cashMax: 70,    xp: 8,  unlockLevel: 2,  jailChance: 16, jailDays: 1, heatGain: 2, componentDrop: { id: 'weed_seeds', min: 1, max: 3 } },
  { id: 'gasstation',   name: 'Bomba de Gasolina',  difficulty: 65,   energyCost: 8,  cashMin: 60,   cashMax: 120,   xp: 12, unlockLevel: 3,  jailChance: 20, jailDays: 2, heatGain: 3 },
  { id: 'jewelry',      name: 'Joalharia',          difficulty: 100,  energyCost: 10, cashMin: 110,  cashMax: 220,   xp: 18, unlockLevel: 4,  jailChance: 25, jailDays: 2, heatGain: 4, componentDrop: { id: 'coca_leaves', min: 1, max: 3 } },
  { id: 'armoredcar',   name: 'Carro Blindado',     difficulty: 150,  energyCost: 14, cashMin: 200,  cashMax: 420,   xp: 28, unlockLevel: 6,  jailChance: 30, jailDays: 3, heatGain: 5 },
  { id: 'bank',         name: 'Assalto a Banco',    difficulty: 220,  energyCost: 18, cashMin: 380,  cashMax: 800,   xp: 42, unlockLevel: 8,  jailChance: 35, jailDays: 3, heatGain: 6, componentDrop: { id: 'chem_precursor', min: 1, max: 2 } },
  { id: 'casino',       name: 'Casino',             difficulty: 320,  energyCost: 22, cashMin: 700,  cashMax: 1500,  xp: 60, unlockLevel: 10, jailChance: 38, jailDays: 4, heatGain: 8 },
  { id: 'artheist',     name: 'Roubo de Arte',      difficulty: 460,  energyCost: 26, cashMin: 1200, cashMax: 2600,  xp: 85, unlockLevel: 13, jailChance: 42, jailDays: 5, heatGain: 9 },
  { id: 'cartel',       name: 'Cofre do Cartel',    difficulty: 650,  energyCost: 30, cashMin: 2200, cashMax: 4800,  xp: 120, unlockLevel: 16, jailChance: 48, jailDays: 6, heatGain: 10, componentDrop: { id: 'chem_precursor', min: 2, max: 4 } },
];

// Probabilidade de sucesso baseada na proximidade poder vs dificuldade.
// heatModifier: pontos percentuais a somar/subtrair (vindo do sistema de Heat).
function successChance(power, difficulty, heatModifier) {
  const ratio = power / difficulty;
  let chance = ratio * 85; // até 85% quando poder == dificuldade
  if (ratio > 1) {
    chance = 85 + Math.min(ratio - 1, 1) * 10; // até 95% com poder bem acima
  }
  chance += (heatModifier || 0);
  return Math.max(3, Math.min(95, Math.round(chance)));
}

// Multiplicador de recompensa: melhor quando poder está perto da dificuldade.
function rewardMultiplier(power, difficulty) {
  const ratio = power / difficulty;
  if (ratio <= 1) return 0.5 + ratio * 0.5; // 0.5x a 1x
  return Math.max(0.4, 1 - (ratio - 1) * 0.3); // decresce se exagerado
}

function attemptRobbery(robberyId) {
  const rob = ROBBERIES.find(r => r.id === robberyId);
  if (!rob) return;

  if (state.jailDaysLeft > 0) {
    toast('Estás na prisão. Não podes assaltar.', 'fail');
    return;
  }
  if (state.level < rob.unlockLevel) {
    toast('Ainda não tens nível suficiente para este assalto.', 'fail');
    return;
  }
  if (state.energy < rob.energyCost) {
    toast('Energia insuficiente.', 'fail');
    return;
  }

  state.energy -= rob.energyCost;
  state.actedThisTurn = true;
  addHeat(rob.heatGain);

  const chance = successChance(state.power, rob.difficulty, heatSuccessChanceModifier());
  const roll = Math.random() * 100;
  const success = roll <= chance;

  if (success) {
    const mult = rewardMultiplier(state.power, rob.difficulty);
    const baseCash = rob.cashMin + Math.random() * (rob.cashMax - rob.cashMin);
    const cashGained = Math.round(baseCash * mult);
    const xpGained = rob.xp;

    state.cash += cashGained;
    state.respect += Math.max(1, Math.round(rob.xp / 4));
    gainXP(xpGained);

    let msg = `${rob.name}: sucesso! +${cashGained} dinheiro, +${xpGained} XP.`;

    if (rob.componentDrop && Math.random() < 0.6) {
      const { id, min, max } = rob.componentDrop;
      const amount = Math.floor(min + Math.random() * (max - min + 1));
      state.components[id] = (state.components[id] || 0) + amount;
      msg += ` +${amount} ${componentName(id)}.`;
    }

    toast(msg, 'success');
  } else {
    const effectiveJailChance = Math.max(0, Math.min(100, rob.jailChance + heatJailChanceModifier()));
    const caught = Math.random() * 100 <= effectiveJailChance;
    if (caught) {
      state.jailDaysLeft = rob.jailDays;
      toast(`${rob.name}: falhaste e foste preso por ${rob.jailDays} dia(s).`, 'fail');
      renderAll();
      switchView('jail');
      return;
    } else {
      toast(`${rob.name}: falhaste. Escapaste por pouco.`, 'fail');
    }
  }

  renderAll();
}

function renderRobberies() {
  const list = document.getElementById('robbery-list');
  list.innerHTML = '';

  ROBBERIES.forEach(rob => {
    const locked = state.level < rob.unlockLevel;
    const noEnergy = state.energy < rob.energyCost;
    const inJail = state.jailDaysLeft > 0;
    const disabled = locked || noEnergy || inJail;
    const chance = successChance(state.power, rob.difficulty, heatSuccessChanceModifier());

    const card = document.createElement('div');
    card.className = 'card' + (disabled ? ' locked' : '');

    let buttonLabel = 'Assaltar';
    if (locked) buttonLabel = '<svg class="icon"><use href="#icon-lock"/></svg>';
    else if (inJail) buttonLabel = 'Preso';
    else if (noEnergy) buttonLabel = 'Sem Energia';

    card.innerHTML = `
      <div class="card-icon"><svg class="icon"><use href="#icon-robbery"/></svg></div>
      <div class="card-body">
        <div class="card-title">${rob.name}</div>
        <div class="card-meta">
          <span>Dificuldade: <b>${rob.difficulty}</b></span>
          <span>Energia: <b>${rob.energyCost}</b></span>
          <span>Recompensa: <b>${rob.cashMin}–${rob.cashMax}</b></span>
          ${locked ? `<span>Requer nível <b>${rob.unlockLevel}</b></span>` : `<span>Sucesso: <b>${chance}%</b></span>`}
        </div>
        ${!locked ? `<div class="success-bar"><div class="success-fill" style="width:${chance}%"></div></div>` : ''}
      </div>
      <div class="card-action">
        <button class="btn" ${disabled ? 'disabled' : ''} data-rob="${rob.id}">
          ${buttonLabel}
        </button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('button[data-rob]').forEach(btn => {
    btn.addEventListener('click', () => attemptRobbery(btn.dataset.rob));
  });
}
