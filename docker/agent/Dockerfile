FROM debian:bookworm-slim AS agent

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
        wget

WORKDIR /opt/sner/server

# cache venv unless packages are changed
COPY server/requirements.lock ./
RUN python3 -m venv venv && venv/bin/pip install -r requirements.lock

COPY server/ ./

RUN sh bin/install_nmap.sh && \
    sh bin/install_ipv6toolkit.sh && \
    sh bin/install_jarm.sh && \
    sh bin/install_firefox.sh && \
    sh bin/install_testssl.sh && \
    sh bin/install_nuclei.sh && \
    sh bin/install_quicmap.sh && \
    sh bin/install_sshaudit.sh

RUN apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY docker/agent/sner-agent /usr/local/bin/sner-agent
RUN chmod +x /usr/local/bin/sner-agent
ENTRYPOINT ["/usr/local/bin/sner-agent"]
