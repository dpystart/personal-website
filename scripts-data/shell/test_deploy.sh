#!/bin/bash
# 测试部署脚本
echo "Starting deployment..."
docker pull myapp:latest
docker-compose up -d
echo "Deploy complete!"
