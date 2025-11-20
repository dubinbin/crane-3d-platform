import "../styles/info-panel.css";
import CurrentCraneInfo from "./current-crane-info";
import CurrentCraneRunningDataPanel from "./current-running-data-panel";

export default function InfoPanel() {
  return (
    <div className="info-panel">
      <div style={{ height: `calc(64px * var(--scale, 1))` }}></div>
      <CurrentCraneRunningDataPanel />
      <div style={{ height: `calc(20px * var(--scale, 1))` }}></div>
      <CurrentCraneInfo />
    </div>
  );
}
