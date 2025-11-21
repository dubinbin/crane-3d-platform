#!/bin/bash

echo "🚀 启动 TowerCrane 3D View Docker 容器"
echo "========================================="

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker 未运行，请先启动 Docker"
  exit 1
fi

# 检查 public 目录是否存在
if [ ! -d "./public" ]; then
  echo "⚠️  public 目录不存在，正在创建..."
  mkdir -p ./public/{pcd,model,json}
  echo "✅ 已创建 public 目录结构"
fi

# 停止并移除旧容器（如果存在）
if [ "$(docker ps -aq -f name=towercrane-3dview)" ]; then
  echo "🔄 发现已存在的容器，正在停止..."
  docker-compose down
fi

# 构建并启动容器
echo "📦 构建并启动容器..."
docker-compose up -d --build

# 等待容器启动
sleep 3

# 检查容器状态
if [ "$(docker ps -q -f name=towercrane-3dview)" ]; then
  echo ""
  echo "✅ 容器启动成功！"
  echo ""
  echo "📊 访问地址: http://localhost:9999"
  echo "📁 Public 目录: $(pwd)/public"
  echo ""
  echo "📝 查看日志: docker-compose logs -f"
  echo "🛑 停止容器: docker-compose down"
  echo ""
  echo "💡 提示: 你可以直接在 ./public 目录下添加 PCD/模型/JSON 文件，无需重启容器"
else
  echo ""
  echo "❌ 容器启动失败，请查看日志:"
  echo "   docker-compose logs"
fi

