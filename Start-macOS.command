#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then
  echo "Install Node.js 22 LTS, then run this launcher again."
  read -r
  exit 1
fi
open http://127.0.0.1:8787
node serve.cjs
