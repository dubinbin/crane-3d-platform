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

    // 从URL参数获取宽度和高度
    const urlParams = new URLSearchParams(window.location.search);
    const widthParam = urlParams.get("width");
    const heightParam = urlParams.get("height");

    // 确定使用的宽度和高度
    const width = widthParam ? `${widthParam}px` : "100%";
    const height = heightParam ? `${heightParam}px` : "100vh";
    const position = widthParam || heightParam ? "absolute" : "fixed";
    const topOffset = "0";

    // 保存当前容器引用
    const currentContainer = containerRef.current;

    // 创建viewer容器
    const viewerContainer = document.createElement("div");
    viewerContainer.id = "viewer-container";
    viewerContainer.style.cssText = `
      width: ${width};
      height: ${height};
      position: ${position};
      top: ${topOffset};
      left: 0;
      z-index: 1;
    `;
    currentContainer.appendChild(viewerContainer);

    // 创建加载遮罩层
    const loadingOverlay = document.createElement("div");
    loadingOverlay.id = "loading-overlay";
    loadingOverlay.style.cssText = `
      display: none;
      position: ${position};
      top: ${topOffset};
      left: 0;
      width: ${width};
      height: ${height};
      background: rgba(0, 0, 0, 0.7);
      justify-content: center;
      align-items: center;
      z-index: 9999;
      color: white;
      font-size: 18px;
    `;
    loadingOverlay.innerHTML = "<p>正在加载...</p>";
    currentContainer.appendChild(loadingOverlay);

    // 初始化点云查看器，传入宽度和高度（如果指定了）
    const viewerOptions: { width?: number; height?: number } = {};
    if (widthParam) viewerOptions.width = parseInt(widthParam, 10);
    if (heightParam) viewerOptions.height = parseInt(heightParam, 10);

    const viewer = new PointCloudViewer("viewer-container", viewerOptions);
    viewerRef.current = viewer;

    // 将viewer暴露到全局作用域
    window.viewer = viewer;

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

  // 从URL参数获取宽度和高度（用于初始渲染）
  const urlParams = new URLSearchParams(window.location.search);
  const widthParam = urlParams.get("width");
  const heightParam = urlParams.get("height");

  const containerWidth = widthParam ? `${widthParam}px` : "100%";
  const containerHeight = heightParam ? `${heightParam}px` : "100vh";

  return (
    <div
      ref={containerRef}
      style={{
        width: containerWidth,
        height: containerHeight,
        position: "relative",
        top: 0,
        left: 0,
        margin: 0,
        padding: 0,
      }}
    />
  );
}
