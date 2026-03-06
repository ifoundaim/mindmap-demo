FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server/src ./server/src

ENV NODE_ENV=production
ENV MCP_HTTP_PORT=8080

EXPOSE 8080

CMD ["node", "server/src/mcp/httpServer.js"]
