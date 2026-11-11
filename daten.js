// =============================================================================
//  daten.js – Prozessdaten einer Spritzgießmaschine (OHNE Beschriftung)
// =============================================================================
//  Pro Schuss werden zwei Prozesswerte aufgezeichnet:
//    - Massetemperatur in °C
//    - Einspritzdruck in bar
//
//  Auf der Maschine laufen im Lauf der Woche verschiedene Artikel (Rezepturen).
//  Welcher Artikel gerade lief, wurde NICHT mitgeschrieben – die Daten haben
//  also kein Label. k-Means soll die Gruppen allein aus den Messwerten finden.
//
//  Die Rezepturen unten dienen nur dazu, die Beispieldaten zu erzeugen. Der
//  Algorithmus sieht sie nie; in der Oberfläche lassen sie sich zum Vergleich
//  nachträglich einblenden ("Wahre Rezepturen zeigen").
// =============================================================================

const MERKMALE = [
  { name: "Massetemperatur", kurz: "T", einheit: "°C", min: 180, max: 300 },
  { name: "Einspritzdruck", kurz: "p", einheit: "bar", min: 500, max: 1500 },
];

// Betriebspunkte der Maschine: Mittelwert und Streuung (Standardabweichung)
const REZEPTUREN = [
  { name: "PP-Deckel", kurz: "PP", t: 215, sT: 5, p: 800, sP: 65, n: 60, form: "kreis" },
  { name: "PA66-Clip", kurz: "PA66", t: 270, sT: 5, p: 830, sP: 65, n: 50, form: "quadrat" },
  { name: "ABS-Gehäuse", kurz: "ABS", t: 240, sT: 5, p: 1080, sP: 60, n: 60, form: "dreieck" },
  { name: "POM-Zahnrad", kurz: "POM", t: 205, sT: 4, p: 1300, sP: 55, n: 45, form: "raute" },
];

// Ein paar Schüsse beim Anfahren oder bei Störungen liegen irgendwo
const STOERUNG = { name: "Anfahren / Störung", kurz: "Störung", n: 10, form: "kreuz" };

// alle Gruppen in einer Liste: Index 0 … 3 = Rezepturen, Index 4 = Störung
const GRUPPEN = REZEPTUREN.concat([STOERUNG]);

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

function erzeugeMessdaten(startwert) {
  const rnd = zufallsGenerator(startwert);
  const liste = [];

  for (let g = 0; g < REZEPTUREN.length; g++) {
    const r = REZEPTUREN[g];
    for (let i = 0; i < r.n; i++) {
      liste.push({ t: r.t + gaussZahl(rnd) * r.sT, p: r.p + gaussZahl(rnd) * r.sP, gruppe: g });
    }
  }
  for (let i = 0; i < STOERUNG.n; i++) {
    liste.push({ t: 185 + rnd() * 110, p: 520 + rnd() * 960, gruppe: GRUPPEN.length - 1 });
  }

  // gemischt, damit die Schussnummer nichts über die Rezeptur verrät
  for (let i = liste.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = liste[i];
    liste[i] = liste[j];
    liste[j] = tmp;
  }

  for (let i = 0; i < liste.length; i++) {
    const b = liste[i];
    b.id = 1001 + i;
    b.t = Math.round(begrenzen(b.t, MERKMALE[0].min + 1, MERKMALE[0].max - 1));
    b.p = Math.round(begrenzen(b.p, MERKMALE[1].min + 5, MERKMALE[1].max - 5) / 5) * 5;
    b.cluster = -1; // wird von k-Means vergeben
    b.alt = -1; // Cluster vor dem letzten Zuordnen (für die Animation)
  }
  return liste;
}
