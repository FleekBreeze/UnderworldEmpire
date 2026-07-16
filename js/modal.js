'use strict';

/* ======================================================================
   BLACKLIST CITY — js/modal.js
   Modal de confirmação genérico, substitui o confirm() nativo do browser.
   Uso: showConfirmModal({ title, message, onConfirm, onCancel, confirmLabel, cancelLabel })
   ====================================================================== */

let modalConfirmCallback = null;
let modalCancelCallback = null;

function showConfirmModal(options) {
  const {
    title = 'Confirmar',
    message = '',
    onConfirm = null,
    onCancel = null,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
  } = options;

  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-message').textContent = message;
  document.getElementById('confirm-modal-accept').textContent = confirmLabel;
  document.getElementById('confirm-modal-cancel').textContent = cancelLabel;

  modalConfirmCallback = onConfirm;
  modalCancelCallback = onCancel;

  document.getElementById('confirm-modal-backdrop').classList.remove('hidden');
}

function hideConfirmModal() {
  document.getElementById('confirm-modal-backdrop').classList.add('hidden');
  modalConfirmCallback = null;
  modalCancelCallback = null;
}

function initConfirmModal() {
  document.getElementById('confirm-modal-accept').addEventListener('click', () => {
    const cb = modalConfirmCallback;
    hideConfirmModal();
    if (cb) cb();
  });

  document.getElementById('confirm-modal-cancel').addEventListener('click', () => {
    const cb = modalCancelCallback;
    hideConfirmModal();
    if (cb) cb();
  });

  // Clicar fora da caixa (no backdrop) cancela, tal como o "Cancelar".
  document.getElementById('confirm-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'confirm-modal-backdrop') {
      const cb = modalCancelCallback;
      hideConfirmModal();
      if (cb) cb();
    }
  });
}
