#!/bin/sh

if ! sner-server psql -Atc 'select * from alembic_version' 1>/dev/null 2>/dev/null; then
    echo "initializing database"
    sner-server dbx init
    sner-server dbx init-data
    sner-server db stamp head

    if [ ! -z "$SNER_ADMIN_PASSWORD" ]; then
        sner-server auth add-user admin admin@localhost --roles admin,operator,user --password "$SNER_ADMIN_PASSWORD"
    fi

    if [ ! -z "$SNER_AGENT_APIKEY" ]; then
        sner-server auth add-agent --apikey "$SNER_AGENT_APIKEY"
    fi
else
    echo "database already initialized"
fi

if [ -z "$SNER_SERVER_BIND" ]; then
    SNER_SERVER_BIND="0.0.0.0:18000"
fi

/opt/sner/server/venv/bin/gunicorn --bind "$SNER_SERVER_BIND" --workers=5 'sner.server.app:create_app()' --access-logfile -
