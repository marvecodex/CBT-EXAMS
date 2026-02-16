FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 4000
CMD ["sh", "-c", "node src/utils/migrate.js && node src/utils/seed.js && node src/server.js"]
