# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/types/package*.json ./packages/types/
RUN npm ci --workspace=apps/api --workspace=packages/types --ignore-scripts

# Stage 2: builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run db:generate
RUN npm run build:api

# Stage 3: runner
# Usamos imagem Debian (node:20) em vez de alpine para garantir
# as dependências nativas necessárias do Prisma/OpenSSL.
FROM node:20 AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN useradd -m -u 1001 fastify
USER fastify

COPY --from=builder --chown=fastify:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/apps/api/package*.json ./
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/apps/api/src/db/prisma ./src/db/prisma
COPY --from=builder --chown=fastify:nodejs /app/packages/types ./packages/types
COPY --from=builder --chown=fastify:nodejs /app/apps/api/entrypoint.sh ./entrypoint.sh

EXPOSE 3001
CMD ["sh", "./entrypoint.sh"]
