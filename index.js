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

try {
  const jsonFilePath = path.join(__dirname, '/public/json/index.json');
  const jsonFileData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
  jsonData = {
    ...jsonData,
    ...jsonFileData,
  };
} catch (error) {
  console.error('can not read json file:', error);
  process.exit(1);
}

// TCP 服务器配置
const TCP_HOST = jsonData.tcp_server_host;
const TCP_PORT = jsonData.tcp_server_port;

// 配置CORS
app.use(cors({
  origin: [
    `http://${host}:${serverPort}`,
  ],
  methods: ["GET", "POST"],
  credentials: true
}));

// 托管静态文件 - 服务 dist 文件夹
app.use(express.static(path.join(__dirname, '/dist')));

// 托管 PCD 文件目录
app.use('/pcd', express.static(path.join(__dirname, '/public/pcd')));

// 托管模型文件目录
app.use('/model', express.static(path.join(__dirname, '/public/model')));

// 托管 JSON 文件目录
app.use('/json', express.static(path.join(__dirname, '/public/json')));

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
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!isShuttingDown) {
          console.log('🔄 尝试重新连接 TCP 服务器...');
          connectToTcpServer();
        }
      }, 5000);
    }
  });
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
    server.listen(serverPort, '0.0.0.0', () => {
      console.log(`🚀 WebSocket 服务器运行在端口 ${serverPort} (所有网络接口)`);
      console.log(`📡 Web 界面访问: http://${host}:${serverPort}`);
      
      // 启动后立即连接 TCP 服务器
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

