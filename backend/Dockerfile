FROM node:24.22.2-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
ENV BIND_HOST=0.0.0.0
EXPOSE 4000 4001
CMD ["npm", "run", "near:start"]

FROM base AS hosted-api
CMD ["node", "--import", "tsx", "src/near/hosted-api.ts"]

FROM base AS hosted-worker
CMD ["node", "scripts/hosted-worker.mjs"]

FROM base AS local
