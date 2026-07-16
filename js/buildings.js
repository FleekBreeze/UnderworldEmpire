'use strict';

/* ======================================================================
   BLACKLIST CITY — js/buildings.js
   Edifícios: compra de novas unidades, upgrades de nível, renda passiva
   ao avançar o dia, e regeneração de energia em tempo real (Bunker).
   ====================================================================== */

// Cada tipo de edifício tem uma escala de níveis (índice 0 = nível 1).
// buyPrice: custo para comprar uma NOVA unidade no nível 1.
// upgradeCost(level): custo para subir de `level` para `level+1` (função).
// output(level): valor gerado por dia nesse nível (cash, respeito, ou % de venda).
const BUILDING_TYPES = {
  disco: {
    name: 'Discoteca',
    icon: 'icon-cash',
    unlockLevel: 1,
    maxLevel: 5,
    buyPrice: 2200,
    description: 'Gera dinheiro todos os dias.',
    upgradeCost: (level) => Math.round(2200 * Math.pow(1.6, level)),
    outputLabel: 'Renda/dia',
    output: (level) => Math.round(60 * Math.pow(1.45, level - 1)),
    maintenanceCost: (level) => Math.round(25 * Math.pow(1.3, level - 1)),
  },
  casino: {
    name: 'Casino',
    icon: 'icon-cash',
    unlockLevel: 5,
    maxLevel: 5,
    buyPrice: 9500,
    description: 'Gera muito mais dinheiro, mas é caro.',
    upgradeCost: (level) => Math.round(9500 * Math.pow(1.65, level)),
    outputLabel: 'Renda/dia',
    output: (level) => Math.round(260 * Math.pow(1.5, level - 1)),
    maintenanceCost: (level) => Math.round(110 * Math.pow(1.3, level - 1)),
  },
  drugden: {
    name: 'Banca de Droga',
    icon: 'icon-flask',
    unlockLevel: 3,
    maxLevel: 5,
    buyPrice: 4200,
    description: 'Vende automaticamente parte do teu stock de drogas todos os dias, ao preço de mercado.',
    upgradeCost: (level) => Math.round(4200 * Math.pow(1.6, level)),
    outputLabel: '% stock vendido/dia',
    output: (level) => Math.min(60, 12 + (level - 1) * 12), // % do stock vendido por dia
    maintenanceCost: (level) => Math.round(45 * Math.pow(1.3, level - 1)),
  },
  autodrome: {
    name: 'Autódromo',
    icon: 'icon-respect',
    unlockLevel: 4,
    maxLevel: 5,
    buyPrice: 6000,
    description: 'Gera respeito todos os dias.',
    upgradeCost: (level) => Math.round(6000 * Math.pow(1.6, level)),
    outputLabel: 'Respeito/dia',
    output: (level) => Math.round(8 * Math.pow(1.4, level - 1)),
    maintenanceCost: (level) => Math.round(60 * Math.pow(1.3, level - 1)),
  },
  bunker: {
    name: 'Bunker',
    icon: 'icon-energy',
    unlockLevel: 12,
    maxLevel: 5,
    buyPrice: 35000,
    description: 'Edifício raro: regenera energia automaticamente em tempo real, mesmo offline.',
    upgradeCost: (level) => Math.round(35000 * Math.pow(1.7, level)),
    outputLabel: 'Energia / 5 min',
    output: (level) => level, // +1 energia por cada 5 min, por nível
    maintenanceCost: (level) => Math.round(180 * Math.pow(1.3, level - 1)),
  },
};

const BUILDING_ENERGY_TICK_MS = 5 * 60 * 1000; // 5 minutos reais

/* ---------------------------------------------------------------------
   COMPRA / UPGRADE
   --------------------------------------------------------------------- */

