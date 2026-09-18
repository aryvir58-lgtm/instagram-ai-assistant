FROM node:lts-alpine

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY package*.json ./
COPY schema.prisma ./
RUN npm install

COPY . .

RUN npx prisma generate --schema=./schema.prisma
RUN npm run build
RUN npm prune --omit=dev

EXPOSE 3000
CMD ["npm", "start"]
