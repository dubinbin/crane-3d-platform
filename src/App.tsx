import "./App.css";
import Three3DView from "./components/three-3d-view";
import Header from "./components/header";
import InfoPanel from "./components/info-panel";
import LeftPanelArea from "./components/left-panel-area";
import AlertModal from "./components/alert-model";
import CraneInfoTooltip from "./components/crane-info-tooltip";
import { TestComp } from "./components/test";
/**
 * 主应用程序组件
 * 负责初始化应用程序和协调各个模块
 */
function App() {
  return (
    <div>
      {/* 3D查看器 - 渲染点云和塔吊 */}
      <Header />
      <TestComp />
      <Three3DView />

      {/* 控制面板 - UI控制 */}

      <LeftPanelArea />

      {/* 信息面板 - 显示信息 */}
      <InfoPanel />

      <AlertModal />

      {/* 塔吊点击信息提示框 */}
      <CraneInfoTooltip />
    </div>
  );
}

export default App;
