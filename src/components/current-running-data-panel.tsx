import { useEffect, useState } from "react";
import "../styles/current-running-data-panel.css";
import { useStore } from "../store";

export default function CurrentCraneRunningDataPanel() {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString());
  const currentOperationCraneId = useStore(
    (state) => state.currentOperationCraneId
  );
  const cranes = useStore((state) => state.cranes);
  const currentCrane = cranes.find((c) => c.id === currentOperationCraneId);

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
                <h4>{currentCrane?.workTime || "20分鐘"}</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#006cff" }}
                  ></i>
                  運行時長
                </span>
              </div>
              <div className="item">
                <h4>{currentCrane?.workerName || "鐘師傅"}</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#6acca3" }}
                  ></i>
                  作業人員
                </span>
              </div>
              <div className="item">
                <h4>{currentCrane?.name || "TC1"}</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#6acca3" }}
                  ></i>
                  天秤编号
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
