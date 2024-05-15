#!/bin/sh
set -e

git clone https://github.com/bojanisc/quicmap.git /opt/quicmap
cd /opt/quicmap
python3 -m venv venv
venv/bin/pip install -r requirements.txt

cat >>/usr/local/bin/quicmap <<__EOF__
#!/bin/sh
/opt/quicmap/venv/bin/python /opt/quicmap/quicmap.py "\$@"
__EOF__
chmod +x /usr/local/bin/quicmap
