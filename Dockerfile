FROM node:21-bookworm

WORKDIR /opt/sner-frontend

COPY package.json .

RUN npm install

COPY . .

RUN npm run build -- --mode development

CMD npm run preview
