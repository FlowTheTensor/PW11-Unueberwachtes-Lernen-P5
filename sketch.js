// =============================================================================
//  KI-Prozessanalyse · Spritzguss
//  k-Means findet ohne Beschriftung Gruppen (Cluster) in den Prozessdaten
//  einer Spritzgießmaschine – nur anhand von Massetemperatur und Einspritzdruck.
// =============================================================================
//
//  Dateien
//    daten.js   Prozessdaten (Schüsse) – die Rezepturen kennt k-Means nicht
//    kmeans.js  der Algorithmus (Zuordnen, Verschieben, Fehlersumme, k-means++)
//    ui.js      Knöpfe, Auswahllisten, Kästchen
//    sketch.js  Ablauf, Zeichnen, Erklärungen (diese Datei)
//
//  Bedienung
//    →         nächster Schritt (Startzentren · Zuordnen · Verschieben)
//    Leertaste automatisch ablaufen lassen / anhalten
//    R         neu starten
//    Maus      Zentren verschieben · Punkt berühren: Abstände ansehen
//    Klick     nach dem Konvergieren: neuen Schuss einordnen
//
//  Läuft mit p5.js 1.x und 2.x.
//  Hinweis: Alle Schleifen haben geschweifte Klammern – der p5-Web-Editor
//  kommt mit Schleifen ohne Klammern nicht zurecht.
// =============================================================================

// -----------------------------------------------------------------------------
// Layout (logisches Raster 1600 × 900, wird auf die Fenstergröße skaliert)
// -----------------------------------------------------------------------------
const W = 1600;
const H = 900;
let S = 1;

// Schriften der Jakob-Preh-Schule (Google Fonts, siehe index.html).
// Ohne Internet wird automatisch auf Systemschriften ausgewichen.
const SCHRIFTEN = {
  titel: ["Quicksand", "Arial"],
  text: ["Inter", "Arial"],
  mono: ["JetBrains Mono", "monospace"],
};
const schriftGeladen = { titel: false, text: false, mono: false };
let TITEL = "Arial";
let SCHRIFT = "Arial";
let MONO = "monospace";

function ladeSchriften() {
  if (!document.fonts || !document.fonts.load) {
    return;
  }
  for (const art of Object.keys(SCHRIFTEN)) {
    const name = SCHRIFTEN[art][0];
    Promise.all([
      document.fonts.load(`400 16px "${name}"`),
      document.fonts.load(`700 16px "${name}"`),
    ])
      .then((ergebnis) => {
        if (ergebnis[0].length > 0 && ergebnis[1].length > 0) {
          schriftGeladen[art] = true;
          TITEL = schriftGeladen.titel ? SCHRIFTEN.titel[0] : SCHRIFTEN.titel[1];
          SCHRIFT = schriftGeladen.text ? SCHRIFTEN.text[0] : SCHRIFTEN.text[1];
          MONO = schriftGeladen.mono ? SCHRIFTEN.mono[0] : SCHRIFTEN.mono[1];
        }
      })
      .catch(() => {});
  }
}

const P_DATEN = { x: 24, y: 84, w: 820, h: 800, titel: "Prozessdaten · Spritzgießmaschine 3" };
const P_ERKL = { x: 860, y: 84, w: 716, h: 244, titel: "" };
const P_EINST = { x: 860, y: 344, w: 716, h: 132, titel: "Einstellungen" };
const P_CLUSTER = { x: 860, y: 492, w: 716, h: 184, titel: "Gefundene Cluster" };
const P_KURVE = { x: 860, y: 692, w: 350, h: 192, titel: "Fehlersumme je Iteration" };
const P_ELLBOGEN = { x: 1226, y: 692, w: 350, h: 192, titel: "Ellenbogen-Methode" };
const KOPF_H = 34; // Höhe der Panel-Überschrift

const PLOT = { x: 104, y: 134, w: 700, h: 612 };
const KARTE_B = 175; // Auflösung der Gebietskarte
const KARTE_H = 153;

// Farben nach dem Corporate Design der Jakob-Preh-Schule (bsnes.de):
// Papierweiß, Logo-Schwarz, Schul-Rot als Akzent, Senf als zweiter Akzent.
const FARBE = {
  papier: [251, 249, 245],
  flaeche: [255, 255, 255],
  flaeche2: [243, 238, 230],
  linie: [231, 225, 214],
  text: [29, 29, 28],
  grau: [91, 88, 82],
  blass: [125, 122, 114],
  akzent: [200, 30, 58],
  akzentHell: [228, 0, 43],
  senf: [184, 122, 28],
  neutral: [160, 155, 146], // Schuss ohne Cluster
};

// Farben der Cluster C1 … C8
const CLUSTER_FARBE = [
  [200, 30, 58], // Schul-Rot
  [44, 92, 150], // Blau
  [184, 122, 28], // Senf
  [52, 128, 84], // Grün
  [122, 74, 150], // Violett
  [24, 132, 140], // Petrol
  [205, 98, 40], // Orange
  [214, 92, 150], // Rosa
];

// Dauer der Animationen in ms (wird mit dem Tempo verrechnet)
const DAUER = { zuordnen: 800, verschieben: 1000 };
const TEMPO = {
  langsam: { faktor: 1.6, pause: 900 },
  mittel: { faktor: 1, pause: 300 },
  schnell: { faktor: 0.3, pause: 40 },
};

// -----------------------------------------------------------------------------
// Zustand
// -----------------------------------------------------------------------------
let startwert = 20251111;
let daten = [];
let zentren = []; // {t, p} in °C und bar
let wege = []; // bisherige Positionen jedes Zentrums
let k = 4;
let startArt = "zufall"; // zufall | plusplus | klick
let normiert = true;
let tempo = "mittel";

let phase = "leer"; // leer | start | zugeordnet | verschoben | fertig
let iteration = 0;
let wechsel = 0;
let leereCluster = [];
let sseVerlauf = []; // {i, sse}
let beispielIdx = 0;

let anim = null; // {art, t0, dauer, von, nach}
let laufAuto = false;
let letzterSchritt = 0;

let gebieteAn = false;
let rezepteAn = false;
let wegeAn = true;
let linienAn = false;

let ziehen = -1; // Index des Zentrums, das gerade mit der Maus bewegt wird
let neuerSchuss = null;
let ellbogen = null; // {werte: [{k, sse}], normiert, startwert}

let karteBild;
let karteSchluessel = "";
let hinweis = null;
let fehlerMeldung = null;
let cnv;

// =============================================================================
// Start
// =============================================================================
function setup() {
  ladeSchriften();
  const [cw, ch] = zeichenflaeche();
  cnv = createCanvas(cw, ch);
  S = width / W;

  karteBild = createImage(KARTE_B, KARTE_H);
  karteBild.loadPixels();

  daten = erzeugeMessdaten(startwert);

  erstelleUi();
  cnv.parent(huelle);
  neuStarten();
  layoutUi();
}

