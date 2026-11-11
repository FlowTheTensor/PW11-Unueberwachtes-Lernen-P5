// =============================================================================
//  kmeans.js – der k-Means-Algorithmus (reines JavaScript, ohne p5)
// =============================================================================
//  Ablauf (Lloyd-Algorithmus):
//    1. k Startzentren wählen
//    2. Zuordnen:   jeder Schuss kommt zum nächstgelegenen Zentrum
//    3. Verschieben: jedes Zentrum wandert in den Mittelwert seiner Schüsse
//    4. 2. und 3. wiederholen, bis sich die Zuordnung nicht mehr ändert
//
//  Zentren werden immer in echten Einheiten (°C, bar) gespeichert.
//  Nur für die Abstände wird – wenn gewünscht – normiert.
// =============================================================================

// Punkt im "Merkmalsraum", in dem die Abstände gemessen werden
function merkmalsRaum(t, p, normiert) {
  if (!normiert) {
    return [t, p];
  }
  const mt = MERKMALE[0];
  const mp = MERKMALE[1];
  return [(t - mt.min) / (mt.max - mt.min), (p - mp.min) / (mp.max - mp.min)];
}

// quadrierter Abstand zwischen Schuss a und Zentrum c
function abstand2(a, c, normiert) {
  const [x1, y1] = merkmalsRaum(a.t, a.p, normiert);
  const [x2, y2] = merkmalsRaum(c.t, c.p, normiert);
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

function abstand(a, c, normiert) {
  return Math.sqrt(abstand2(a, c, normiert));
}

function naechstesZentrum(b, zentren, normiert) {
  let bester = -1;
  let besterD2 = Infinity;
  for (let i = 0; i < zentren.length; i++) {
    const d2 = abstand2(b, zentren[i], normiert);
    if (d2 < besterD2) {
      besterD2 = d2;
      bester = i;
    }
  }
  return { c: bester, d2: besterD2 };
}

// Schritt 2: jeden Schuss zuordnen – liefert die Anzahl der Wechsel
function alleZuordnen(daten, zentren, normiert) {
  let wechsel = 0;
  for (const b of daten) {
    const c = naechstesZentrum(b, zentren, normiert).c;
    b.alt = b.cluster;
    if (c !== b.cluster) {
      wechsel++;
    }
    b.cluster = c;
  }
  return wechsel;
}

// Schritt 3: neue Zentren = Mittelwerte der zugeordneten Schüsse
// Bleibt ein Cluster leer, bleibt sein Zentrum stehen.
function mittelwerte(daten, zentren) {
  const summe = zentren.map(() => ({ t: 0, p: 0, n: 0 }));
  for (const b of daten) {
    if (b.cluster >= 0) {
      summe[b.cluster].t += b.t;
      summe[b.cluster].p += b.p;
      summe[b.cluster].n++;
    }
  }
  const neu = [];
  const leer = [];
  for (let i = 0; i < zentren.length; i++) {
    if (summe[i].n === 0) {
      neu.push({ t: zentren[i].t, p: zentren[i].p });
      leer.push(i);
    } else {
      neu.push({ t: summe[i].t / summe[i].n, p: summe[i].p / summe[i].n });
    }
  }
  return { neu, leer };
}

// Fehlersumme (SSE, "Inertia"): Summe der quadrierten Abstände zum eigenen Zentrum
function fehlersumme(daten, zentren, normiert) {
  let s = 0;
  for (const b of daten) {
    if (b.cluster >= 0) {
      s += abstand2(b, zentren[b.cluster], normiert);
    }
  }
  return s;
}

// --- Startzentren -------------------------------------------------------------
function zufallsStart(daten, k, rnd) {
  const indizes = [];
  while (indizes.length < Math.min(k, daten.length)) {
    const i = Math.floor(rnd() * daten.length);
    if (!indizes.includes(i)) {
      indizes.push(i);
    }
  }
  return indizes.map((i) => ({ t: daten[i].t, p: daten[i].p }));
}

// k-means++: weitere Zentren bevorzugt weit weg von den bisherigen
// (Wahrscheinlichkeit proportional zum quadrierten Abstand zum nächsten Zentrum)
function plusPlusStart(daten, k, normiert, rnd) {
  const erstes = daten[Math.floor(rnd() * daten.length)];
  const zentren = [{ t: erstes.t, p: erstes.p }];
  while (zentren.length < k) {
    const d2 = daten.map((b) => naechstesZentrum(b, zentren, normiert).d2);
    let summe = 0;
    for (const d of d2) {
      summe += d;
    }
    let ziel = rnd() * summe;
    let wahl = daten.length - 1;
    for (let i = 0; i < daten.length; i++) {
      ziel -= d2[i];
      if (ziel <= 0) {
        wahl = i;
        break;
      }
    }
    zentren.push({ t: daten[wahl].t, p: daten[wahl].p });
  }
  return zentren;
}

// --- kompletter Durchlauf (für die Ellenbogen-Methode) ------------------------
// verändert die Zuordnung der Schüsse in der Oberfläche NICHT
function kmeansKomplett(daten, k, normiert, rnd) {
  const kopie = daten.map((b) => ({ t: b.t, p: b.p, cluster: -1, alt: -1 }));
  let zentren = plusPlusStart(kopie, k, normiert, rnd);
  for (let it = 0; it < 100; it++) {
    const wechsel = alleZuordnen(kopie, zentren, normiert);
    if (wechsel === 0 && it > 0) {
      break;
    }
    zentren = mittelwerte(kopie, zentren).neu;
  }
  return fehlersumme(kopie, zentren, normiert);
}
