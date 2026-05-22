FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN mkdir -p src/rag/documents tmp

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist

# Copy OSHA PDF if it exists
COPY src/rag/documents ./src/rag/documents

EXPOSE 3002

CMD ["node", "dist/index.js"]
