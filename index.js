import express from "express";
import { Server as SocketIOServer } from "socket.io";
import http from "http";
import net from "net";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();

// 获取当前文件的目录路径 (ES6 模块中的 __dirname 替代方案)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建 HTTP 服务器
const server = http.createServer(app);

const host = "localhost";
const serverPort = 9999;

let jsonData = {
  tcp_server_host: "localhost",
  tcp_server_port: 9999,
};

// 读取配置文件的函数（每次调用都重新读取，避免缓存）
function loadConfigFromFile() {
  const defaultConfig = {
    tcp_server_host: "localhost",
    tcp_server_port: 9999,
  };
  
  const jsonFilePath = path.join(__dirname, '/public/json/index.json');
  try {
    if (fs.existsSync(jsonFilePath)) {
      // 每次读取都重新读取文件，不使用缓存
      const jsonFileData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
      return {
        ...defaultConfig,
        ...jsonFileData,
      };
    } else {
      console.warn('⚠️  配置文件不存在，使用默认配置:', jsonFilePath);
      return defaultConfig;
    }
  } catch (error) {
    console.error('❌ 读取配置文件失败:', error.message);
    return defaultConfig;
  }
}

// 初始化时读取一次配置
jsonData = loadConfigFromFile();
console.log('✅ 成功加载配置文件');

// TCP 服务器配置（会在服务器启动后通过 HTTP 接口重新获取最新配置）
let TCP_HOST = process.env.TCP_HOST || 
  (jsonData.tcp_server_host === 'localhost' ? 'host.docker.internal' : jsonData.tcp_server_host);
let TCP_PORT = process.env.TCP_PORT ? parseInt(process.env.TCP_PORT) : jsonData.tcp_server_port;

// 配置CORS
app.use(cors({
  origin: [
    `http://${host}:${serverPort}`,
  ],
  methods: ["GET", "POST"],
  credentials: true
}));

// 【重要】动态资源路由必须在 dist 静态文件之前配置
// 这样可以确保动态资源不会被 dist 目录中的旧文件覆盖

// API 接口：获取配置文件（每次请求都重新读取，避免缓存）
app.get('/api/config', (req, res) => {
  const config = loadConfigFromFile();
  // 设置无缓存响应头
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'application/json');
  res.json(config);
});

// 托管 JSON 文件目录（动态配置文件，优先级最高）
app.use('/json', express.static(path.join(__dirname, '/public/json')));

// 托管 PCD 文件目录（点云数据，动态更新）
app.use('/pcd', express.static(path.join(__dirname, '/public/pcd')));

// 托管模型文件目录（3D模型，动态更新）
app.use('/model', express.static(path.join(__dirname, '/public/model')));

// 托管静态文件 - 服务 dist 文件夹（打包的前端资源）
app.use(express.static(path.join(__dirname, '/dist')));

// 配置 Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      `http://${host}:${serverPort}`,
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// TCP 客户端连接
let tcpClient = null;
let tcpConnected = false;
let reconnectTimer = null;
let isShuttingDown = false;

// 通过 HTTP 接口获取最新配置（避免文件系统缓存）
async function fetchConfigFromAPI() {
  try {
    const response = await fetch(`http://${host}:${serverPort}/api/config`);
    if (response.ok) {
      const config = await response.json();
      console.log('🔍 获取到的配置:', JSON.stringify(config, null, 2));
      console.log('✅ 通过 API 获取最新配置');
      return config;
    } else {
      console.warn('⚠️  API 获取配置失败，使用已加载的配置');
      return jsonData;
    }
  } catch (error) {
    console.warn('⚠️  API 获取配置失败:', error.message, '，使用已加载的配置');
    return jsonData;
  }
}

