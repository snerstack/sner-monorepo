FROM debian:bookworm-slim AS agent

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
    unzip \
    wget

WORKDIR /opt/sner
COPY server /opt/sner/server
COPY docker/agent/sner-agent /usr/local/bin/sner-agent

WORKDIR /opt/sner/server
RUN python3 -m venv venv && venv/bin/pip install -r requirements.lock

RUN sh bin/install_nmap.sh && \
    sh bin/install_ipv6toolkit.sh && \
    sh bin/install_jarm.sh && \
    sh bin/install_firefox.sh && \
    sh bin/install_testssl.sh && \
    sh bin/install_nuclei.sh && \
    sh bin/install_quicmap.sh && \
    sh bin/install_sshaudit.sh

ENTRYPOINT ["/usr/local/bin/sner-agent"]
