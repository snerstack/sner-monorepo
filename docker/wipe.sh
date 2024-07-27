#!bin/sh

docker-compose down
docker volume rm sner_dbdata
docker volume rm sner_vardata
