# Sner monorepo

## Installation

### Development enviroment

```
apt-get -y install git sudo make docker docker-compose-plugin nodejs npm
git clone https://github.com/snerstack/sner-monorepo.git /opt/sner
cd /opt/sner
```

#### Using docker-compose

`make dev`

#### Manually

##### Frontend

```
cd frontend

# install dependencies
npm install

# run tests
npm run linst
npm run test

# run dev server
npm run dev
```

##### Server

```
cd server

make install
make install-extra
make install-db
. venv/bin/activate
make db

# run tests
make lint
make coverage
make test-extra

# run dev server
bin/server run
```

## Production

```
apt-get -y install git sudo make docker docker-compose-plugin nodejs npm
git clone https://github.com/snerstack/sner-monorepo.git /opt/sner
cd /opt/sner
```

### Using docker-compose

```
make prod
```
