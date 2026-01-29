import { useEffect, useRef } from "react";
import { useStore } from "../store";

/**
 * 监听 isInPointLift 状态，自动在 3D 场景中开始/停止绘制吊钩轨迹
 * - start: isInPointLift=true 时，从当前吊钩位置开始记录
 * - stop: isInPointLift=false 时停止记录（保留线用于回看）
 */
export function PointLiftTrailController() {
  const isInPointLift = useStore((s) => s.isInPointLift);
  const currentMovingCraneId = useStore((s) => s.currentMovingCraneId);

  const lastIsInPointLiftRef = useRef<boolean>(isInPointLift);

  useEffect(() => {
    const last = lastIsInPointLiftRef.current;
    lastIsInPointLiftRef.current = isInPointLift;

    // rising edge: false -> true
    if (!last && isInPointLift) {
      const craneId = currentMovingCraneId || useStore.getState().currentOperationCraneId || "101";
      if (window.viewer?.startPointLiftTrail) {
        window.viewer.startPointLiftTrail(craneId);
      }
      return;
    }

    // falling edge: true -> false
    if (last && !isInPointLift) {
      if (window.viewer?.stopPointLiftTrail) {
        window.viewer.clearPointLiftTrail();
      }
      if (window.viewer?.clearPredictedPath) {
        window.viewer.clearPredictedPath();
      }
    }
  }, [isInPointLift, currentMovingCraneId]);

  // unmount cleanup
  useEffect(() => {
    return () => {
      if (window.viewer?.stopPointLiftTrail) {
        window.viewer.stopPointLiftTrail();
      }
    };
  }, []);

  return null;
}

