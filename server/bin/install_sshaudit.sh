#!/bin/sh
set -e

mkdir /opt/ssh-audit
cd /opt/ssh-audit
python3 -m venv venv
venv/bin/pip install ssh-audit

ln -sf /opt/ssh-audit/venv/bin/ssh-audit /usr/local/bin/ssh-audit
