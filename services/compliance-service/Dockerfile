FROM node:22-alpine AS base

# Keep the runtime slim but include the common Node libraries this repo needs.
RUN apk add --no-cache ca-certificates libc6-compat openssl

WORKDIR /app
ENV CI=true

FROM base AS deps

# Native toolchain is only needed during dependency installation.
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY api-gateway/package.json ./api-gateway/package.json
COPY services/compliance-service/package.json ./services/compliance-service/package.json
COPY services/compliance-service/prisma ./services/compliance-service/prisma
COPY services/ai-worker/package.json ./services/ai-worker/package.json
COPY shared/package.json ./shared/package.json
COPY frontend/package.json ./frontend/package.json

RUN npm ci

FROM deps AS build

# Build from the repo root so the shared workspace is available.
COPY . .

RUN npm run build --workspace=shared
RUN npm run build --workspace=services/compliance-service
RUN npm prune --omit=dev && npm cache clean --force

FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared/package.json ./shared/package.json
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/services/compliance-service/package.json ./services/compliance-service/package.json
COPY --from=build /app/services/compliance-service/prisma ./services/compliance-service/prisma
COPY --from=build /app/services/compliance-service/dist ./services/compliance-service/dist

EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --schema services/compliance-service/prisma/schema.prisma && node services/compliance-service/dist/index.js"]
