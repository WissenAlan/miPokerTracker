/**
 * Parser bilingüe (Español / Inglés) de Hand History de PokerStars (.txt)
 */

function parseHand(handText, defaultHero = null) {
  if (!handText || !handText.trim()) return null;

  const lines = handText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 3) return null;

  // 1. Cabecera (Inglés o Español)
  // Ej Inglés: PokerStars Hand #245892301928: Hold'em No Limit ($0.01/$0.02 USD) - 2026/10/28 14:05:12 ET
  // Ej Español: Mano #262546103762 de PokerStars:  Hold'em sin límite ($0.02/$0.05 USD) - 2026/10/29 11:51:40 ART [2026/10/29 10:51:40 ET]
  let handId = null;
  let gameType = '';
  let stakesStr = '';
  let dateStr = '';

  const headerMatchEs = lines[0].match(/Mano\s+#(\d+)\s+de\s+PokerStars:\s*([^-(]+)(?:\(([^)]+)\))?\s*-\s*([0-9/:\sA-Za-z\[\]]+)/i);
  const headerMatchEn = lines[0].match(/PokerStars\s+(?:Zoom\s+)?Hand\s+#(\d+):\s*([^-(]+)(?:\(([^)]+)\))?\s*-\s*([0-9/:\sA-Za-z\[\]]+)/i);

  if (headerMatchEs) {
    handId = headerMatchEs[1];
    gameType = headerMatchEs[2].trim();
    stakesStr = headerMatchEs[3] || '';
    dateStr = headerMatchEs[4].trim();
  } else if (headerMatchEn) {
    handId = headerMatchEn[1];
    gameType = headerMatchEn[2].trim();
    stakesStr = headerMatchEn[3] || '';
    dateStr = headerMatchEn[4].trim();
  } else {
    return null;
  }

  // Stakes parse ($0.02/$0.05 USD)
  let sb = 0.02;
  let bb = 0.05;
  const stakesMatch = stakesStr.match(/\$?([\d.]+)\/\$?([\d.]+)/);
  if (stakesMatch) {
    sb = parseFloat(stakesMatch[1]) || 0.02;
    bb = parseFloat(stakesMatch[2]) || 0.05;
  }

  // 2. Detectar Hero (Repartido a <Hero> o Dealt to <Hero>)
  let heroName = defaultHero;
  for (const line of lines) {
    const dealtMatch = line.match(/^(?:Repartido a|Dealt to)\s+([^\[]+)\s*\[(.+)\]/i);
    if (dealtMatch) {
      heroName = dealtMatch[1].trim();
      break;
    }
  }

  if (!heroName) {
    return null;
  }

  // 3. Procesar acciones
  let invested = 0;
  let collected = 0;
  let vpip = false;
  let pfr = false;
  let sawShowdown = false;
  let wonAtShowdown = false;
  let holeCards = null;

  let inPreflop = false;
  let inSummary = false;

  const heroRegex = escapeRegex(heroName);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('*** HOLE CARDS ***') || line.includes('*** CARTAS PROPIAS ***')) {
      inPreflop = true;
      continue;
    }
    if (line.includes('*** FLOP ***') || line.includes('*** TURN ***') || line.includes('*** RIVER ***')) {
      inPreflop = false;
      continue;
    }
    if (line.includes('*** SHOW DOWN ***') || line.includes('*** CONFRONTACIÓN ***') || line.includes('*** CONFRONTACI') ) {
      inPreflop = false;
      continue;
    }
    if (line.includes('*** SUMMARY ***') || line.includes('*** RESUMEN ***')) {
      inSummary = true;
      continue;
    }

    // Hole cards
    const dealtMatch = line.match(new RegExp(`^(?:Repartido a|Dealt to)\\s+${heroRegex}\\s*\\[([^\\]]+)\\]`, 'i'));
    if (dealtMatch) {
      holeCards = dealtMatch[1];
      continue;
    }

    // Showdown check
    if (line.match(new RegExp(`^${heroRegex}:\\s*(?:muestra|shows)\\s*\\[`, 'i'))) {
      sawShowdown = true;
    }

    if (!inSummary) {
      // Ciegas / Antes
      // pone ciega pequeña $0.02 | posts small blind $0.02 | posts big blind $0.05
      const blindMatch = line.match(new RegExp(`^${heroRegex}:\\s*(?:pone ciega pequeña|pone ciega grande|pone ante|posts small blind|posts big blind|posts ante)\\s+\\$?([\\d.]+)`, 'i'));
      if (blindMatch) {
        invested += parseFloat(blindMatch[1]) || 0;
        continue;
      }

      // Calls / Iguala
      const callMatch = line.match(new RegExp(`^${heroRegex}:\\s*(?:iguala|calls)\\s+\\$?([\\d.]+)`, 'i'));
      if (callMatch) {
        invested += parseFloat(callMatch[1]) || 0;
        if (inPreflop) vpip = true;
        continue;
      }

      // Bets / Apuesta
      const betMatch = line.match(new RegExp(`^${heroRegex}:\\s*(?:apuesta|bets)\\s+\\$?([\\d.]+)`, 'i'));
      if (betMatch) {
        invested += parseFloat(betMatch[1]) || 0;
        continue;
      }

      // Raises / Sube
      // Ej Español: alan_vincen: sube $0.10 a $0.15
      // Ej Inglés: Hero: raises $0.04 to $0.06
      const raiseMatch = line.match(new RegExp(`^${heroRegex}:\\s*(?:sube|raises)\\s+\\$?([\\d.]+)(?:\\s+(?:a|to)\\s+\\$?([\\d.]+))?`, 'i'));
      if (raiseMatch) {
        const diff = parseFloat(raiseMatch[1]) || 0;
        invested += diff;
        if (inPreflop) {
          vpip = true;
          pfr = true;
        }
        continue;
      }

      // Uncalled bet returned
      // La apuesta no igualada ($0.47) se ha devuelto a YeezusSSJ
      // Uncalled bet ($0.08) returned to Hero
      const uncalledMatch = line.match(new RegExp(`(?:La apuesta no igualada\\s*\\(\\$?([\\d.]+)\\)\\s*se ha devuelto a|Uncalled bet\\s*\\(\\$?([\\d.]+)\\)\\s*returned to)\\s+${heroRegex}`, 'i'));
      if (uncalledMatch) {
        const amt = parseFloat(uncalledMatch[1] || uncalledMatch[2]) || 0;
        invested -= amt;
        continue;
      }

      // Collected during hand (sin showdown)
      // silvegunman se llevó $1.21 del pozo
      // Hero collected $0.13 from pot
      const collectedMatch = line.match(new RegExp(`^${heroRegex}\\s+(?:se llevó|collected)\\s+\\$?([\\d.]+)\\s*(?:del pozo|from pot)`, 'i'));
      if (collectedMatch) {
        collected += parseFloat(collectedMatch[1]) || 0;
        continue;
      }
    } else {
      // En la sección RESUMEN / SUMMARY
      // Asiento 2: silvegunman mostró [2c 2d] y ganó ($1.21)
      // Asiento 6: alan_vincen se llevó ($1.21)
      // Seat 4: Hero collected ($0.13)
      const summaryWinMatch = line.match(new RegExp(`(?:Asiento|Seat)\\s+\\d+:\\s+${heroRegex}\\s+(?:.*(?:ganó|se llevó|collected|won)\\s*\\(\\$?([\\d.]+)\\))`, 'i'));
      if (summaryWinMatch) {
        const winAmt = parseFloat(summaryWinMatch[1]) || 0;
        if (collected === 0) {
          collected = winAmt;
        }
        wonAtShowdown = true;
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

function parseHandHistoryContent(content, defaultHero = null) {
  // Split por inicio de mano en español o inglés
  const rawHands = content.split(/(?=(?:Mano\s+#\d+\s+de\s+PokerStars|PokerStars\s+(?:Zoom\s+)?Hand\s+#\d+))/i);
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
