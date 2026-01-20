import { Button, Tooltip } from "antd";
import BoomTypeCrane from "../assets/boom_type_crane.png";
import FloorTypeCrane from "../assets/floor_type_crane.png";
import { useStore } from "../store";
import "../styles/current-crane-info.css";
import { CraneType, OnlineStatus } from "../types";
import { DisconnectOutlined, LinkOutlined } from "@ant-design/icons";
import { AlertModalManager } from "./alert-model";

export default function CurrentCraneInfo() {
  const currentOperationCraneId = useStore(
    (state) => state.currentOperationCraneId
  );
  const cranes = useStore((state) => state.cranes);
  const currentCrane = cranes.find((c) => c.id === currentOperationCraneId);

  const handleConnect = () => {
    AlertModalManager.current?.show({
      title: "连接塔吊控制端",
      message: "正在连接塔吊控制端，请稍后...",
      type: "success",
      duration: 3000,
    });
  };

  const handleDisconnect = () => {
    AlertModalManager.current?.show({
      title: "断开塔吊控制端",
      message: "正在断开塔吊控制端，请稍后...",
      type: "success",
      duration: 3000,
    });
  };

  return (
    <div className="current-crane-main-wrapper">
      <div className="current-crane-info">
        <div className="current-crane-info-title">
          {currentCrane?.onlineStatus !== OnlineStatus.ONLINE ? (
            <Tooltip title="上線">
              <span
                style={{
                  color: "#35ED88FF",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: "#35ED88FF",
                }}
              ></span>
            </Tooltip>
          ) : (
            <Tooltip title="离线">
              <span
                style={{
                  color: "#ed3f35",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: "#ed3f35",
                }}
              ></span>
            </Tooltip>
          )}
          {currentCrane?.name || "TC1"}
        </div>
        <div className="current-crane-info-wrapper">
          <div className="crane-info-container">
            <img
              src={
                currentCrane?.type === CraneType.BOOM
                  ? BoomTypeCrane
                  : FloorTypeCrane
              }
              className="crane-info-img"
              alt="CraneInfo"
            />
            <div className="info-box">
              <p>吊鉤高度：{currentCrane?.currentHookHeight || "10m"}</p>
              <p
                className={
                  currentCrane?.type === CraneType.BOOM
                    ? "boom-type"
                    : "floor-type"
                }
              >
                {currentCrane?.type === CraneType.BOOM
                  ? "吊臂長度："
                  : "小車距離："}
                {currentCrane?.type === CraneType.BOOM
                  ? currentCrane?.currentRopeLength || "10m"
                  : currentCrane?.currentCarDistance || "0m"}
              </p>
              <p>
                吊鉤高度：
                {currentCrane?.currentHeightDistanceFromGround || "10m"}
              </p>
              <p>回轉角度: {currentCrane?.currentRotationAngleText || "0°"}</p>
            </div>
          </div>

          <div className="crane-params-info-container">
            <div className="item">
              <p>
                {currentCrane?.type === CraneType.BOOM
                  ? "大臂俯仰"
                  : "小車距離"}
              </p>
              <i className="center-text">
                {currentCrane?.type === CraneType.BOOM
                  ? currentCrane?.currentArmPitchAngleText || "0°"
                  : currentCrane?.currentCarDistance || "0m"}
              </i>
            </div>
            <div className="item">
              <p>吊鉤高度</p>
              <i>{currentCrane?.currentRopeLength || "10米"}</i>
            </div>
            <div className="item">
              <p>回轉角度</p>
              <i>{currentCrane?.currentRotationAngleText || "0°"}</i>
            </div>
          </div>

          <div className="overview panel">
            <div className="inner">
              <div className="item">
                <h4>{currentCrane?.loadMatrix || "0%"}</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#006cff" }}
                  ></i>
                  載矩
                </span>
              </div>
              <div className="item">
                <h4>{currentCrane?.weight || "0"}</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#6acca3" }}
                  ></i>
                  重量(T)
                </span>
              </div>
              <div className="item">
                <h4>{currentCrane?.windSpeed || "10m/s"}</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#CC916AFF" }}
                  ></i>
                  風速(m/s)
                </span>
              </div>
              <div className="item">
                <h4>{currentCrane?.swingWidth || "10m"}</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#35ED88FF" }}
                  ></i>
                  吊鉤擺幅(m)
                </span>
              </div>
              <div className="item">
                <h4>{currentCrane?.armInclinationAngle || "0°"}</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#357BE6FF" }}
                  ></i>
                  大臂傾角(°)
                </span>
              </div>
            </div>
          </div>

          <div className="connectOptions">
            {currentCrane?.onlineStatus === OnlineStatus.OFFLINE ? (
              <Button
                onClick={handleConnect}
                type="primary"
                ghost
                className="item"
                variant="filled"
                icon={<LinkOutlined />}
              >
                連接
              </Button>
            ) : (
              <Button
                onClick={handleDisconnect}
                type="primary"
                ghost
                danger
                variant="filled"
                className="item"
                icon={<DisconnectOutlined />}
              >
                斷開
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
