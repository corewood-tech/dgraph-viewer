FROM golang:1.22-alpine AS build

WORKDIR /src
COPY go.mod ./
COPY *.go ./
COPY static/ static/

RUN CGO_ENABLED=0 go build -ldflags='-s -w' -o /dgraph-viewer .

FROM alpine:3.20

COPY --from=build /dgraph-viewer /dgraph-viewer

ENV DGRAPH_HTTP=http://localhost:28028
EXPOSE 18080

ENTRYPOINT ["/dgraph-viewer"]
