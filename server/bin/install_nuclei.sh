#!/bin/sh

wget --no-verbose -O /tmp/nuclei.zip https://github.com/projectdiscovery/nuclei/releases/download/v3.3.4/nuclei_3.3.4_linux_amd64.zip
unzip /tmp/nuclei.zip -d /opt/nuclei
ln -sf /opt/nuclei/nuclei /usr/local/bin/nuclei