function buyBuilding(typeId) {
  const def = BUILDING_TYPES[typeId];
  if (!def) return;

  if (state.jailDaysLeft > 0) {
    toast('Estás na prisão. Não podes negociar.', 'fail');
    return;
  }
  if (state.level < def.unlockLevel) {
    toast('Ainda não tens nível suficiente para este edifício.', 'fail');
    return;
  }
  if (state.cash < def.buyPrice) {
    toast('Dinheiro insuficiente.', 'fail');
    return;
  }

  state.cash -= def.buyPrice;
  state.buildings.push({ type: typeId, level: 1, inactive: false });

  toast(`Compraste: ${def.name}.`, 'success');
  checkAchievements();
  renderAll();
}

function upgradeBuilding(buildingIndex) {
  const building = state.buildings[buildingIndex];
  if (!building) return;
  const def = BUILDING_TYPES[building.type];

  if (state.jailDaysLeft > 0) {
    toast('Estás na prisão. Não podes negociar.', 'fail');
    return;
  }
  if (building.level >= def.maxLevel) {
    toast('Este edifício já está no nível máximo.', 'fail');
    return;
  }

  const cost = def.upgradeCost(building.level);
  if (state.cash < cost) {
    toast('Dinheiro insuficiente para o upgrade.', 'fail');
    return;
  }

  state.cash -= cost;
  building.level += 1;

  toast(`${def.name} melhorado para nível ${building.level}.`, 'success');
  renderAll();
}

/* ---------------------------------------------------------------------
   MANUTENÇÃO E RENDA PASSIVA DIÁRIA (chamado em nextDay())
   --------------------------------------------------------------------- */

// Tenta pagar a manutenção de cada edifício. Se não houver cash, o edifício
// fica inactive (sem renda) até o jogador pagar manualmente o que falta.
function collectDailyMaintenance() {
  if (state.buildings.length === 0) return { totalPaid: 0, newlyInactive: [] };

  let totalPaid = 0;
  const newlyInactive = [];

  state.buildings.forEach(building => {
    const def = BUILDING_TYPES[building.type];
    const cost = def.maintenanceCost(building.level);

    if (state.cash >= cost) {
      state.cash -= cost;
      totalPaid += cost;
      if (building.inactive) building.inactive = false; // volta a ficar ativo assim que conseguires pagar
    } else if (!building.inactive) {
      building.inactive = true;
      newlyInactive.push(def.name);
    }
  });

  return { totalPaid, newlyInactive };
}

// Paga manualmente a manutenção de um edifício específico para o reativar.
function payBuildingMaintenance(buildingIndex) {
  const building = state.buildings[buildingIndex];
  if (!building) return;
  const def = BUILDING_TYPES[building.type];
  const cost = def.maintenanceCost(building.level);

  if (state.jailDaysLeft > 0) {
    toast('Estás na prisão. Não podes negociar.', 'fail');
    return;
  }
  if (state.cash < cost) {
    toast('Dinheiro insuficiente para pagar a manutenção.', 'fail');
    return;
  }

  state.cash -= cost;
  building.inactive = false;
  toast(`${def.name} reativado.`, 'success');
  renderAll();
}

