import { useRef, useState, useEffect } from "react";
import { PCDParser } from "../utils/pcd-parser";
import "../styles/pointCloud-helper-panel.css";
import CraneControlPanel from "./crane-control-panel";
import { ArrowsAltOutlined, ShrinkOutlined } from "@ant-design/icons";

export default function PointCloudHelperPanel() {
  const controlPanelRef = useRef<HTMLDivElement>(null);
  const [iscollapsed, setIscollapsed] = useState(false);

  // 从URL参数读取密度值，默认为 "0"（完整点云）
  const getInitialDensity = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const densityParam = urlParams.get("density");
    return densityParam || "0"; // 默认值为 "0" 表示完整点云
  };

  const getDensityLabel = (value: string) => {
    const options: Record<string, string> = {
      "25000": "快速",
      "50000": "标准",
      "200000": "增强",
      "500000": "高清",
      "0": "完整",
    };
    return options[value] || "完整";
  };

  const [densityValue, setDensityValue] = useState(() => {
    const initialDensity = getInitialDensity();
    return getDensityLabel(initialDensity);
  });

  const [selectedDensity, setSelectedDensity] = useState(getInitialDensity);

  // 初始化时设置选择框的值
  useEffect(() => {
    const densitySelect = document.getElementById(
      "point-density"
    ) as HTMLSelectElement;

    if (controlPanelRef.current) {
      controlPanelRef.current.style.opacity = "0";
    }
    if (densitySelect) {
      densitySelect.value = selectedDensity;
    }
  }, [selectedDensity]);

  const handlePanelToggle = () => {
    setIscollapsed(!iscollapsed);
    const controlPanel = controlPanelRef.current;

    if (iscollapsed) {
      if (controlPanel) controlPanel.classList.remove("collapsed");
    } else {
      if (controlPanel) controlPanel.classList.add("collapsed");
    }
  };

  const bindPointDensityControl = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const numValue = parseInt(value);
    const options: Record<string, string> = {
      "25000": "快速",
      "50000": "标准",
      "200000": "增强",
      "500000": "高清",
      "0": "完整",
    };
    setDensityValue(options[value] || "完整");
    setSelectedDensity(value);

    // 如果有当前加载的文件，重新解析
    if (window.currentPCDData) {
      console.log("重新解析点云，新密度:", numValue);
      try {
        const pointData = PCDParser.parsePCD(window.currentPCDData);
        window?.viewer?.renderPointCloud(pointData);
        window?.viewer?.updateFileInfo(pointData, window.currentFileName || "");
      } catch (error) {
        console.error("重新解析失败:", error);
      }
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
          <h3 style={{ margin: 0, color: "#FFFFFFFF" }}>🔬 设置面板</h3>
        </div>

        <div className="control-content">
          <div className="crane-control-panel">
            <label className="panel-header">
              <h4>点云密度</h4>
              <span className="value-display" id="density-value">
                {densityValue}
              </span>
            </label>
            <select
              id="point-density"
              style={{
                width: "100%",
                padding: 8,
                background: "rgba(255, 255, 255, 0.2)",
                color: "white",
                border: "1px solid #666",
                borderRadius: 6,
              }}
              value={selectedDensity}
              onChange={bindPointDensityControl}
            >
              <option value="25000">快速预览 (2.5万点)</option>
              <option value="50000">标准密度 (5万点)</option>
              <option value="200000">增强密度 (20万点)</option>
              <option value="500000">高清密度 (50万点)</option>
              <option value="0">完整点云 (全部点)</option>
            </select>
          </div>

          <CraneControlPanel />
        </div>
      </div>
    </div>
  );
}
