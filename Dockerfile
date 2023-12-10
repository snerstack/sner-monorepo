FROM debian:bullseye

RUN apt-get update && apt-get install -y git sudo make gcc libpq-dev python3-dev python3-venv unzip libmagic-dev postgresql-client

WORKDIR /opt/sner4

COPY . .

RUN python3 -m venv venv && . venv/bin/activate && pip install -U pip && pip install -r requirements.lock

RUN mkdir /var/lib/sner

RUN cp -vn sner-docker-config.yaml /etc/sner.yaml

CMD . venv/bin/activate && bin/server dbx remove && bin/server dbx init && bin/server dbx init-data && bin/server run