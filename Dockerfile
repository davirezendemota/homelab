FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY docker-entrypoint.dev.sh /usr/local/bin/docker-entrypoint.dev.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.dev.sh

ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_SOCKET=/var/run/docker.sock
ENV HOST_ROOT=/host
ENV DB_PATH=/app/data/homepage.db

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.dev.sh"]
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000", "--webpack"]
