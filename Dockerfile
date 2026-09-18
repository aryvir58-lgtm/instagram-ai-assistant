FROM node:lts-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY schema.prisma ./
RUN npm install --include=dev

COPY . .

RUN npx prisma generate --schema=./schema.prisma
RUN npm run build
RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
