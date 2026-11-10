FROM node:24.22.2-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG ACCORD_API_URL=http://api:4000
ENV ACCORD_API_URL=$ACCORD_API_URL
RUN npm run build
FROM node:24.22.2-bookworm-slim
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/public ./public
ENV ACCORD_API_URL=http://api:4000
EXPOSE 3000
CMD ["npm", "start"]
