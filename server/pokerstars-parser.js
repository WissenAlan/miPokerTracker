/**
 * Parser bilingüe (Español / Inglés) de Hand History de PokerStars (.txt)
 *
 * RASTREO PRECISO POR CALLE:
 * En cada calle (Preflop, Flop, Turn, River), el monto acumulado de apuestas
 * del jugador se reinicia.
 * Los 'raises' (sube $X a $Y / raises $X to $Y) indican que la apuesta TOTAL
 * acumulada en esa calle pasa a ser $Y. La inversión adicional en ese momento
 * es ($Y - streetInvested).
 * Las apuestas devueltas ('uncalled bet / apuesta no igualada') se restan.
 * Esto garantiza que el profit de cada mano sea exacto al centavo.
 */

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseHand(handText, defaultHero = null) {
  if (!handText || !handText.trim()) return null;

  const lines = handText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 3) return null;

  // 1. Cabecera (Inglés o Español)
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

  // 3. Extraer stack inicial del héroe (antes de las cartas)
  const heroRegex = escapeRegex(heroName);
  let heroStackBefore = null;

  for (const line of lines) {
    if (line.includes('*** CARTAS PROPIAS ***') || line.includes('*** HOLE CARDS ***')) break;
    const mEs = line.match(new RegExp(`Asiento n\\.º\\s+\\d+:\\s+${heroRegex}\\s+\\(\\$?([\\d.]+)\\s+en fichas\\)`, 'i'));
    if (mEs) { heroStackBefore = parseFloat(mEs[1]); break; }
    const mEn = line.match(new RegExp(`Seat\\s+\\d+:\\s+${heroRegex}\\s+\\(\\$?([\\d.]+)\\s+in chips\\)`, 'i'));
    if (mEn) { heroStackBefore = parseFloat(mEn[1]); break; }
  }

  // 4. Procesar acciones con rastreo de calle
  let totalInvested = 0;
  let streetInvested = 0;
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

    // Cambio de calle: reiniciar streetInvested
    if (line.includes('*** HOLE CARDS ***') || line.includes('*** CARTAS PROPIAS ***')) {
      inPreflop = true;
      streetInvested = 0;
      continue;
    }
    if (line.includes('*** FLOP ***') || line.includes('*** TURN ***') || line.includes('*** RIVER ***')) {
      inPreflop = false;
      streetInvested = 0;
      continue;
    }
    if (line.includes('*** SHOW DOWN ***') || line.includes('*** CONFRONTACIÓN ***') || line.includes('*** CONFRONTACI')) {
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
      // Blinds & Antes
      const blindMatch = line.match(new RegExp(`^${heroRegex}:\\s*(?:pone ciega pequeña|pone ciega grande|pone ante|posts small blind|posts big blind|posts ante)\\s+\\$?([\\d.]+)`, 'i'));
      if (blindMatch) {
        const amt = parseFloat(blindMatch[1]) || 0;
        totalInvested += amt;
        streetInvested += amt;
        continue;
      }

      // Calls / Iguala
      const callMatch = line.match(new RegExp(`^${heroRegex}:\\s*(?:iguala|calls)\\s+\\$?([\\d.]+)`, 'i'));
      if (callMatch) {
        const amt = parseFloat(callMatch[1]) || 0;
        totalInvested += amt;
        streetInvested += amt;
        if (inPreflop) vpip = true;
        continue;
      }

      // Bets / Apuesta
      const betMatch = line.match(new RegExp(`^${heroRegex}:\\s*(?:apuesta|bets)\\s+\\$?([\\d.]+)`, 'i'));
      if (betMatch) {
        const amt = parseFloat(betMatch[1]) || 0;
        totalInvested += amt;
        streetInvested += amt;
        continue;
      }

      // Raises / Sube: "sube $X a $Y" o "raises $X to $Y"
      // El total acumulado en esta calle pasa a ser $Y (o streetInvested + $X si no hay 'a $Y')
      const raiseMatch = line.match(new RegExp(`^${heroRegex}:\\s*(?:sube|raises)\\s+\\$?([\\d.]+)(?:\\s+(?:a|to)\\s+\\$?([\\d.]+))?`, 'i'));
      if (raiseMatch) {
        const totalTo = raiseMatch[2] ? parseFloat(raiseMatch[2]) : (streetInvested + (parseFloat(raiseMatch[1]) || 0));
        const added = totalTo - streetInvested;
        totalInvested += added;
        streetInvested = totalTo;
        if (inPreflop) {
          vpip = true;
          pfr = true;
        }
        continue;
      }

      // Uncalled bet returned
      const uncalledMatch = line.match(new RegExp(`(?:La apuesta no igualada\\s*\\(\\$?([\\d.]+)\\)\\s*se ha devuelto a|Uncalled bet\\s*\\(\\$?([\\d.]+)\\)\\s*returned to)\\s+${heroRegex}`, 'i'));
      if (uncalledMatch) {
        const amt = parseFloat(uncalledMatch[1] || uncalledMatch[2]) || 0;
        totalInvested -= amt;
        streetInvested -= amt;
        continue;
      }

      // Collected during hand (sin showdown)
      const collectedMatch = line.match(new RegExp(`^${heroRegex}\\s+(?:se llevó|collected)\\s+\\$?([\\d.]+)\\s*(?:del pozo|from pot)`, 'i'));
      if (collectedMatch) {
        collected += parseFloat(collectedMatch[1]) || 0;
        continue;
      }

      // Retiro de fondos / cashout mid-hand
      const cashoutMatch = line.match(new RegExp(`^${heroRegex}\\s+(?:retira fondos|retiró fondos)\\s+de la mano por\\s+\\$?([\\d.]+)`, 'i'));
      if (cashoutMatch) {
        collected += parseFloat(cashoutMatch[1]) || 0;
        continue;
      }
    } else {
      // RESUMEN: detectar cobro si no fue capturado antes
      const summaryWinMatch = line.match(new RegExp(`(?:Asiento|Seat)\\s+\\d+:\\s+${heroRegex}\\s+(?:.*(?:ganó|se llevó|recaudó|collected|won)\\s*\\(\\$?([\\d.]+)\\))`, 'i'));
      if (summaryWinMatch) {
        const winAmt = parseFloat(summaryWinMatch[1]) || 0;
        if (collected === 0) {
          collected = winAmt;
        }
        wonAtShowdown = true;
      }
    }
  }

  totalInvested = Number(totalInvested.toFixed(2));
  collected = Number(collected.toFixed(2));
  const profit = Number((collected - totalInvested).toFixed(2));

  return {
    handId,
    gameType,
    dateStr,
    stakes: { sb, bb },
    hero: heroName,
    holeCards,
    heroStackBefore,
    invested: totalInvested,
    collected,
    profit,
    vpip,
    pfr,
    sawShowdown,
    wonAtShowdown
  };
}

function parseHandHistoryContent(content, defaultHero = null) {
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
