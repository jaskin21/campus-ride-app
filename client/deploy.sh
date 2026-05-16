#!/bin/bash
echo "Building..."
npm run build

echo "Uploading to S3..."
aws s3 sync dist/ s3://campus-ride-app-frontend-dev --delete

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id E3Q12CI7ACHWXG --paths "/*"

echo "✅ Deploy complete!"