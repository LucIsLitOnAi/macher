#!/bin/zsh
# Lädt die App-Dateien nach GitHub (LucIsLitOnAi/macher) hoch, ohne git (git würde den Xcode-Dialog öffnen).
# GitHub Pages veröffentlicht danach automatisch: https://lucislitonai.github.io/macher/
# Vorher bei Änderungen die CACHE-Version in sw.js hochzählen, sonst sehen iPhones die alte Version.
set -e
cd "${0:A:h}"
REPO=LucIsLitOnAi/macher
TMP=$(mktemp)
for f in index.html styles.css app.js sw.js manifest.webmanifest README.md deploy.sh icons/*; do
  sha=$(gh api "repos/$REPO/contents/$f" --jq .sha 2>/dev/null) || sha=""
  printf '{"message":"Update %s","content":"%s"%s}' "$f" "$(base64 -i "$f" | tr -d '\n')" \
    "${sha:+,\"sha\":\"$sha\"}" > "$TMP"
  gh api -X PUT "repos/$REPO/contents/$f" --input "$TMP" --jq '.content.path'
done
rm -f "$TMP"