function collectDailyBuildingIncome() {
  if (state.buildings.length === 0) return;

  const { totalPaid, newlyInactive } = collectDailyMaintenance();

  let cashGained = 0;
  let respectGained = 0;
  let drugSalesTotal = 0;
  const drugSaleLines = [];

  state.buildings.forEach(building => {
    if (building.inactive) return; // edifícios inativos não geram renda

    const def = BUILDING_TYPES[building.type];
    const value = def.output(building.level);

    if (building.type === 'disco' || building.type === 'casino') {
      cashGained += value;
    } else if (building.type === 'autodrome') {
      respectGained += value;
    } else if (building.type === 'drugden') {
      // Vende `value`% do stock de cada droga ao preço de mercado atual.
      DRUGS.forEach(drug => {
        const owned = state.drugs[drug.id] || 0;
        if (owned <= 0) return;
        const unitsSold = Math.floor(owned * (value / 100));
        if (unitsSold <= 0) return;
        const price = state.drugPrices[drug.id] || drug.basePrice;
        const revenue = unitsSold * price;

        state.drugs[drug.id] -= unitsSold;
        drugSalesTotal += revenue;
        state.stats.drugUnitsSold += unitsSold;
        drugSaleLines.push(`${unitsSold}x ${drug.name}`);
      });
    }
    // 'bunker' é tratado em tempo real, não aqui.
  });

  state.cash += cashGained + drugSalesTotal;
  state.respect += respectGained;

  const parts = [];
  if (totalPaid > 0) parts.push(`-${formatNumber(totalPaid)} manutenção`);
  if (cashGained > 0) parts.push(`+${formatNumber(cashGained)} dinheiro (negócios)`);
  if (respectGained > 0) parts.push(`+${respectGained} respeito (autódromo)`);
  if (drugSalesTotal > 0) parts.push(`+${formatNumber(drugSalesTotal)} dinheiro (banca: ${drugSaleLines.join(', ')})`);

  if (parts.length > 0) {
    toast(`Edifícios: ${parts.join('; ')}.`, 'success');
  }
  if (newlyInactive.length > 0) {
    toast(`Sem dinheiro para manutenção: ${newlyInactive.join(', ')} ficaram inativos.`, 'fail');
  }

  checkAchievements();
}

/* ---------------------------------------------------------------------
   REGENERAÇÃO DE ENERGIA EM TEMPO REAL (Bunker)
   --------------------------------------------------------------------- */

// Soma a "taxa de energia por tick" de todos os bunkers possuídos.
function bunkerEnergyPerTick() {
  return state.buildings
    .filter(b => b.type === 'bunker')
    .reduce((sum, b) => sum + BUILDING_TYPES.bunker.output(b.level), 0);
}

// Calcula quantos ticks de 5 minutos passaram desde o último cálculo
// (funciona mesmo se o browser esteve fechado) e aplica a energia ganha.
function applyOfflineEnergyRegen() {
  const ratePerTick = bunkerEnergyPerTick();
  if (ratePerTick <= 0) {
    state.lastEnergyTick = Date.now();
    return;
  }

  const now = Date.now();
  const elapsed = now - (state.lastEnergyTick || now);
  const ticks = Math.floor(elapsed / BUILDING_ENERGY_TICK_MS);

  if (ticks > 0) {
    const gained = ticks * ratePerTick;
    const before = state.energy;
    state.energy = Math.min(state.energyMax, state.energy + gained);
    state.lastEnergyTick += ticks * BUILDING_ENERGY_TICK_MS;

    if (state.energy > before) {
      toast(`Bunker regenerou +${state.energy - before} energia enquanto estiveste fora.`, 'success');
    }
  }
}

// Timer de UI: corre a cada poucos segundos para ir aplicando a regeneração
// em tempo real enquanto o jogador está com o jogo aberto.
let energyTickInterval = null;

function startEnergyTickLoop() {
  if (energyTickInterval) clearInterval(energyTickInterval);
  energyTickInterval = setInterval(() => {
    const ratePerTick = bunkerEnergyPerTick();
    if (ratePerTick <= 0) return;

    const now = Date.now();
    const elapsed = now - state.lastEnergyTick;
    if (elapsed >= BUILDING_ENERGY_TICK_MS) {
      const ticks = Math.floor(elapsed / BUILDING_ENERGY_TICK_MS);
      const gained = ticks * ratePerTick;
      const before = state.energy;
      state.energy = Math.min(state.energyMax, state.energy + gained);
      state.lastEnergyTick += ticks * BUILDING_ENERGY_TICK_MS;

      if (state.energy > before) {
        renderStatusBar();
      }
    }
  }, 15000); // verifica a cada 15s; suficiente para um tick de 5 min
}

