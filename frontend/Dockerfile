# ---- Stage 1: Build the React App ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Accept build-time environment variables
ARG VITE_API_URL
ARG VITE_LIVEKIT_URL

# Build the production bundle with env vars injected at build time
RUN VITE_API_URL=$VITE_API_URL VITE_LIVEKIT_URL=$VITE_LIVEKIT_URL npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:1.25-alpine

# Copy the built React app from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom Nginx config (handles SPA routing)
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
