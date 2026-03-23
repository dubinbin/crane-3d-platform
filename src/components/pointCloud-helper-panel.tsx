import { useRef } from "react";
import "../styles/pointCloud-helper-panel.css";
import CraneControlPanel from "./crane-control-panel";
import PointCloudManager from "./point-cloud-manager";

export default function PointCloudHelperPanel() {
  const controlPanelRef = useRef<HTMLDivElement>(null);

  return (
    <div
      id="control-panel"
      className="pointCloud-helper-panel"
      ref={controlPanelRef}
    >
      <div className="panel-header">
        <h3
          style={{
            margin: 0,
            color: "#FFFFFFFF",
            fontSize: `calc(18px * var(--scale, 1))`,
          }}
        >
          🔬 设置面板
        </h3>
      </div>

      <div className="control-content">
        <CraneControlPanel />
      </div>

      <div style={{ height: `calc(20px * var(--scale, 1))` }}></div>

      <div className="control-content">
        <PointCloudManager />
      </div>
    </div>
  );
}
