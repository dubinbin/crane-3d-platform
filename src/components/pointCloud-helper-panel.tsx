import { useRef, useState } from "react";
// import { ColorUtils } from "../utils/file-util";
import { PCDParser } from "../utils/pcd-parser";
import "../styles/pointCloud-helper-panel.css";
import { AlertModalManager } from "./alert-model";

export default function PointCloudHelperPanel() {
  const controlPanelRef = useRef<HTMLDivElement>(null);
  const [iscollapsed, setIscollapsed] = useState(false);
  //   const [pointSize, setPointSize] = useState(0.01);
  const [densityValue, setDensityValue] = useState("标准");
  //   const [backgroundColor, setBackgroundColor] = useState("rgba(1,10,24,1)");

  const handlePanelToggle = () => {
    setIscollapsed(!iscollapsed);
    const controlPanel = controlPanelRef.current;

    if (iscollapsed) {
      if (controlPanel) controlPanel.classList.remove("collapsed");
      AlertModalManager.current?.show({
        title: "警告",
        message: "TC1和TC有碰撞风险，请立即调整",
        type: "danger",
        duration: 10000,
      });
    } else {
      if (controlPanel) controlPanel.classList.add("collapsed");
    }
  };

  //   const changeColor = (e: React.ChangeEvent<HTMLInputElement>) => {
  //     const color = e.target.value;
  //     const hexColor = ColorUtils.hexToThreeColor(color);
  //     window?.viewer?.setBackgroundColor(hexColor);
  //     console.log("背景颜色:", hexColor);
  //     setBackgroundColor(color);
  //   };

  //   const bindPointSizeControl = (e: React.ChangeEvent<HTMLInputElement>) => {
  //     const size = parseFloat(e.target.value);
  //     setPointSize(size);
  //     window?.viewer?.setPointSize(size);
  //   };

  const bindPointDensityControl = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    const options = {
      25000: "快速",
      50000: "标准",
      200000: "增强",
      500000: "高清",
      0: "完整",
    };
    setDensityValue(options[value as keyof typeof options] || "标准");

    // 如果有当前加载的文件，重新解析
    if (window.currentPCDData) {
      console.log("重新解析点云，新密度:", value);
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
          {iscollapsed ? "☰" : "--"}
        </div>

        <div className="panel-header">
          <h3 style={{ margin: 0, color: "#FFFFFFFF" }}>🔬 塔吊点云设置</h3>
        </div>

        <div className="control-content">
          {/* <div className="control-group">
            <label>
              点大小
              <span className="value-display" id="point-size-value">
                {pointSize}
              </span>
            </label>
            <input
              type="range"
              id="point-size-slider"
              className="slider"
              min="0.01"
              max="0.5"
              step="0.01"
              value={pointSize}
              onChange={bindPointSizeControl}
            />
          </div> */}

          {/* <div className="control-group">
            <label>背景颜色</label>
            <input
              type="color"
              id="background-color"
              onChange={changeColor}
              value={backgroundColor}
            />
          </div> */}

          <div className="control-group">
            <label>
              点云密度
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
              onChange={bindPointDensityControl}
            >
              <option value="25000">快速预览 (2.5万点)</option>
              <option value="50000" selected>
                标准密度 (5万点)
              </option>
              <option value="200000">增强密度 (20万点)</option>
              <option value="500000">高清密度 (50万点)</option>
              <option value="0">完整点云 (全部点)</option>
            </select>
          </div>

          <div className="btn-group">
            <button id="reset-camera" className="btn">
              🔄 重置视角
            </button>
            <button id="add-crane" className="btn">
              🏗️ 添加塔吊
            </button>
            <button id="clear-cranes" className="btn">
              🗑️ 清除所有塔吊
            </button>
          </div>

          <div
            className="control-group"
            id="crane-controls"
            style={{ display: "none" }}
          >
            <label>塔吊控制</label>
            <div
              id="crane-list"
              className="crane-list-container"
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                background: "rgba(255,255,255,0.1)",
                padding: "10px",
                borderRadius: "6px",
                marginTop: "10px",
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
