// update-dashboard.js
// Roda via GitHub Actions — busca dados do Google Sheets e injeta no dashboard.html

import fetch from 'node-fetch';
import fs from 'fs';

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTn7jYHWYnEY5lAMye8VWT3a0VD43GCoewkaTo38ip_yafcUN1RizBYR-Jj0hHlPWR8MEAN298CxzbZ/pub?output=csv";

async function main() {
  console.log('📊 Buscando dados do Google Sheets...');

  const resp = await fetch(SHEET_CSV_URL);
  if (!resp.ok) throw new Error(`Falha ao buscar planilha: ${resp.status}`);
  const csvText = await resp.text();

  console.log('✅ Dados recebidos. Injetando no dashboard...');

  // Lê o HTML atual
  let html = fs.readFileSync('dashboard.html', 'utf-8');

  // Escapa o CSV para injeção segura como string JS
  const escapedCSV = csvText
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  const now = new Date().toISOString();

  // Substitui ou insere o bloco de dados inline
  const dataBlock = `
// ─── DADOS PRÉ-CARREGADOS (injetados via GitHub Actions em ${now}) ─────────
const PRELOADED_CSV = \`${escapedCSV}\`;
const PRELOADED_TIMESTAMP = "${now}";
`;

  // Se já existe o bloco, substitui; senão, insere antes do fetchData()
  if (html.includes('// ─── DADOS PRÉ-CARREGADOS')) {
    html = html.replace(
      /\/\/ ─── DADOS PRÉ-CARREGADOS[\s\S]*?const PRELOADED_TIMESTAMP = "[^"]*";/,
      dataBlock.trim()
    );
  } else {
    html = html.replace(
      '// ─── INIT ─────────────────────────────────────────────────────────────────',
      dataBlock + '\n// ─── INIT ─────────────────────────────────────────────────────────────────'
    );
  }

  // Ajusta a função fetchData para usar dados pré-carregados quando disponíveis
  const fetchPatch = `
async function fetchData() {
  try {
    let text;
    if (typeof PRELOADED_CSV !== 'undefined' && PRELOADED_CSV.trim().length > 0) {
      // Usa dados pré-carregados pelo GitHub Actions
      text = PRELOADED_CSV;
      console.log('📦 Usando dados pré-carregados de', PRELOADED_TIMESTAMP);
    } else {
      // Fallback: busca ao vivo
      const resp = await fetch(SHEET_URL);
      if (!resp.ok) throw new Error('Falha ao buscar dados: ' + resp.status);
      text = await resp.text();
    }
`;

  // Verifica se já foi patcheado
  if (!html.includes('Usando dados pré-carregados')) {
    html = html.replace(
      `async function fetchData() {
  try {
    // Try fetching as CSV (published as CSV)
    const csvUrl = SHEET_URL;
    const resp = await fetch(csvUrl);
    
    if (!resp.ok) throw new Error('Falha ao buscar dados: ' + resp.status);
    
    const text = await resp.text();`,
      fetchPatch
    );
  }

  fs.writeFileSync('dashboard.html', html, 'utf-8');
  console.log(`✅ dashboard.html atualizado com sucesso em ${now}`);
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
