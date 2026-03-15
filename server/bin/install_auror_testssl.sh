#!/bin/sh
set -e

git clone --depth 1 --branch v3.2rc4 https://github.com/drwetter/testssl.sh.git /opt/testssl.sh
ln -sf /opt/testssl.sh/testssl.sh /usr/local/bin/testssl.sh

# required by testssl
apt-get install -y bind9-dnsutils bsdextrautils ldnsutils procps socat

# required by parser
apt-get install -y openssl
