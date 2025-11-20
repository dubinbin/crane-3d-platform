import "./App.css";
import Three3DView from "./components/three-3d-view";
import Header from "./components/header";
// import InfoPanel from "./components/info-panel";
import LeftPanelArea from "./components/left-panel-area";
import AlertModal from "./components/alert-model";
import CraneInfoTooltip from "./components/crane-info-tooltip";
import { WebSocketAPIComponent } from "./components/webSocket-api-component";
// import InfoPanel from "./components/info-panel";
/**
 * 主应用程序组件
 * 负责初始化应用程序和协调各个模块
 */
function App() {
  return (
    <>
      <Header />
      <WebSocketAPIComponent />
      <Three3DView />
      <LeftPanelArea />
      {/* <InfoPanel /> */}
      <AlertModal />
      <CraneInfoTooltip />
    </>
  );
}

export default App;
