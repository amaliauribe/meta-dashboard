#!/bin/bash
# Daily QS (Quality Score) capture for Google and Bing keywords

# Google QS Capture
curl -s -X POST http://localhost:3001/api/google/qs-capture \
  -H "Content-Type: application/json" \
  -d '{}' > /dev/null 2>&1

# Bing QS Capture  
curl -s -X POST http://localhost:3001/api/bing/qs-capture \
  -H "Content-Type: application/json" \
  -d '{}' > /dev/null 2>&1

echo "$(date): QS capture completed" >> /var/log/qs-capture.log
