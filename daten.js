// =============================================================================
//  daten.js – Messdaten für zwei Beispiele (jeweils OHNE Beschriftung)
// =============================================================================
//  Beispiel "motor" (Standard):
//    Antrieb eines Förderbands der Industrie-4.0-Modellanlage.
//    Pro Messung: Motorstrom in A und Schwingstärke am Motorlager in mm/s.
//    Das Band lief in verschiedenen Betriebszuständen – welcher Zustand
//    gerade herrschte, wurde nicht mitgeschrieben.
//
//  Beispiel "pneumatik":
//    Pneumatikzylinder einer Station der Modellanlage.
//    Pro Hub: Ausfahrzeit in ms und Luftverbrauch in Normlitern.
//    Welcher Fehlerzustand gerade vorlag, wurde nicht mitgeschrieben.
//
//  Beispiel "spritzguss":
//    Spritzgießmaschine. Pro Schuss: Massetemperatur in °C und
//    Einspritzdruck in bar. Welcher Artikel (Rezeptur) gerade lief, wurde
//    nicht mitgeschrieben.
//
//  Die Gruppen unten dienen nur dazu, die Beispieldaten zu erzeugen. k-Means
//  sieht sie nie; in der Oberfläche lassen sie sich zum Vergleich nachträglich
//  einblenden ("Wahre Zustände zeigen" bzw. "Wahre Rezepturen zeigen").
//
//  Jeder Messpunkt hat die Felder x (Merkmal 1, waagrechte Achse) und
//  y (Merkmal 2, senkrechte Achse).
// =============================================================================

