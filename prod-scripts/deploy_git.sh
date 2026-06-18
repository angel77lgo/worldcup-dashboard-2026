#!/bin/bash
set -e

# Valores por defecto
APP=""
BRANCH=""

# Parsear argumentos
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --app) APP="$2"; shift ;;
        --branch) BRANCH="$2"; shift ;;
        *) echo "Uso: $0 --app <web|api|dashboard> [--branch <nombre_rama>]"; exit 1 ;;
    esac
    shift
done

if [ -z "$APP" ]; then
    echo "Error: El parámetro --app <web|api|dashboard> es obligatorio."
    exit 1
fi

if [ "$APP" != "web" ] && [ "$APP" != "api" ] && [ "$APP" != "dashboard" ]; then
    echo "Error: El parámetro --app debe ser 'web', 'api' o 'dashboard'."
    exit 1
fi

SOURCE_DIR="/root/source/medical-$APP"
TARGET_DIR="/app/medical-$APP"

if [ "$APP" = "dashboard" ]; then
    SOURCE_DIR="/root/source/worldcup-dashboard"
    TARGET_DIR="/app/worldcup-dashboard"
fi

echo "🟢 1. Accediendo al repositorio en $SOURCE_DIR..."
cd "$SOURCE_DIR"

# Si se especificó una rama, cambiar a ella
if [ -n "$BRANCH" ]; then
    echo "🟢 2. Cambiando a la rama '$BRANCH'..."
    git fetch origin
    git checkout "$BRANCH"
else
    # Si no, usar la rama activa actual
    BRANCH=$(git branch --show-current)
    echo "🟢 2. Usando la rama activa actual: '$BRANCH'..."
fi

echo "🟢 3. Descargando los últimos cambios desde GitHub..."
git pull origin "$BRANCH"

echo "🟢 4. Sincronizando los cambios hacia la carpeta de producción en /app..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '.next' \
  --exclude 'uploads' \
  --exclude '.env' \
  --exclude '.env.*' \
  "$SOURCE_DIR/" "$TARGET_DIR/"

echo "🟢 5. Reconstruyendo y levantando el contenedor de Docker para: $APP..."
cd /app
docker compose -f docker-compose.prod.yml up -d --build "$APP"

APP_NAME="medical-$APP"
if [ "$APP" = "dashboard" ]; then
    APP_NAME="worldcup-dashboard"
fi
echo "🚀 ¡Despliegue directo desde Git completado con éxito para $APP_NAME (Rama: $BRANCH)!"
