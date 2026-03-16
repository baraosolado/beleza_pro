#!/bin/sh
set -e
echo "Rodando migrations..."
npx prisma migrate deploy --schema=src/db/prisma/schema.prisma
echo "Migrations concluídas. Subindo servidor..."
exec node dist/server.js
