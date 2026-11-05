#!/bin/sh
# Copy the series' shared cast and set into this part (HyperFrames only serves files inside the project).
cd "$(dirname "$0")/.." && mkdir -p assets/shared && cp ../shared/*.js assets/shared/ && echo "synced: $(ls assets/shared)"
