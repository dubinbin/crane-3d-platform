import {
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
  createRef,
  type RefObject,
} from "react";
import "../styles/alert-modal.css";

export interface AlertOptions {
  title?: string;
  message: string;
  type?: "danger" | "warning" | "info" | "success";
  duration?: number; // 自动关闭时间（毫秒），0 表示不自动关闭
}

export const AlertModalManager: RefObject<{
  show: (options: AlertOptions) => void;
  hide: () => void;
} | null> = createRef();

export interface AlertModalRef {
  show: (options: AlertOptions) => void;
  hide: () => void;
}

const AlertModal = forwardRef<AlertModalRef>((_, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const [alertData, setAlertData] = useState<AlertOptions>({
    title: "ALERT",
    message: "",
    type: "danger",
    duration: 3000,
  });

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    show: (options: AlertOptions) => {
      setAlertData({
        title: options.title || "ALERT",
        message: options.message,
        type: options.type || "danger",
        duration: options.duration ?? 3000,
      });
      setIsVisible(true);

      // 自动关闭
      if (options.duration && options.duration > 0) {
        setTimeout(() => {
          setIsVisible(false);
        }, options.duration);
      }
    },
    hide: () => {
      setIsVisible(false);
    },
  }));

  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  if (!isVisible) return null;

  // 根据类型设置不同的样式类

  return (
    <div className={`alert-modal-overlay ${isVisible ? "show" : ""}`}>
      <div className={`alert-modal-main-wrapper`}>
        <div className="alert-modal-wrapper">
          <div className="alert-modal-content">
            <div className="alert-header">
              <p className="alert-title">{alertData.title}</p>
              <button className="alert-close-btn" onClick={handleClose}>
                ✕
              </button>
            </div>
            <div className="alert-body">
              <p className="alert-message">{alertData.message}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const AlertModalComponent = () => {
  return <AlertModal ref={AlertModalManager} />;
};

export default AlertModalComponent;
