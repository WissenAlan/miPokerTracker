const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { parseHandHistoryContent, summarizeHands } = require('./pokerstars-parser');
const { syncPokerStarsFolder, startAutoWatcher, resolveHandHistoryDir } = require('./pokerstars-sync');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DATA_DIR = path.join(__dirname, '..', 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const DEMO_FILE = path.join(DATA_DIR, 'demo-sessions.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Default config
function getConfig() {
  const defaultDir = 'C:\\Users\\alan_\\AppData\\Local\\PokerStars\\HandHistory';
  if (!fs.existsSync(CONFIG_FILE)) {
    const initialConfig = {
      pokerstarsDir: defaultDir,
      heroName: 'alan_vincen',
      autoSync: true
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(initialConfig, null, 2), 'utf-8');
    return initialConfig;
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch (err) {
    return { pokerstarsDir: defaultDir, heroName: 'alan_vincen', autoSync: true };
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
}

// Load sessions
function loadSessions() {
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    } catch (e) {
      console.error('Error reading sessions.json:', e);
    }
  }
  if (fs.existsSync(DEMO_FILE)) {
    return JSON.parse(fs.readFileSync(DEMO_FILE, 'utf-8'));
  }
  return [];
}

function saveSessions(sessions) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

// Recompute running balance & gain
function recalculateBalances(sessions) {
  let runningBanca = 0;
  let runningGanancia = 0;

  return sessions.map((s, index) => {
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
}

// GET all sessions
app.get('/api/sessions', (req, res) => {
  const sessions = loadSessions();
  res.json({ success: true, count: sessions.length, data: sessions });
});

// POST new session (Manual)
app.post('/api/sessions', (req, res) => {
  const { fecha, cantManos, minutos, deltaGanancia, deltaBanca, stake, notas } = req.body;
  const sessions = loadSessions();
  const last = sessions[sessions.length - 1] || { banca: 0, ganancia: 0 };

  const parsedManos = parseInt(cantManos, 10) || 0;
  const parsedMin = parseInt(minutos, 10) || 0;
  const parsedDeltaGan = parseFloat(deltaGanancia) || 0;
  const parsedDeltaBanca = deltaBanca !== undefined ? parseFloat(deltaBanca) : parsedDeltaGan;

  const newBanca = Number((last.banca + parsedDeltaBanca).toFixed(2));
  const newGanancia = Number((last.ganancia + parsedDeltaGan).toFixed(2));

  let isoDate = new Date().toISOString().split('T')[0];
  if (fecha) {
    const parts = fecha.split('/');
    if (parts.length === 3) {
      isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  const determinedStake = stake || (isoDate >= '2026-09-30' ? 'NL5' : 'NL2');

  const newSession = {
    id: `sess-${Date.now()}`,
    fecha: fecha || new Date().toLocaleDateString('es-ES'),
    isoDate,
    tipo: 'sesion',
    cantManos: parsedManos,
    minutos: parsedMin,
    banca: newBanca,
    ganancia: newGanancia,
    deltaBanca: parsedDeltaBanca,
    deltaGanancia: parsedDeltaGan,
    stake: determinedStake,
    stakeLabel: determinedStake === 'NL5' ? 'NL5 ($5)' : 'NL2 ($2)',
    recompensaCode: 0,
    fuente: 'manual',
    notas: notas || ''
  };

  sessions.push(newSession);
  saveSessions(sessions);

  res.json({ success: true, data: newSession });
});

// POST new reward / withdrawal / deposit
app.post('/api/rewards', (req, res) => {
  const { monto, tipo, fecha, notas } = req.body; // tipo: 'recompensa' | 'retiro' | 'deposito'
  const sessions = loadSessions();
  const last = sessions[sessions.length - 1] || { banca: 0, ganancia: 0 };

  const amount = Math.abs(parseFloat(monto) || 0);
  const multiplier = tipo === 'retiro' ? -1 : 1;
  const deltaBanca = Number((amount * multiplier).toFixed(2));

  let isoDate = new Date().toISOString().split('T')[0];
  if (fecha) {
    const parts = fecha.split('/');
    if (parts.length === 3) {
      isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  let code = 1;
  if (tipo === 'retiro') code = 2;
  else if (tipo === 'deposito') code = 3;

  const newReward = {
    id: `mov-${Date.now()}`,
    fecha: fecha || new Date().toLocaleDateString('es-ES'),
    isoDate,
    tipo: tipo || 'recompensa',
    cantManos: 0,
    minutos: 0,
    banca: Number((last.banca + deltaBanca).toFixed(2)),
    ganancia: last.ganancia,
    deltaBanca,
    deltaGanancia: 0,
    stake: null,
    recompensaCode: code,
    fuente: 'manual',
    notas: notas || (tipo === 'recompensa' ? 'Cofre / Stars Reward' : tipo === 'deposito' ? 'Depósito' : 'Retiro')
  };

  sessions.push(newReward);
  saveSessions(sessions);

  res.json({ success: true, data: newReward });
});

// DELETE session by ID
app.delete('/api/sessions/:id', (req, res) => {
  let sessions = loadSessions();
  const initialLen = sessions.length;
  sessions = sessions.filter(s => s.id !== req.params.id);

  if (sessions.length === initialLen) {
    return res.status(404).json({ success: false, message: 'Registro no encontrado' });
  }

  sessions = recalculateBalances(sessions);
  saveSessions(sessions);

  res.json({ success: true, message: 'Registro eliminado correctamente', count: sessions.length });
});

// PUT update session by ID (edit latest or any session)
app.put('/api/sessions/:id', (req, res) => {
  let sessions = loadSessions();
  const index = sessions.findIndex(s => s.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Registro no encontrado' });
  }

  const target = sessions[index];
  const { fecha, cantManos, minutos, deltaBanca, deltaGanancia, banca, stake, notas } = req.body;

  // Si se envió saldo de banca final deseado, calculamos deltaBanca = banca - prevBanca
  if (banca !== undefined && banca !== null && banca !== '') {
    const prevBanca = index > 0 ? (sessions[index - 1].banca || 0) : 0;
    const targetBancaNum = parseFloat(banca);
    if (!isNaN(targetBancaNum)) {
      const calculatedDelta = Number((targetBancaNum - prevBanca).toFixed(2));
      target.deltaBanca = calculatedDelta;
      if (target.tipo === 'sesion') {
        target.deltaGanancia = calculatedDelta;
      }
    }
  } else {
    if (deltaBanca !== undefined && deltaBanca !== null && deltaBanca !== '') {
      target.deltaBanca = parseFloat(deltaBanca);
    }
    if (deltaGanancia !== undefined && deltaGanancia !== null && deltaGanancia !== '') {
      target.deltaGanancia = parseFloat(deltaGanancia);
    }
  }

  if (cantManos !== undefined && cantManos !== null) {
    target.cantManos = parseInt(cantManos, 10) || 0;
  }
  if (minutos !== undefined && minutos !== null) {
    target.minutos = parseInt(minutos, 10) || 0;
  }
  if (stake !== undefined && stake !== null) {
    target.stake = stake;
    target.stakeLabel = stake === 'NL5' ? 'NL5 ($5)' : stake === 'NL2' ? 'NL2 ($2)' : stake;
  }
  if (notas !== undefined) {
    target.notas = notas;
  }
  if (fecha) {
    target.fecha = fecha;
    const parts = fecha.split('/');
    if (parts.length === 3) {
      target.isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  sessions = recalculateBalances(sessions);
  saveSessions(sessions);

  res.json({ success: true, message: 'Registro actualizado correctamente', data: sessions[index] });
});

// Config endpoints
app.get('/api/config', (req, res) => {
  res.json({ success: true, config: getConfig() });
});

app.post('/api/config', (req, res) => {
  const current = getConfig();
  const updated = { ...current, ...req.body };
  saveConfig(updated);
  res.json({ success: true, config: updated });
});

// PokerStars Folder Status & Sync
app.get('/api/pokerstars/status', (req, res) => {
  const cfg = getConfig();
  const dirPath = resolveHandHistoryDir(cfg.pokerstarsDir);
  const exists = fs.existsSync(dirPath);

  let filesCount = 0;
  if (exists) {
    try {
      filesCount = fs.readdirSync(dirPath).filter(f => f.endsWith('.txt')).length;
    } catch (e) {}
  }

  res.json({
    success: true,
    path: dirPath,
    exists,
    filesCount,
    heroName: cfg.heroName
  });
});

// Manual Sync trigger
app.post('/api/pokerstars/sync', (req, res) => {
  const cfg = getConfig();
  const result = syncPokerStarsFolder(cfg.pokerstarsDir, cfg.heroName);
  res.json(result);
});

// Live status endpoint
app.get('/api/pokerstars/live', (req, res) => {
  const cfg = getConfig();
  const resolvedDir = resolveHandHistoryDir(cfg.pokerstarsDir);
  let isPlaying = false;
  let activeTables = [];
  let lastMtime = 0;

  if (fs.existsSync(resolvedDir)) {
    try {
      const files = fs.readdirSync(resolvedDir).filter(f => f.endsWith('.txt'));
      const now = Date.now();
      for (const f of files) {
        const full = path.join(resolvedDir, f);
        const stat = fs.statSync(full);
        // If file modified in last 10 minutes, player is actively playing
        if (now - stat.mtimeMs < 10 * 60 * 1000) {
          isPlaying = true;
          activeTables.push(f.replace(/^HH\d+\s+/, '').replace(/\.txt$/, ''));
          if (stat.mtimeMs > lastMtime) lastMtime = stat.mtimeMs;
        }
      }
    } catch (e) {}
  }

  const sessions = loadSessions();
  const today = new Date();
  const fechaHoy = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  const todaySession = sessions.find(s => s.fecha === fechaHoy && s.tipo === 'sesion');

  res.json({
    success: true,
    isPlaying,
    activeTables,
    todayHands: todaySession ? todaySession.cantManos : 0,
    todayProfit: todaySession ? todaySession.deltaGanancia : 0,
    lastUpdate: lastMtime ? new Date(lastMtime).toLocaleTimeString() : null
  });
});

// Serve static frontend in production
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Iniciar servidor y auto-watcher
const server = app.listen(PORT, () => {
  console.log(`Servidor miPokerTracker v2.0 escuchando en http://localhost:${PORT}`);
  const cfg = getConfig();
  startAutoWatcher(cfg.pokerstarsDir, cfg.heroName, (update) => {
    console.log('[Auto-Sync Live] Actualizado:', update.handsCount, 'manos hoy');
  });
});
