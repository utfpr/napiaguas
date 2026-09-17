#!/bin/bash
set -euo pipefail

VERSION="${1:-latest}"
PLATFORM="${PLATFORM:-linux/amd64}"

echo "Building frontend image (tag: $VERSION, platform: $PLATFORM)..."
docker build --platform "$PLATFORM" -t "napiaguas-web:${VERSION}" -f deploy-files/Dockerfile.web .

echo "Building backend image (tag: $VERSION, platform: $PLATFORM)..."
docker build --platform "$PLATFORM" -t "napiaguas-api:${VERSION}" -f deploy-files/Dockerfile.api .

echo "Tagging images with latest..."
docker tag "napiaguas-web:${VERSION}" "napiaguas-web:latest"
docker tag "napiaguas-api:${VERSION}" "napiaguas-api:latest"

echo "Build completed: napiaguas-web:${VERSION}, napiaguas-api:${VERSION}"
