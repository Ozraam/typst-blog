#!/bin/bash
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "🔄 Récupération des dernières modifications..."
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git pull origin main || true
fi

echo "🚀 Reconstruction et démarrage des conteneurs..."
docker compose up -d --build

echo "🩺 Vérification du statut des conteneurs..."
sleep 3
docker compose ps
