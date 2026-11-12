# KI-Prozessanalyse · k-Means

Unüberwachtes Lernen zum Zuschauen und Ausprobieren: Der k-Means-Algorithmus findet in Messdaten aus der Produktion Gruppen ähnlicher Messpunkte – **ohne** dass jemand vorher gesagt hat, was dahintersteckt. Jeder Schritt (Startzentren, Zuordnen, Verschieben) lässt sich einzeln verfolgen, mit allen Zahlen und Formeln.

Erstellt für den Unterricht an der Jakob-Preh-Schule ([bsnes.de](https://www.bsnes.de)).

**Live-Version:** [Hier direkt anschauen](https://flowthetensor.github.io/PW11-Unueberwachtes-Lernen-P5/)

---

## Worum geht es?

In der Produktion werden ständig Messwerte aufgezeichnet – aber fast nie steht dabei, *was* gerade los war. Diese Daten haben also **kein Label**. Anders als beim überwachten Lernen (z. B. PW9: i.O. / n.i.O.) gibt es keine „richtige Antwort“, aus der gelernt werden könnte. k-Means soll die Struktur allein aus den Messwerten finden: Welche Messpunkte gehören zusammen?

In der roten **Beispiel-Leiste** unter der Kopfzeile stehen drei Datensätze zur Verfügung. In jedem stecken vier versteckte Gruppen und ein paar Ausreißer. Der Algorithmus kennt die Tabellen unten nicht – mit „Wahre Zustände zeigen“ bzw. „Wahre Rezepturen zeigen“ lassen sich die Gruppen nachträglich einblenden, um das Ergebnis zu überprüfen.

> Alle Werte sind simuliert und an eine typische 24-V-Modellanlage für Industrie 4.0 angelehnt. Sobald echte Messdaten der ETS-Anlage verfügbar sind, kann man sie mit realen Werten vergleichen.

### 1. Förderband-Antrieb · Zustandsüberwachung (Standard)

Am Antriebsmotor M1 eines Förderbands werden zwei Werte gemessen:

| Merkmal | Bereich |
|---|---|
| Motorstrom I | 0 … 1,6 A |
| Schwingstärke v am Motorlager | 0 … 10 mm/s |

Auf dem Band liegt immer höchstens ein Werkstück. Welcher Zustand wann herrschte, wurde nicht mitgeschrieben. Versteckt in den 195 Messungen:

| Zustand | Motorstrom | Schwingstärke | Erklärung |
|---|---|---|---|
| Leerlauf | ≈ 0,35 A | ≈ 1,2 mm/s | Band läuft ohne Werkstück, nur Reibung |
| Band mit Werkstück | ≈ 0,72 A | ≈ 1,6 mm/s | höheres Lastmoment → mehr Strom |
| Blockiert | ≈ 1,38 A | ≈ 0,35 mm/s | Band klemmt, Motor steht: hoher Strom, aber kaum Schwingung, weil sich nichts dreht |
| Lagerschaden | ≈ 0,78 A | ≈ 6,4 mm/s | beschädigtes Kugellager: Strom fast normal, Schwingung stark erhöht |
| Anlauf / Störung | irgendwo | irgendwo | Einschaltvorgänge, Messfehler |

Bei Gleichstrom-Getriebemotoren ist der Strom proportional zum Drehmoment, also zur Last auf dem Band. Die Schwingstärke ist der klassische Kennwert der Zustandsüberwachung (vgl. DIN ISO 10816 / 20816): Ein Lagerschaden zeigt sich dort, lange bevor der Antrieb ausfällt (**Predictive Maintenance**).

### 2. Pneumatikzylinder · Fehlerdiagnose

An einem doppeltwirkenden Pneumatikzylinder (1A1) werden bei jedem Hub zwei Werte gemessen:

| Merkmal | Bereich | Sensor |
|---|---|---|
| Ausfahrzeit t | 200 … 700 ms | Zeit zwischen Ventilsignal und Endlagensensor |
| Luftverbrauch V je Hub | 0 … 0,6 Nl | Durchflusssensor in der Zuleitung (Normliter) |

Welcher Fehler wann vorlag, wurde nicht mitgeschrieben. Versteckt in den 200 Hüben:

| Zustand | Ausfahrzeit | Luftverbrauch | Erklärung |
|---|---|---|---|
| Normalbetrieb | ≈ 300 ms | ≈ 0,22 Nl | Zylinder fährt sauber aus |
| Leckage | ≈ 315 ms | ≈ 0,45 Nl | Schlauch oder Dichtung undicht: das Ventil liefert nach, der Zylinder ist kaum langsamer, verbraucht aber viel mehr Luft |
| Druck zu niedrig | ≈ 470 ms | ≈ 0,16 Nl | Wartungseinheit falsch eingestellt: weniger Kraft → langsamer, weniger Luftmasse je Hub |
| Schwergängig | ≈ 580 ms | ≈ 0,23 Nl | Führung verschmutzt oder Drossel zu weit zu: deutlich langsamer, Luftverbrauch normal |
| Störung / Fehlmessung | irgendwo | irgendwo | Sensor prellt, Hub abgebrochen |

Jeder Fehler hat seine eigene „Handschrift“ – mit nur *einem* der beiden Merkmale wären sie nicht zu unterscheiden (Leckage sieht man nicht an der Zeit, Schwergängigkeit nicht am Luftverbrauch). Druckluft ist zudem eine der teuersten Energieformen in der Fabrik; Leckagen zu finden ist ein typisches Industrie-4.0-Thema.

### 3. Spritzgießmaschine · Rezepturen

Spritzgießmaschine 3 zeichnet bei jedem Schuss zwei Prozesswerte auf:

| Merkmal | Bereich |
|---|---|
| Massetemperatur T | 180 … 300 °C |
| Einspritzdruck p | 500 … 1500 bar |

Im Lauf der Woche liefen verschiedene Artikel – welcher wann lief, wurde nicht mitgeschrieben. Versteckt in den 225 Schüssen:

| Rezeptur | Massetemperatur | Einspritzdruck |
|---|---|---|
| PP-Deckel | ≈ 215 °C | ≈ 800 bar |
| PA66-Clip | ≈ 270 °C | ≈ 830 bar |
| ABS-Gehäuse | ≈ 240 °C | ≈ 1080 bar |
| POM-Zahnrad | ≈ 205 °C | ≈ 1300 bar |
| Anfahren / Störung | irgendwo | irgendwo |

## Der k-Means-Algorithmus

```
① k Startzentren wählen
② Zuordnen:    jeder Messpunkt kommt zum nächstgelegenen Zentrum
③ Verschieben: jedes Zentrum wandert in den Mittelwert seiner Messpunkte
②③ wiederholen, bis kein Messpunkt mehr das Cluster wechselt
```

**Abstand** (euklidisch) zwischen Messpunkt und Zentrum $c$, hier am Beispiel Förderband:

$$d = \sqrt{(I - I_c)^2 + (v - v_c)^2}$$

**Neues Zentrum** = Mittelwert der $n$ Messpunkte im Cluster:

$$I_c = \frac{I_1 + I_2 + \dots + I_n}{n} \qquad v_c = \frac{v_1 + v_2 + \dots + v_n}{n}$$

**Fehlersumme** (SSE, in Bibliotheken oft „Inertia“): Summe der quadrierten Abstände aller Messpunkte zu ihrem Zentrum

$$\text{SSE} = \sum_{i} d_i^2$$

Jeder Schritt ② und ③ macht die Fehlersumme kleiner oder lässt sie gleich – deshalb hört k-Means immer irgendwann auf. Es findet aber nicht unbedingt die beste Lösung (lokales Minimum), das Ergebnis hängt von den Startzentren ab.

### Normierung

Die beiden Merkmale haben ganz verschiedene Einheiten und Zahlenbereiche (1,6 A gegenüber 10 mm/s, 500 ms gegenüber 0,6 Nl, 120 °C gegenüber 1000 bar). Ohne Normierung bestimmt fast nur das Merkmal mit dem größeren Zahlenbereich den Abstand. Deshalb wird normalerweise jedes Merkmal auf 0 … 1 umgerechnet, z. B.:

$$I' = \frac{I - 0\,\text{A}}{1{,}6\,\text{A}} \qquad v' = \frac{v - 0\,\text{mm/s}}{10\,\text{mm/s}}$$

Mit dem Kästchen „Merkmale normieren“ lässt sich das abschalten. Mit „Gebiete einblenden“ sieht man den Unterschied sofort: Die Gebiete werden zu Streifen, und Gruppen, die sich nur im „kleinen“ Merkmal unterscheiden, werden zusammengeworfen – beim Förderband Leerlauf und Band mit Werkstück, beim Pneumatikzylinder Normalbetrieb und Leckage, beim Spritzguss PP und PA66.

### Startzentren

- **zufällige Punkte:** k Messpunkte werden zufällig als Startzentren genommen.
- **k-means++:** Das erste Zentrum ist ein zufälliger Messpunkt, jedes weitere wird mit einer Wahrscheinlichkeit proportional zu $d^2$ gewählt – also bevorzugt weit weg von den bisherigen. Das ist die Voreinstellung in scikit-learn.
- **per Klick setzen:** Die Zentren selbst ins Diagramm klicken (gut für schlechte Startwerte mit Absicht).

### Wie viele Cluster? Die Ellenbogen-Methode

k-Means braucht k als Vorgabe. Für k = 1 … 8 wird die beste Fehlersumme aus je 10 Durchläufen aufgetragen. Mehr Cluster machen die Fehlersumme immer kleiner – aber ab einem bestimmten k lohnt es sich kaum noch. Dieser Knick („Ellenbogen“) ist ein guter Wert für k. In allen drei Beispielen liegt er mit Normierung bei k = 4.

### Neue Messungen einordnen und Anomalien erkennen

Nach dem Konvergieren lässt sich per Klick eine neue Messung einordnen. Sie kommt zum nächsten Zentrum. Liegt sie mehr als dreimal so weit weg wie die Messpunkte dieses Clusters im Mittel, gilt sie als **auffällig** – so kann eine Zustandsüberwachung einen ungewöhnlichen Zustand melden, für den es noch gar keine Kategorie gibt.

## Bedienung

| Aktion | Wirkung |
|---|---|
| Beispiel-Leiste (Reiter 1–3) | Förderband-Antrieb, Pneumatikzylinder oder Spritzgießmaschine |
| **→** oder „Schritt“ | nächster Schritt: Startzentren · Zuordnen · Verschieben |
| **Leertaste** oder „Automatisch“ | bis zum Ende durchlaufen lassen / anhalten |
| **R** oder „Neu starten“ | neue Startzentren, gleiche Daten |
| Maus über einem Punkt | Nummer, Messwerte und Abstände zu allen Zentren |
| Zentrum mit der Maus ziehen | Zentrum von Hand verschieben, danach neu zuordnen |
| Klick ins Diagramm (wenn fertig) | neue Messung einordnen |

**Einstellungen:** Anzahl der Cluster k (1 … 8), Startzentren, Tempo, Normierung, Wege der Zentren, Abstandslinien. „Neue Messdaten“ erzeugt einen neuen Datensatz mit denselben Gruppen, „CSV speichern“ lädt die Daten mit der gefundenen Cluster-Nummer herunter (z. B. für Excel oder Python).

## Ideen für den Unterricht

- **Überwacht oder unüberwacht?** Vergleiche mit PW9 (KI-Qualitätsprüfung): Was ist dort das Label, was fehlt hier? Warum gibt es in der Instandhaltung oft keine Labels? (Schäden sind selten, niemand protokolliert jeden Zustand.)
- **Physik vorher überlegen:** Wo im Diagramm erwartest du Leerlauf, Band mit Werkstück, Blockiert und einen Lagerschaden? Warum steigt bei einer Blockade der Strom, die Schwingung aber nicht?
- **Schritt für Schritt:** Einmal mit → komplett durchklicken. Am Beispielpunkt die Abstände nachrechnen, an einem Zentrum den Mittelwert nachvollziehen.
- **Ergebnis prüfen:** Nach dem Konvergieren „Wahre Zustände zeigen“ einschalten. Welche Zustände wurden gut getrennt? Wo landen die Störungen?
- **Startzentren:** Mehrmals „Neu starten“ mit zufälligen Punkten. Kommt immer dasselbe heraus? Vergleiche die Fehlersumme. Was passiert mit „per Klick“, wenn alle Zentren in eine Ecke gesetzt werden?
- **k-means++:** Wie oft geht es damit schief, wie oft mit zufälligen Punkten?
- **Normierung abschalten:** Gebiete einblenden und neu durchlaufen lassen. Welche Zustände werden jetzt zusammengeworfen – und warum? (Tipp: Zahlenbereiche der Achsen vergleichen.)
- **Ellenbogen-Methode:** Welches k empfiehlt sie mit Normierung, welches ohne?
- **Anomalieerkennung Förderband:** Eine Messung bei 0,05 A und 0,2 mm/s einordnen – was könnte passiert sein? (Motor bekommt keinen Strom: Drahtbruch, Sicherung, Not-Halt.) Und eine bei 1,40 A und 0,3 mm/s? Warum ist die *nicht* auffällig, obwohl das Band blockiert? (Blockaden kamen schon oft vor – sie haben ein eigenes Cluster.)
- **Anomalieerkennung Pneumatik:** Ein Hub mit 650 ms und 0,50 Nl – welche zwei Fehler könnten gleichzeitig vorliegen?
- **Fehlerdiagnose Pneumatik:** Welche Messung bräuchte man, wenn man nur die Ausfahrzeit hätte? Welche Fehler könnte man dann nicht mehr unterscheiden?
- **Grenzen von k-Means:** Was passiert mit k = 2 oder k = 8? Kann k-Means auch Gruppen finden, die nicht rund sind?
- **Transfer:** Gleiches Vorgehen am Spritzguss-Beispiel. Was ist dort ein „Zustand“?
- **Weiterarbeit:** Daten als CSV speichern und in Python mit `sklearn.cluster.KMeans` nachrechnen.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite, bindet Schriften, p5.js und die Skripte ein |
| `style.css` | Gestaltung im Corporate Design der Schule |
| `daten.js` | alle drei Beispiele (Merkmale, wahre Gruppen, Texte) und der Datengenerator |
| `kmeans.js` | der k-Means-Algorithmus – reines JavaScript, ohne p5 |
| `ui.js` | Knöpfe, Auswahllisten, Kästchen |
| `sketch.js` | Ablauf, Zeichnen, Erklärtexte |
| `assets/logo-jps.png` | Logo der Jakob-Preh-Schule |
| `libraries/p5.min.js` | p5.js (lokal, damit die Seite auch offline läuft) |

Ein weiteres Beispiel lässt sich ergänzen, indem man in `daten.js` einen Eintrag in `SZENARIEN` hinzufügt (zwei Merkmale, Gruppen mit Mittelwert und Streuung, Wörter für die Texte). Es erscheint dann automatisch als weiterer Reiter in der Beispiel-Leiste.

## Lokal starten

Am einfachsten in VS Code mit der Erweiterung **Live Server**: Rechtsklick auf `index.html` → „Open with Live Server“.

## Technische Hinweise

- Läuft mit **p5.js 1.x** (lokal mitgeliefert) und **p5.js 2.x**. Dafür verzichtet der Code bewusst auf Funktionen, die sich zwischen den Versionen geändert haben (z. B. `preload`, `loadFont`).
- Die Schriften (Quicksand, Inter, JetBrains Mono) kommen von Google Fonts. Ohne Internet weicht die Seite automatisch auf Systemschriften aus.
- Alle Schleifen haben geschweifte Klammern: Der p5-Web-Editor baut in Schleifen eine Endlosschleifen-Sicherung ein, die bei Schleifen ohne Klammern fehlschlägt.
- Fehler in `draw()` werden abgefangen und als Hinweis angezeigt, statt das Programm einzufrieren.
- Jeder Datensatz wird mit festem Startwert erzeugt und ist deshalb bei jedem Start gleich. Erst „Neue Messdaten“ würfelt neu.
