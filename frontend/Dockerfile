FROM node:21-bookworm AS base

WORKDIR /opt/sner-frontend

COPY package.json .

RUN npm install

COPY . .

FROM base AS dev

CMD npm run dev -- --host

FROM base AS testing

RUN npm run build -- --mode testing

CMD npm run preview

