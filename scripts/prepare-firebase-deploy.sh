#!/bin/bash
# Script to prepare Firebase deployment by bundling workspace packages

set -e

echo "🔨 Building Next.js app..."
cd apps/web
yarn build
cd ../..

echo "📦 Bundling workspace packages..."
# Copy contracts package
mkdir -p .firebase/fledgely/functions/packages/contracts
cp -r packages/contracts/src .firebase/fledgely/functions/packages/contracts/
cp packages/contracts/package.json .firebase/fledgely/functions/packages/contracts/

# Copy shared package
mkdir -p .firebase/fledgely/functions/packages/shared
cp -r packages/shared/src .firebase/fledgely/functions/packages/shared/
cp packages/shared/package.json .firebase/fledgely/functions/packages/shared/

echo "📝 Updating package.json references..."
# Update package.json to use relative paths
cd .firebase/fledgely/functions
sed -i '' 's|file:../../packages/contracts|file:./packages/contracts|g' package.json
sed -i '' 's|file:../../packages/shared|file:./packages/shared|g' package.json

# Generate package-lock.json with npm
npm install --package-lock-only

echo "✅ Firebase deployment bundle prepared!"
