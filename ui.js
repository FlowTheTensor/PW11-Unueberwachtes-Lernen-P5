// =============================================================================
//  ui.js – HTML-Bedienelemente über der Zeichenfläche
// =============================================================================
//  Alle Positionen werden im logischen 1600×900-Raster angegeben und beim
//  Ändern der Fenstergröße mitskaliert (siehe layoutUi).
// =============================================================================

const ui = {};
const uiPositionen = [];
let huelle;

function platziere(el, x, y, w, ...klassen) {
  el.addClass("ui");
  for (const k of klassen) {
    el.addClass(k);
  }
  el.parent(huelle);
  uiPositionen.push({ el, x, y, w });
  return el;
}

function layoutUi() {
  huelle.style("width", width + "px");
  huelle.style("font-size", 15 * S + "px");
  for (const p of uiPositionen) {
    // alles unterhalb der Kopfzeile rutscht um die Beispiel-Leiste nach unten
    const y = p.y >= 56 && !p.el.hasClass("beispiel") ? p.y + LEISTE : p.y;
    p.el.position(p.x * S, y * S);
    if (p.w) {
      p.el.style("width", p.w * S + "px");
    }
  }
}

// Nach dem Anklicken den Fokus abgeben, damit die Tasten wieder wirken
function fokusWeg(el) {
  const inp = el.elt.querySelector ? el.elt.querySelector("input, select") : null;
  (inp || el.elt).blur();
}

function erstelleUi() {
  huelle = createDiv();
  huelle.addClass("huelle");

  // --- Kopfzeile -------------------------------------------------------------
  ui.logo = platziere(createImg("assets/logo-jps.png", "Logo der Jakob-Preh-Schule"), 14, 3, 122, "logo");

  // Beispiel-Leiste: ein Reiter je Beispiel (Reihenfolge wie in daten.js)
  ui.beispiele = {};
  let bx = 128;
  Object.keys(SZENARIEN).forEach((id, i) => {
    const text = `${i + 1} · ${SZENARIEN[id].name}`;
    const b = 34 + text.length * 8.6;
    ui.beispiele[id] = platziere(createButton(text), bx, 63, b, "beispiel");
    ui.beispiele[id].attribute("title", "Beispiel wechseln (neue Messdaten, Clustering startet neu)");
    ui.beispiele[id].mousePressed(() => {
      szenarioWechseln(id);
      ui.beispiele[id].elt.blur();
    });
    bx += b + 10;
  });

  ui.neueDaten = platziere(createButton("Neue Messdaten"), 1270, 12, 150, "kopf");
  ui.neueDaten.mousePressed(neueMessdaten);

  ui.csv = platziere(createButton("CSV speichern"), 1428, 12, 148, "kopf");
  ui.csv.mousePressed(csvSpeichern);

  // --- Prozessdaten ----------------------------------------------------------
  ui.gebiete = platziere(createButton("Gebiete einblenden"), 40, 830, 220);
  ui.gebiete.mousePressed(() => {
    gebieteAn = !gebieteAn;
    karteSchluessel = "";
  });

  ui.rezepte = platziere(createButton("Wahre Zustände zeigen"), 270, 830, 250);
  ui.rezepte.mousePressed(() => {
    rezepteAn = !rezepteAn;
  });

  // --- Ablauf (Erklärfeld) ---------------------------------------------------
  ui.schritt = platziere(createButton("Schritt ▶ (→)"), 876, 284, 190, "dunkel");
  ui.schritt.mousePressed(schritt);

  ui.auto = platziere(createButton("▶ Automatisch"), 1074, 284, 190, "primaer");
  ui.auto.mousePressed(autoUmschalten);

  ui.neu = platziere(createButton("↺ Neu starten (R)"), 1272, 284, 190);
  ui.neu.mousePressed(neuStarten);

  // --- Einstellungen ---------------------------------------------------------
  platziere(createSpan("Anzahl Cluster k"), 876, 380, 136);
  ui.k = platziere(createSelect(), 1014, 380, 66);
  for (let i = 1; i <= 8; i++) {
    ui.k.option(String(i), String(i));
  }
  ui.k.selected(String(k));
  ui.k.changed(() => {
    k = parseInt(ui.k.value(), 10);
    neuStarten();
    ui.k.elt.blur();
  });

  platziere(createSpan("Startzentren"), 1104, 380, 104);
  ui.start = platziere(createSelect(), 1208, 380, 188);
  ui.start.option("zufällige Punkte", "zufall");
  ui.start.option("k-means++", "plusplus");
  ui.start.option("per Klick setzen", "klick");
  ui.start.selected(startArt);
  ui.start.changed(() => {
    startArt = ui.start.value();
    neuStarten();
    ui.start.elt.blur();
  });

  platziere(createSpan("Tempo"), 1418, 380, 56);
  ui.tempo = platziere(createSelect(), 1474, 380, 90);
  for (const t of ["langsam", "mittel", "schnell"]) {
    ui.tempo.option(t, t);
  }
  ui.tempo.selected(tempo);
  ui.tempo.changed(() => {
    tempo = ui.tempo.value();
    ui.tempo.elt.blur();
  });

  ui.normiert = platziere(createCheckbox(" Merkmale normieren (0 … 1)", normiert), 876, 418, 262);
  ui.normiert.changed(() => {
    normiert = ui.normiert.checked();
    normierungGeaendert();
    fokusWeg(ui.normiert);
  });

  ui.wege = platziere(createCheckbox(" Wege der Zentren", wegeAn), 1150, 418, 180);
  ui.wege.changed(() => {
    wegeAn = ui.wege.checked();
    fokusWeg(ui.wege);
  });

  ui.linien = platziere(createCheckbox(" Abstandslinien", linienAn), 1340, 418, 170);
  ui.linien.changed(() => {
    linienAn = ui.linien.checked();
    fokusWeg(ui.linien);
  });

  // --- Ellenbogen-Methode ----------------------------------------------------
  ui.ellbogen = platziere(createButton("berechnen"), 1226 + 350 - 108, 697, 96, "klein", "dunkel");
  ui.ellbogen.mousePressed(ellbogenBerechnen);
}

