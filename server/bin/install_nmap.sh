#!/bin/sh

apt-get -y install nmap
patch --directory=/usr/share/nmap -p1 < extra/nmap-serviceprobe-fix-php.patch
