FROM node:18

WORKDIR /app

# Add node_modules/.bin to PATH
ENV PATH=/app/node_modules/.bin:$PATH

# Build-time arguments
ARG NODE_ENV
ARG APP_ENV
ARG PLATFORM_API_URL
ARG MONGODB_DATABASE_NAME
ARG MONGODB_USERNAME
ARG MONGODB_PASSWORD

# Runtime environment
ENV NODE_ENV=${NODE_ENV}
ENV APP_ENV=${APP_ENV}
ENV PLATFORM_API_URL=${PLATFORM_API_URL}
ENV MONGODB_DATABASE_NAME=${MONGODB_DATABASE_NAME}
ENV MONGODB_USERNAME=${MONGODB_USERNAME}
ENV MONGODB_PASSWORD=${MONGODB_PASSWORD}

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy the rest of the codebase
COPY . .

# Fix permissions (only chown if needed)
RUN chown -R node:node /app/uploads /app/log || true

# Build app
RUN yarn build

EXPOSE 8000

USER node

CMD ["npm", "start"]
