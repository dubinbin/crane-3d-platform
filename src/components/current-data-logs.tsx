import { useMemo } from "react";
import "../styles/current-crane-logs.css";

// 故障类型定义
const FAULT_TYPES = [
  { code: "01", desc: "动臂无法抬起" },
  { code: "02", desc: "回转异常" },
  { code: "03", desc: "小车运行故障" },
  { code: "04", desc: "吊钩高度异常" },
  { code: "05", desc: "限位器失效" },
  { code: "06", desc: "电机过载" },
  { code: "07", desc: "传感器失灵" },
  { code: "08", desc: "液压系统故障" },
  { code: "09", desc: "控制系统异常" },
  { code: "10", desc: "安全装置报警" },
];

// 生成随机时间
const generateRandomDate = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(Math.floor(Math.random() * 60));
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

// 生成假数据
const generateFakeLogs = (count: number) => {
  return Array.from({ length: count }, (_, i) => {
    const fault = FAULT_TYPES[Math.floor(Math.random() * FAULT_TYPES.length)];
    return {
      id: i,
      time: generateRandomDate(30),
      type: fault.code,
      description: fault.desc,
    };
  });
};

export default function CurrentDataLogs() {
  // 生成足够多的日志数据用于循环滚动
  const logs = useMemo(() => generateFakeLogs(20), []);

  return (
    <div className="current-crane-main-wrapper">
      <div className="current-crane-logs">
        <p className="current-crane-logs-title">塔吊运行日志</p>

        <div className="current-crane-logs-wrapper">
          <div className="logs-scroll-content">
            {/* 第一组数据 */}
            {logs.map((log) => (
              <div key={`first-${log.id}`} className="logs-item">
                <p className="logs-item-title">故障时间</p>
                <p className="logs-item-content">{log.time}</p>
                <p className="logs-item-title">故障类型</p>
                <p className="logs-item-content">{log.type}</p>
                <p className="logs-item-title">故障描述</p>
                <p className="logs-item-content">{log.description}</p>
              </div>
            ))}
            {/* 复制一组数据用于无缝循环 */}
            {logs.map((log) => (
              <div key={`second-${log.id}`} className="logs-item">
                <p className="logs-item-title">故障时间</p>
                <p className="logs-item-content">{log.time}</p>
                <p className="logs-item-title">故障类型</p>
                <p className="logs-item-content">{log.type}</p>
                <p className="logs-item-title">故障描述</p>
                <p className="logs-item-content">{log.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
