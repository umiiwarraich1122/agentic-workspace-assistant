# ---- Stage 1: Build the React App ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_LIVEKIT_URL

RUN VITE_API_URL=$VITE_API_URL VITE_LIVEKIT_URL=$VITE_LIVEKIT_URL npm run build

# ---- Stage 2: Serve with Caddy ----
FROM caddy:2.7-alpine

# Copy the built React app from Stage 1
COPY --from=builder /app/dist /usr/share/caddy

# Copy our custom Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443
