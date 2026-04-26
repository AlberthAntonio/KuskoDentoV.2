#!/bin/bash
set -e

echo -e "🚀 Despliegue con Prisma 6 (Estable)..."

# 1. Cargar .env
export $(grep -v '^#' .env | xargs)

# 2. Instalar versiones específicas
npm install @prisma/client@6.0.0 prisma@6.0.0 mysql2

# 3. Generar y Migrar
npx prisma generate
npx prisma migrate deploy

echo -e "🌱 Ejecutando Seed..."
DATABASE_URL="$DATABASE_URL" npx tsx prisma/seed.ts

echo -e "✅ ¡Despliegue completado con éxito!"
echo -e "Acceso: admin@demo.com / Admin12345"