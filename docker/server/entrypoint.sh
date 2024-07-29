#!/bin/sh

if ! sner-server psql -Atc 'select * from alembic_version' 1>/dev/null 2>/dev/null; then
    echo "initializing database"
    sner-server dbx init
    sner-server dbx init-data
    sner-server db stamp head
    sner-server auth add-agent --apikey "$SNER_AGENT_APIKEY"
else
    echo "database already initialized"
fi

/opt/sner/server/venv/bin/gunicorn --bind '0.0.0.0:18000' --workers=5 'sner.server.app:create_app()' --access-logfile -