function zeichenflaeche() {
  const cw = Math.max(800, Math.min(1600, windowWidth - 24, ((windowHeight - 24) * W) / H));
  return [Math.round(cw), Math.round((cw * H) / W)];
}

function windowResized() {
  const [cw, ch] = zeichenflaeche();
  resizeCanvas(cw, ch);
  S = width / W;
  layoutUi();
}

// =============================================================================
// Hauptschleife – Fehler werden abgefangen, damit nie alles einfriert
// =============================================================================
function draw() {
  try {
    logik();
    background(...FARBE.papier);
    push();
    scale(S);
    zeichneKopf();
    zeichneDatenPanel();
    zeichneErklaerung();
    zeichneEinstellungen();
    zeichneClusterPanel();
    zeichneKurvenPanel();
    zeichneEllbogenPanel();
    zeichneTooltip();
    zeichneFehlerMeldung();
    pop();
    aktualisiereUi();
  } catch (err) {
    behandleFehler(err);
  }
}

function behandleFehler(err) {
  console.error(err);
  fehlerMeldung = { text: String((err && err.message) || err), t0: millis() };
  laufAuto = false;
  anim = null;
  ziehen = -1;
}

function logik() {
  if (anim && millis() - anim.t0 > anim.dauer) {
    anim = null;
  }
  if (laufAuto && !anim && millis() - letzterSchritt > TEMPO[tempo].pause) {
    schritt();
    if (phase === "fertig") {
      laufAuto = false;
    }
  }
}

// =============================================================================
// Ablauf von k-Means
// =============================================================================
function neuStarten() {
  laufAuto = false;
  zentren = [];
  wege = [];
  phase = "leer";
  iteration = 0;
  wechsel = 0;
  leereCluster = [];
  sseVerlauf = [];
  anim = null;
  ziehen = -1;
  neuerSchuss = null;
  karteSchluessel = "";
  beispielIdx = Math.floor(Math.random() * daten.length);
  for (const b of daten) {
    b.cluster = -1;
    b.alt = -1;
  }
}

function neueMessdaten() {
  startwert = Math.floor(Math.random() * 1e9);
  daten = erzeugeMessdaten(startwert);
  neuStarten();
}

// Zentren stehen fest → alles für einen neuen Durchlauf vorbereiten
function zentrenGesetzt() {
  phase = "start";
  iteration = 0;
  wechsel = 0;
  sseVerlauf = [];
  leereCluster = [];
  neuerSchuss = null;
  wege = zentren.map((z) => [{ t: z.t, p: z.p }]);
  karteSchluessel = "";
}

function startzentrenWaehlen() {
  if (startArt === "klick") {
    zeigeHinweis(`Klicke ${k - zentren.length} Startzentren ins Diagramm.`);
    return;
  }
  if (startArt === "plusplus") {
    zentren = plusPlusStart(daten, k, normiert, Math.random);
  } else {
    zentren = zufallsStart(daten, k, Math.random);
  }
  zentrenGesetzt();
}

function zuordnenSchritt() {
  const vorher = phase;
  wechsel = alleZuordnen(daten, zentren, normiert);
  iteration++;
  sseVerlauf.push({ i: iteration, sse: fehlersumme(daten, zentren, normiert) });
  phase = vorher === "verschoben" && wechsel === 0 ? "fertig" : "zugeordnet";
  anim = { art: "zuordnen", t0: millis(), dauer: DAUER.zuordnen * TEMPO[tempo].faktor };
}

function verschiebenSchritt() {
  const ergebnis = mittelwerte(daten, zentren);
  const von = zentren.map((z) => ({ t: z.t, p: z.p }));
  zentren = ergebnis.neu;
  leereCluster = ergebnis.leer;
  for (let i = 0; i < zentren.length; i++) {
    wege[i].push({ t: zentren[i].t, p: zentren[i].p });
  }
  phase = "verschoben";
  anim = { art: "verschieben", t0: millis(), dauer: DAUER.verschieben * TEMPO[tempo].faktor, von, nach: ergebnis.neu };
}

function schritt() {
  if (ziehen >= 0) {
    return;
  }
  anim = null; // laufende Animation überspringen
  neuerSchuss = null;
  letzterSchritt = millis();
  if (phase === "leer") {
    startzentrenWaehlen();
  } else if (phase === "start" || phase === "verschoben") {
    zuordnenSchritt();
  } else if (phase === "zugeordnet") {
    verschiebenSchritt();
  } else {
    zeigeHinweis("k-Means ist fertig. „Neu starten“ probiert andere Startzentren aus.");
    laufAuto = false;
  }
}

function autoUmschalten() {
  if (laufAuto) {
    laufAuto = false;
    return;
  }
  if (phase === "fertig" || (phase === "leer" && startArt === "klick")) {
    return;
  }
  laufAuto = true;
  letzterSchritt = 0;
}

// Normierung umgeschaltet: Zentren bleiben, aber die Zuordnung muss neu berechnet werden
function normierungGeaendert() {
  karteSchluessel = "";
  neuerSchuss = null;
  if (phase !== "leer") {
    zentrenGesetzt();
    zeigeHinweis(
      normiert
        ? "Jetzt wird normiert gemessen. Gleiche Zentren – mit → neu zuordnen."
        : "Jetzt wird in °C und bar gemessen. Gleiche Zentren – mit → neu zuordnen."
    );
  }
}

function zeigeHinweis(text) {
  hinweis = { text, t0: millis() };
}

