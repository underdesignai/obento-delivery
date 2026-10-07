FROM node:22-slim

WORKDIR /app

# Install openssl for Prisma engines
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3640
EXPOSE 3640

CMD ["npm", "run", "start"]
