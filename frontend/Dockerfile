FROM node:21-bookworm AS base

WORKDIR /opt/sner/frontend

COPY package.json .

RUN npm install

COPY . .

FROM base AS dev

CMD npm run dev -- --host

FROM base AS prod

RUN npm run build

CMD npm run preview


