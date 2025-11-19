import { useEffect, useState } from "react";
import { EventBus, EventName, type CraneClickedEvent } from "../utils/event";
import { CraneType } from "../types";
import "../styles/crane-info-tooltip.css";
import { useStore } from "../store";

export default function CraneInfoTooltip() {
  const currentOperationCraneId = useStore(
    (state) => state.currentOperationCraneId
  );
  const cranes = useStore((state) => state.cranes);
  const currentCrane = cranes.find((c) => c.id === currentOperationCraneId);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleCraneClick = (event: CraneClickedEvent) => {
      setPosition(event.screenPosition);
      setVisible(true);
      viewCurrentCraneInfo();
    };

    EventBus.on(EventName.CRANE_CLICKED, handleCraneClick);

    return () => {
      EventBus.off(EventName.CRANE_CLICKED, handleCraneClick);
    };
  }, []);

  const viewCurrentCraneInfo = () => {
    if (!currentCrane) return;
  };

  const handleClose = () => {
    setVisible(false);
  };

  if (!visible || !currentCrane) return null;

  return (
    <div
      className="crane-info-tooltip"
      style={{
        left: position.x + 10,
        top: position.y + 10,
      }}
    >
      <div className="crane-info-tooltip-header">
        <h4>{currentCrane.name}</h4>
        <button onClick={handleClose} className="close-btn">
          ×
        </button>
      </div>

      <div className="crane-info-content">
        <div className="info-row">
          <span className="label">ID:</span>
          <span className="value">{currentCrane.id}</span>
        </div>

        <div className="info-row">
          <span className="label">类型:</span>
          <span className="value">
            {currentCrane.type === CraneType.BOOM ? "动臂式" : "平头式"}
          </span>
        </div>

        <div className="info-row">
          <span className="label">Socket ID:</span>
          <span className="value">{currentCrane.socketId}</span>
        </div>

        {currentCrane.position && (
          <div className="info-row">
            <span className="label">位置:</span>
            <span className="value">
              X: {currentCrane.position.x.toFixed(2)}, Y:{" "}
              {currentCrane.position.y.toFixed(2)}, Z:{" "}
              {currentCrane.position.z.toFixed(2)}
            </span>
          </div>
        )}

        <div className="info-row">
          <span className="label">半径:</span>
          <span className="value">{currentCrane.radius}m</span>
        </div>

        <div className="info-row">
          <span className="label">高度:</span>
          <span className="value">{currentCrane.height}m</span>
        </div>

        {currentCrane.currentRotationAngle !== undefined && (
          <div className="info-row">
            <span className="label">回转角度:</span>
            <span className="value">
              {currentCrane?.currentRotationAngleText}°
            </span>
          </div>
        )}

        {currentCrane.currentArmPitchAngle !== undefined && (
          <div className="info-row">
            <span className="label">俯仰角度:</span>
            <span className="value">
              {currentCrane?.currentArmPitchAngleText}°
            </span>
          </div>
        )}

        {currentCrane.currentRopeLength !== undefined && (
          <div className="info-row">
            <span className="label">吊绳长度:</span>
            <span className="value">
              {currentCrane.currentRopeLength.toFixed(2)}m
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
