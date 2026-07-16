'use strict';

/* ======================================================================
   BLACKLIST CITY — js/heat.js
   Sistema de "Calor" (visibilidade perante a polícia/rivais).
   Sobe com atividade criminosa, desce lentamente com o tempo.
   Heat alto = mais risco. Heat baixo = pequenos bónus por discrição.
   ====================================================================== */

const HEAT_MAX = 100;
const HEAT_HIGH_THRESHOLD = 60;
const HEAT_LOW_THRESHOLD = 25;
const HEAT_DAILY_DECAY_BASE = 10;     // decay mínimo garantido por dia
const HEAT_DAILY_DECAY_IDLE_BONUS = 8; // decay extra se não agiste nesse "turno"

function addHeat(amount) {
  state.heat = Math.max(0, Math.min(HEAT_MAX, state.heat + amount));
}

function isHeatHigh() {
  return state.heat >= HEAT_HIGH_THRESHOLD;
}

function isHeatLow() {
  return state.heat <= HEAT_LOW_THRESHOLD;
}

// Penalização/bónus aplicado ao jailChance de um assalto, em pontos percentuais.
function heatJailChanceModifier() {
  if (isHeatHigh()) {
    // Escala de +0 a +20 pontos percentuais conforme o heat sobe de 60 a 100.
    return Math.round(((state.heat - HEAT_HIGH_THRESHOLD) / (HEAT_MAX - HEAT_HIGH_THRESHOLD)) * 20);
  }
  if (isHeatLow()) {
    return -5; // discrição reduz ligeiramente o risco
  }
  return 0;
}

// Bónus/penalização à % de sucesso de assaltos.
function heatSuccessChanceModifier() {
  if (isHeatLow()) return 4;
  if (isHeatHigh()) return -4;
  return 0;
}

// Desconto/agravo no custo do suborno.
function heatBribeCostMultiplier() {
  if (isHeatLow()) return 0.85; // -15%
  if (isHeatHigh()) return 1.25; // +25%
  return 1;
}

// Decay diário do heat: decay base, mais um bónus extra se o jogador não
// realizou nenhuma ação "ilegal" desde o último avanço de dia.
function decayHeatForNewDay(actedThisTurn) {
  const decay = HEAT_DAILY_DECAY_BASE + (actedThisTurn ? 0 : HEAT_DAILY_DECAY_IDLE_BONUS);
  addHeat(-decay);
}

// Probabilidade de rusga ao avançar o dia, quando o heat está alto.
// Rusga: perdes parte do stock de drogas e algum cash.
function maybeTriggerRaid() {
  if (!isHeatHigh()) return null;

  const raidChance = Math.round(((state.heat - HEAT_HIGH_THRESHOLD) / (HEAT_MAX - HEAT_HIGH_THRESHOLD)) * 35); // até 35%
  if (Math.random() * 100 > raidChance) return null;

  // Perde 20-40% do stock de cada droga.
  const lostDrugLines = [];
  DRUGS.forEach(drug => {
    const owned = state.drugs[drug.id] || 0;
    if (owned <= 0) return;
    const lossPct = 0.2 + Math.random() * 0.2;
    const lost = Math.max(1, Math.floor(owned * lossPct));
    state.drugs[drug.id] -= lost;
    lostDrugLines.push(`${lost}x ${drug.name}`);
  });

  // Perde 5-12% do cash.
  const cashLossPct = 0.05 + Math.random() * 0.07;
  const cashLost = Math.round(state.cash * cashLossPct);
  state.cash = Math.max(0, state.cash - cashLost);

  // Uma rusga alivia algum heat, já que "pagaste" por isso.
  addHeat(-15);
  state.stats.raidsSurvived += 1;

  return { cashLost, lostDrugLines };
}

function heatLevelLabel() {
  if (isHeatHigh()) return 'Alto';
  if (isHeatLow()) return 'Baixo';
  return 'Médio';
}

function heatLevelClass() {
  if (isHeatHigh()) return 'heat-high';
  if (isHeatLow()) return 'heat-low';
  return 'heat-mid';
}
