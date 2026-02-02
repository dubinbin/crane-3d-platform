import express from "express";
import { Server as SocketIOServer } from "socket.io";
import http from "http";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);
// 创建 HTTP 服务器
const server = http.createServer(app);

const host = "localhost";
const serverPort = 9999;

// 通过 HTTP 接口获取最新配置（避免文件系统缓存）
const config = {
    "tcp_server_host": "192.168.90.26",
    "tcp_server_port": 12345,
}

// TCP 服务器配置（会在服务器启动后通过 HTTP 接口重新获取最新配置）
let TCP_HOST = config.tcp_server_host;
let TCP_PORT = config.tcp_server_port;


// 托管静态文件 - 服务 dist 文件夹（打包的前端资源）
// 使用优化配置，这些文件通常不会变化
app.use(express.static(path.join(__dirname, '/dist'), {
  maxAge: 86400000, // 24小时缓存（前端资源通常带hash，可以长期缓存）
}));

// 配置 Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      `http://${host}:${serverPort}`,
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  // 确保二进制数据传输正常
  maxHttpBufferSize: 1e8, // 100MB，支持大文件传输
  pingTimeout: 60000, // 60秒 ping 超时
  pingInterval: 25000, // 25秒 ping 间隔
  // 允许二进制数据
  allowEIO3: true
});

// TCP 客户端连接
let tcpClient = null;
let tcpConnected = false;
let reconnectTimer = null;
let isShuttingDown = false;
let healthCheckTimer = null; // 健康检查定时器
let reconnectCount = 0; // 重连次数
let isReconnecting = false; // 是否正在重连
let heartbeatCount = 0; // 心跳计数器
let heartbeatTimer = null; // 心跳定时器
let lastDataTime = null; // 最后一次收到数据的时间

// 消息序列化函数（对应Flutter的Message.serialize）
function serializeMessage(userID, timeStamp, type, valueArray1, valueArray2) {
  const byteNumber = 40;
  const buffer = Buffer.alloc(byteNumber);
  
  // Offset 0: userID (uint8)
  buffer.writeUInt8(parseInt(userID), 0);
  
  // Offset 1-8: timeStamp (int64, little endian)
  buffer.writeBigInt64LE(BigInt(timeStamp), 1);
  
  // Offset 9: type (uint8)
  buffer.writeUInt8(type, 9);
  
  // Offset 10-15: valueArray1 (3 int16, little endian)
  for (let i = 0; i < 3; i++) {
    buffer.writeInt16LE(valueArray1[i], 10 + 2 * i);
  }
  
  // Offset 16-39: valueArray2 (3 float64, little endian)
  for (let i = 0; i < 3; i++) {
    buffer.writeDoubleLE(valueArray2[i], 16 + 8 * i);
  }
  
  return buffer;
}

// 清除健康检查定时器
function clearHealthCheck() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  lastDataTime = null;
}

// 清除心跳定时器
function clearHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  heartbeatCount = 0;
}


// 连接到 TCP 服务器
function connectToTcpServer() {
  // 如果正在重连，避免重复连接
  if (isReconnecting) {
    console.warn('⚠️  正在重连中，跳过重复连接请求');
    return;
  }
  
  isReconnecting = true;
  reconnectCount++;
  
  // 清理旧的连接和定时器
  if (tcpClient) {
    tcpClient.removeAllListeners(); // 移除所有事件监听器
    tcpClient.destroy();
    tcpClient = null;
  }
  clearHealthCheck();
  clearHeartbeat();
  
  // 清除重连定时器
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  console.log(`正在连接到 TCP 服务器 ${TCP_HOST}:${TCP_PORT}...`);
  
  tcpClient = new net.Socket();
  
  // 启用 TCP keep-alive，防止连接被静默关闭
  tcpClient.setKeepAlive(true, 10000); // 10秒后开始发送 keep-alive 探测包
  tcpClient.setNoDelay(true); // 禁用 Nagle 算法，减少延迟

  tcpClient.on('data', (chunk) => {
    io.volatile.emit('server-msg', chunk);
  });

  // 连接成功回调
  tcpClient.connect(TCP_PORT, TCP_HOST, () => {
    tcpConnected = true;
    isReconnecting = false; // 重置重连状态
    reconnectCount = 0; // 重置重连计数
    lastDataTime = Date.now(); // 初始化最后接收数据时间
    console.log(`✅ 已连接到 TCP 服务器 ${TCP_HOST}:${TCP_PORT}`);
    console.log(`   连接详情: local=${tcpClient.localAddress}:${tcpClient.localPort}, remote=${tcpClient.remoteAddress}:${tcpClient.remotePort}`);
    console.log(`   Socket 状态: readable=${tcpClient.readable}, writable=${tcpClient.writable}`);
    console.log(`   缓冲区状态: readableLength=${tcpClient.readableLength || 0} bytes`);
  });

  function heartbeat() {
    if (!tcpConnected || !tcpClient) {
      return;
    }
    
    heartbeatCount++;
    const timeStamp = Date.now();
    // SendCmdType.heartbeat - 需要根据实际值调整，这里假设为100，您可以根据实际情况修改
    const HEARTBEAT_TYPE = 100;
    
    // 创建心跳消息（对应Flutter的Message构造）
    const message = serializeMessage(
      "1",                    // userID
      timeStamp,              // timeStamp
      HEARTBEAT_TYPE,         // type (SendCmdType.heartbeat)
      [heartbeatCount, 0, 0], // valueArray1
      [0.0, 0.0, 0.0]         // valueArray2
    );
    
    // 发送到TCP服务器
    tcpClient.write(message);
    
    // 调试日志（低频输出）
    if (heartbeatCount % 10 === 0) {
      console.log(`💓 心跳发送: count=${heartbeatCount}, timestamp=${timeStamp}`);
    }
  }

 
  // 连接超时处理
  tcpClient.on('timeout', () => {
    console.error('❌ TCP 连接超时（30秒内未建立连接）');
    isReconnecting = false; // 重置重连状态
    clearHeartbeat(); // 清除心跳定时器
    tcpClient.destroy();
  });

  // 监听错误事件
  tcpClient.on('error', (err) => {
    console.error('❌ TCP 连接错误:', err.message);
    tcpConnected = false;
    clearHeartbeat(); // 清除心跳定时器
  });

  // 监听关闭事件
  tcpClient.on('close', (hadError) => {
    console.warn(`⚠️  TCP 连接已关闭${hadError ? ' (有错误)' : ''}`);
    tcpConnected = false;
    clearHeartbeat(); // 清除心跳定时器
    
    // 如果不是正在关闭服务器，尝试重连
    if (!isShuttingDown && !isReconnecting) {
      console.log('🔄 准备重连 TCP 服务器...');
      reconnectTimer = setTimeout(() => {
        connectToTcpServer();
      }, 3000); // 3秒后重连
    }
  });

  // 监听 end 事件（TCP 服务器关闭了写入端）
  tcpClient.on('end', () => {
    console.warn('⚠️  TCP 服务器关闭了写入端（发送了 FIN）');
    console.log('连接状态: readable=', tcpClient?.readable, ', writable=', tcpClient?.writable);
    clearHeartbeat(); // 清除心跳定时器
    // 当服务器关闭写入端时，我们也关闭读取端
    tcpClient.end();
  });

  tcpClient.on('connect', () => {
    console.log('TCP connected');
  
    // 强制 flowing（关键）
    tcpClient.resume();
  
    // 启动心跳定时器（每5秒发送一次心跳）
    clearHeartbeat();

    heartbeatTimer = setInterval(() => {
      heartbeat();
    }, 1500);
    
    // 立即发送一次心跳
    heartbeat();
  });

  // 监听 pause 和 resume 事件（流控制）
  tcpClient.on('pause', () => {
    console.warn('⏸️  TCP 流已暂停（可能因为缓冲区满）');
  });
}

