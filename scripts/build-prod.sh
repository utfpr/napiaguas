#!/bin/bash
set -euo pipefail

VERSION="${1:-latest}"

echo "Building frontend image (tag: $VERSION)..."
docker build -t "napiaguas-web:${VERSION}" -f infrastructure/docker/Dockerfile.web .

echo "Building backend image (tag: $VERSION)..."
docker build -t "napiaguas-api:${VERSION}" -f infrastructure/docker/Dockerfile.api.prod .

echo "Tagging images with latest..."
docker tag "napiaguas-web:${VERSION}" "napiaguas-web:latest"
docker tag "napiaguas-api:${VERSION}" "napiaguas-api:latest"

echo "Build completed: napiaguas-web:${VERSION}, napiaguas-api:${VERSION}"
