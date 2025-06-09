#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Create directories if they don't exist
mkdir -p "$SCRIPT_DIR/data"

docker run -d \
  --name earthquake-qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v "$SCRIPT_DIR/data":/qdrant/storage \
  -e QDRANT_ALLOW_RECOVERY=true \
  --restart unless-stopped \
  qdrant/qdrant
