import { Button, Input } from "antd";
import boomTypeCrane from "../assets/boom_type_crane.jpg";
import floorTypeCrane from "../assets/floor_type_crane.jpg";
import { useState } from "react";
import { AlertModalManager } from "./alert-model";
import "../styles/add-crane-dialog.css";
import { useStore } from "../store";
import type { CraneType } from "../types";
import { v4 as uuidv4 } from "uuid";

export default function AddCraneDialog() {
  const [craneType, setCraneType] = useState<CraneType>("boom");
  const [craneCode, setCraneCode] = useState<string>("TC1");
  const [craneId, setCraneId] = useState<string>("16");
  const [craneHeight, setCraneHeight] = useState<string>("10");
  const [craneArmLength, setCraneArmLength] = useState<string>("60");
  const { addCrane, cranes } = useStore((state) => state);

  const handleCraneTypeChange = (type: CraneType) => {
    setCraneType(type);
  };

  const createCrane = () => {
    const crane = cranes.find((c) => c.name === craneCode);
    if (crane) {
      AlertModalManager.current?.show({
        title: "塔吊代号已存在",
        message: "塔吊代号已存在, 请重新输入",
        type: "danger",
        duration: 3000,
      });
      return;
    }
    if (window?.viewer) {
      // 翻转地图视角
      window.viewer.flipTheMapView();

      const x = 0;
      const y = 0;
      const z = 0;

      // 添加塔吊到场景
      const craneManager = window.viewer.getCraneManager();
      const craneData = {
        id: uuidv4(),
        name: craneCode,
        socketId: craneId,
        type: craneType,
        position: { x, y, z },
        radius: Number(craneHeight),
        height: Number(craneArmLength),
        currentHookHeight: 0,
        currentCarDistance: 0,
        currentRotationAngle: 0,
        currentArmPitchAngle: 0,
        currentRopeLength: 0,
      };
      const crane = craneManager.addCrane(craneData);

      if (crane) {
        // 同步到 store
        addCrane(craneData);
      }

      // 隐藏弹窗
      AlertModalManager.current?.hide();

      // 提示添加成功
      setTimeout(() => {
        AlertModalManager.current?.show({
          title: "添加塔吊成功",
          message: "添加塔吊成功, 请使用控制面板调整塔吊位置",
          type: "success",
          duration: 3000,
        });
      }, 200);
    }
  };

  return (
    <div className="add-crane-dialog">
      <div className="crane-type-container">
        <div
          className={`boom-type-crane-container ${
            craneType === "boom" ? "selected-active" : ""
          }`}
          onClick={() => handleCraneTypeChange("boom")}
        >
          <img
            className="boom-type-crane"
            src={boomTypeCrane}
            alt="CraneInfo"
          />
          <p>动臂式塔吊</p>
        </div>

        <div
          className={`floor-type-crane-container ${
            craneType === "floor" ? "selected-active" : ""
          }`}
          onClick={() => handleCraneTypeChange("floor")}
        >
          <img
            className="floor-type-crane"
            src={floorTypeCrane}
            alt="CraneInfo"
          />
          <p>平头塔吊</p>
        </div>
      </div>
      <div className="crane-code-input-container">
        <label className="crane-code-input-label">塔吊代号</label>
        <Input
          placeholder="请输入塔吊代号"
          className="crane-code-input"
          defaultValue={craneCode}
          onChange={(e) => setCraneCode(e.target.value)}
        />
      </div>

      <div className="crane-code-input-container">
        <label className="crane-code-input-label">id(唯一标识)</label>
        <Input
          placeholder="请输入id"
          className="crane-code-input"
          defaultValue={craneId}
          onChange={(e) => setCraneId(e.target.value)}
        />
      </div>

      <div className="crane-code-input-container">
        <label className="crane-code-input-label">塔机高度(米)</label>
        <Input
          placeholder="请输入塔机高度"
          className="crane-code-input"
          defaultValue={craneHeight}
          suffix="m"
          onChange={(e) => setCraneHeight(e.target.value)}
        />
      </div>

      <div className="crane-code-input-container">
        <label className="crane-code-input-label">摆臂长度(米)</label>
        <Input
          placeholder="请输入摆臂长度"
          className="crane-code-input"
          defaultValue={craneArmLength}
          suffix="m"
          onChange={(e) => setCraneArmLength(e.target.value)}
        />
      </div>

      <Button
        type="primary"
        size="large"
        block
        className="add-crane-button"
        onClick={createCrane}
      >
        添加塔吊
      </Button>
    </div>
  );
}
