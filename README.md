# Sner frontend

Modern web frontend for [sner4](https://github.com/bodik/sner4) written in React Typescript, built with Vite.

## Installation

Project requires nodejs version 18 and higher.

```
apt-get -y install git nodejs npm node-typescript
git clone https://github.com/Filiq/sner-frontend /opt/sner-frontend
cd /opt/sner-frontend
npm install
```

## Public Enviroment variables

You can edit enviroment variables in `.env.development` or `.env` for production. Especially the server URL for sner backend can be changed.

## Development

### Start dev server

`npm run dev`

### Run tests

```
npm run lint
npm run test
```

## Build

`npm run build`
