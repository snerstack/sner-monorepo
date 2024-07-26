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
git clone git@github.com:snerstack/sner-monorepo.git /opt/sner
cd /opt/sner
git checkout devel

# frontend
cd /opt/sner/frontend
npm install
npm run test
npm run lint

# server
cd /opt/sner/server
make install
make install-dev
make install-db
. venv/bin/activate
make db
make coverage lint
make test-selenium
deactivate

# run devservers
cd /opt/sner
make devservers
```

### Docker
```
make dev
```

### Ports

* 18000 - flask dev server
* 18080 - vite dev server
* 18001 - gunicorn/flask prod server
* 18002 - flask test server
* 18082 - vite test server