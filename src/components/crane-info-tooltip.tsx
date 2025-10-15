import { useEffect, useState } from "react";
import { EventBus, EventName, type CraneClickedEvent } from "../utils/event";
import type { CraneInfo } from "../types";
import "../styles/crane-info-tooltip.css";
import { useStore } from "../store";

export default function CraneInfoTooltip() {
  const [selectedCrane, setSelectedCrane] = useState<CraneInfo | null>(null);
  const updateCurrentCrane = useStore((state) => state.updateCurrentCrane);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleCraneClick = (event: CraneClickedEvent) => {
      setSelectedCrane(event.crane);
      setPosition(event.screenPosition);
      setVisible(true);
      viewCurrentCraneInfo(event.crane);
    };

    EventBus.on(EventName.CRANE_CLICKED, handleCraneClick);

    return () => {
      EventBus.off(EventName.CRANE_CLICKED, handleCraneClick);
    };
  }, []);

  const viewCurrentCraneInfo = (crane: CraneInfo) => {
    updateCurrentCrane({
      craneId: crane.name,
      craneLoadHeight: crane.currentHookHeight,
      craneHookheight: crane.currentHookHeight,
      currentRotationAngle: crane.currentRotationAngle,
      currentCarDistance: crane.currentCarDistance,
      loadMatrix: 30,
      weight: 0.8,
      windSpeed: 3,
      swingWidth: 10,
      armInclinationAngle: 0,
      workTime: "12h",
      workerName: "钟师傅",
    });
  };

  const handleClose = () => {
    setVisible(false);
  };

  if (!visible || !selectedCrane) return null;

  return (
    <div
      className="crane-info-tooltip"
      style={{
        left: position.x + 10,
        top: position.y + 10,
      }}
    >
      <div className="crane-info-tooltip-header">
        <h4>{selectedCrane.name}</h4>
        <button onClick={handleClose} className="close-btn">
          ×
        </button>
      </div>

      <div className="crane-info-content">
        <div className="info-row">
          <span className="label">ID:</span>
          <span className="value">{selectedCrane.id}</span>
        </div>

        <div className="info-row">
          <span className="label">类型:</span>
          <span className="value">
            {selectedCrane.type === "boom" ? "动臂式" : "平头式"}
          </span>
        </div>

        <div className="info-row">
          <span className="label">Socket ID:</span>
          <span className="value">{selectedCrane.socketId}</span>
        </div>

        {selectedCrane.position && (
          <div className="info-row">
            <span className="label">位置:</span>
            <span className="value">
              X: {selectedCrane.position.x.toFixed(2)}, Y:{" "}
              {selectedCrane.position.y.toFixed(2)}, Z:{" "}
              {selectedCrane.position.z.toFixed(2)}
            </span>
          </div>
        )}

        <div className="info-row">
          <span className="label">半径:</span>
          <span className="value">{selectedCrane.radius}m</span>
        </div>

        <div className="info-row">
          <span className="label">高度:</span>
          <span className="value">{selectedCrane.height}m</span>
        </div>

        {selectedCrane.currentRotationAngle !== undefined && (
          <div className="info-row">
            <span className="label">回转角度:</span>
            <span className="value">
              {selectedCrane.currentRotationAngle.toFixed(0)}°
            </span>
          </div>
        )}

        {selectedCrane.currentArmPitchAngle !== undefined && (
          <div className="info-row">
            <span className="label">俯仰角度:</span>
            <span className="value">
              {selectedCrane.currentArmPitchAngle.toFixed(0)}°
            </span>
          </div>
        )}

        {selectedCrane.currentRopeLength !== undefined && (
          <div className="info-row">
            <span className="label">吊绳长度:</span>
            <span className="value">
              {selectedCrane.currentRopeLength.toFixed(2)}m
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
