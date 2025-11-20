import { useEffect } from "react";
import "./App.css";
import Three3DView from "./components/three-3d-view";
// import InfoPanel from "./components/info-panel";
import LeftPanelArea from "./components/left-panel-area";
import AlertModal from "./components/alert-model";
import CraneInfoTooltip from "./components/crane-info-tooltip";
import { WebSocketAPIComponent } from "./components/webSocket-api-component";
import Header from "./components/header";
// import InfoPanel from "./components/info-panel";
/**
 * 主应用程序组件
 * 负责初始化应用程序和协调各个模块
 */
function App() {
  useEffect(() => {
    // 从URL参数获取宽度和高度，设置CSS变量
    const urlParams = new URLSearchParams(window.location.search);
    const widthParam = urlParams.get("width");
    const heightParam = urlParams.get("height");

    // 默认基准尺寸（全屏时的参考尺寸）
    const defaultWidth = window.innerWidth || 1920;
    const defaultHeight = window.innerHeight || 1080;

    if (widthParam) {
      const width = parseInt(widthParam, 10);
      document.documentElement.style.setProperty(
        "--viewer-width",
        `${width}px`
      );
      // 计算宽度缩放比例
      const scaleX = width / defaultWidth;
      document.documentElement.style.setProperty(
        "--scale-x",
        scaleX.toString()
      );
    } else {
      document.documentElement.style.setProperty("--viewer-width", "100vw");
      document.documentElement.style.setProperty("--scale-x", "1");
    }

    if (heightParam) {
      const height = parseInt(heightParam, 10);
      document.documentElement.style.setProperty(
        "--viewer-height",
        `${height}px`
      );
      // 计算高度缩放比例
      const scaleY = height / defaultHeight;
      document.documentElement.style.setProperty(
        "--scale-y",
        scaleY.toString()
      );
    } else {
      document.documentElement.style.setProperty("--viewer-height", "100vh");
      document.documentElement.style.setProperty("--scale-y", "1");
    }

    // 计算统一的缩放比例（取较小的值，保持比例）
    if (widthParam && heightParam) {
      const width = parseInt(widthParam, 10);
      const height = parseInt(heightParam, 10);
      const scaleX = width / defaultWidth;
      const scaleY = height / defaultHeight;
      const scale = Math.min(scaleX, scaleY);
      document.documentElement.style.setProperty("--scale", scale.toString());
    } else if (widthParam) {
      const width = parseInt(widthParam, 10);
      const scale = width / defaultWidth;
      document.documentElement.style.setProperty("--scale", scale.toString());
    } else if (heightParam) {
      const height = parseInt(heightParam, 10);
      const scale = height / defaultHeight;
      document.documentElement.style.setProperty("--scale", scale.toString());
    } else {
      document.documentElement.style.setProperty("--scale", "1");
    }
  }, []);

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
