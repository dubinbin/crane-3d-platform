import "./App.css";
import Three3DView from "./components/three-3d-view";
import Header from "./components/header";
import InfoPanel from "./components/info-panel";
import LeftPanelArea from "./components/left-panel-area";
import AlertModal from "./components/alert-model";
/**
 * 主应用程序组件
 * 负责初始化应用程序和协调各个模块
 */
function App() {
  return (
    <div>
      {/* 3D查看器 - 渲染点云和塔吊 */}
      <Header />
      <Three3DView />

      {/* 控制面板 - UI控制 */}

      <LeftPanelArea />

      {/* 信息面板 - 显示信息 */}
      <InfoPanel />

      <AlertModal />
    </div>
  );
}

export default App;
