'use strict';

/* ======================================================================
   BLACKLIST CITY — js/utils.js
   Funções utilitárias partilhadas por todos os módulos.
   ====================================================================== */

function formatNumber(n) {
  return n.toLocaleString('pt-PT');
}

function toast(message, type) {
  const feed = document.getElementById('log-feed');
  const el = document.createElement('div');
  el.className = `toast ${type || ''}`;
  el.textContent = message;
  feed.appendChild(el);

  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${viewName}`).classList.remove('hidden');

  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
}
