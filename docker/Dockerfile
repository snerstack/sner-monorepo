FROM node:21-bookworm AS frontend

WORKDIR /opt/sner
COPY frontend /opt/sner/frontend

WORKDIR /opt/sner/frontend
RUN npm install
RUN npm run build


FROM debian:bookworm-slim AS server

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    python3 \
	python3-dev \
    python3-magic \
	python3-pip \
	python3-venv \
	vim

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    gcc \
    git \
    libpq-dev \
    postgresql-client \
    unzip

WORKDIR /opt/sner
COPY server /opt/sner/server
COPY docker/sner-server /usr/local/bin/sner-server
RUN mkdir -p frontend/dist
COPY --from=frontend /opt/sner/frontend/dist frontend/dist

WORKDIR /opt/sner/server
RUN python3 -m venv venv && venv/bin/pip install -r requirements.lock

COPY docker/entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
