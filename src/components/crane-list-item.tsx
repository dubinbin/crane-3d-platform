import { Input } from "antd";
import { useStore } from "../store";
import "../styles/crane-list-item.css";
import { CraneType } from "../types";

interface CraneListItemProps {
  craneId: string;
}

export default function CraneListItem({ craneId }: CraneListItemProps) {
  const crane = useStore((state) => state.cranes.find((c) => c.id === craneId));
  const updateCranePosition = useStore((state) => state.updateCranePosition);
  const updateCraneRotation = useStore((state) => state.updateCraneRotation);
  const updateCraneArmPitch = useStore((state) => state.updateCraneArmPitch);
  const updateRopeLength = useStore((state) => state.updateRopeLength);
  const updateCraneCarDistance = useStore(
    (state) => state.updateCraneCarDistance
  );

  if (!crane) return null;

  const handlePositionChange = (axis: "x" | "y" | "z", value: number) => {
    updateCranePosition(craneId, axis, value);
    if (window.viewer) {
      window.viewer.getCraneManager().updateCranePosition(craneId, axis, value);
    }
  };

  const handleRotationChange = (value: number) => {
    updateCraneRotation(craneId, value);
    if (window.viewer) {
      window.viewer.getCraneManager().updateCraneRotation(craneId, value);
    }
  };

  const handleArmPitchChange = (value: number) => {
    updateCraneArmPitch(craneId, value);
    if (window.viewer) {
      window.viewer.getCraneManager().updateCraneArmPitch(craneId, value);
    }
  };

  const handleRopeLengthChange = (value: number) => {
    updateRopeLength(craneId, value);
    if (window.viewer) {
      window.viewer.getCraneManager().updateRopeLength(craneId, value);
    }
  };

  const handleCarDistanceChange = (value: number) => {
    updateCraneCarDistance(craneId, value);
    if (window.viewer) {
      window.viewer.getCraneManager().updateCraneCarDistance(craneId, value);
    }
  };

  return (
    <div className="crane-item">
      <div className="crane-item-header">数值调整</div>

      <div className="crane-control">
        <div className="crane-control-label">
          <i>X位置:</i>
          <span className="value-display">{crane.position?.x.toFixed(2)}</span>
        </div>
        <Input
          type="range"
          min="-20"
          max="20"
          step="0.1"
          value={crane.position?.x}
          onChange={(e) =>
            handlePositionChange("x", parseFloat(e.target.value))
          }
        />
      </div>

      <div className="crane-control">
        <div className="crane-control-label">
          <i>Y位置:</i>
          <span className="value-display">{crane.position?.y.toFixed(2)}</span>
        </div>
        <Input
          type="range"
          min="-20"
          max="20"
          step="0.1"
          value={crane.position?.y}
          onChange={(e) =>
            handlePositionChange("y", parseFloat(e.target.value))
          }
          className="crane-slider"
        />
      </div>

      <div className="crane-control">
        <div className="crane-control-label">
          <i>Z位置:</i>
          <span className="value-display">{crane.position?.z.toFixed(2)}</span>
        </div>
        <Input
          type="range"
          min="-10"
          max="10"
          step="0.1"
          value={crane.position?.z}
          onChange={(e) =>
            handlePositionChange("z", parseFloat(e.target.value))
          }
          className="crane-slider"
        />
      </div>

      <div className="crane-control">
        <div className="crane-control-label">
          <i>水平旋转:</i>
          <span className="value-display">
            {crane.currentRotationAngle?.toFixed(0)}°
          </span>
        </div>
        <Input
          type="range"
          min="0"
          max="450"
          step="1"
          value={crane.currentRotationAngle}
          onChange={(e) => handleRotationChange(parseFloat(e.target.value))}
          className="crane-slider"
        />
      </div>

      {crane.type === CraneType.BOOM ? (
        <div className="crane-control">
          <div className="crane-control-label">
            <i>臂膀俯仰:</i>
            <span className="value-display">
              {crane.currentArmPitchAngle?.toFixed(0)}°
            </span>
          </div>
          <Input
            type="range"
            min="-90"
            max="90"
            step="1"
            value={crane.currentArmPitchAngle}
            onChange={(e) => handleArmPitchChange(parseFloat(e.target.value))}
            className="crane-slider"
          />
        </div>
      ) : (
        <div className="crane-control">
          <div className="crane-control-label">
            <i>小车距离：</i>
            <span className="value-display">
              {crane.currentCarDistance?.toFixed(0)}m
            </span>
          </div>
          <Input
            type="range"
            min="0"
            max="60"
            step="0.1"
            value={crane.currentCarDistance}
            onChange={(e) =>
              handleCarDistanceChange(parseFloat(e.target.value))
            }
            className="crane-slider"
          />
        </div>
      )}

      <div className="crane-control">
        <div className="crane-control-label">
          <i>吊绳长度:</i>
          <span className="value-display">
            {crane.currentRopeLength?.toFixed(2)}
          </span>
        </div>
        <Input
          type="range"
          min="1"
          max="100"
          step="1"
          value={crane.currentRopeLength}
          onChange={(e) => handleRopeLengthChange(parseFloat(e.target.value))}
          className="crane-slider"
        />
      </div>
    </div>
  );
}
