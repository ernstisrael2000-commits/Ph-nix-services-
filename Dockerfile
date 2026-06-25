FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Build frontend
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=base /app/dist ./dist
COPY --from=base /app/src ./src
COPY --from=base /app/server.ts ./server.ts
COPY --from=base /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=base /app/tsconfig.json ./tsconfig.json
COPY --from=base /app/tsconfig.server.json ./tsconfig.server.json

EXPOSE 5000

CMD ["npm", "start"]