// Socket.IO 连接处理
io.on('connection', (socket) => {
  const totalClients = io.sockets.sockets.size;
  console.log(`🌐 WebSocket 客户端已连接: ${socket.id} (总计: ${totalClients})`);
  
  // 发送当前 TCP 连接状态
  socket.emit('tcp-status', { connected: tcpConnected });
  
  // 监听客户端断开
  socket.on('disconnect', (reason) => {
    const remainingClients = io.sockets.sockets.size;
    console.log(`🔌 WebSocket 客户端断开: ${socket.id}, 原因: ${reason} (剩余: ${remainingClients})`);
  });

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
function start() {
  try {
    server.listen(serverPort, '0.0.0.0',  () => {
      console.log(`🚀 WebSocket 服务器运行在端口 ${serverPort} (所有网络接口)`);
      console.log(`📡 Web 界面访问: http://${host}:${serverPort}`);
    
      connectToTcpServer();

      connectToWebSocketServer();
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// WebSocket 客户端连接（连接到 9002 端口）
let wsClient = null;

function connectToWebSocketServer() {
  // 如果已经连接，先关闭旧连接
  if (wsClient) {
    wsClient.close();
    wsClient = null;
  }

  try {
    wsClient = new WebSocket(`ws://${TCP_HOST}:9002/`);
    
    wsClient.onopen = () => {
      console.log(`✅ WebSocket 客户端连接成功: ws://${TCP_HOST}:9002/`);
    };
    
    wsClient.onclose = (event) => {
      console.log(`❌ WebSocket 客户端连接断开: code=${event.code}, reason=${event.reason}`);
      wsClient = null;
      
      // 如果不是主动关闭，尝试重连
      if (!isShuttingDown && event.code !== 1000) {
        console.log('🔄 3秒后尝试重连 WebSocket 服务器...');
        setTimeout(() => {
          if (!isShuttingDown) {
            connectToWebSocketServer();
          }
        }, 3000);
      }
    };
    
    wsClient.onmessage = (event) => {
      console.log('📥 server-websocket-msg', event.data);
      // 将 Blob 转换为 ArrayBuffer 或直接传递
      if (event.data instanceof Blob) {
        event.data.arrayBuffer().then((buffer) => {
          io.volatile.emit('server-websocket-msg', buffer);
        });
      } else {
        io.volatile.emit('server-websocket-msg', event.data);
      }
    };
    
    wsClient.onerror = (error) => {
      console.error('❌ WebSocket 客户端连接错误:', error);
    };
  } catch (error) {
    console.error('❌ 创建 WebSocket 连接失败:', error);
    wsClient = null;
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
  
  // 清除健康检查定时器
  clearHealthCheck();
  
  // 清除心跳定时器
  clearHeartbeat();
  
  // 关闭 TCP 连接
  if (tcpClient) {
    tcpClient.removeAllListeners('close'); // 移除 close 监听器，防止触发重连
    tcpClient.destroy();
    console.log('✅ TCP 连接已关闭');
  }
  
  // 关闭 WebSocket 客户端连接
  if (wsClient) {
    wsClient.close(1000, 'Server shutting down');
    wsClient = null;
    console.log('✅ WebSocket 客户端连接已关闭');
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

