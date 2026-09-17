# =============================================================================
# Stage 1: Build
# =============================================================================
FROM oven/bun:1.3.10-debian AS builder

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production=false

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN bun run build

# =============================================================================
# Stage 2: Runtime
# =============================================================================
FROM oven/bun:1.3.10-slim-debian AS runtime

# Install dumb-init for proper signal handling, then remove the default bun user
# so we can create our own with a known UID/GID.
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/* && \
    userdel bun || true && \
    groupadd -r app && \
    useradd -r -g app -d /app -s /sbin/nologin app

WORKDIR /app

# Copy package manifests and install production-only dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production=true

# Copy the built output from the builder stage
COPY --from=builder /app/dist ./dist

# Ensure the app user owns everything under /app
RUN chown -R app:app /app

# Run as non-root user
USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "run", "src/index.ts"]
