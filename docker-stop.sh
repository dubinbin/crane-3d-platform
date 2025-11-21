#!/bin/bash

echo "🛑 停止 TowerCrane 3D View Docker 容器"
echo "========================================="

# 停止容器
docker-compose down

echo ""
echo "✅ 容器已停止"
echo ""
echo "💡 提示: public 目录中的文件已保留"
echo "🚀 重新启动: ./docker-start.sh 或 docker-compose up -d"

