const fs = require('fs');
const path = require('path');

function parseSaldoDat(datPath) {
  const buf = fs.readFileSync(datPath);
  const recSize = 32;
  const total = buf.length / recSize;
  const sessions = [];

  let prevBanca = 0;
  let prevGanancia = 0;

  for (let i = 0; i < total; i++) {
    const slice = buf.subarray(i * recSize, (i + 1) * recSize);
    const fecha = slice.subarray(0, 11).toString('latin1').replace(/\0.*$/, '').trim();
    const cantManos = slice.readInt32LE(12);
    const minutos = slice.readInt32LE(16);
    const banca = Number(slice.readFloatLE(20).toFixed(2));
    const ganancia = Number(slice.readFloatLE(24).toFixed(2));
    const recompensaCode = slice.readInt32LE(28);

    // Parse date into ISO YYYY-MM-DD
    let isoDate = '';
    const parts = fecha.split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      isoDate = `${y}-${m}-${d}`;
    }

    let tipo = 'sesion';
    if (recompensaCode === 1) tipo = 'recompensa';
    else if (recompensaCode === 2) tipo = 'retiro';

    const deltaBanca = i === 0 ? banca : Number((banca - prevBanca).toFixed(2));
    const deltaGanancia = i === 0 ? ganancia : Number((ganancia - prevGanancia).toFixed(2));

    sessions.push({
      id: `legacy-${i + 1}`,
      fecha,
      isoDate,
      tipo,
      cantManos,
      minutos,
      banca,
      ganancia,
      deltaBanca,
      deltaGanancia,
      recompensaCode,
      fuente: 'saldo.dat'
    });

    prevBanca = banca;
    prevGanancia = ganancia;
  }

  return sessions;
}

const datPath = path.join(__dirname, '..', 'data', 'backups', 'saldo_original_backup.dat');
const outJsonPath = path.join(__dirname, '..', 'data', 'sessions.json');
const sessions = parseSaldoDat(datPath);

fs.writeFileSync(outJsonPath, JSON.stringify(sessions, null, 2), 'utf-8');
console.log(`Migración completada con éxito: ${sessions.length} registros guardados en ${outJsonPath}`);
