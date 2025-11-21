# Docker 部署指南

## 快速开始

### 方法 1: 使用启动脚本 (最简单)

```bash
# 首次启动或重新构建
./docker-start.sh

# 停止容器
./docker-stop.sh
```

### 方法 2: 使用 Docker Compose (推荐)

```bash
# 构建并启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止容器
docker-compose down
```

### 方法 2: 使用 Docker 命令

```bash
# 构建镜像
docker build -t towercrane-3dview .

# 运行容器（带 public 目录映射）
docker run -d \
  --name towercrane-3dview \
  -p 9999:9999 \
  -v $(pwd)/public:/app/public:ro \
  --restart unless-stopped \
  towercrane-3dview

# 查看日志
docker logs -f towercrane-3dview

# 停止容器
docker stop towercrane-3dview

# 删除容器
docker rm towercrane-3dview
```

## 访问应用

启动后，访问: `http://localhost:9999`

## 📁 文件管理 (PCD/模型/JSON)

### 目录映射

项目已配置 `public` 目录的 volume 映射，你可以直接在宿主机上管理文件：

```
宿主机目录          ->  容器内路径
./public/pcd/       ->  /app/public/pcd/
./public/model/     ->  /app/public/model/
./public/json/      ->  /app/public/json/
```

### 添加新文件

**无需重启容器！** 直接在宿主机操作：

```bash
# 添加 PCD 文件
cp your_file.pcd ./public/pcd/

# 添加模型文件
cp your_model.fbx ./public/model/

# 添加 JSON 文件
cp your_data.json ./public/json/
```

文件会立即在应用中可用，访问路径：
- PCD 文件: `http://localhost:9999/pcd/your_file.pcd`
- 模型文件: `http://localhost:9999/model/your_model.fbx`
- JSON 文件: `http://localhost:9999/json/your_data.json`

### 权限说明

默认配置为**只读模式** (`:ro`)，防止容器修改宿主机文件。如需容器内写入，修改 `docker-compose.yml`：

```yaml
volumes:
  - ./public:/app/public  # 移除 :ro 即可读写
```

## 网络配置说明

### TCP 服务器连接

项目需要连接到局域网内的 TCP 服务器 (`192.168.20.147:12345`)。

#### 在 Linux 上

如果需要访问宿主机局域网内的设备，可以使用 `host` 网络模式：

```bash
docker run -d \
  --name towercrane-3dview \
  --network host \
  -v $(pwd)/public:/app/public:ro \
  --restart unless-stopped \
  towercrane-3dview
```

或修改 `docker-compose.yml`：

```yaml
services:
  towercrane-3dview:
    network_mode: "host"
```

#### 在 Mac/Windows 上

Docker Desktop 的 `host` 网络模式支持有限，建议：

1. **使用桥接网络** (默认配置)
2. **修改 TCP_HOST**: 如果 TCP 服务器在宿主机上，使用 `host.docker.internal`
3. **使用宿主机 IP**: 直接使用宿主机的局域网 IP 地址

## 环境变量配置

如果需要修改 TCP 服务器地址，可以通过环境变量：

### Docker Compose

编辑 `docker-compose.yml`:

```yaml
services:
  towercrane-3dview:
    environment:
      - TCP_HOST=192.168.20.147
      - TCP_PORT=12345
```

### Docker 命令

```bash
docker run -d \
  --name towercrane-3dview \
  -p 9999:9999 \
  -v $(pwd)/public:/app/public:ro \
  -e TCP_HOST=192.168.20.147 \
  -e TCP_PORT=12345 \
  towercrane-3dview
```

**注意**: 当前 `index.js` 中 TCP 配置是硬编码的。如需使用环境变量，需要修改代码：

```javascript
const TCP_HOST = process.env.TCP_HOST || "192.168.20.147";
const TCP_PORT = parseInt(process.env.TCP_PORT) || 12345;
```

## 常用命令

```bash
# 重新构建镜像
docker-compose build

# 强制重新构建并启动
docker-compose up -d --build

# 查看容器状态
docker-compose ps

# 进入容器
docker exec -it towercrane-3dview sh

# 查看实时日志
docker-compose logs -f

# 清理所有资源
docker-compose down -v
```

## 生产部署建议

1. **使用环境变量管理配置**
2. **配置日志持久化**
3. **设置资源限制**
4. **使用健康检查**

示例 `docker-compose.yml`:

```yaml
services:
  towercrane-3dview:
    build: .
    container_name: towercrane-3dview
    ports:
      - "9999:9999"
    environment:
      - NODE_ENV=production
      - TCP_HOST=${TCP_HOST:-192.168.20.147}
      - TCP_PORT=${TCP_PORT:-12345}
    volumes:
      - ./public:/app/public:ro
    restart: unless-stopped
    # 资源限制
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    # 健康检查
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:9999"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker logs towercrane-3dview

# 检查构建过程
docker-compose build --no-cache
```

### 无法连接 TCP 服务器

1. 检查 TCP 服务器是否运行
2. 确认容器网络配置
3. 检查防火墙规则

### 端口被占用

```bash
# 修改 docker-compose.yml 中的端口映射
ports:
  - "8080:9999"  # 将宿主机端口改为 8080
```

