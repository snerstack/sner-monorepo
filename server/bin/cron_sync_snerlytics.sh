#!/bin/sh
# snerlytics cron helper

/opt/sner/server/venv/bin/python /opt/sner/server/bin/server storage rebuild-elasticstorage
/opt/sner/server/venv/bin/python /opt/sner/server/bin/server storage rebuild-vulnsearch-localdb
/opt/sner/server/venv/bin/python /opt/sner/server/bin/server storage rebuild-vulnsearch-elastic
