import { useEffect, useState } from "react";
import "../styles/current-running-data-panel.css";

export default function CurrentCraneRunningDataPanel() {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="current-crane-main-wrapper">
      <div className="current-crane-running-data">
        <div className="current-crane-running-data-wrapper">
          <div className="overview panel">
            <p className="current-time">{currentTime}</p>
            <div className="inner">
              <div className="item">
                <h4>12h</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#006cff" }}
                  ></i>
                  运行时长
                </span>
              </div>
              <div className="item">
                <h4>钟师傅</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#6acca3" }}
                  ></i>
                  操作人
                </span>
              </div>
              <div className="item">
                <h4>TC1</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#6acca3" }}
                  ></i>
                  塔吊编号
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
