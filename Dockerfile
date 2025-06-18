# Use official Node.js 18 image
FROM node:18

# Set working directory
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

# Pass args to environment variables
ENV NODE_ENV=${NODE_ENV}
ENV APP_ENV=${APP_ENV}
ENV PLATFORM_API_URL=${PLATFORM_API_URL}
ENV MONGODB_DATABASE_NAME=${MONGODB_DATABASE_NAME}
ENV MONGODB_USERNAME=${MONGODB_USERNAME}
ENV MONGODB_PASSWORD=${MONGODB_PASSWORD}

# Copy package info and install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy all other project files
COPY . .

# Ensure uploads and logs are writeable
RUN mkdir -p /app/uploads /app/log \
    && touch /app/log/.keep \
    && chown -R node:node /app/uploads /app/log

# Build the project (if applicable)
RUN yarn build

# Expose the backend port (ensure your app uses 8000)
EXPOSE 8000

# Run as non-root user
USER node

# Start the backend app
CMD ["npm", "start"]
