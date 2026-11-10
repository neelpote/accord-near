FROM node:24.22.2-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
ENV BIND_HOST=0.0.0.0
EXPOSE 4000 4001
CMD ["npm", "run", "near:start"]
