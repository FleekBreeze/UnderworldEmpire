'use strict';

/* ======================================================================
   BLACKLIST CITY — js/profile.js
   Identidade do jogador: nome editável e escolha de avatar.
   ====================================================================== */

const AVATAR_OPTIONS = ['avatar-strategist', 'avatar-brute', 'avatar-shadow'];

function savePlayerName() {
  const input = document.getElementById('input-player-name');
  const value = input.value.trim();

  if (value.length === 0) {
    toast('O nome não pode ficar vazio.', 'fail');
    return;
  }
  if (value.length > 20) {
    toast('Nome demasiado longo (máx. 20 caracteres).', 'fail');
    return;
  }

  state.name = value;
  toast('Nome guardado.', 'success');
  renderProfile();
}

function selectAvatar(avatarId) {
  if (!AVATAR_OPTIONS.includes(avatarId)) return;
  state.avatar = avatarId;
  renderProfile();
}

function renderIdentityCard() {
  const display = document.getElementById('profile-avatar-display');
  if (display) {
    display.setAttribute('href', '#' + (state.avatar || 'avatar-strategist'));
  }

  const nameInput = document.getElementById('input-player-name');
  if (nameInput && document.activeElement !== nameInput) {
    // Não sobrescreve enquanto o jogador está a escrever.
    nameInput.value = state.name === 'Sem Nome' ? '' : state.name;
  }

  document.querySelectorAll('.avatar-option').forEach(btn => {
    btn.classList.toggle('avatar-selected', btn.dataset.avatar === state.avatar);
  });
}
