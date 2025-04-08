FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080 4000

CMD ["sh", "-c", "node server.js & node consumer.js"]