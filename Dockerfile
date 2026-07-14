# --- Frontend build ---
FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json components.json tailwind.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# --- Server build ---
FROM node:22-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

# --- Runtime ---
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=server-build /app/server/dist ./dist
COPY server/drizzle ./drizzle
COPY --from=frontend /app/dist /app/client
ENV STATIC_DIR=/app/client
ENV PORT=3001
EXPOSE 3001

# Release step (run once per deploy, before starting the app):
#   node dist/db/migrate.js
CMD ["node", "dist/index.js"]
