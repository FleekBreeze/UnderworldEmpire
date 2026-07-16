'use strict';

/* ======================================================================
   BLACKLIST CITY — js/drugs.js
   Drogas, componentes, laboratório, mercado flutuante.
   ====================================================================== */

// Cada droga usa 1 tipo de componente. basePrice flutua ±variance por dia.
const DRUGS = [
  {
    id: 'weed', name: 'Marijuana',
    componentId: 'weed_seeds', componentName: 'Semente de Cannabis',
    componentsPerUnit: 2,
    basePrice: 12, variance: 0.25,
    unlockLabLevel: 1,
  },
  {
    id: 'coke', name: 'Cocaína',
    componentId: 'coca_leaves', componentName: 'Folha de Coca',
    componentsPerUnit: 3,
    basePrice: 45, variance: 0.3,
    unlockLabLevel: 2,
  },
  {
    id: 'meth', name: 'Metanfetamina',
    componentId: 'chem_precursor', componentName: 'Precursor Químico',
    componentsPerUnit: 4,
    basePrice: 90, variance: 0.35,
    unlockLabLevel: 3,
  },
  {
    id: 'heroin', name: 'Heroína',
    componentId: 'chem_precursor', componentName: 'Precursor Químico',
    componentsPerUnit: 6,
    basePrice: 160, variance: 0.4,
    unlockLabLevel: 4,
  },
];

// Componentes podem também ser comprados diretamente (mais caro que apanhar em robberies).
const COMPONENT_BUY_PRICE = {
  weed_seeds: 4,
  coca_leaves: 9,
  chem_precursor: 18,
};

// Níveis do laboratório: produção de unidades de droga por dia (todas as drogas desbloqueadas).
const LAB_LEVELS = [
  { level: 0, name: 'Sem Laboratório', upgradeCost: 0,    unitsPerDay: 0 },
  { level: 1, name: 'Laboratório Caseiro', upgradeCost: 1800,  unitsPerDay: 4 },
  { level: 2, name: 'Laboratório Equipado', upgradeCost: 6500,  unitsPerDay: 9 },
  { level: 3, name: 'Laboratório Industrial', upgradeCost: 18000, unitsPerDay: 16 },
  { level: 4, name: 'Super-Laboratório', upgradeCost: 42000, unitsPerDay: 28 },
];

function componentName(componentId) {
  const drug = DRUGS.find(d => d.componentId === componentId);
  return drug ? drug.componentName : componentId;
}

function buyComponent(componentId, amount) {
  if (state.jailDaysLeft > 0) {
    toast('Estás na prisão. Não podes negociar.', 'fail');
    return;
  }
  const unitPrice = COMPONENT_BUY_PRICE[componentId];
  if (unitPrice === undefined) return;

  const totalCost = unitPrice * amount;
  if (state.cash < totalCost) {
    toast('Dinheiro insuficiente.', 'fail');
    return;
  }

  state.cash -= totalCost;
  state.components[componentId] = (state.components[componentId] || 0) + amount;
  toast(`Comprados ${amount}x ${componentName(componentId)}.`, 'success');
  renderAll();
}

function upgradeLab() {
  if (state.jailDaysLeft > 0) {
    toast('Estás na prisão. Não podes negociar.', 'fail');
    return;
  }
  const nextLevel = LAB_LEVELS[state.labLevel + 1];
  if (!nextLevel) {
    toast('Laboratório já está no nível máximo.', 'fail');
    return;
  }
  if (state.cash < nextLevel.upgradeCost) {
    toast('Dinheiro insuficiente para o upgrade.', 'fail');
    return;
  }

  state.cash -= nextLevel.upgradeCost;
  state.labLevel = nextLevel.level;
  toast(`Laboratório melhorado: ${nextLevel.name}.`, 'success');
  checkAchievements();
  renderAll();
}

// Produção diária: distribui a capacidade do laboratório pelas drogas
// já desbloqueadas, limitada pelos componentes disponíveis.
function produceDrugs() {
  if (state.labLevel <= 0) return;

  const labInfo = LAB_LEVELS[state.labLevel];
  const unlockedDrugs = DRUGS.filter(d => d.unlockLabLevel <= state.labLevel);
  if (unlockedDrugs.length === 0) return;

  const capacityPerDrug = Math.floor(labInfo.unitsPerDay / unlockedDrugs.length) || 1;
  let producedAny = false;
  const producedLines = [];

  unlockedDrugs.forEach(drug => {
    const have = state.components[drug.componentId] || 0;
    const maxByComponents = Math.floor(have / drug.componentsPerUnit);
    const unitsProduced = Math.min(capacityPerDrug, maxByComponents);

    if (unitsProduced > 0) {
      state.components[drug.componentId] -= unitsProduced * drug.componentsPerUnit;
      state.drugs[drug.id] = (state.drugs[drug.id] || 0) + unitsProduced;
      producedLines.push(`+${unitsProduced} ${drug.name}`);
      producedAny = true;
    }
  });

  if (producedAny) {
    toast(`Laboratório produziu: ${producedLines.join(', ')}.`, 'success');
  }
}

