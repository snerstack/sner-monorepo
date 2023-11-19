FROM node:21-bookworm

WORKDIR /opt/sner-frontend

COPY package.json .

RUN npm install

COPY . .

RUN npm run build -- --mode testing

CMD npm run preview -- --port 18080
