// import CurrentDataPanel from "./current-data-panel";
// import PointCloudHelperPanel from "./pointCloud-helper-panel";
import { useEffect, useState } from "react";
import "../styles/left-panel-area.css";
// import CurrentDataPanel from "./current-data-panel";
// import CurrentDataLogs from "./current-data-logs";
// import CurrentDataLogs from "./current-data-logs";
import PointCloudHelperPanel from "./pointCloud-helper-panel";

export default function LeftPanelArea() {
  const [showHelperPanel, setShowHelperPanel] = useState(false);

  useEffect(() => {
    if (window.location.search.includes("debug")) {
      setShowHelperPanel(true);
    }
  }, []);

  return (
    <div className="left-panel-area">
      {/* <CurrentDataPanel /> */}
      <div style={{ height: `calc(20px * var(--scale, 1))` }}></div>
      {showHelperPanel && <PointCloudHelperPanel />}
      <div style={{ height: `calc(20px * var(--scale, 1))` }}></div>
      {/* <CurrentDataLogs /> */}
    </div>
  );
}
