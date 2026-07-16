'use strict';

/* ======================================================================
   BLACKLIST CITY — js/shop.js
   Loja de armas/equipamento que aumenta o poder do jogador.
   ====================================================================== */

const SHOP_ITEMS = [
  { id: 'knife',     name: 'Navalha',        power: 5,   price: 50,    icon: 'icon-gun' },
  { id: 'bat',       name: 'Bastão',         power: 12,  price: 150,   icon: 'icon-gun' },
  { id: 'pistol',    name: 'Pistola 9mm',    power: 28,  price: 450,   icon: 'icon-gun' },
  { id: 'revolver',  name: 'Revólver .357',  power: 50,  price: 1100,  icon: 'icon-gun' },
  { id: 'shotgun',   name: 'Caçadeira',      power: 90,  price: 2400,  icon: 'icon-gun' },
  { id: 'smg',       name: 'Submetralhadora', power: 150, price: 5200, icon: 'icon-gun' },
  { id: 'sniper',    name: 'Sniper',         power: 240, price: 9800,  icon: 'icon-gun' },
  { id: 'armor',     name: 'Colete Blindado', power: 320, price: 16500, icon: 'icon-gun' },
];

function buyItem(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;

  if (state.jailDaysLeft > 0) {
    toast('Estás na prisão. Não podes comprar equipamento.', 'fail');
    return;
  }
  if (state.inventory.includes(itemId)) {
    toast('Já possuis este item.', 'fail');
    return;
  }
  if (state.cash < item.price) {
    toast('Dinheiro insuficiente.', 'fail');
    return;
  }

  state.cash -= item.price;
  state.power += item.power;
  state.inventory.push(itemId);

  toast(`Compraste ${item.name}. +${item.power} poder.`, 'success');
  checkAchievements();
  renderAll();
}

function renderShop() {
  const list = document.getElementById('shop-list');
  list.innerHTML = '';

  SHOP_ITEMS.forEach(item => {
    const owned = state.inventory.includes(item.id);
    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
      <div class="card-icon"><svg class="icon"><use href="#${item.icon}"/></svg></div>
      <div class="card-body">
        <div class="card-title">${item.name}</div>
        <div class="card-meta">
          <span>Poder: <b>+${item.power}</b></span>
          <span>Preço: <b>${formatNumber(item.price)}</b></span>
        </div>
      </div>
      <div class="card-action">
        <button class="btn ${owned ? 'btn-secondary' : ''}" ${owned ? 'disabled' : ''} data-item="${item.id}">
          ${owned ? 'Possuído' : 'Comprar'}
        </button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('button[data-item]').forEach(btn => {
    btn.addEventListener('click', () => buyItem(btn.dataset.item));
  });
}
