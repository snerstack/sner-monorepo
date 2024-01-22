FROM python:3.11-bookworm as base

RUN apt-get update && apt-get install -y git sudo make gcc libpq-dev python3-dev python3-venv python3-pip unzip libmagic-dev postgresql-client

WORKDIR /opt/sner/server

COPY . .

RUN pip install -U pip && pip install -r requirements.lock

RUN mkdir /var/lib/sner

FROM base AS dev

RUN cp sner-docker-dev-config.yaml /etc/sner.yaml

CMD bin/server dbx remove && bin/server dbx init && bin/server dbx init-data && bin/server auth add-user --password password --roles user,operator,agent,admin user user@example.com && bin/server run --debug

FROM base AS prod

COPY /etc/sner.yaml /etc/sner.yaml

CMD bin/server run --host 0.0.0.0