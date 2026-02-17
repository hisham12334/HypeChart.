# ---------- Base ----------
FROM node:20-bookworm-slim AS base
WORKDIR /app

RUN apt-get update && apt-get install -y openssl

RUN npm install -g pnpm@9.15.2


# ---------- Dependencies ----------
FROM base AS deps

COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile


# ---------- Builder ----------
FROM deps AS builder
ARG APP_NAME

# Generate Prisma Client
RUN pnpm --filter @brand-order-system/database generate

# Build selected app
RUN pnpm --filter ${APP_NAME} build


# ---------- Runner ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y openssl

RUN npm install -g pnpm@9.15.2

ARG APP_NAME

COPY --from=builder /app .

WORKDIR /app/apps/${APP_NAME}

EXPOSE 3000

CMD ["pnpm", "start"]

