#!/bin/sh

git clone https://github.com/bojanisc/quicmap.git /opt/quicmap
pip install -r /opt/quicmap/requirements.txt
sed -i '1s|^#!/usr/bin/env python$|#!/usr/bin/python3|' /opt/quicmap/quicmap.py
chmod +x /opt/quicmap/quicmap.py
ln -sf /opt/quicmap/quicmap.py /usr/local/bin/quicmap