/* ---------------------------------------------------------------------
   RENDERIZAÇÃO
   --------------------------------------------------------------------- */

function renderBuildingCatalog() {
  const list = document.getElementById('building-catalog-list');
  list.innerHTML = '';

  Object.keys(BUILDING_TYPES).forEach(typeId => {
    const def = BUILDING_TYPES[typeId];
    const locked = state.level < def.unlockLevel;
    const ownedCount = state.buildings.filter(b => b.type === typeId).length;

    const card = document.createElement('div');
    card.className = 'card' + (locked ? ' locked' : '');
    card.innerHTML = `
      <div class="card-icon"><svg class="icon"><use href="#${def.icon}"/></svg></div>
      <div class="card-body">
        <div class="card-title">${def.name} ${ownedCount > 0 ? `<span class="owned-tag">x${ownedCount}</span>` : ''}</div>
        <div class="card-meta">
          <span>${def.description}</span>
        </div>
        <div class="card-meta">
          <span>Preço: <b>${formatNumber(def.buyPrice)}</b></span>
          ${locked ? `<span>Requer nível <b>${def.unlockLevel}</b></span>` : `<span>${def.outputLabel} (nv.1): <b>${def.output(1)}</b></span>`}
        </div>
      </div>
      <div class="card-action">
        <button class="btn" ${locked ? 'disabled' : ''} data-buy-building="${typeId}">
          ${locked ? '<svg class="icon"><use href="#icon-lock"/></svg>' : 'Comprar'}
        </button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('button[data-buy-building]').forEach(btn => {
    btn.addEventListener('click', () => buyBuilding(btn.dataset.buyBuilding));
  });
}

function renderOwnedBuildings() {
  const list = document.getElementById('owned-buildings-list');
  list.innerHTML = '';

  if (state.buildings.length === 0) {
    list.innerHTML = '<div class="inventory-empty">Ainda não possuis edifícios.</div>';
    return;
  }

  state.buildings.forEach((building, index) => {
    const def = BUILDING_TYPES[building.type];
    const maxed = building.level >= def.maxLevel;
    const upgradeCost = maxed ? null : def.upgradeCost(building.level);
    const maintenanceCost = def.maintenanceCost(building.level);

    const card = document.createElement('div');
    card.className = 'card' + (building.inactive ? ' building-inactive' : '');
    card.innerHTML = `
      <div class="card-icon"><svg class="icon"><use href="#${def.icon}"/></svg></div>
      <div class="card-body">
        <div class="card-title">${def.name} — Nível ${building.level} ${building.inactive ? '<span class="inactive-tag">Inativo</span>' : ''}</div>
        <div class="card-meta">
          <span>${def.outputLabel}: <b>${def.output(building.level)}</b></span>
          <span>Manutenção/dia: <b>${formatNumber(maintenanceCost)}</b></span>
          ${maxed ? '<span>Nível máximo</span>' : `<span>Upgrade: <b>${formatNumber(upgradeCost)}</b></span>`}
        </div>
      </div>
      <div class="card-action">
        ${building.inactive
          ? `<button class="btn" data-pay-maintenance="${index}">Reativar (${formatNumber(maintenanceCost)})</button>`
          : `<button class="btn ${maxed ? 'btn-secondary' : ''}" ${maxed ? 'disabled' : ''} data-upgrade-building="${index}">${maxed ? 'Máximo' : 'Melhorar'}</button>`}
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('button[data-upgrade-building]').forEach(btn => {
    btn.addEventListener('click', () => upgradeBuilding(parseInt(btn.dataset.upgradeBuilding, 10)));
  });
  list.querySelectorAll('button[data-pay-maintenance]').forEach(btn => {
    btn.addEventListener('click', () => payBuildingMaintenance(parseInt(btn.dataset.payMaintenance, 10)));
  });
}

function renderBuildings() {
  renderBuildingCatalog();
  renderOwnedBuildings();
}