// --- kleine Helfer, damit das DOM nur bei echten Änderungen angefasst wird ---
function beschrifte(el, html) {
  if (el._html !== html) {
    el.html(html);
    el._html = html;
  }
}

function sperre(el, gesperrt) {
  if (el.elt.disabled !== gesperrt) {
    el.elt.disabled = gesperrt;
  }
  const inp = el.elt.querySelector ? el.elt.querySelector("input") : null;
  if (inp && inp.disabled !== gesperrt) {
    inp.disabled = gesperrt;
  }
}

function klasse(el, name, an) {
  if (an) {
    el.addClass(name);
  } else {
    el.removeClass(name);
  }
}

// wird in jedem Frame aufgerufen
function aktualisiereUi() {
  beschrifte(ui.auto, laufAuto ? "■ Anhalten" : "▶ Automatisch");
  klasse(ui.auto, "primaer", !laufAuto);
  klasse(ui.auto, "dunkel", laufAuto);

  if (phase === "leer") {
    beschrifte(ui.schritt, startArt === "klick" ? "Zentren klicken …" : "Startzentren ▶ (→)");
  } else if (phase === "start" || phase === "verschoben") {
    beschrifte(ui.schritt, "Zuordnen ▶ (→)");
  } else if (phase === "zugeordnet") {
    beschrifte(ui.schritt, "Verschieben ▶ (→)");
  } else {
    beschrifte(ui.schritt, "Fertig ✓");
  }
  sperre(ui.schritt, laufAuto || phase === "fertig" || (phase === "leer" && startArt === "klick"));
  sperre(ui.auto, phase === "fertig" || (phase === "leer" && startArt === "klick"));

  beschrifte(ui.gebiete, gebieteAn ? "Gebiete ausblenden" : "Gebiete einblenden");
  klasse(ui.gebiete, "kopf", true);
  klasse(ui.gebiete, "aktiv", gebieteAn);
  beschrifte(ui.rezepte, rezepteAn ? `Wahre ${SZ.wort.gruppen} verbergen` : `Wahre ${SZ.wort.gruppen} zeigen`);
  klasse(ui.rezepte, "kopf", true);
  klasse(ui.rezepte, "aktiv", rezepteAn);

  for (const id of Object.keys(ui.beispiele)) {
    klasse(ui.beispiele[id], "aktiv", id === szenario);
    sperre(ui.beispiele[id], laufAuto && id !== szenario);
    ui.beispiele[id].attribute("aria-pressed", id === szenario ? "true" : "false");
  }

  for (const el of [ui.k, ui.start, ui.normiert, ui.neueDaten, ui.ellbogen, ui.neu]) {
    sperre(el, laufAuto);
  }
}