function weich(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animAnteil(art) {
  if (!anim || anim.art !== art) {
    return 1;
  }
  return constrain((millis() - anim.t0) / anim.dauer, 0, 1);
}

// angezeigte Position eines Zentrums (gleitet beim Verschieben)
function zeigeZentrum(i) {
  if (anim && anim.art === "verschieben") {
    const a = weich(animAnteil("verschieben"));
    return { t: lerp(anim.von[i].t, anim.nach[i].t, a), p: lerp(anim.von[i].p, anim.nach[i].p, a) };
  }
  return zentren[i];
}

// =============================================================================
// Ellenbogen-Methode: Fehlersumme für k = 1 … 8
// =============================================================================
function ellbogenBerechnen() {
  const werte = [];
  for (let kk = 1; kk <= 8; kk++) {
    let beste = Infinity;
    for (let lauf = 0; lauf < 10; lauf++) {
      beste = Math.min(beste, kmeansKomplett(daten, kk, normiert, Math.random));
    }
    werte.push({ k: kk, sse: beste });
  }
  ellbogen = { werte, normiert, startwert };
}

// =============================================================================
// Statistik der Cluster
// =============================================================================
function clusterStatistik() {
  const st = zentren.map(() => ({ n: 0, t: 0, p: 0, d: 0, gruppen: GRUPPEN.map(() => 0) }));
  for (const b of daten) {
    if (b.cluster >= 0 && b.cluster < st.length) {
      const s = st[b.cluster];
      s.n++;
      s.t += b.t;
      s.p += b.p;
      s.d += abstand(b, zentren[b.cluster], normiert);
      s.gruppen[b.gruppe]++;
    }
  }
  for (const s of st) {
    if (s.n > 0) {
      s.t /= s.n;
      s.p /= s.n;
      s.d /= s.n;
    }
  }
  return st;
}

function neuenSchussEinordnen(t, p) {
  const b = { t, p };
  const st = clusterStatistik();
  const ds = zentren.map((z) => abstand(b, z, normiert));
  let c = 0;
  for (let i = 1; i < ds.length; i++) {
    if (ds[i] < ds[c]) {
      c = i;
    }
  }
  const grenze = 3 * st[c].d;
  neuerSchuss = { t, p, c, d: ds[c], ds, mittel: st[c].d, grenze, auffaellig: ds[c] > grenze };
}

// =============================================================================
// Zeichnen – Grundlagen
// =============================================================================
function mausX() {
  return mouseX / S;
}

function mausY() {
  return mouseY / S;
}

// Karte im Stil der Schule: weiße Fläche, feine Linie, Titel mit rotem Punkt
function panel(p) {
  noStroke();
  fill(29, 29, 28, 10);
  rect(p.x + 1, p.y + 3, p.w, p.h, 12);
  fill(...FARBE.flaeche);
  stroke(...FARBE.linie);
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h, 12);
  stroke(...FARBE.linie);
  line(p.x + 12, p.y + KOPF_H, p.x + p.w - 12, p.y + KOPF_H);
  if (p.titel) {
    noStroke();
    fill(...FARBE.akzentHell);
    circle(p.x + 19, p.y + KOPF_H / 2 + 1, 7);
    fill(...FARBE.text);
    textFont(TITEL);
    textStyle(BOLD);
    textSize(16);
    textAlign(LEFT, CENTER);
    text(p.titel, p.x + 30, p.y + KOPF_H / 2 + 1);
    textStyle(NORMAL);
  }
}

function hell(farbe, anteil) {
  return [lerp(farbe[0], 255, anteil), lerp(farbe[1], 255, anteil), lerp(farbe[2], 255, anteil)];
}

function clusterFarbe(c) {
  return c >= 0 ? CLUSTER_FARBE[c % CLUSTER_FARBE.length] : FARBE.neutral;
}

// Zahlen: Abstände und Fehlersummen je nach Normierung sinnvoll runden
function fD(d) {
  return normiert ? d.toFixed(3) : d.toFixed(1);
}

function tausender(v) {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function fSSE(v) {
  if (v >= 1000) {
    return tausender(v);
  }
  if (v >= 10) {
    return v.toFixed(1);
  }
  return v.toFixed(3);
}

function umbrechen(txt, maxBreite) {
  const woerter = txt.split(" ");
  const zeilen = [];
  let akt = "";
  for (const wort of woerter) {
    const probe = akt ? akt + " " + wort : wort;
    if (textWidth(probe) > maxBreite && akt) {
      zeilen.push(akt);
      akt = wort;
    } else {
      akt = probe;
    }
  }
  if (akt) {
    zeilen.push(akt);
  }
  return zeilen;
}

// =============================================================================
// Kopfzeile
// =============================================================================
function zeichneKopf() {
  noStroke();
  fill(...FARBE.flaeche);
  rect(0, 0, W, 56);
  stroke(...FARBE.linie);
  strokeWeight(1);
  line(0, 56, W, 56);

  // Trenner zwischen Logo und Titel: Punkt und Strich wie im Logo
  noStroke();
  fill(...FARBE.akzentHell);
  circle(160, 28, 6);
  stroke(...FARBE.akzentHell);
  strokeWeight(3);
  line(170, 34, 180, 22);

  noStroke();
  fill(...FARBE.text);
  textFont(TITEL);
  textStyle(BOLD);
  textSize(21);
  textAlign(LEFT, CENTER);
  text("KI-Prozessanalyse", 194, 21);
  textStyle(NORMAL);
  textFont(SCHRIFT);
  textSize(13);
  fill(...FARBE.blass);
  text("Spritzguss · k-Means-Clustering · unüberwachtes Lernen", 194, 41);

  fill(...FARBE.grau);
  textSize(13);
  textAlign(LEFT, CENTER);
  text(statusText(), 26, 70);
}

function statusText() {
  const startName = { zufall: "zufällige Schüsse", plusplus: "k-means++", klick: "per Klick" }[startArt];
  let s = `${daten.length} Schüsse ohne Label · k = ${k} · Startzentren: ${startName} · ${
    normiert ? "normiert" : "nicht normiert (°C und bar)"
  }`;
  if (iteration > 0) {
    s += ` · Iteration ${iteration} · Fehlersumme SSE = ${fSSE(sseVerlauf[sseVerlauf.length - 1].sse)}`;
  }
  if (phase === "fertig") {
    s += " · konvergiert ✓";
  }
  return s;
}

// =============================================================================
// Prozessdaten
// =============================================================================
function zuPlot(t, p) {
  const mt = MERKMALE[0];
  const mp = MERKMALE[1];
  return [
    PLOT.x + ((t - mt.min) / (mt.max - mt.min)) * PLOT.w,
    PLOT.y + PLOT.h - ((p - mp.min) / (mp.max - mp.min)) * PLOT.h,
  ];
}

function ausPlot(px, py) {
  const mt = MERKMALE[0];
  const mp = MERKMALE[1];
  const t = mt.min + ((px - PLOT.x) / PLOT.w) * (mt.max - mt.min);
  const p = mp.min + ((PLOT.y + PLOT.h - py) / PLOT.h) * (mp.max - mp.min);
  return { t: constrain(t, mt.min, mt.max), p: constrain(p, mp.min, mp.max) };
}

function imPlot(px, py) {
  return px >= PLOT.x && px <= PLOT.x + PLOT.w && py >= PLOT.y && py <= PLOT.y + PLOT.h;
}

function zentrumUnterMaus() {
  for (let i = zentren.length - 1; i >= 0; i--) {
    const z = zeigeZentrum(i);
    const [zx, zy] = zuPlot(z.t, z.p);
    if (dist(mausX(), mausY(), zx, zy) < 18) {
      return i;
    }
  }
  return -1;
}

function punktUnterMaus() {
  const mx = mausX();
  const my = mausY();
  if (!imPlot(mx, my)) {
    return -1;
  }
  let bester = -1;
  let besterAbstand = 9;
  for (let i = 0; i < daten.length; i++) {
    const [px, py] = zuPlot(daten[i].t, daten[i].p);
    const d = dist(mx, my, px, py);
    if (d < besterAbstand) {
      besterAbstand = d;
      bester = i;
    }
  }
  return bester;
}

// Gebietskarte: jedes Pixel bekommt die Farbe des nächstgelegenen Zentrums
function berechneKarte() {
  const zs = zentren.map((z, i) => zeigeZentrum(i));
  const schluessel = JSON.stringify(zs.map((z) => [z.t.toFixed(2), z.p.toFixed(1)])) + normiert;
  if (schluessel === karteSchluessel) {
    return;
  }
  karteSchluessel = schluessel;
  const nr = new Int8Array(KARTE_B * KARTE_H);
  for (let r = 0; r < KARTE_H; r++) {
    for (let c = 0; c < KARTE_B; c++) {
      const pkt = ausPlot(PLOT.x + ((c + 0.5) / KARTE_B) * PLOT.w, PLOT.y + ((r + 0.5) / KARTE_H) * PLOT.h);
      nr[r * KARTE_B + c] = naechstesZentrum(pkt, zs, normiert).c;
    }
  }
  const px = karteBild.pixels;
  for (let r = 0; r < KARTE_H; r++) {
    for (let c = 0; c < KARTE_B; c++) {
      const idx = r * KARTE_B + c;
      const grenze =
        (c + 1 < KARTE_B && nr[idx + 1] !== nr[idx]) || (r + 1 < KARTE_H && nr[idx + KARTE_B] !== nr[idx]);
      const f = grenze ? hell(clusterFarbe(nr[idx]), 0.35) : hell(clusterFarbe(nr[idx]), 0.84);
      px[idx * 4] = f[0];
      px[idx * 4 + 1] = f[1];
      px[idx * 4 + 2] = f[2];
      px[idx * 4 + 3] = 255;
    }
  }
  karteBild.updatePixels();
}

function zeichneForm(x, y, form, r, farbe, alpha) {
  if (form === "kreuz") {
    stroke(255, alpha);
    strokeWeight(5);
    line(x - r, y - r, x + r, y + r);
    line(x - r, y + r, x + r, y - r);
    stroke(farbe[0], farbe[1], farbe[2], alpha);
    strokeWeight(2.5);
    line(x - r, y - r, x + r, y + r);
    line(x - r, y + r, x + r, y - r);
    return;
  }
  stroke(255, alpha);
  strokeWeight(1.3);
  fill(farbe[0], farbe[1], farbe[2], alpha);
  if (form === "quadrat") {
    rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8);
  } else if (form === "dreieck") {
    triangle(x, y - r * 1.2, x + r * 1.1, y + r * 0.8, x - r * 1.1, y + r * 0.8);
  } else if (form === "raute") {
    quad(x, y - r * 1.25, x + r * 1.1, y, x, y + r * 1.25, x - r * 1.1, y);
  } else {
    circle(x, y, r * 2);
  }
}

