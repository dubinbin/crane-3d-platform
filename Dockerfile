# 多阶段构建 Dockerfile

# 阶段 1: 构建前端
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies，用于构建）
RUN npm ci

# 复制源代码
COPY . .

# 构建前端项目
RUN npm run build

# 阶段 2: 生产环境
FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 只安装生产依赖
RUN npm ci --only=production

# 从构建阶段复制构建好的前端文件
COPY --from=builder /app/dist ./dist

# 复制服务器文件
COPY index.js ./

# 注意: public 目录通过 volume 挂载，不需要在镜像中复制
# 参考 docker-compose.yml 中的 volumes 配置

# 暴露端口
EXPOSE 9999

# 设置环境变量（可选）
ENV NODE_ENV=production

# 启动服务器
CMD ["node", "index.js"]

