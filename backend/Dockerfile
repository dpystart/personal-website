FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod ./
COPY main.go ./
RUN go build -o server .

FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Shanghai

WORKDIR /app
COPY --from=builder /app/server .

EXPOSE 3001

ENV SCRIPTS_DIR=/root/mydata/scripts
ENV PORT=3001

CMD ["./server"]
