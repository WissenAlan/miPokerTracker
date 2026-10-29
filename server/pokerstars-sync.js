const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { parseHandHistoryContent, summarizeHands } = require('./pokerstars-parser');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Encuentra la carpeta activa de HandHistory (busca si hay subcarpeta de usuario como alan_vincen)
function resolveHandHistoryDir(baseDir) {
  if (!fs.existsSync(baseDir)) return baseDir;

  try {
    const subdirs = fs.readdirSync(baseDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => path.join(baseDir, d.name));

    // Si tiene subcarpeta con txt, usar la subcarpeta
    for (const sub of subdirs) {
      const hasTxt = fs.readdirSync(sub).some(f => f.endsWith('.txt'));
      if (hasTxt) return sub;
    }
  } catch (e) {
    console.error(e);
  }

  return baseDir;
}

function syncPokerStarsFolder(hhDir, heroName = 'alan_vincen') {
  if (!fs.existsSync(hhDir)) {
    return { success: false, message: 'Carpeta no existe' };
  }

  const resolvedDir = resolveHandHistoryDir(hhDir);
  let files = [];

  function findTxt(dir) {
    let results = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          results = results.concat(findTxt(full));
        } else if (e.name.endsWith('.txt')) {
          results.push(full);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return results;
  }

  files = findTxt(resolvedDir);
  if (files.length === 0) {
    return { success: true, handsCount: 0, message: 'No hay archivos .txt' };
  }

  // Parse all hands
  let allHands = [];
  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf-8');
      const hands = parseHandHistoryContent(content, heroName);
      allHands = allHands.concat(hands);
    } catch (err) {
      console.error('Error leyendo archivo:', f, err);
    }
  }

  // Deduplicate by handId
  const seen = new Set();
  const uniqueHands = [];
  for (const h of allHands) {
    if (!seen.has(h.handId)) {
      seen.add(h.handId);
      uniqueHands.push(h);
    }
  }

  if (uniqueHands.length === 0) {
    return { success: true, handsCount: 0, message: 'Sin manos válidas' };
  }

  // Agrupar manos de hoy
  const today = new Date();
  const fechaHoy = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  const isoHoy = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const summary = summarizeHands(uniqueHands);

  // Cargar sessions.json y actualizar o crear sesión de hoy
  let sessions = [];
  if (fs.existsSync(SESSIONS_FILE)) {
    sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  }

  // Buscar si ya hay sesión de hoy
  let todaySession = sessions.find(s => s.fecha === fechaHoy && s.tipo === 'sesion');

  // Estimar minutos: ~1 mano cada 20 segundos
  const minutosJugados = Math.max(1, Math.round(summary.totalHands * 0.35));

  if (todaySession) {
    todaySession.cantManos = summary.totalHands;
    todaySession.minutos = minutosJugados;
    todaySession.deltaGanancia = summary.totalProfit;
    todaySession.deltaBanca = summary.totalProfit;
    todaySession.stake = 'NL5';
    todaySession.stakeLabel = 'NL5 ($5)';
    todaySession.notas = `PokerStars Auto-Sync (${summary.totalHands} manos) • VPIP: ${summary.vpipPct}% • PFR: ${summary.pfrPct}%`;
    todaySession.fuente = 'pokerstars-live';
  } else {
    // Crear nueva sesión para hoy
    todaySession = {
      id: `pokerstars-${isoHoy}`,
      fecha: fechaHoy,
      isoDate: isoHoy,
      tipo: 'sesion',
      cantManos: summary.totalHands,
      minutos: minutosJugados,
      banca: 0, // Se recalculará
      ganancia: 0, // Se recalculará
      deltaBanca: summary.totalProfit,
      deltaGanancia: summary.totalProfit,
      stake: 'NL5',
      stakeLabel: 'NL5 ($5)',
      recompensaCode: 0,
      fuente: 'pokerstars-live',
      notas: `PokerStars Auto-Sync (${summary.totalHands} manos) • VPIP: ${summary.vpipPct}% • PFR: ${summary.pfrPct}%`
    };
    sessions.push(todaySession);
  }

  // Recalcular banca y ganancias corridas
  let runningBanca = 0;
  let runningGanancia = 0;

  sessions = sessions.map((s, index) => {
    let deltaBanca = Number(s.deltaBanca || 0);
    let deltaGanancia = Number(s.deltaGanancia || 0);

    if (index === 0 && (s.deltaBanca === undefined || isNaN(s.deltaBanca))) {
      deltaBanca = s.banca || 0;
      deltaGanancia = s.ganancia || 0;
    }

    runningBanca = Number((runningBanca + deltaBanca).toFixed(2));
    runningGanancia = Number((runningGanancia + deltaGanancia).toFixed(2));

    return {
      ...s,
      banca: runningBanca,
      ganancia: runningGanancia,
      deltaBanca,
      deltaGanancia
    };
  });

  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');

  return {
    success: true,
    handsCount: summary.totalHands,
    profit: summary.totalProfit,
    summary,
    bancaActual: runningBanca,
    lastUpdate: new Date().toISOString()
  };
}

let watcherInstance = null;

function startAutoWatcher(hhDir, heroName, onUpdate) {
  if (watcherInstance) {
    try { watcherInstance.close(); } catch (e) {}
  }

  const watchPath = resolveHandHistoryDir(hhDir);
  console.log('Iniciando watcher en:', watchPath);

  let debounceTimer = null;

  watcherInstance = chokidar.watch(watchPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 200
    }
  });

  watcherInstance.on('all', (event, filePath) => {
    if (filePath.endsWith('.txt')) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log(`[Auto-Sync] Archivo modificado: ${path.basename(filePath)}. Sincronizando...`);
        const res = syncPokerStarsFolder(hhDir, heroName);
        if (onUpdate) onUpdate(res);
      }, 1500);
    }
  });

  return watcherInstance;
}

module.exports = {
  syncPokerStarsFolder,
  startAutoWatcher,
  resolveHandHistoryDir
};
