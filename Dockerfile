FROM node:18

WORKDIR /app

ENV PATH=/app/node_modules/.bin:$PATH

ARG NODE_ENV
ARG APP_ENV
ARG PLATFORM_API_URL
ARG MONGODB_DATABASE_NAME
ARG MONGODB_USERNAME
ARG MONGODB_PASSWORD

ENV NODE_ENV=$NODE_ENV
ENV APP_ENV=$APP_ENV
ENV PLATFORM_API_URL=$PLATFORM_API_URL
ENV MONGODB_DATABASE_NAME=$MONGODB_DATABASE_NAME
ENV MONGODB_USERNAME=$MONGODB_USERNAME
ENV MONGODB_PASSWORD=$MONGODB_PASSWORD

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

# ✅ Fix bad uploads/log issue
RUN rm -f /app/uploads /app/log && \
    mkdir -p /app/uploads /app/log && \
    touch /app/log/.keep && \
    chown -R node:node /app/uploads /app/log

RUN yarn build

EXPOSE 8000

CMD ["npm", "start"]
