# Sner monorepo

Assumes Debian 12 Bookworm.


## Installation

Not fully implemented yet

```
apt-get -y install git sudo make docker.io docker-compose
git clone https://github.com/snerstack/sner-monorepo.git /opt/sner
cd /opt/sner
make prod
```


## Development enviroment

```
# install
apt-get -y install git sudo make docker.io docker-compose nodejs npm screen
git clone https://github.com/snerstack/sner-monorepo.git /opt/sner
cd /opt/sner
git checkout devel
git remote set-url origin git@github.com:snerstack/sner-monorepo.git

# server
cd /opt/sner/server
make install
make install-dev
make install-db
. venv/bin/activate
make db
make lint coverage
make test-selenium
deactivate

# frontend
cd /opt/sner/frontend
npm install
npm run lint
npm run test

# run devservers
cd /opt/sner
make devservers
```

### Docker
```
make dev
```
