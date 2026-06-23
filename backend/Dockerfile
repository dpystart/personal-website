FROM golang:1.22-alpine AS builder

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

WORKDIR /app
COPY go.mod ./
COPY main.go ./

ENV GOPROXY=https://goproxy.cn,direct
RUN go build -o server .

FROM alpine:latest

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Shanghai

WORKDIR /app
COPY --from=builder /app/server .

EXPOSE 3001

ENV SCRIPTS_DIR=/root/mydata/scripts
ENV PORT=3001

CMD ["./server"]
