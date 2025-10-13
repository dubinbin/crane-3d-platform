import "../styles/info-panel.css";
import CurrentCraneInfo from "./current-crane-info";
import CurrentCraneRunningDataPanel from "./current-running-data-panel";

export default function InfoPanel() {
  return (
    <div className="info-panel">
      <div style={{ height: "64px" }}></div>
      <CurrentCraneRunningDataPanel />
      <div style={{ height: "20px" }}></div>
      <CurrentCraneInfo />
    </div>
  );
}
