'use strict';

/* ======================================================================
   BLACKLIST CITY — js/tutorial.js
   Modal de "Como Jogar". Abre automaticamente na primeira visita
   (detetado via localStorage) e pode ser reaberto manualmente.
   ====================================================================== */

const TUTORIAL_SEEN_KEY = 'blacklist_city_tutorial_seen_v1';

function showTutorial() {
  document.getElementById('tutorial-modal-backdrop').classList.remove('hidden');
}

function hideTutorial() {
  document.getElementById('tutorial-modal-backdrop').classList.add('hidden');
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch (e) { /* localStorage indisponível, ignora */ }
}

function initTutorial() {
  document.getElementById('btn-how-to-play').addEventListener('click', showTutorial);
  document.getElementById('tutorial-modal-close').addEventListener('click', hideTutorial);

  // Clicar fora da caixa também fecha (e marca como visto).
  document.getElementById('tutorial-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'tutorial-modal-backdrop') hideTutorial();
  });

  let alreadySeen = false;
  try {
    alreadySeen = localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
  } catch (e) { /* localStorage indisponível, assume não visto */ }

  if (!alreadySeen) {
    showTutorial();
  }
}
