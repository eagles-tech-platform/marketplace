FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Local-mode uploads need somewhere to write — mounted as a volume in
# docker-compose so files survive container restarts.
RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "server.js"]
