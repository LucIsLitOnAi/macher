# Macher – Rezeptbox für die Geschwister

Web-App (PWA), die man auf dem iPhone über Safari → Teilen → „Zum Home-Bildschirm“ wie eine App installiert.
Eigene Umsetzung der Idee „minimalistische Rezeptkarte“ (Inspiration: miseapp.co, kein Code/Design übernommen).

## Funktionen (Stand 21.10.2026)
- Rezeptkarte: Titel, Untertitel, Zutaten, Notizen, Quellen (Links). Keine Fotos, mit Absicht.
- Zutaten umsortieren (↑ ↓), Enter springt in eine neue Zutat-Zeile.
- Kochen: auf eine Zutat tippen, dann wird sie durchgestrichen. „Zurücksetzen“ hebt das wieder auf.
- Suche über Titel, Zutaten, Notizen und Quellen.
- Teilen: Das Rezept steckt komplett im Link (`#import=…`), dazu kann man eine kleine Nachricht schreiben. Der Empfänger tippt auf „In meine Rezepte“.
- 4 Themes (Papier, Nacht, Salbei, Ozean).
- Sicherung als JSON speichern/laden (Einstellungen).
- Offline-fähig (Service Worker).

Daten liegen nur auf dem jeweiligen Gerät (localStorage), es gibt keinen Server.

## Lokal starten
```bash
npx -y serve@14.2.4 -l 4321 /Volumes/Luc-Media/LiveLikeLuc/rezept-app
```
Dann http://localhost:4321 öffnen. Name der App ändern: `APP_NAME` in `app.js`, `<title>` in `index.html` und `manifest.webmanifest`.

## Dateien
- `index.html`, `styles.css`, `app.js`: die App
- `sw.js`: Offline-Cache (bei Änderungen `CACHE`-Version hochzählen)
- `manifest.webmanifest`, `icons/`: Name und Icon auf dem Home-Bildschirm

## Offen
- Online stellen (z. B. GitHub Pages oder Cloudflare Pages), damit die Geschwister sie installieren können.
- Später optional: echte iPhone-App mit Capacitor + Xcode, gemeinsame Rezepte per Sync, Rezepte untereinander verlinken.