// 连接到 TCP 服务器
function connectToTcpServer() {
  if (tcpClient) {
    tcpClient.destroy();
  }

  console.log(`正在连接到 TCP 服务器 ${TCP_HOST}:${TCP_PORT}...`);
  
  tcpClient = new net.Socket();
  // 不设置 encoding，保持二进制数据格式（Buffer）

  tcpClient.connect(TCP_PORT, TCP_HOST, () => {
    tcpConnected = true;
    console.log(`✅ 已连接到 TCP 服务器 ${TCP_HOST}:${TCP_PORT}`);
    
    // 通知所有 WebSocket 客户端 TCP 连接状态
    io.emit('tcp-status', { connected: true });
  });

  // 接收 TCP 数据，转发给所有 WebSocket 客户端
  tcpClient.on('data', (data) => {
    console.log('📥 TCP -> WebSocket: [二进制数据]', data.length, 'bytes');
    // 直接发送 Buffer，Socket.IO 会自动转换为 ArrayBuffer 发送到浏览器
    io.emit('server-msg', data);
  });

  tcpClient.on('error', (err) => {
    console.error('❌ TCP 连接错误:', err.message);
    tcpConnected = false;
    io.emit('tcp-status', { connected: false, error: err.message });
  });

  tcpClient.on('close', () => {
    console.log('🔌 TCP 连接已关闭');
    tcpConnected = false;
    io.emit('tcp-status', { connected: false });
    
    // 5秒后自动重连（只在非关闭状态下重连）
    if (!reconnectTimer && !isShuttingDown) {
      reconnectTimer = setTimeout(async () => {
        reconnectTimer = null;
        if (!isShuttingDown) {
          console.log('🔄 尝试重新连接 TCP 服务器...');
          // 重连前先获取最新配置
          const latestConfig = await fetchConfigFromAPI();
          updateTcpConfig(latestConfig);
          connectToTcpServer();
        }
      }, 5000);
    }
  });
}

// 更新 TCP 配置
function updateTcpConfig(config) {
  jsonData = config;
  TCP_HOST = process.env.TCP_HOST || 
    (config.tcp_server_host === 'localhost' ? 'host.docker.internal' : config.tcp_server_host);
  TCP_PORT = process.env.TCP_PORT ? parseInt(process.env.TCP_PORT) : config.tcp_server_port;
  console.log(`📝 更新 TCP 配置: ${TCP_HOST}:${TCP_PORT}`);
}

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log('🌐 WebSocket 客户端已连接:', socket.id);
  
  // 发送当前 TCP 连接状态
  socket.emit('tcp-status', { connected: tcpConnected });

  // 接收 WebSocket 消息，转发到 TCP 服务器
  socket.on('client-msg', (data) => {
    const dataType = Buffer.isBuffer(data) ? 'Buffer' : typeof data;
    const dataSize = Buffer.isBuffer(data) ? data.length : (typeof data === 'string' ? data.length : 'N/A');
    console.log(`📤 WebSocket -> TCP: [${dataType}] ${dataSize} bytes`);
    
    if (tcpConnected && tcpClient) {
      // 确保数据是 Buffer 格式
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      tcpClient.write(buffer);
    } else {
      console.warn('⚠️  TCP 未连接，无法发送消息');
      socket.emit('error', { message: 'TCP server not connected' });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 WebSocket 客户端断开:', socket.id);
  });
});

// SPA 路由支持
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/dist/index.html'));
});

// 处理其他页面路由（排除静态文件路径和 socket.io）
app.get(/^\/(?!(socket\.io|pcd|model|json)\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '/dist/index.html'));
});

// 启动服务器
async function start() {
  try {
    server.listen(serverPort, '0.0.0.0', async () => {
      console.log(`🚀 WebSocket 服务器运行在端口 ${serverPort} (所有网络接口)`);
      console.log(`📡 Web 界面访问: http://${host}:${serverPort}`);
      
      // 服务器启动后，通过 HTTP 接口获取最新配置（避免文件系统缓存）
      const latestConfig = await fetchConfigFromAPI();
      updateTcpConfig(latestConfig);
      
      // 使用最新配置连接 TCP 服务器
      connectToTcpServer();
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 优雅退出
function shutdown() {
  if (isShuttingDown) {
    console.log('⚠️  强制退出...');
    process.exit(1);
  }
  
  isShuttingDown = true;
  console.log('\n🛑 正在关闭服务器...');
  
  // 清除重连定时器
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  // 关闭 TCP 连接
  if (tcpClient) {
    tcpClient.removeAllListeners('close'); // 移除 close 监听器，防止触发重连
    tcpClient.destroy();
    console.log('✅ TCP 连接已关闭');
  }
  
  // 关闭所有 Socket.IO 连接
  io.close(() => {
    console.log('✅ Socket.IO 已关闭');
    
    // 关闭 HTTP 服务器
    server.close(() => {
      console.log('✅ HTTP 服务器已关闭');
      process.exit(0);
    });
    
    // 设置超时强制退出（防止服务器无法正常关闭）
    setTimeout(() => {
      console.log('⚠️  强制退出（超时）');
      process.exit(0);
    }, 3000);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();