function zeichneZentrum(x, y, farbe, nr, hervor) {
  noStroke();
  fill(29, 29, 28, 40);
  circle(x + 1, y + 2, 32);
  fill(255);
  stroke(...farbe);
  strokeWeight(hervor ? 4.5 : 3.5);
  circle(x, y, hervor ? 32 : 28);
  strokeWeight(3.5);
  line(x - 7, y, x + 7, y);
  line(x, y - 7, x, y + 7);

  const s = "C" + nr;
  textFont(TITEL);
  textStyle(BOLD);
  textSize(15);
  const b = textWidth(s) + 10;
  noStroke();
  fill(255, 230);
  rect(x + 14, y - 26, b, 20, 6);
  fill(...farbe);
  textAlign(LEFT, CENTER);
  text(s, x + 19, y - 16);
  textStyle(NORMAL);
}

function zeichneStern(x, y, r) {
  beginShape();
  for (let i = 0; i < 10; i++) {
    const a = -HALF_PI + (i * PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    vertex(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  endShape(CLOSE);
}

function zeichneDatenPanel() {
  panel(P_DATEN);
  zeichneLegende();

  // Diagrammfläche
  stroke(...FARBE.linie);
  strokeWeight(1);
  fill(...FARBE.papier);
  rect(PLOT.x, PLOT.y, PLOT.w, PLOT.h);
  if (gebieteAn && zentren.length > 0) {
    berechneKarte();
    image(karteBild, PLOT.x, PLOT.y, PLOT.w, PLOT.h);
  }

  // Gitter und Achsen
  textFont(SCHRIFT);
  textSize(12);
  for (let t = 180; t <= 300; t += 20) {
    const [gx] = zuPlot(t, 500);
    stroke(0, 0, 0, 25);
    strokeWeight(1);
    line(gx, PLOT.y, gx, PLOT.y + PLOT.h);
    noStroke();
    fill(...FARBE.grau);
    textAlign(CENTER, TOP);
    text(t, gx, PLOT.y + PLOT.h + 6);
  }
  for (let p = 500; p <= 1500; p += 100) {
    const [, gy] = zuPlot(180, p);
    stroke(0, 0, 0, 25);
    line(PLOT.x, gy, PLOT.x + PLOT.w, gy);
    noStroke();
    fill(...FARBE.grau);
    textAlign(RIGHT, CENTER);
    text(p, PLOT.x - 6, gy);
  }
  fill(...FARBE.text);
  textStyle(BOLD);
  textSize(13);
  textAlign(CENTER, TOP);
  text("Massetemperatur T in °C", PLOT.x + PLOT.w / 2, PLOT.y + PLOT.h + 26);
  push();
  translate(P_DATEN.x + 18, PLOT.y + PLOT.h / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, TOP);
  text("Einspritzdruck p in bar", 0, 0);
  pop();
  textStyle(NORMAL);

  const aZu = weich(animAnteil("zuordnen"));
  const zs = zentren.map((z, i) => zeigeZentrum(i));

  // Wege der Zentren
  if (wegeAn) {
    for (let i = 0; i < wege.length; i++) {
      const f = clusterFarbe(i);
      noFill();
      stroke(f[0], f[1], f[2], 150);
      strokeWeight(2);
      beginShape();
      for (const w of wege[i]) {
        const [x, y] = zuPlot(w.t, w.p);
        vertex(x, y);
      }
      const [zx, zy] = zuPlot(zs[i].t, zs[i].p);
      vertex(zx, zy);
      endShape();
      noStroke();
      fill(f[0], f[1], f[2], 170);
      for (const w of wege[i]) {
        const [x, y] = zuPlot(w.t, w.p);
        circle(x, y, 6);
      }
    }
  }

  // Abstandslinien (immer kurz beim Zuordnen, dauerhaft mit Kästchen)
  if (zentren.length > 0 && (linienAn || (anim && anim.art === "zuordnen"))) {
    for (const b of daten) {
      if (b.cluster < 0) {
        continue;
      }
      const [px, py] = zuPlot(b.t, b.p);
      const [zx, zy] = zuPlot(zs[b.cluster].t, zs[b.cluster].p);
      const f = clusterFarbe(b.cluster);
      let alpha = 70;
      let ende = 1;
      if (anim && anim.art === "zuordnen") {
        ende = Math.min(1, aZu * 1.6);
        alpha = linienAn ? 70 : 140 * (1 - aZu) + 20;
      }
      stroke(f[0], f[1], f[2], alpha);
      strokeWeight(1);
      line(px, py, lerp(px, zx, ende), lerp(py, zy, ende));
    }
  }

  // Schüsse
  for (const b of daten) {
    const [px, py] = zuPlot(b.t, b.p);
    let f = clusterFarbe(b.cluster);
    if (anim && anim.art === "zuordnen" && b.alt !== b.cluster) {
      const f0 = clusterFarbe(b.alt);
      f = [lerp(f0[0], f[0], aZu), lerp(f0[1], f[1], aZu), lerp(f0[2], f[2], aZu)];
    }
    const form = rezepteAn ? GRUPPEN[b.gruppe].form : "kreis";
    zeichneForm(px, py, form, 5.5, f, b.cluster >= 0 ? 235 : 190);
  }

  // Beispielschuss bzw. Schuss unter der Maus: Abstände zu allen Zentren
  const hover = ziehen < 0 ? punktUnterMaus() : -1;
  const zeigeBeispiel = phase === "start" || phase === "zugeordnet";
  const idx = hover >= 0 ? hover : zeigeBeispiel && !laufAuto ? beispielIdx : -1;
  if (idx >= 0 && zentren.length > 0) {
    zeichneAbstaende(daten[idx], zs, hover >= 0 ? "" : "Beispiel");
  } else if (hover >= 0) {
    const [px, py] = zuPlot(daten[hover].t, daten[hover].p);
    noFill();
    stroke(...FARBE.text);
    strokeWeight(2);
    circle(px, py, 20);
  }

  // Zentren
  for (let i = 0; i < zs.length; i++) {
    const [zx, zy] = zuPlot(zs[i].t, zs[i].p);
    zeichneZentrum(zx, zy, clusterFarbe(i), i + 1, i === ziehen);
  }

  // neuer Schuss
  if (neuerSchuss) {
    const [nx, ny] = zuPlot(neuerSchuss.t, neuerSchuss.p);
    const z = zs[neuerSchuss.c];
    const [zx, zy] = zuPlot(z.t, z.p);
    const f = clusterFarbe(neuerSchuss.c);
    stroke(...f);
    strokeWeight(2.5);
    drawingContext.setLineDash([6, 5]);
    line(nx, ny, zx, zy);
    drawingContext.setLineDash([]);
    stroke(255);
    strokeWeight(2);
    fill(...(neuerSchuss.auffaellig ? FARBE.akzentHell : FARBE.text));
    zeichneStern(nx, ny, 14);
    noStroke();
    fill(...FARBE.text);
    textFont(SCHRIFT);
    textStyle(BOLD);
    textSize(13);
    const rechts = nx < PLOT.x + PLOT.w - 200;
    textAlign(rechts ? LEFT : RIGHT, CENTER);
    text(neuerSchuss.auffaellig ? "neuer Schuss · auffällig!" : "neuer Schuss", rechts ? nx + 16 : nx - 16, ny + 16);
    textStyle(NORMAL);
  }

  zeichnePlotBanner();

  // Hinweis unter den Knöpfen
  noStroke();
  fill(...FARBE.blass);
  textFont(SCHRIFT);
  textSize(12);
  textAlign(LEFT, CENTER);
  text("Maus auf Punkt: Abstände · Zentren ziehen", 540, 838);
  text("Wenn fertig: Klick ordnet neuen Schuss ein", 540, 856);

  // Mauszeiger
  if (ziehen >= 0 || (zentrumUnterMaus() >= 0 && !laufAuto)) {
    cursor(MOVE);
  } else if (imPlot(mausX(), mausY()) && !laufAuto) {
    cursor(CROSS);
  } else {
    cursor(ARROW);
  }
}

function zeichneLegende() {
  textFont(SCHRIFT);
  textSize(12);
  textAlign(LEFT, CENTER);
  const y = P_DATEN.y + 17;
  if (rezepteAn) {
    let x = P_DATEN.x + P_DATEN.w - 380;
    for (const g of GRUPPEN) {
      zeichneForm(x, y, g.form, 5.5, FARBE.grau, 255);
      noStroke();
      fill(...FARBE.text);
      text(g.kurz, x + 11, y + 1);
      x += textWidth(g.kurz) + 32;
    }
  } else {
    const x = P_DATEN.x + P_DATEN.w - 300;
    zeichneForm(x, y, "kreis", 5.5, FARBE.neutral, 255);
    noStroke();
    fill(...FARBE.text);
    text("Schuss (ohne Label)", x + 11, y + 1);
    stroke(...FARBE.text);
    strokeWeight(2.5);
    noFill();
    circle(x + 160, y, 15);
    line(x + 156, y, x + 164, y);
    line(x + 160, y - 4, x + 160, y + 4);
    noStroke();
    fill(...FARBE.text);
    text("Cluster-Zentrum", x + 172, y + 1);
  }
}

function zeichneAbstaende(b, zs, label) {
  const [px, py] = zuPlot(b.t, b.p);
  const ds = zs.map((z) => abstand(b, z, normiert));
  let best = 0;
  for (let i = 1; i < ds.length; i++) {
    if (ds[i] < ds[best]) {
      best = i;
    }
  }
  for (let i = 0; i < zs.length; i++) {
    const [zx, zy] = zuPlot(zs[i].t, zs[i].p);
    stroke(...(i === best ? FARBE.text : FARBE.blass));
    strokeWeight(i === best ? 2 : 1.2);
    drawingContext.setLineDash([5, 5]);
    line(px, py, zx, zy);
    drawingContext.setLineDash([]);
  }
  for (let i = 0; i < zs.length; i++) {
    const [zx, zy] = zuPlot(zs[i].t, zs[i].p);
    const mx = lerp(px, zx, 0.5);
    const my = lerp(py, zy, 0.5);
    const s = fD(ds[i]);
    textFont(MONO);
    textSize(12);
    textStyle(i === best ? BOLD : NORMAL);
    const w = textWidth(s) + 10;
    fill(255, 235);
    stroke(...(i === best ? FARBE.text : FARBE.linie));
    strokeWeight(1);
    rect(mx - w / 2, my - 9, w, 18, 5);
    noStroke();
    fill(...(i === best ? FARBE.text : FARBE.grau));
    textAlign(CENTER, CENTER);
    text(s, mx, my);
    textStyle(NORMAL);
  }
  noFill();
  stroke(...FARBE.text);
  strokeWeight(2.5);
  circle(px, py, 20);
  if (label) {
    noStroke();
    fill(...FARBE.text);
    textFont(SCHRIFT);
    textStyle(BOLD);
    textSize(12);
    textAlign(LEFT, CENTER);
    text(label, px + 13, py + 13);
    textStyle(NORMAL);
  }
}

function zeichnePlotBanner() {
  let s = "";
  if (phase === "leer") {
    s =
      startArt === "klick"
        ? `Klicke noch ${k - zentren.length} Startzentren ins Diagramm`
        : "Die Schüsse haben keine Beschriftung · mit → Startzentren wählen";
  }
  if (!s) {
    return;
  }
  textFont(SCHRIFT);
  textStyle(BOLD);
  textSize(14);
  const b = textWidth(s) + 28;
  noStroke();
  fill(29, 29, 28, 225);
  rect(PLOT.x + PLOT.w / 2 - b / 2, PLOT.y + 14, b, 32, 16);
  fill(255);
  textAlign(CENTER, CENTER);
  text(s, PLOT.x + PLOT.w / 2, PLOT.y + 30);
  textStyle(NORMAL);
}

// =============================================================================
// Erklärfeld
// =============================================================================
function beispiel() {
  const h = punktUnterMaus();
  return daten[h >= 0 ? h : beispielIdx];
}

function abstandsFormel() {
  if (normiert) {
    return [
      "d = √( (T′ − T′c)² + (p′ − p′c)² )",
      "mit  T′ = (T − 180 °C) / 120 °C   und   p′ = (p − 500 bar) / 1000 bar",
    ];
  }
  return ["d = √( (T − Tc)² + (p − pc)² )   ⚠ °C und bar werden gemischt!"];
}

function abstandsZeilen(b) {
  const zs = zentren.map((z, i) => zeigeZentrum(i));
  const ds = zs.map((z) => abstand(b, z, normiert));
  let best = 0;
  for (let i = 1; i < ds.length; i++) {
    if (ds[i] < ds[best]) {
      best = i;
    }
  }
  const zeilen = [`Schuss ${b.id} (${b.t} °C · ${b.p} bar):`];
  let akt = "";
  for (let i = 0; i < ds.length; i++) {
    akt += (`d(C${i + 1}) = ${fD(ds[i])}` + (i === best ? " ←" : "")).padEnd(20, " ");
    if (i % 4 === 3 || i === ds.length - 1) {
      zeilen.push("  " + akt.trimEnd());
      akt = "";
    }
  }
  return zeilen;
}

function erklaerung() {
  const n = daten.length;
  if (neuerSchuss) {
    const ns = neuerSchuss;
    const c = "C" + (ns.c + 1);
    return {
      titel: "Neuen Schuss einordnen",
      text:
        `Ein neuer Schuss mit ${ns.t} °C und ${ns.p} bar wird dem nächsten Zentrum ${c} zugeordnet. ` +
        (ns.auffaellig
          ? "Er liegt aber viel weiter weg als die übrigen Schüsse dieses Clusters – auffällig! So kann k-Means auch Störungen im Prozess melden (Anomalieerkennung)."
          : "Sein Abstand ist ähnlich wie bei den anderen Schüssen dieses Clusters – ein ganz normaler Schuss dieser Gruppe."),
      formeln: [
        `Abstand zu ${c}: d = ${fD(ns.d)}`,
        `Ø Abstand der Schüsse in ${c}: ${fD(ns.mittel)}  →  Grenze 3 × ${fD(ns.mittel)} = ${fD(ns.grenze)}`,
        `${fD(ns.d)} ${ns.auffaellig ? ">" : "≤"} ${fD(ns.grenze)}  →  ${ns.auffaellig ? "auffällig" : "unauffällig"}`,
      ],
    };
  }

  if (phase === "leer") {
    let t = `Die ${n} Schüsse haben keine Beschriftung: Niemand hat notiert, welcher Artikel gerade lief. k-Means soll k = ${k} Gruppen ähnlicher Schüsse finden. `;
    if (startArt === "klick") {
      t += `Klicke dazu ${k - zentren.length} Startzentren ins Diagramm.`;
    } else if (startArt === "plusplus") {
      t += "k-means++: Das erste Startzentrum ist ein zufälliger Schuss, jedes weitere wird bevorzugt weit weg von den bisherigen gewählt.";
    } else {
      t += `Mit → werden ${k} zufällige Schüsse als Startzentren genommen.`;
    }
    return {
      titel: "① Startzentren wählen",
      text: t,
      formeln: [
        "① k Startzentren wählen",
        "② Zuordnen:    jeder Schuss kommt zum nächstgelegenen Zentrum",
        "③ Verschieben: jedes Zentrum wandert in die Mitte seiner Schüsse",
        "②③ wiederholen, bis kein Schuss mehr das Cluster wechselt",
      ],
    };
  }

  if (phase === "start") {
    return {
      titel: "Startzentren gewählt · als Nächstes ② Zuordnen",
      text: `Die Zentren C1 … C${k} stehen fest. Für jeden Schuss wird jetzt der Abstand zu jedem Zentrum berechnet – er kommt zum nächstgelegenen. Fahre mit der Maus über einen Punkt, um seine Abstände zu sehen.`,
      formeln: abstandsFormel().concat(abstandsZeilen(beispiel())),
    };
  }

  const sse = sseVerlauf.length > 0 ? sseVerlauf[sseVerlauf.length - 1].sse : 0;

  if (phase === "zugeordnet") {
    const wechselText =
      iteration > 1 ? ` ${wechsel} ${wechsel === 1 ? "Schuss hat" : "Schüsse haben"} dabei das Cluster gewechselt.` : "";
    return {
      titel: `② Zuordnen · Iteration ${iteration}`,
      text: `Jeder Schuss gehört jetzt zum nächstgelegenen Zentrum und hat dessen Farbe.${wechselText} Als Nächstes wandert jedes Zentrum in die Mitte seiner Schüsse.`,
      formeln: abstandsZeilen(beispiel()).concat([`Fehlersumme  SSE = Σ d² = ${fSSE(sse)}`]),
    };
  }

  if (phase === "verschoben") {
    const b = beispiel();
    const c = b.cluster >= 0 ? b.cluster : 0;
    const glieder = daten.filter((x) => x.cluster === c);
    const formeln = [`Zentrum = Mittelwert aller Schüsse im Cluster`];
    if (glieder.length >= 2) {
      const z = zentren[c];
      formeln.push(
        `C${c + 1}: ${glieder.length} Schüsse  →  Tc = (${glieder[0].t} + ${glieder[1].t} + …) / ${glieder.length} = ${z.t.toFixed(1)} °C`
      );
      formeln.push(
        `${" ".repeat(String(glieder.length).length + 17)}pc = (${glieder[0].p} + ${glieder[1].p} + …) / ${glieder.length} = ${z.p.toFixed(0)} bar`
      );
    }
    if (leereCluster.length > 0) {
      formeln.push(`⚠ leer: ${leereCluster.map((i) => "C" + (i + 1)).join(", ")} – Zentrum bleibt stehen`);
    }
    return {
      titel: `③ Zentren verschieben · Iteration ${iteration}`,
      text: "Jedes Zentrum steht jetzt im Mittelwert seiner Schüsse. Weil sich die Zentren bewegt haben, liegt mancher Schuss jetzt näher an einem anderen Zentrum – also wird wieder zugeordnet.",
      formeln,
    };
  }

  // fertig
  return {
    titel: `Fertig · konvergiert nach ${iteration} Iterationen`,
    text: "Beim letzten Zuordnen hat kein Schuss mehr das Cluster gewechselt, die Zentren bleiben stehen. Passen die Cluster zu den Rezepturen? Mit „Neu starten“ und anderen Startzentren kann ein anderes Ergebnis herauskommen.",
    formeln: [
      `Fehlersumme  SSE = Σ d² = ${fSSE(sse)}`,
      "Klick ins Diagramm: einen neuen Schuss einordnen",
      "Wie viele Cluster passen am besten? → Ellenbogen-Methode",
    ],
  };
}

function zeichneErklaerung() {
  const p = P_ERKL;
  const e = erklaerung();
  p.titel = e.titel;
  panel(p);

  let ty = p.y + KOPF_H + 10;
  const unten = p.y + p.h - 50;
  noStroke();
  textAlign(LEFT, TOP);
  textFont(SCHRIFT);
  textSize(14);
  if (hinweis && millis() - hinweis.t0 < 3500) {
    fill(...FARBE.akzent);
    textStyle(BOLD);
    for (const z of umbrechen(hinweis.text, p.w - 32)) {
      text(z, p.x + 16, ty);
      ty += 18;
    }
    textStyle(NORMAL);
  } else {
    fill(...FARBE.grau);
    for (const z of umbrechen(e.text, p.w - 32).slice(0, 4)) {
      text(z, p.x + 16, ty);
      ty += 18;
    }
  }

  ty += 6;
  textFont(MONO);
  textSize(13);
  fill(...FARBE.text);
  for (const f of e.formeln) {
    if (ty + 15 > unten) {
      break;
    }
    text(f, p.x + 16, ty);
    ty += 16;
  }
}

function zeichneEinstellungen() {
  const p = P_EINST;
  panel(p);
  noStroke();
  fill(...FARBE.blass);
  textFont(SCHRIFT);
  textSize(12);
  textAlign(LEFT, TOP);
  text(
    normiert
      ? "Normiert: Temperatur und Druck zählen gleich stark, egal in welcher Einheit."
      : "Nicht normiert: Der Druck (Bereich 1000 bar) überwiegt die Temperatur (Bereich 120 °C).",
    p.x + 16,
    p.y + p.h - 22
  );
}

// =============================================================================
// Tabelle der Cluster
// =============================================================================
function zeichneClusterPanel() {
  const p = P_CLUSTER;
  panel(p);
  textFont(SCHRIFT);

  if (iteration === 0) {
    noStroke();
    fill(...FARBE.grau);
    textSize(13);
    textAlign(CENTER, CENTER);
    text("Noch keine Zuordnung.\nNach dem ersten Zuordnen stehen hier die Cluster.", p.x + p.w / 2, p.y + KOPF_H + (p.h - KOPF_H) / 2);
    return;
  }

  const st = clusterStatistik();
  const sp = [p.x + 18, p.x + 100, p.x + 180, p.x + 290, p.x + 390, p.x + 490];
  let y = p.y + KOPF_H + 14;
  textSize(12);
  textStyle(BOLD);
  fill(...FARBE.blass);
  noStroke();
  textAlign(LEFT, CENTER);
  const kopf = ["Cluster", "Schüsse", "Ø Temperatur", "Ø Druck", "Ø Abstand", rezepteAn ? "wahre Rezepturen darin" : "(Rezepturen verborgen)"];
  for (let i = 0; i < kopf.length; i++) {
    text(kopf[i], sp[i], y);
  }
  textStyle(NORMAL);
  y += 18;
  const zeile = Math.min(16, (p.y + p.h - 10 - y) / st.length);
  for (let i = 0; i < st.length; i++) {
    const s = st[i];
    const f = clusterFarbe(i);
    fill(...f);
    noStroke();
    circle(sp[0] + 5, y, 10);
    fill(...FARBE.text);
    textFont(SCHRIFT);
    textStyle(BOLD);
    text("C" + (i + 1), sp[0] + 16, y);
    textStyle(NORMAL);
    textFont(MONO);
    text(String(s.n), sp[1], y);
    text(s.n > 0 ? s.t.toFixed(1) + " °C" : "–", sp[2], y);
    text(s.n > 0 ? s.p.toFixed(0) + " bar" : "–", sp[3], y);
    text(s.n > 0 ? fD(s.d) : "–", sp[4], y);
    if (rezepteAn && s.n > 0) {
      const teile = s.gruppen
        .map((anz, g) => ({ anz, g }))
        .filter((x) => x.anz > 0)
        .sort((a, b) => b.anz - a.anz)
        .slice(0, 3)
        .map((x) => `${GRUPPEN[x.g].kurz} ${x.anz}`);
      textFont(SCHRIFT);
      text(teile.join(" · "), sp[5], y);
    }
    y += zeile;
  }
}

// =============================================================================
// Fehlersumme je Iteration
// =============================================================================
function zeichneLinienDiagramm(p, punkte, xName, markiertX, blass) {
  const gx = p.x + 66;
  const gy = p.y + KOPF_H + 16;
  const gw = p.w - 86;
  const gh = p.h - KOPF_H - 48;
  let maxX = 1;
  let maxY = 0;
  for (const q of punkte) {
    maxX = Math.max(maxX, q.x);
    maxY = Math.max(maxY, q.y);
  }
  maxY = maxY > 0 ? maxY * 1.1 : 1;
  const minX = punkte.length > 0 ? punkte[0].x : 0;
  const sx = (x) => gx + (maxX === minX ? 0.5 : (x - minX) / (maxX - minX)) * gw;
  const sy = (v) => gy + gh - (v / maxY) * gh;

  stroke(...FARBE.linie);
  strokeWeight(1);
  line(gx, sy(maxY / 2), gx + gw, sy(maxY / 2));
  stroke(...FARBE.blass);
  strokeWeight(1.5);
  line(gx, gy, gx, gy + gh);
  line(gx, gy + gh, gx + gw, gy + gh);

  noStroke();
  fill(...FARBE.grau);
  textFont(SCHRIFT);
  textSize(11);
  textAlign(RIGHT, CENTER);
  text(fSSE(maxY / 2), gx - 6, sy(maxY / 2));
  text("0", gx - 6, sy(0));
  textAlign(CENTER, TOP);
  text(String(minX), gx, gy + gh + 5);
  if (maxX !== minX) {
    text(String(maxX), gx + gw, gy + gh + 5);
  }
  text(xName, gx + gw / 2, gy + gh + 5);

  const f = blass ? FARBE.neutral : CLUSTER_FARBE[1];
  noFill();
  stroke(...f);
  strokeWeight(2.5);
  beginShape();
  for (const q of punkte) {
    vertex(sx(q.x), sy(q.y));
  }
  endShape();
  noStroke();
  for (const q of punkte) {
    fill(...f);
    circle(sx(q.x), sy(q.y), 7);
    if (q.x === markiertX) {
      noFill();
      stroke(...FARBE.akzent);
      strokeWeight(2.5);
      circle(sx(q.x), sy(q.y), 18);
      noStroke();
    }
  }
}

function zeichneKurvenPanel() {
  const p = P_KURVE;
  panel(p);
  if (sseVerlauf.length === 0) {
    noStroke();
    fill(...FARBE.grau);
    textFont(SCHRIFT);
    textSize(13);
    textAlign(CENTER, CENTER);
    text("Noch keine Iteration.\nDie Fehlersumme zeigt, wie eng\ndie Schüsse um ihre Zentren liegen.", p.x + p.w / 2, p.y + KOPF_H + (p.h - KOPF_H) / 2);
    return;
  }
  zeichneLinienDiagramm(
    p,
    sseVerlauf.map((q) => ({ x: q.i, y: q.sse })),
    "Iteration",
    iteration,
    false
  );
}

function zeichneEllbogenPanel() {
  const p = P_ELLBOGEN;
  panel(p);
  if (!ellbogen) {
    noStroke();
    fill(...FARBE.grau);
    textFont(SCHRIFT);
    textSize(13);
    textAlign(CENTER, CENTER);
    text("Wie viele Cluster sind sinnvoll?\nFür k = 1 … 8 wird k-Means je 10-mal\ngerechnet – die beste Fehlersumme zählt.", p.x + p.w / 2, p.y + KOPF_H + (p.h - KOPF_H) / 2);
    return;
  }
  const veraltet = ellbogen.normiert !== normiert || ellbogen.startwert !== startwert;
  zeichneLinienDiagramm(
    p,
    ellbogen.werte.map((q) => ({ x: q.k, y: q.sse })),
    "Anzahl Cluster k",
    k,
    veraltet
  );
  if (veraltet) {
    noStroke();
    fill(...FARBE.akzent);
    textFont(SCHRIFT);
    textStyle(BOLD);
    textSize(12);
    textAlign(RIGHT, TOP);
    text("veraltet – neu berechnen", p.x + p.w - 16, p.y + KOPF_H + 8);
    textStyle(NORMAL);
  }
}

// -----------------------------------------------------------------------------
// Tooltip und Fehlermeldung
// -----------------------------------------------------------------------------
function zeichneTooltip() {
  if (ziehen >= 0) {
    return;
  }
  const i = punktUnterMaus();
  if (i < 0) {
    return;
  }
  const b = daten[i];
  let s = `Schuss ${b.id} · ${b.t} °C · ${b.p} bar`;
  if (b.cluster >= 0) {
    s += ` · Cluster C${b.cluster + 1}`;
  }
  if (rezepteAn) {
    s += ` · ${GRUPPEN[b.gruppe].name}`;
  }
  const mx = mausX();
  const my = mausY();
  textFont(SCHRIFT);
  textSize(13);
  const w = textWidth(s) + 18;
  const tx = Math.min(mx + 14, W - w - 10);
  noStroke();
  fill(29, 29, 28, 235);
  rect(tx, my + 14, w, 26, 6);
  fill(255);
  textAlign(LEFT, CENTER);
  text(s, tx + 9, my + 27);
}

function zeichneFehlerMeldung() {
  if (!fehlerMeldung || millis() - fehlerMeldung.t0 > 8000) {
    return;
  }
  const s = "Interner Fehler: " + fehlerMeldung.text + "  (Details in der Konsole)";
  textFont(SCHRIFT);
  textSize(14);
  const b = textWidth(s) + 30;
  noStroke();
  fill(...FARBE.akzent, 240);
  rect(W / 2 - b / 2, 62, b, 30, 6);
  fill(255);
  textAlign(CENTER, CENTER);
  text(s, W / 2, 77);
}

// =============================================================================
// Eingaben
// =============================================================================
function mousePressed() {
  if (laufAuto) {
    return;
  }
  const mx = mausX();
  const my = mausY();
  if (!imPlot(mx, my) && zentrumUnterMaus() < 0) {
    return;
  }

  // 1. Zentrum anfassen
  const z = zentrumUnterMaus();
  if (z >= 0 && (phase !== "leer" || startArt === "klick")) {
    anim = null;
    ziehen = z;
    return;
  }

  const pkt = ausPlot(mx, my);
  // 2. Startzentren per Klick
  if (phase === "leer") {
    if (startArt === "klick") {
      zentren.push({ t: pkt.t, p: pkt.p });
      karteSchluessel = "";
      if (zentren.length >= k) {
        zentrenGesetzt();
      }
    } else {
      zeigeHinweis("Mit → werden die Startzentren gewählt – oder stelle „per Klick setzen“ ein.");
    }
    return;
  }

  // 3. neuen Schuss einordnen
  if (phase === "fertig") {
    neuenSchussEinordnen(Math.round(pkt.t), Math.round(pkt.p / 5) * 5);
  } else {
    zeigeHinweis("Neue Schüsse lassen sich einordnen, sobald k-Means fertig ist.");
  }
}

function mouseDragged() {
  if (ziehen < 0) {
    return;
  }
  const pkt = ausPlot(mausX(), mausY());
  zentren[ziehen] = { t: pkt.t, p: pkt.p };
}

function mouseReleased() {
  if (ziehen < 0) {
    return;
  }
  ziehen = -1;
  if (phase === "leer") {
    return; // noch beim Setzen der Startzentren
  }
  zentrenGesetzt();
  zeigeHinweis("Zentrum verschoben – mit → wird neu zugeordnet.");
}

function keyPressed() {
  // Tasten nicht abfangen, wenn eine Auswahlliste oder ein Textfeld den Fokus hat
  const el = document.activeElement;
  if (el && (el.tagName === "SELECT" || el.tagName === "TEXTAREA" ||
      (el.tagName === "INPUT" && !["checkbox", "range", "button", "file"].includes(el.type)))) {
    return true;
  }
  if (key === "ArrowRight") {
    if (!laufAuto) {
      schritt();
    }
    return false;
  }
  if (key === " ") {
    autoUmschalten();
    return false;
  }
  if ((key === "r" || key === "R") && !laufAuto) {
    neuStarten();
    return false;
  }
  return true;
}

// =============================================================================
// Daten als CSV speichern (z. B. zur Weiterarbeit in Python oder Excel)
// =============================================================================
function csvSpeichern() {
  const zeilen = ["schuss;massetemperatur_c;einspritzdruck_bar;cluster"];
  const sortiert = daten.slice().sort((a, b) => a.id - b.id);
  for (const b of sortiert) {
    zeilen.push(`${b.id};${b.t};${b.p};${b.cluster >= 0 ? "C" + (b.cluster + 1) : ""}`);
  }
  const blob = new Blob([zeilen.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "prozessdaten_maschine3.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