const SZENARIEN = {
  motor: {
    name: "Förderband-Antrieb · Zustandsüberwachung",
    titel: "Messdaten · Förderband-Antrieb M1",
    untertitel: "Förderband-Antrieb · k-Means-Clustering · unüberwachtes Lernen",
    startwert: 20260311,
    merkmale: [
      { name: "Motorstrom", kurz: "I", einheit: "A", min: 0, max: 1.6, gitter: 0.2, stellen: 2, raster: 0.01, csv: "motorstrom_a" },
      { name: "Schwingstärke", kurz: "v", einheit: "mm/s", min: 0, max: 10, gitter: 1, stellen: 1, raster: 0.1, csv: "schwingstaerke_mm_s" },
    ],
    // Betriebszustände: Mittelwert und Streuung (Standardabweichung)
    gruppen: [
      { name: "Leerlauf", kurz: "Leerlauf", x: 0.35, sx: 0.04, y: 1.2, sy: 0.35, n: 55, form: "kreis" },
      { name: "Band mit Werkstück", kurz: "Mit Werkstück", x: 0.72, sx: 0.05, y: 1.6, sy: 0.4, n: 65, form: "quadrat" },
      { name: "Blockiert (Band steht, Motor zieht Strom)", kurz: "Blockiert", x: 1.38, sx: 0.05, y: 0.35, sy: 0.12, n: 30, form: "dreieck" },
      { name: "Lagerschaden", kurz: "Lagerschaden", x: 0.78, sx: 0.08, y: 6.4, sy: 0.8, n: 35, form: "raute" },
    ],
    // ein paar Messungen beim Anlaufen oder bei Störungen liegen irgendwo
    stoerung: { name: "Anlauf / Störung", kurz: "Störung", n: 10, x: [0.05, 1.55], y: [0.3, 9.5], form: "kreuz" },
    wort: {
      einzahl: "Messung",
      mehrzahl: "Messungen",
      mehrzahlDativ: "Messungen",
      titelNeu: "Neue Messung einordnen",
      jeder: "jede",
      jedenAkk: "jede",
      erKlein: "sie",
      einenNeuen: "eine neue Messung",
      kein: "keine",
      mancher: "manche",
      einNeuer: "Eine neue Messung",
      neuer: "neue Messung",
      er: "Sie",
      sein: "Ihr",
      gruppe: "Zustand",
      gruppen: "Zustände",
      gruppenDativ: "Betriebszuständen",
      unbekannt: "in welchem Zustand das Band gerade lief",
      anomalie: "So erkennt man einen sich anbahnenden Schaden, bevor das Band ausfällt (Predictive Maintenance).",
    },
    dStellen: 2, // Nachkommastellen für Abstände ohne Normierung
    csvDatei: "messdaten_foerderband_m1.csv",
  },

  pneumatik: {
    name: "Pneumatikzylinder · Fehlerdiagnose",
    titel: "Messdaten · Pneumatikzylinder 1A1",
    untertitel: "Pneumatik · k-Means-Clustering · unüberwachtes Lernen",
    startwert: 20260412,
    merkmale: [
      { name: "Ausfahrzeit", kurz: "t", einheit: "ms", min: 200, max: 700, gitter: 50, stellen: 0, raster: 1, csv: "ausfahrzeit_ms" },
      { name: "Luftverbrauch", kurz: "V", einheit: "Nl", min: 0, max: 0.6, gitter: 0.1, stellen: 2, raster: 0.01, csv: "luftverbrauch_nl" },
    ],
    // Zustände des Zylinders: Mittelwert und Streuung (Standardabweichung)
    gruppen: [
      { name: "Normalbetrieb", kurz: "Normal", x: 300, sx: 15, y: 0.22, sy: 0.015, n: 80, form: "kreis" },
      { name: "Leckage (Schlauch oder Dichtung undicht)", kurz: "Leckage", x: 315, sx: 15, y: 0.45, sy: 0.04, n: 35, form: "quadrat" },
      { name: "Druck zu niedrig (Wartungseinheit)", kurz: "Druck niedrig", x: 470, sx: 25, y: 0.16, sy: 0.015, n: 40, form: "dreieck" },
      { name: "Schwergängig (Führung verschmutzt)", kurz: "Schwergängig", x: 580, sx: 30, y: 0.23, sy: 0.02, n: 35, form: "raute" },
    ],
    stoerung: { name: "Störung / Fehlmessung", kurz: "Störung", n: 10, x: [210, 690], y: [0.05, 0.58], form: "kreuz" },
    wort: {
      einzahl: "Hub",
      mehrzahl: "Hübe",
      mehrzahlDativ: "Hüben",
      titelNeu: "Neuen Hub einordnen",
      jeder: "jeder",
      jedenAkk: "jeden",
      erKlein: "er",
      einenNeuen: "einen neuen Hub",
      kein: "kein",
      mancher: "mancher",
      einNeuer: "Ein neuer Hub",
      neuer: "neuer Hub",
      er: "Er",
      sein: "Sein",
      gruppe: "Zustand",
      gruppen: "Zustände",
      gruppenDativ: "Zuständen",
      unbekannt: "in welchem Zustand der Zylinder gerade war",
      anomalie: "So fällt ein neuer Fehler in der Pneumatik auf, bevor die Station ausfällt.",
    },
    dStellen: 2,
    csvDatei: "messdaten_pneumatik_1a1.csv",
  },

  spritzguss: {
    name: "Spritzgießmaschine · Rezepturen",
    titel: "Prozessdaten · Spritzgießmaschine 3",
    untertitel: "Spritzguss · k-Means-Clustering · unüberwachtes Lernen",
    startwert: 20251111,
    merkmale: [
      { name: "Massetemperatur", kurz: "T", einheit: "°C", min: 180, max: 300, gitter: 20, stellen: 0, raster: 1, csv: "massetemperatur_c" },
      { name: "Einspritzdruck", kurz: "p", einheit: "bar", min: 500, max: 1500, gitter: 100, stellen: 0, raster: 5, csv: "einspritzdruck_bar" },
    ],
    gruppen: [
      { name: "PP-Deckel", kurz: "PP", x: 215, sx: 5, y: 800, sy: 65, n: 60, form: "kreis" },
      { name: "PA66-Clip", kurz: "PA66", x: 270, sx: 5, y: 830, sy: 65, n: 50, form: "quadrat" },
      { name: "ABS-Gehäuse", kurz: "ABS", x: 240, sx: 5, y: 1080, sy: 60, n: 60, form: "dreieck" },
      { name: "POM-Zahnrad", kurz: "POM", x: 205, sx: 4, y: 1300, sy: 55, n: 45, form: "raute" },
    ],
    stoerung: { name: "Anfahren / Störung", kurz: "Störung", n: 10, x: [185, 295], y: [520, 1480], form: "kreuz" },
    wort: {
      einzahl: "Schuss",
      mehrzahl: "Schüsse",
      mehrzahlDativ: "Schüssen",
      titelNeu: "Neuen Schuss einordnen",
      jeder: "jeder",
      jedenAkk: "jeden",
      erKlein: "er",
      einenNeuen: "einen neuen Schuss",
      kein: "kein",
      mancher: "mancher",
      einNeuer: "Ein neuer Schuss",
      neuer: "neuer Schuss",
      er: "Er",
      sein: "Sein",
      gruppe: "Rezeptur",
      gruppen: "Rezepturen",
      gruppenDativ: "Rezepturen",
      unbekannt: "welcher Artikel gerade lief",
      anomalie: "So kann k-Means auch Störungen im Prozess melden (Anomalieerkennung).",
    },
    dStellen: 1,
    csvDatei: "prozessdaten_maschine3.csv",
  },
};

