# One image, three roles. The command picks the role:
#   node src/api.js | node src/worker.js | node src/loadgen.js

# Stage 1: install the production dependencies. npm is needed only here
FROM node:22-alpine AS deps
WORKDIR /app
# Dependencies first, so this layer is reused when only the code changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: the image that runs. No npm: it is not used at run time, and it
# brought every HIGH finding of the image scan (see the Docker page in the guide)
FROM node:22-alpine
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
WORKDIR /app
ENV NODE_ENV=production
# kafkajs prints a notice about its default partitioner on every start
ENV KAFKAJS_NO_PARTITIONER_WARNING=1

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

USER node
EXPOSE 8080
CMD ["node", "src/api.js"]
