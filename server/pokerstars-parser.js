/**
 * Parser de Hand History de PokerStars (.txt)
 */

function parseMoney(str) {
  if (!str) return 0;
  const clean = str.replace(/[^\d.-]/g, '');
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

function parseHand(handText, defaultHero = null) {
  if (!handText || !handText.trim()) return null;

  const lines = handText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 3) return null;

  // 1. Cabecera
  // PokerStars Hand #245892301928: Hold'em No Limit ($0.01/$0.02 USD) - 2026/10/28 14:05:12 ET
  const headerMatch = lines[0].match(/PokerStars\s+(?:Zoom\s+)?Hand\s+#(\d+):\s+([^-(]+)(?:\(([^)]+)\))?\s*-\s*([0-9/:\sA-Za-z]+)/i);
  if (!headerMatch) return null;

  const handId = headerMatch[1];
  const gameType = headerMatch[2].trim();
  const stakesStr = headerMatch[3] || '';
  const dateStr = headerMatch[4].trim();

  // Stakes parse ($0.01/$0.02 USD)
  let sb = 0.01;
  let bb = 0.02;
  const stakesMatch = stakesStr.match(/\$?([\d.]+)\/\$?([\d.]+)/);
  if (stakesMatch) {
    sb = parseFloat(stakesMatch[1]) || 0.01;
    bb = parseFloat(stakesMatch[2]) || 0.02;
  }

  // 2. Detectar Hero
  let heroName = defaultHero;
  for (const line of lines) {
    const dealtMatch = line.match(/^Dealt to ([^\[]+) \[(.+)\]/);
    if (dealtMatch) {
      heroName = dealtMatch[1].trim();
      break;
    }
  }

  // Si no se encontró en "Dealt to", buscar en lines
  if (!heroName) {
    return {
      handId,
      gameType,
      dateStr,
      stakes: { sb, bb },
      heroFound: false
    };
  }

  // 3. Calcular acciones del Hero (inversión y cobro)
  let invested = 0;
  let collected = 0;
  let vpip = false;
  let pfr = false;
  let sawShowdown = false;
  let wonAtShowdown = false;
  let holeCards = null;

  let inPreflop = false;
  let inSummary = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('*** HOLE CARDS ***')) {
      inPreflop = true;
      continue;
    }
    if (line.startsWith('*** FLOP ***') || line.startsWith('*** TURN ***') || line.startsWith('*** RIVER ***')) {
      inPreflop = false;
      continue;
    }
    if (line.startsWith('*** SHOW DOWN ***')) {
      inPreflop = false;
      sawShowdown = true;
      continue;
    }
    if (line.startsWith('*** SUMMARY ***')) {
      inSummary = true;
      continue;
    }

    // Hole cards
    const dealtMatch = line.match(new RegExp(`^Dealt to ${escapeRegex(heroName)} \\[(.+)\\]`));
    if (dealtMatch) {
      holeCards = dealtMatch[1];
      continue;
    }

    if (!inSummary) {
      // Blinds and antes
      const blindMatch = line.match(new RegExp(`^${escapeRegex(heroName)}: posts (?:small blind|big blind|ante)\\s+\\$?([\\d.]+)`));
      if (blindMatch) {
        invested += parseFloat(blindMatch[1]) || 0;
        continue;
      }

      // Bets, raises, calls
      const callMatch = line.match(new RegExp(`^${escapeRegex(heroName)}: calls \\$?([\\d.]+)`));
      if (callMatch) {
        const amt = parseFloat(callMatch[1]) || 0;
        invested += amt;
        if (inPreflop) vpip = true;
        continue;
      }

      const betMatch = line.match(new RegExp(`^${escapeRegex(heroName)}: bets \\$?([\\d.]+)`));
      if (betMatch) {
        const amt = parseFloat(betMatch[1]) || 0;
        invested += amt;
        continue;
      }

      const raiseMatch = line.match(new RegExp(`^${escapeRegex(heroName)}: raises \\$?([\\d.]+)(?: to \\$?([\\d.]+))?`));
      if (raiseMatch) {
        // En pokerstars: raises $0.04 to $0.06 -> el incremento total que el jugador aporta en esa ronda
        // Si ya puso $0.02 de BB y sube a $0.06, agrega $0.04.
        const diff = parseFloat(raiseMatch[1]) || 0;
        invested += diff;
        if (inPreflop) {
          vpip = true;
          pfr = true;
        }
        continue;
      }

      // Uncalled bet returned
      const uncalledMatch = line.match(new RegExp(`^Uncalled bet \\(\\$?([\\d.]+)\\) returned to ${escapeRegex(heroName)}`));
      if (uncalledMatch) {
        invested -= parseFloat(uncalledMatch[1]) || 0;
        continue;
      }

      // Collected during hand (sin showdown)
      const collectedMatch = line.match(new RegExp(`^${escapeRegex(heroName)} collected \\$?([\\d.]+) from pot`));
      if (collectedMatch) {
        collected += parseFloat(collectedMatch[1]) || 0;
        continue;
      }
    } else {
      // En la sección SUMMARY
      const seatWinMatch = line.match(new RegExp(`Seat \\d+: ${escapeRegex(heroName)} (?:\\([^)]+\\)\\s+)?(?:collected|won) \\(\\$?([\\d.]+)\\)`));
      if (seatWinMatch) {
        // Solo sumamos si no se contó ya
        const winAmt = parseFloat(seatWinMatch[1]) || 0;
        if (collected === 0) {
          collected = winAmt;
        }
        if (sawShowdown) {
          wonAtShowdown = true;
        }
      }
    }
  }

  invested = Number(invested.toFixed(2));
  collected = Number(collected.toFixed(2));
  const profit = Number((collected - invested).toFixed(2));

  return {
    handId,
    gameType,
    dateStr,
    stakes: { sb, bb },
    hero: heroName,
    holeCards,
    invested,
    collected,
    profit,
    vpip,
    pfr,
    sawShowdown,
    wonAtShowdown
  };
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parsea un archivo de texto con múltiples manos y las agrupa
 */
function parseHandHistoryContent(content, defaultHero = null) {
  const rawHands = content.split(/(?=PokerStars\s+(?:Zoom\s+)?Hand\s+#)/i);
  const hands = [];

  for (const raw of rawHands) {
    if (!raw.trim()) continue;
    const parsed = parseHand(raw, defaultHero);
    if (parsed && parsed.hero) {
      hands.push(parsed);
    }
  }

  return hands;
}

/**
 * Resumen de sesión de manos
 */
function summarizeHands(hands) {
  if (!hands || hands.length === 0) return null;

  const totalHands = hands.length;
  let totalProfit = 0;
  let vpipCount = 0;
  let pfrCount = 0;
  let showdownCount = 0;
  let wonShowdownCount = 0;
  const hero = hands[0].hero;

  for (const h of hands) {
    totalProfit += h.profit;
    if (h.vpip) vpipCount++;
    if (h.pfr) pfrCount++;
    if (h.sawShowdown) {
      showdownCount++;
      if (h.wonAtShowdown) wonShowdownCount++;
    }
  }

  totalProfit = Number(totalProfit.toFixed(2));

  return {
    hero,
    totalHands,
    totalProfit,
    vpipPct: Number(((vpipCount / totalHands) * 100).toFixed(1)),
    pfrPct: Number(((pfrCount / totalHands) * 100).toFixed(1)),
    showdownPct: Number(((showdownCount / totalHands) * 100).toFixed(1)),
    wtsdWinPct: showdownCount > 0 ? Number(((wonShowdownCount / showdownCount) * 100).toFixed(1)) : 0,
    stakes: hands[0].stakes
  };
}

module.exports = {
  parseHand,
  parseHandHistoryContent,
  summarizeHands
};
