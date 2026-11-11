# KI-Prozessanalyse · k-Means

Unüberwachtes Lernen zum Zuschauen und Ausprobieren: Der k-Means-Algorithmus findet in den Prozessdaten einer Spritzgießmaschine Gruppen ähnlicher Schüsse – **ohne** dass jemand vorher gesagt hat, welcher Artikel gerade lief. Jeder Schritt (Startzentren, Zuordnen, Verschieben) lässt sich einzeln verfolgen, mit allen Zahlen und Formeln.

Erstellt für den Unterricht an der Jakob-Preh-Schule ([bsnes.de](https://www.bsnes.de)).

**Live-Version:** [Hier direkt anschauen](https://flowthetensor.github.io/PW11-Unueberwachtes-Lernen-p5/)

---

## Worum geht es?

Spritzgießmaschine 3 zeichnet bei jedem Schuss zwei Prozesswerte auf:

| Merkmal | Bereich |
|---|---|
| Massetemperatur T | 180 … 300 °C |
| Einspritzdruck p | 500 … 1500 bar |

Im Lauf der Woche liefen verschiedene Artikel auf der Maschine – **welcher wann lief, wurde nicht mitgeschrieben.** Die 225 Schüsse haben also kein Label. Anders als beim überwachten Lernen (z. B. PW9: i.O. / n.i.O.) gibt es keine „richtige Antwort“, aus der gelernt werden könnte. k-Means soll die Struktur allein aus den Messwerten finden.

Versteckt in den Daten stecken vier Rezepturen und ein paar Ausreißer:

| Rezeptur | Massetemperatur | Einspritzdruck |
|---|---|---|
| PP-Deckel | ≈ 215 °C | ≈ 800 bar |
| PA66-Clip | ≈ 270 °C | ≈ 830 bar |
| ABS-Gehäuse | ≈ 240 °C | ≈ 1080 bar |
| POM-Zahnrad | ≈ 205 °C | ≈ 1300 bar |
| Anfahren / Störung | irgendwo | irgendwo |

Der Algorithmus kennt diese Tabelle nicht. Mit „Wahre Rezepturen zeigen“ lassen sie sich nachträglich einblenden, um das Ergebnis zu überprüfen.

## Der k-Means-Algorithmus

```
① k Startzentren wählen
② Zuordnen:    jeder Schuss kommt zum nächstgelegenen Zentrum
③ Verschieben: jedes Zentrum wandert in den Mittelwert seiner Schüsse
②③ wiederholen, bis kein Schuss mehr das Cluster wechselt
```

**Abstand** (euklidisch) zwischen Schuss und Zentrum $c$:

$$d = \sqrt{(T - T_c)^2 + (p - p_c)^2}$$

**Neues Zentrum** = Mittelwert der $n$ Schüsse im Cluster:

$$T_c = \frac{T_1 + T_2 + \dots + T_n}{n} \qquad p_c = \frac{p_1 + p_2 + \dots + p_n}{n}$$

**Fehlersumme** (SSE, in Bibliotheken oft „Inertia“): Summe der quadrierten Abstände aller Schüsse zu ihrem Zentrum

$$\text{SSE} = \sum_{i} d_i^2$$

Jeder Schritt ② und ③ macht die Fehlersumme kleiner oder lässt sie gleich – deshalb hört k-Means immer irgendwann auf. Es findet aber nicht unbedingt die beste Lösung (lokales Minimum), das Ergebnis hängt von den Startzentren ab.

### Normierung

Temperatur und Druck haben ganz verschiedene Einheiten und Bereiche (120 °C gegenüber 1000 bar). Ohne Normierung bestimmt fast nur der Druck den Abstand. Deshalb wird normalerweise jedes Merkmal auf 0 … 1 umgerechnet:

$$T' = \frac{T - 180\,°\text{C}}{120\,°\text{C}} \qquad p' = \frac{p - 500\,\text{bar}}{1000\,\text{bar}}$$

Mit dem Kästchen „Merkmale normieren“ lässt sich das abschalten. Mit „Gebiete einblenden“ sieht man den Unterschied sofort: Ohne Normierung werden die Gebiete zu waagrechten Streifen.

### Startzentren

- **zufällige Schüsse:** k Schüsse werden zufällig als Startzentren genommen.
- **k-means++:** Das erste Zentrum ist ein zufälliger Schuss, jedes weitere wird mit einer Wahrscheinlichkeit proportional zu $d^2$ gewählt – also bevorzugt weit weg von den bisherigen. Das ist die Voreinstellung in scikit-learn.
- **per Klick setzen:** Die Zentren selbst ins Diagramm klicken (gut für schlechte Startwerte mit Absicht).

### Wie viele Cluster? Die Ellenbogen-Methode

k-Means braucht k als Vorgabe. Für k = 1 … 8 wird die beste Fehlersumme aus je 10 Durchläufen aufgetragen. Mehr Cluster machen die Fehlersumme immer kleiner – aber ab einem bestimmten k lohnt es sich kaum noch. Dieser Knick („Ellenbogen“) ist ein guter Wert für k.

### Neue Schüsse einordnen und Anomalien erkennen

Nach dem Konvergieren lässt sich per Klick ein neuer Schuss einordnen. Er kommt zum nächsten Zentrum. Liegt er mehr als dreimal so weit weg wie die Schüsse dieses Clusters im Mittel, gilt er als **auffällig** – so kann ein Clustering in der Produktion Prozessstörungen melden.

## Bedienung

| Aktion | Wirkung |
|---|---|
| **→** oder „Schritt“ | nächster Schritt: Startzentren · Zuordnen · Verschieben |
| **Leertaste** oder „Automatisch“ | bis zum Ende durchlaufen lassen / anhalten |
| **R** oder „Neu starten“ | neue Startzentren, gleiche Daten |
| Maus über einem Punkt | Schussnummer, Messwerte und Abstände zu allen Zentren |
| Zentrum mit der Maus ziehen | Zentrum von Hand verschieben, danach neu zuordnen |
| Klick ins Diagramm (wenn fertig) | neuen Schuss einordnen |

**Einstellungen:** Anzahl der Cluster k (1 … 8), Startzentren, Tempo, Normierung, Wege der Zentren, Abstandslinien. „Neue Messdaten“ erzeugt einen neuen Datensatz mit denselben Rezepturen, „CSV speichern“ lädt die Daten mit der gefundenen Cluster-Nummer herunter (z. B. für Excel oder Python).

## Ideen für den Unterricht

- **Überwacht oder unüberwacht?** Vergleiche mit PW9 (KI-Qualitätsprüfung): Was ist dort das Label, was fehlt hier? Wofür braucht man in der Fertigung Verfahren ohne Label?
- **Schritt für Schritt:** Einmal mit → komplett durchklicken. Am Beispielschuss die Abstände nachrechnen, an einem Zentrum den Mittelwert nachvollziehen.
- **Ergebnis prüfen:** Nach dem Konvergieren „Wahre Rezepturen zeigen“ einschalten. Welche Rezepturen wurden gut getrennt? Wo landen die Störungen?
- **Startzentren:** Mehrmals „Neu starten“ mit zufälligen Schüssen. Kommt immer dasselbe heraus? Vergleiche die Fehlersumme. Was passiert mit „per Klick“, wenn alle Zentren in eine Ecke gesetzt werden?
- **k-means++:** Wie oft geht es damit schief, wie oft mit zufälligen Schüssen?
- **Normierung abschalten:** Gebiete einblenden und neu durchlaufen lassen. Warum werden PP-Deckel und PA66-Clip jetzt zusammengeworfen? (Tipp: Bereich der Achsen vergleichen.)
- **Ellenbogen-Methode:** Welches k empfiehlt sie? Wie sieht die Kurve ohne Normierung aus?
- **Anomalieerkennung:** Einen Schuss bei 285 °C und 1350 bar einordnen. Und einen bei 240 °C und 1080 bar?
- **Grenzen von k-Means:** Was passiert mit k = 2 oder k = 8? Kann k-Means auch Gruppen finden, die nicht rund sind?
- **Weiterarbeit:** Daten als CSV speichern und in Python mit `sklearn.cluster.KMeans` nachrechnen.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite, bindet Schriften, p5.js und die Skripte ein |
| `style.css` | Gestaltung im Corporate Design der Schule |
| `daten.js` | Beispieldaten (Rezepturen, Störungen, Zufallsgenerator) |
| `kmeans.js` | der k-Means-Algorithmus – reines JavaScript, ohne p5 |
| `ui.js` | Knöpfe, Auswahllisten, Kästchen |
| `sketch.js` | Ablauf, Zeichnen, Erklärtexte |
| `assets/logo-jps.png` | Logo der Jakob-Preh-Schule |
| `libraries/p5.min.js` | p5.js (lokal, damit die Seite auch offline läuft) |

## Lokal starten

Am einfachsten in VS Code mit der Erweiterung **Live Server**: Rechtsklick auf `index.html` → „Open with Live Server“.

## Technische Hinweise

- Läuft mit **p5.js 1.x** (lokal mitgeliefert) und **p5.js 2.x**. Dafür verzichtet der Code bewusst auf Funktionen, die sich zwischen den Versionen geändert haben (z. B. `preload`, `loadFont`).
- Die Schriften (Quicksand, Inter, JetBrains Mono) kommen von Google Fonts. Ohne Internet weicht die Seite automatisch auf Systemschriften aus.
- Alle Schleifen haben geschweifte Klammern: Der p5-Web-Editor baut in Schleifen eine Endlosschleifen-Sicherung ein, die bei Schleifen ohne Klammern fehlschlägt.
- Fehler in `draw()` werden abgefangen und als Hinweis angezeigt, statt das Programm einzufrieren.
- Der Datensatz wird mit festem Startwert erzeugt und ist deshalb bei jedem Start gleich. Erst „Neue Messdaten“ würfelt neu.
