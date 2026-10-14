# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Build source
COPY . .
RUN npm run build

# Stage 2: Serve with Caddy
FROM caddy:2-alpine

# Copy built assets
COPY --from=builder /app/dist /srv

# Copy custom Caddy configuration
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443
