# Minimal, non-root local price proxy.
FROM node:22-alpine
WORKDIR /app
COPY src ./src
COPY package.json ./
USER node
EXPOSE 8787
CMD ["node", "src/server.js"]
