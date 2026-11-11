// =============================================================================
//  kmeans.js – der k-Means-Algorithmus (reines JavaScript, ohne p5)
// =============================================================================
//  Ablauf (Lloyd-Algorithmus):
//    1. k Startzentren wählen
//    2. Zuordnen:   jeder Messpunkt kommt zum nächstgelegenen Zentrum
//    3. Verschieben: jedes Zentrum wandert in den Mittelwert seiner Messpunkte
//    4. 2. und 3. wiederholen, bis sich die Zuordnung nicht mehr ändert
//
//  Zentren werden immer in echten Einheiten (z. B. A und mm/s) gespeichert.
//  Nur für die Abstände wird – wenn gewünscht – normiert.
// =============================================================================

// Punkt im "Merkmalsraum", in dem die Abstände gemessen werden
function merkmalsRaum(x, y, normiert) {
  if (!normiert) {
    return [x, y];
  }
  const m1 = MERKMALE[0];
  const m2 = MERKMALE[1];
  return [(x - m1.min) / (m1.max - m1.min), (y - m2.min) / (m2.max - m2.min)];
}

// quadrierter Abstand zwischen Messpunkt a und Zentrum c
function abstand2(a, c, normiert) {
  const [x1, y1] = merkmalsRaum(a.x, a.y, normiert);
  const [x2, y2] = merkmalsRaum(c.x, c.y, normiert);
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

// Schritt 2: jeden Messpunkt zuordnen – liefert die Anzahl der Wechsel
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

// Schritt 3: neue Zentren = Mittelwerte der zugeordneten Messpunkte
// Bleibt ein Cluster leer, bleibt sein Zentrum stehen.
function mittelwerte(daten, zentren) {
  const summe = zentren.map(() => ({ x: 0, y: 0, n: 0 }));
  for (const b of daten) {
    if (b.cluster >= 0) {
      summe[b.cluster].x += b.x;
      summe[b.cluster].y += b.y;
      summe[b.cluster].n++;
    }
  }
  const neu = [];
  const leer = [];
  for (let i = 0; i < zentren.length; i++) {
    if (summe[i].n === 0) {
      neu.push({ x: zentren[i].x, y: zentren[i].y });
      leer.push(i);
    } else {
      neu.push({ x: summe[i].x / summe[i].n, y: summe[i].y / summe[i].n });
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
  return indizes.map((i) => ({ x: daten[i].x, y: daten[i].y }));
}

// k-means++: weitere Zentren bevorzugt weit weg von den bisherigen
// (Wahrscheinlichkeit proportional zum quadrierten Abstand zum nächsten Zentrum)
function plusPlusStart(daten, k, normiert, rnd) {
  const erstes = daten[Math.floor(rnd() * daten.length)];
  const zentren = [{ x: erstes.x, y: erstes.y }];
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
    zentren.push({ x: daten[wahl].x, y: daten[wahl].y });
  }
  return zentren;
}

// --- kompletter Durchlauf (für die Ellenbogen-Methode) ------------------------
// verändert die Zuordnung der Messpunkte in der Oberfläche NICHT
function kmeansKomplett(daten, k, normiert, rnd) {
  const kopie = daten.map((b) => ({ x: b.x, y: b.y, cluster: -1, alt: -1 }));
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
