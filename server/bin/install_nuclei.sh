#!/bin/sh

wget --no-verbose -O /tmp/nuclei.zip https://github.com/projectdiscovery/nuclei/releases/download/v3.6.2/nuclei_3.6.2_linux_amd64.zip
unzip /tmp/nuclei.zip -d /opt/nuclei
ln -sf /opt/nuclei/nuclei /usr/local/bin/nuclei
