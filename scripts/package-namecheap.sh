#!/usr/bin/env bash
set -euo pipefail

# Build both sides and assemble the cPanel upload bundle.
# See docs/DEPLOY-NAMECHEAP.md for the full deployment steps.

cd "$(dirname "$0")/.."

npm run build
(cd server && npm run build)

rm -rf deploy/gitshipdone deploy/gitshipdone.zip
mkdir -p deploy/gitshipdone

cp -R server/dist deploy/gitshipdone/dist
find deploy/gitshipdone/dist -type d -name "__tests__" -exec rm -rf {} +
cp -R server/drizzle deploy/gitshipdone/drizzle
cp -R dist deploy/gitshipdone/client
cp server/package.json server/package-lock.json deploy/gitshipdone/

(cd deploy && zip -rq gitshipdone.zip gitshipdone)

echo "Bundle ready: deploy/gitshipdone.zip"
echo "Upload it to ~/gitshipdone on the server, extract, add .env, then follow docs/DEPLOY-NAMECHEAP.md"
