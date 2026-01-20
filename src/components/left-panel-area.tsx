// import CurrentDataPanel from "./current-data-panel";
import PointCloudHelperPanel from "./pointCloud-helper-panel";
import "../styles/left-panel-area.css";
import CurrentDataPanel from "./current-data-panel";
import CurrentDataLogs from "./current-data-logs";
// import CurrentDataLogs from "./current-data-logs";

export default function LeftPanelArea() {
  return (
    <div className="left-panel-area">
      <CurrentDataPanel />
      <div style={{ height: `calc(20px * var(--scale, 1))` }}></div>
      <PointCloudHelperPanel />
      <div style={{ height: `calc(20px * var(--scale, 1))` }}></div>
      <CurrentDataLogs />
    </div>
  );
}
