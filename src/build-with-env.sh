#!/bin/bash

# Load environment variables from .env
if [ ! -f .env ]; then
  echo ".env file not found!"
  exit 1
fi

# Export variables from .env
export $(grep -v '^#' .env | xargs)

# Build the Docker image with build arguments
docker build \
  --build-arg NODE_ENV=$NODE_ENV \
  --build-arg APP_ENV=$APP_ENV \
  --build-arg PLATFORM_API_URL=$PLATFORM_API_URL \
  --build-arg MONGODB_DATABASE_NAME=$MONGODB_DATABASE_NAME \
  --build-arg MONGODB_USERNAME=$MONGODB_USERNAME \
  --build-arg MONGODB_PASSWORD=$MONGODB_PASSWORD \
  -t ecomerce-backend:latest .

# Optional: echo what got passed in
echo "Build complete with:"
echo "NODE_ENV=$NODE_ENV"
echo "NODE_ENV=$NODE_ENV"
echo "APP_ENV=$APP_ENV"
echo "PLATFORM_API_URL=$PLATFORM_API_URL"
