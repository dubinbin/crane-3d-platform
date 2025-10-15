import { useEffect, useRef } from "react";
import { PointCloudViewer } from "../utils/pointcloud-viewer";
import { EventBus, EventName } from "../utils/event";
import { AlertModalManager } from "./alert-model";
import AddCraneDialog from "./add-crane-dialog";

export default function Three3DView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PointCloudViewer | null>(null);

  useEffect(() => {
    // 确保容器已挂载
    if (!containerRef.current) return;

    // 保存当前容器引用
    const currentContainer = containerRef.current;

    // 创建viewer容器
    const viewerContainer = document.createElement("div");
    viewerContainer.id = "viewer-container";
    viewerContainer.style.cssText = `
      width: 100%;
      height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1;
    `;
    currentContainer.appendChild(viewerContainer);

    // 创建加载遮罩层
    const loadingOverlay = document.createElement("div");
    loadingOverlay.id = "loading-overlay";
    loadingOverlay.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      justify-content: center;
      align-items: center;
      z-index: 9999;
      color: white;
      font-size: 18px;
    `;
    loadingOverlay.innerHTML = "<p>正在加载...</p>";
    currentContainer.appendChild(loadingOverlay);

    // 初始化点云查看器
    const viewer = new PointCloudViewer("viewer-container");
    viewerRef.current = viewer;

    // 将viewer暴露到全局作用域
    window.viewer = viewer;

    console.log("Three3DView 初始化完成");

    // 清理函数
    return () => {
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
      if (currentContainer) {
        currentContainer.innerHTML = "";
      }
      delete window.viewer;
    };
  }, []);

  // event handler
  useEffect(() => {
    EventBus.on(EventName.ADD_CRANE, () => {
      AlertModalManager.current?.show({
        title: "创建塔吊",
        message: "",
        type: "info",
        duration: 0,
        component: <AddCraneDialog />,
      });
    });

    return () => {
      EventBus.off(EventName.ADD_CRANE, () => {});
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100vh", position: "relative" }}
    />
  );
}
