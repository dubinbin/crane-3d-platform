import CurrentDataPanel from "./current-data-panel";
import PointCloudHelperPanel from "./pointCloud-helper-panel";
import "../styles/left-panel-area.css";
import CurrentDataLogs from "./current-data-logs";

export default function LeftPanelArea() {
  return (
    <div className="left-panel-area">
      <CurrentDataPanel />
      <div style={{ height: "20px" }}></div>
      <PointCloudHelperPanel />
      <div style={{ height: "20px" }}></div>
      <CurrentDataLogs />
    </div>
  );
}
