FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY scripts ./scripts
COPY stickers ./stickers
COPY .env.example ./
RUN mkdir -p data personas
EXPOSE 8080
CMD ["node", "src/index.js"]
