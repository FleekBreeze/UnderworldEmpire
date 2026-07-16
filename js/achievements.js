'use strict';

/* ======================================================================
   BLACKLIST CITY — js/achievements.js
   Conquistas permanentes. Cada uma tem uma condição (checada após cada
   ação relevante) e paga um bónus único em dinheiro ao ser desbloqueada.
   ====================================================================== */

// condition(s): recebe o state e devolve true/false.
// Os ids devem ser estáveis — nunca os renumerar, só adicionar no fim.
const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'Primeiro Golpe', description: 'Completa o teu primeiro assalto com sucesso.', reward: 50,
    condition: (s) => s.stats.successfulRobberies >= 1 },
  { id: 'ten_robberies', name: 'Mão Leve', description: 'Completa 10 assaltos com sucesso.', reward: 150,
    condition: (s) => s.stats.successfulRobberies >= 10 },
  { id: 'fifty_robberies', name: 'Reincidente', description: 'Completa 50 assaltos com sucesso.', reward: 500,
    condition: (s) => s.stats.successfulRobberies >= 50 },
  { id: 'level_5', name: 'A Subir', description: 'Atinge o nível 5.', reward: 200,
    condition: (s) => s.level >= 5 },
  { id: 'level_10', name: 'Nome na Rua', description: 'Atinge o nível 10.', reward: 600,
    condition: (s) => s.level >= 10 },
  { id: 'level_16', name: 'Lenda do Submundo', description: 'Atinge o nível 16.', reward: 2000,
    condition: (s) => s.level >= 16 },
  { id: 'first_jail', name: 'Bem-vindo ao Sistema', description: 'Vai para a prisão pela primeira vez.', reward: 30,
    condition: (s) => s.stats.timesJailed >= 1 },
  { id: 'first_bribe', name: 'Tudo se Compra', description: 'Paga o teu primeiro suborno.', reward: 80,
    condition: (s) => s.stats.bribesPaid >= 1 },
  { id: 'first_drug_sale', name: 'Primeiro Negócio', description: 'Vende a tua primeira droga.', reward: 60,
    condition: (s) => s.stats.drugUnitsSold >= 1 },
  { id: 'hundred_drugs_sold', name: 'Fornecedor', description: 'Vende 100 unidades de droga (acumulado).', reward: 400,
    condition: (s) => s.stats.drugUnitsSold >= 100 },
  { id: 'lab_maxed', name: 'Química Avançada', description: 'Atinge o laboratório de nível máximo.', reward: 1500,
    condition: (s) => s.labLevel >= 4 },
  { id: 'first_building', name: 'Empresário', description: 'Compra o teu primeiro edifício.', reward: 100,
    condition: (s) => s.buildings.length >= 1 },
  { id: 'five_buildings', name: 'Magnate', description: 'Possui 5 edifícios ao mesmo tempo.', reward: 800,
    condition: (s) => s.buildings.length >= 5 },
  { id: 'own_bunker', name: 'Fortaleza', description: 'Adquire um Bunker.', reward: 1000,
    condition: (s) => s.buildings.some(b => b.type === 'bunker') },
  { id: 'first_10k', name: 'Primeiro Milhão (a caminho)', description: 'Acumula 10.000 em dinheiro.', reward: 300,
    condition: (s) => s.cash >= 10000 },
  { id: 'first_100k', name: 'Império', description: 'Acumula 100.000 em dinheiro.', reward: 3000,
    condition: (s) => s.cash >= 100000 },
  { id: 'survived_raid', name: 'Sobrevivente', description: 'Sobrevive a uma rusga policial.', reward: 100,
    condition: (s) => s.stats.raidsSurvived >= 1 },
  { id: 'full_arsenal', name: 'Arsenal Completo', description: 'Possui todas as armas da loja.', reward: 1000,
    condition: (s) => SHOP_ITEMS.every(item => s.inventory.includes(item.id)) },
];

function checkAchievements() {
  if (!state.unlockedAchievements) state.unlockedAchievements = [];

  const newlyUnlocked = [];

  ACHIEVEMENTS.forEach(ach => {
    if (state.unlockedAchievements.includes(ach.id)) return;
    if (ach.condition(state)) {
      state.unlockedAchievements.push(ach.id);
      state.cash += ach.reward;
      newlyUnlocked.push(ach);
    }
  });

  newlyUnlocked.forEach(ach => {
    toast(`Conquista desbloqueada: ${ach.name} (+${formatNumber(ach.reward)})`, 'success');
  });

  if (newlyUnlocked.length > 0) {
    const navBtn = document.getElementById('nav-achievements');
    if (navBtn) navBtn.classList.add('nav-btn-alert');
  }
}

function renderAchievements() {
  const unlocked = state.unlockedAchievements || [];

  const progressEl = document.getElementById('achievements-progress');
  if (progressEl) {
    progressEl.textContent = `${unlocked.length} / ${ACHIEVEMENTS.length} desbloqueadas`;
  }

  const list = document.getElementById('achievements-list');
  if (!list) return;
  list.innerHTML = '';

  ACHIEVEMENTS.forEach(ach => {
    const isUnlocked = unlocked.includes(ach.id);
    const card = document.createElement('div');
    card.className = 'card' + (isUnlocked ? ' achievement-unlocked' : ' locked');
    card.innerHTML = `
      <div class="card-icon"><svg class="icon"><use href="#icon-trophy"/></svg></div>
      <div class="card-body">
        <div class="card-title">${ach.name} ${isUnlocked ? '<span class="stamp stamp-good">Aprovado</span>' : ''}</div>
        <div class="card-meta">
          <span>${ach.description}</span>
        </div>
        <div class="card-meta">
          <span>Bónus: <b>${formatNumber(ach.reward)}</b></span>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}