// aktives Beispiel – wird mit setzeSzenario() umgeschaltet
let SZ = SZENARIEN.motor;
let MERKMALE = SZ.merkmale;
let GRUPPEN = SZ.gruppen.concat([SZ.stoerung]); // letzter Eintrag = Störung

function setzeSzenario(schluessel) {
  SZ = SZENARIEN[schluessel];
  MERKMALE = SZ.merkmale;
  GRUPPEN = SZ.gruppen.concat([SZ.stoerung]);
}

// Zufallsgenerator mit festem Startwert: der Datensatz ist bei jedem Start gleich
function zufallsGenerator(startwert) {
  let a = startwert >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// normalverteilte Zufallszahl (Box-Muller-Verfahren)
function gaussZahl(rnd) {
  let u = 0;
  while (u === 0) {
    u = rnd();
  }
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function begrenzen(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// auf das Messraster runden (z. B. 0.01 A oder 5 bar)
function aufRaster(v, m) {
  const r = Math.round(v / m.raster) * m.raster;
  return Number(r.toFixed(Math.max(0, m.stellen)));
}

function erzeugeMessdaten(startwert) {
  const rnd = zufallsGenerator(startwert);
  const liste = [];

  for (let g = 0; g < SZ.gruppen.length; g++) {
    const gr = SZ.gruppen[g];
    for (let i = 0; i < gr.n; i++) {
      liste.push({ x: gr.x + gaussZahl(rnd) * gr.sx, y: gr.y + gaussZahl(rnd) * gr.sy, gruppe: g });
    }
  }
  const st = SZ.stoerung;
  for (let i = 0; i < st.n; i++) {
    liste.push({
      x: st.x[0] + rnd() * (st.x[1] - st.x[0]),
      y: st.y[0] + rnd() * (st.y[1] - st.y[0]),
      gruppe: GRUPPEN.length - 1,
    });
  }

  // gemischt, damit die Nummer nichts über die Gruppe verrät
  for (let i = liste.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = liste[i];
    liste[i] = liste[j];
    liste[j] = tmp;
  }

  const [mx, my] = MERKMALE;
  for (let i = 0; i < liste.length; i++) {
    const b = liste[i];
    b.id = 1001 + i;
    b.x = aufRaster(begrenzen(b.x, mx.min + mx.raster, mx.max - mx.raster), mx);
    b.y = aufRaster(begrenzen(b.y, my.min + my.raster, my.max - my.raster), my);
    b.cluster = -1; // wird von k-Means vergeben
    b.alt = -1; // Cluster vor dem letzten Zuordnen (für die Animation)
  }
  return liste;
}

// Messwert mit Einheit, z. B. "0.72 A" oder "1080 bar"
function wertText(v, m) {
  return v.toFixed(m.stellen) + " " + m.einheit;
}
