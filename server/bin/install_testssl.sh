#!/bin/sh

git clone --depth 1 --branch v3.2rc3 https://github.com/drwetter/testssl.sh.git /opt/testssl.sh
ln -sf /opt/testssl.sh/testssl.sh /usr/local/bin/testssl.sh

# required by testssl
apt-get install -y bind9-dnsutils bsdextrautils ldnsutils socat

# required by parser
apt-get install -y openssl