// Preços flutuam de forma aleatória dentro do range de variância da droga.
function fluctuateDrugPrices() {
  DRUGS.forEach(drug => {
    const change = (Math.random() * 2 - 1) * drug.variance; // -variance .. +variance
    const newPrice = Math.round(drug.basePrice * (1 + change));
    state.drugPrices[drug.id] = Math.max(1, newPrice);
  });
}

function sellDrug(drugId, amount) {
  if (state.jailDaysLeft > 0) {
    toast('Estás na prisão. Não podes negociar.', 'fail');
    return;
  }
  const owned = state.drugs[drugId] || 0;
  if (amount <= 0 || amount > owned) {
    toast('Quantidade inválida.', 'fail');
    return;
  }

  const drug = DRUGS.find(d => d.id === drugId);
  const price = state.drugPrices[drugId] || drug.basePrice;
  const total = price * amount;

  state.drugs[drugId] -= amount;
  state.cash += total;
  state.respect += Math.max(1, Math.round(amount / 5));
  state.actedThisTurn = true;
  state.stats.drugUnitsSold += amount;
  addHeat(Math.min(5, Math.ceil(amount / 8)));

  toast(`Vendeste ${amount}x ${drug.name} por ${formatNumber(total)}.`, 'success');
  checkAchievements();
  renderAll();
}

function renderDrugLab() {
  const labInfo = LAB_LEVELS[state.labLevel];
  const nextLab = LAB_LEVELS[state.labLevel + 1];

  const labBox = document.getElementById('lab-box');
  labBox.innerHTML = `
    <div class="card-icon"><svg class="icon"><use href="#icon-shop"/></svg></div>
    <div class="card-body">
      <div class="card-title">${labInfo.name}</div>
      <div class="card-meta">
        <span>Produção: <b>${labInfo.unitsPerDay} unid./dia</b></span>
        ${nextLab ? `<span>Upgrade: <b>${formatNumber(nextLab.upgradeCost)}</b></span>` : '<span>Nível máximo</span>'}
      </div>
    </div>
    <div class="card-action">
      ${nextLab
        ? `<button class="btn" id="btn-upgrade-lab">Melhorar</button>`
        : `<button class="btn btn-secondary" disabled>Máximo</button>`}
    </div>
  `;
  if (nextLab) {
    document.getElementById('btn-upgrade-lab').addEventListener('click', upgradeLab);
  }

  // Componentes
  const compList = document.getElementById('components-list');
  compList.innerHTML = '';
  Object.keys(COMPONENT_BUY_PRICE).forEach(componentId => {
    const owned = state.components[componentId] || 0;
    const price = COMPONENT_BUY_PRICE[componentId];
    const card = document.createElement('div');
    card.className = 'card card-compact';
    card.innerHTML = `
      <div class="card-body">
        <div class="card-title">${componentName(componentId)}</div>
        <div class="card-meta">
          <span>Tens: <b>${owned}</b></span>
          <span>Preço unit.: <b>${price}</b></span>
        </div>
      </div>
      <div class="card-action">
        <button class="btn btn-secondary" data-buy-component="${componentId}" data-amount="10">+10</button>
      </div>
    `;
    compList.appendChild(card);
  });
  compList.querySelectorAll('button[data-buy-component]').forEach(btn => {
    btn.addEventListener('click', () => {
      buyComponent(btn.dataset.buyComponent, parseInt(btn.dataset.amount, 10));
    });
  });

  // Drogas (inventário + venda)
  const drugList = document.getElementById('drug-list');
  drugList.innerHTML = '';
  DRUGS.forEach(drug => {
    const unlocked = state.labLevel >= drug.unlockLabLevel;
    const owned = state.drugs[drug.id] || 0;
    const price = state.drugPrices[drug.id] || drug.basePrice;

    const card = document.createElement('div');
    card.className = 'card' + (unlocked ? '' : ' locked');
    card.innerHTML = `
      <div class="card-icon"><svg class="icon"><use href="#icon-skull"/></svg></div>
      <div class="card-body">
        <div class="card-title">${drug.name}</div>
        <div class="card-meta">
          ${unlocked
            ? `<span>Tens: <b>${owned}</b></span><span>Preço: <b>${price}</b>/unid.</span><span>Custo: <b>${drug.componentsPerUnit}x ${componentName(drug.componentId)}</b></span>`
            : `<span>Requer laboratório nível <b>${drug.unlockLabLevel}</b></span>`}
        </div>
      </div>
      <div class="card-action">
        ${unlocked
          ? `<button class="btn" data-sell-drug="${drug.id}" ${owned <= 0 ? 'disabled' : ''}>Vender Tudo</button>`
          : `<button class="btn btn-secondary" disabled><svg class="icon"><use href="#icon-lock"/></svg></button>`}
      </div>
    `;
    drugList.appendChild(card);
  });
  drugList.querySelectorAll('button[data-sell-drug]').forEach(btn => {
    btn.addEventListener('click', () => {
      const drugId = btn.dataset.sellDrug;
      sellDrug(drugId, state.drugs[drugId] || 0);
    });
  });
}
