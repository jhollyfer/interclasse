# Teste local e CI; nunca produção (_standards/tooling.md §8.4). O MinIO é
# compilado do código-fonte numa release fixa: o repositório comunitário só
# distribui código-fonte e a imagem `minio/minio` saiu do Docker Hub. O build
# precisa de proxy.golang.org, sum.golang.org e storage.googleapis.com.
FROM golang:1.24-alpine AS build
ARG MINIO_RELEASE=RELEASE.2025-10-15T17-29-55Z
ARG MC_RELEASE=RELEASE.2025-08-13T08-35-41Z
RUN apk add --no-cache git
ENV CGO_ENABLED=0
RUN git clone --depth 1 --branch "$MINIO_RELEASE" https://github.com/minio/minio /src/minio \
 && cd /src/minio && go build -trimpath -o /out/minio .
RUN git clone --depth 1 --branch "$MC_RELEASE" https://github.com/minio/mc /src/mc \
 && cd /src/mc && go build -trimpath -o /out/mc .

FROM alpine:3.22
COPY --from=build /out/minio /out/mc /usr/local/bin/
ENTRYPOINT ["minio"]
