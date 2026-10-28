const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { parseHandHistoryContent, summarizeHands } = require('./pokerstars-parser');

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
      heroName: '',
      autoSync: true
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(initialConfig, null, 2), 'utf-8');
    return initialConfig;
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch (err) {
    return { pokerstarsDir: defaultDir, heroName: '', autoSync: true };
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
  const { fecha, cantManos, minutos, deltaGanancia, deltaBanca, notas } = req.body;
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
    recompensaCode: 0,
    fuente: 'manual',
    notas: notas || ''
  };

  sessions.push(newSession);
  saveSessions(sessions);

  res.json({ success: true, data: newSession });
});

// POST new reward / withdrawal
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

  const newReward = {
    id: `mov-${Date.now()}`,
    fecha: fecha || new Date().toLocaleDateString('es-ES'),
    isoDate,
    tipo: tipo || 'recompensa',
    cantManos: 0,
    minutos: 0,
    banca: Number((last.banca + deltaBanca).toFixed(2)),
    ganancia: last.ganancia, // Recompensas y retiros no alteran la ganancia en mesas
    deltaBanca,
    deltaGanancia: 0,
    recompensaCode: tipo === 'retiro' ? 2 : 1,
    fuente: 'manual',
    notas: notas || (tipo === 'recompensa' ? 'Cofre / Stars Reward' : 'Movimiento de saldo')
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

  // Recalculate balances
  sessions = recalculateBalances(sessions);
  saveSessions(sessions);

  res.json({ success: true, message: 'Registro eliminado correctamente', count: sessions.length });
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
  const dirPath = cfg.pokerstarsDir;
  const exists = fs.existsSync(dirPath);

  let filesCount = 0;
  let fileList = [];

  if (exists) {
    try {
      // Find all txt files recursively
      function findTxt(dir) {
        let results = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          const full = path.join(dir, e.name);
          if (e.isDirectory()) {
            results = results.concat(findTxt(full));
          } else if (e.name.toLowerCase().endsWith('.txt')) {
            results.push(full);
          }
        }
        return results;
      }
      fileList = findTxt(dirPath);
      filesCount = fileList.length;
    } catch (e) {
      console.error(e);
    }
  }

  res.json({
    success: true,
    path: dirPath,
    exists,
    filesCount,
    heroName: cfg.heroName
  });
});

// PokerStars Sync from folder
app.post('/api/pokerstars/sync', (req, res) => {
  const cfg = getConfig();
  const dirPath = cfg.pokerstarsDir;

  if (!fs.existsSync(dirPath)) {
    return res.status(400).json({ success: false, message: 'La ruta de PokerStars no existe en el sistema' });
  }

  try {
    function findTxt(dir) {
      let results = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          results = results.concat(findTxt(full));
        } else if (e.name.toLowerCase().endsWith('.txt')) {
          results.push(full);
        }
      }
      return results;
    }

    const files = findTxt(dirPath);
    if (files.length === 0) {
      return res.json({ success: true, importedHands: 0, message: 'No se encontraron archivos de historial .txt en la carpeta' });
    }

    let allHands = [];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      const hands = parseHandHistoryContent(content, cfg.heroName);
      allHands = allHands.concat(hands);
    }

    if (allHands.length === 0) {
      return res.json({ success: true, importedHands: 0, message: 'Archivos escaneados pero no se detectaron manos válidas del jugador' });
    }

    const summary = summarizeHands(allHands);
    res.json({
      success: true,
      filesScanned: files.length,
      importedHands: allHands.length,
      summary
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Parse pasted raw hand history text
app.post('/api/pokerstars/parse-raw', (req, res) => {
  const { text, heroName } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, message: 'Texto requerido' });
  }

  const hands = parseHandHistoryContent(text, heroName);
  const summary = summarizeHands(hands);

  res.json({
    success: true,
    handsCount: hands.length,
    summary,
    sampleHands: hands.slice(0, 10)
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

app.listen(PORT, () => {
  console.log(`Servidor miPokerTracker v2.0 escuchando en http://localhost:${PORT}`);
});
