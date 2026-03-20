import { useRef, useState } from "react";
import "../styles/pointCloud-helper-panel.css";
import CraneControlPanel from "./crane-control-panel";
import { ArrowsAltOutlined, ShrinkOutlined } from "@ant-design/icons";

export default function PointCloudHelperPanel() {
  const controlPanelRef = useRef<HTMLDivElement>(null);
  const [iscollapsed, setIscollapsed] = useState(false);

  const handlePanelToggle = () => {
    setIscollapsed(!iscollapsed);
    const controlPanel = controlPanelRef.current;

    if (iscollapsed) {
      if (controlPanel) controlPanel.classList.remove("collapsed");
    } else {
      if (controlPanel) controlPanel.classList.add("collapsed");
    }
  };

  return (
    <div
      id="control-panel"
      className="pointCloud-helper-panel"
      ref={controlPanelRef}
    >
      <div className="control-panel-wrapper">
        <div
          id="panel-toggle"
          title="折叠/展开控制面板"
          onClick={handlePanelToggle}
        >
          {iscollapsed ? <ArrowsAltOutlined /> : <ShrinkOutlined />}
        </div>

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
      </div>
    </div>
  );
}
