#!/bin/sh
# Prepara o MinIO de teste (_standards/tooling.md §8.4): um bucket privado para
# dev e outro para a suíte (separados pelo mesmo motivo do DATABASE_URL), e um
# usuário de escopo mínimo para a aplicação. O root só existe para este setup;
# a aplicação usa STORAGE_KEY/STORAGE_SECRET, nunca ele. Idempotente.
set -eu

: "${MINIO_ENDPOINT:=http://minio:9000}"

mc alias set local "$MINIO_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

resources=""
for bucket in "$STORAGE_BUCKET" "$STORAGE_BUCKET-test"; do
  mc mb --ignore-existing "local/$bucket"
  mc anonymous set none "local/$bucket"
  resources="$resources\"arn:aws:s3:::$bucket/*\","
done
resources="${resources%,}"

cat > /tmp/app-policy.json <<JSON
{ "Version": "2012-10-17", "Statement": [{ "Effect": "Allow",
  "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:AbortMultipartUpload","s3:ListMultipartUploadParts"],
  "Resource": [$resources] }] }
JSON

mc admin policy create local app-rw /tmp/app-policy.json || true
mc admin user add local "$STORAGE_KEY" "$STORAGE_SECRET"
mc admin policy attach local app-rw --user "$STORAGE_KEY" || true
