'use strict';

/* ======================================================================
   BLACKLIST CITY — js/jail.js
   Prisão: contagem de dias, suborno, render.
   ====================================================================== */

// Custo do suborno escala com os dias restantes e com o nível do jogador,
// com desconto se o heat estiver baixo ou agravo se estiver alto.
function bribeCost() {
  const base = state.jailDaysLeft * (80 + state.level * 25);
  return Math.round(base * heatBribeCostMultiplier());
}

function payBribe() {
  if (state.jailDaysLeft <= 0) return;
  const cost = bribeCost();
  if (state.cash < cost) {
    toast('Dinheiro insuficiente para o suborno.', 'fail');
    return;
  }
  state.cash -= cost;
  state.jailDaysLeft = 0;
  state.stats.bribesPaid += 1;
  toast(`Pagaste ${formatNumber(cost)} de suborno. Estás livre.`, 'success');
  checkAchievements();
  renderAll();
}

function renderJail() {
  const wrap = document.getElementById('jail-wrap');
  const inJail = state.jailDaysLeft > 0;

  if (!inJail) {
    wrap.innerHTML = `
      <div class="jail-free">
        <svg class="icon icon-xl"><use href="#icon-respect"/></svg>
        <p>Estás livre. Continua o teu trabalho na cidade.</p>
      </div>
    `;
    return;
  }

  const cost = bribeCost();
  wrap.innerHTML = `
    <div class="jail-status">
      <svg class="icon icon-xl"><use href="#icon-lock"/></svg>
      <div><span class="stamp stamp-danger">Detido</span></div>
      <div class="jail-days">${state.jailDaysLeft} dia(s) restantes</div>
      <p class="view-sub">Avança o dia para cumprir pena, ou paga um suborno para saíres já.</p>
      <button id="btn-bribe" class="btn">Pagar Suborno (${formatNumber(cost)})</button>
    </div>
  `;

  document.getElementById('btn-bribe').addEventListener('click', payBribe);
}
