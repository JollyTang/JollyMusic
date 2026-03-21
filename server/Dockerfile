FROM node:lts-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 7860

ENV PORT=7860

CMD ["node", "dist/index.js"]
