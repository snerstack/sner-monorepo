#!/bin/sh

apt-get -y install gcc libpq-dev python3-dev unzip
apt-get -y install python3-venv
python3 -m venv venv
venv/bin/pip install -U pip
venv/bin/pip install -r requirements.lock
