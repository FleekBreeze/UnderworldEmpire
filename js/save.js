'use strict';

/* ======================================================================
   BLACKLIST CITY — js/save.js
   Sistema de save por "seed" de texto: exporta o estado inteiro do jogo
   como uma string codificada (base64) que pode ser copiada, transferida
   como .txt, e importada mais tarde no mesmo ou noutro dispositivo.
   ====================================================================== */

const SEED_PREFIX = 'BLCS1:'; // identifica versão/formato da seed

/* ---------------------------------------------------------------------
   CODIFICAÇÃO / DESCODIFICAÇÃO (UTF-8 seguro, suporta acentos no nome)
   --------------------------------------------------------------------- */

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function generateSeedFromState() {
  try {
    const json = JSON.stringify(state);
    return SEED_PREFIX + utf8ToBase64(json);
  } catch (e) {
    return '';
  }
}

function applySeedString(seedRaw) {
  const seed = (seedRaw || '').trim();

  if (!seed) {
    toast('Cola ou escolhe uma seed válida.', 'fail');
    return false;
  }
  if (!seed.startsWith(SEED_PREFIX)) {
    toast('Seed inválida ou de formato incompatível.', 'fail');
    return false;
  }

  try {
    const encoded = seed.slice(SEED_PREFIX.length);
    const json = base64ToUtf8(encoded);
    const loaded = JSON.parse(json);
    state = Object.assign(createNewState(), loaded);
    applyOfflineEnergyRegen();
    renderAll();
    toast('Save importado com sucesso.', 'success');
    return true;
  } catch (e) {
    toast('Não foi possível ler essa seed. Verifica se está completa.', 'fail');
    return false;
  }
}

/* ---------------------------------------------------------------------
   MODAL
   --------------------------------------------------------------------- */

function showSeedModal() {
  document.getElementById('seed-export-text').value = generateSeedFromState();
  switchSeedTab('export');
  document.getElementById('seed-modal-backdrop').classList.remove('hidden');
}

function hideSeedModal() {
  document.getElementById('seed-modal-backdrop').classList.add('hidden');
  document.getElementById('seed-import-text').value = '';
  document.getElementById('seed-file-input').value = '';
}

function switchSeedTab(tab) {
  document.querySelectorAll('.seed-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.getElementById('seed-tab-export').classList.toggle('hidden', tab !== 'export');
  document.getElementById('seed-tab-import').classList.toggle('hidden', tab !== 'import');
}

async function copySeedToClipboard() {
  const textEl = document.getElementById('seed-export-text');
  const text = textEl.value;

  try {
    await navigator.clipboard.writeText(text);
    toast('Seed copiada.', 'success');
  } catch (e) {
    // Fallback para contextos sem Clipboard API (ex: alguns browsers móveis via file://)
    textEl.removeAttribute('readonly');
    textEl.focus();
    textEl.select();
    try {
      document.execCommand('copy');
      toast('Seed copiada.', 'success');
    } catch (e2) {
      toast('Não foi possível copiar automaticamente. Seleciona o texto e copia manualmente.', 'fail');
    }
    textEl.setAttribute('readonly', 'true');
  }
}

function downloadSeedFile() {
  const text = document.getElementById('seed-export-text').value;
  const safeName = (state.name || 'save').trim().replace(/[^a-z0-9_-]+/gi, '_') || 'save';
  const filename = `blacklistcity_${safeName}_dia${state.day}.txt`;

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Ficheiro transferido.', 'success');
}

function readSeedFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById('seed-import-text').value = String(reader.result || '').trim();
  };
  reader.onerror = () => toast('Não foi possível ler o ficheiro.', 'fail');
  reader.readAsText(file);
}

function initSeedModal() {
  document.getElementById('btn-seed').addEventListener('click', showSeedModal);
  document.getElementById('seed-modal-close').addEventListener('click', hideSeedModal);

  document.getElementById('seed-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'seed-modal-backdrop') hideSeedModal();
  });

  document.querySelectorAll('.seed-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSeedTab(btn.dataset.tab));
  });

  document.getElementById('btn-seed-copy').addEventListener('click', copySeedToClipboard);
  document.getElementById('btn-seed-download').addEventListener('click', downloadSeedFile);

  document.getElementById('seed-file-input').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) readSeedFile(file);
  });

  document.getElementById('btn-seed-import').addEventListener('click', () => {
    const text = document.getElementById('seed-import-text').value;
    if (!text.trim()) {
      toast('Cola ou escolhe uma seed primeiro.', 'fail');
      return;
    }
    showConfirmModal({
      title: 'Importar Seed',
      message: 'Isto substitui todo o progresso atual pelo progresso guardado na seed. Tens a certeza?',
      confirmLabel: 'Importar',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        if (applySeedString(text)) hideSeedModal();
      },
    });
  });
}
