# One image, three roles. The command picks the role:
#   node src/api.js | node src/worker.js | node src/loadgen.js
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
# kafkajs prints a notice about its default partitioner on every start
ENV KAFKAJS_NO_PARTITIONER_WARNING=1

# Dependencies first, so this layer is reused when only the code changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

USER node
EXPOSE 8080
CMD ["node", "src/api.js"]
