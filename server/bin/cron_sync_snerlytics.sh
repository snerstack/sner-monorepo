#!/bin/sh
# snerlytics cron helper with mutex, signal handling, and error messages

LOCKFILE="/tmp/cron_sync_snerlytics.lock"
if [ -e "$LOCKFILE" ]; then
    echo "ERROR: Script is already running. Exiting."
    exit 1
fi
if ! touch "$LOCKFILE"; then
    echo "ERROR: Could not create lock file. Exiting."
    exit 1
fi
trap 'rm -f "$LOCKFILE"' INT TERM EXIT

/opt/sner/server/venv/bin/python /opt/sner/server/bin/server storage rebuild-vulnsearch-localdb
/opt/sner/server/venv/bin/python /opt/sner/server/bin/server storage rebuild-vulnsearch-elastic

rm -f "$LOCKFILE"
