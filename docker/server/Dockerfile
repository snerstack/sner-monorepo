# Stage 1: Build the frontend assets
FROM node:21-bookworm AS frontend
WORKDIR /opt/sner/frontend

# cache node_modules unless packages are changed
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Build the server
FROM debian:bookworm-slim AS server

RUN groupadd --system --gid 999 sner && \
    useradd --system --gid sner --uid 999 --no-create-home --home-dir /var/lib/sner --shell /bin/bash sner && \
    install --verbose --directory --owner sner --group sner --mode 0755 /var/lib/sner

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        gcc \
        git \
        iproute2 \
        libpq-dev \
        postgresql-client \
        python3 \
        python3-dev \
        python3-magic \
        python3-pip \
        python3-venv \
        unzip \
        vim \
        wget \
        && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /opt/sner/server

# cache venv unless packages are changed
COPY server/requirements.lock ./
RUN python3 -m venv venv && venv/bin/pip install -r requirements.lock

COPY server/ ./
RUN mkdir -p /opt/sner/frontend/dist
COPY --from=frontend /opt/sner/frontend/dist/ /opt/sner/frontend/dist/

COPY docker/server/sner-server /usr/local/bin/sner-server
RUN chmod +x /usr/local/bin/sner-server

COPY docker/server/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER sner
EXPOSE 18000
ENTRYPOINT ["/entrypoint.sh"]
