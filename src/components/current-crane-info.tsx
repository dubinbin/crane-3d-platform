import { Button, Tooltip } from "antd";
import BoomTypeCrane from "../assets/boom_type_crane.png";
import FloorTypeCrane from "../assets/floor_type_crane.png";
import { useStore } from "../store";
import "../styles/current-crane-info.css";
import { CraneType, OnlineStatus } from "../types";
import { DisconnectOutlined, LinkOutlined } from "@ant-design/icons";
import { AlertModalManager } from "./alert-model";

export default function CurrentCraneInfo() {
  const currentCrane = useStore((state) => state.currentCrane);

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
          {currentCrane?.onlineStatus === OnlineStatus.ONLINE ? (
            <Tooltip title="在线">
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
          {currentCrane?.craneId}
        </div>
        <div className="current-crane-info-wrapper">
          <div className="crane-info-container">
            <img
              src={
                currentCrane?.craneType === "boom"
                  ? BoomTypeCrane
                  : FloorTypeCrane
              }
              className="crane-info-img"
              alt="CraneInfo"
            />
            <div className="info-box">
              <p>吊物高度：{currentCrane?.craneLoadHeight}米</p>
              <p
                className={
                  currentCrane?.craneType === CraneType.BOOM
                    ? "boom-type"
                    : "floor-type"
                }
              >
                小车距离：{currentCrane?.currentCarDistance}米
              </p>
              <p>吊钩高度：{currentCrane?.craneHookheight}米</p>
              <p>回转角度: {currentCrane?.currentRotationAngle}度</p>
            </div>
          </div>

          <div className="crane-params-info-container">
            <div className="item">
              <p>小车距离</p>
              <i>{currentCrane?.currentCarDistance}米</i>
            </div>
            <div className="item">
              <p>吊钩高度</p>
              <i>{currentCrane?.craneHookheight}米</i>
            </div>
            <div className="item">
              <p>回转角度</p>
              <i>{currentCrane?.currentRotationAngle}度</i>
            </div>
          </div>

          <div className="overview panel">
            <div className="inner">
              <div className="item">
                <h4>{currentCrane?.loadMatrix}%</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#006cff" }}
                  ></i>
                  载矩
                </span>
              </div>
              <div className="item">
                <h4>{currentCrane?.weight}T</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#6acca3" }}
                  ></i>
                  重量
                </span>
              </div>
              <div className="item">
                <h4>{currentCrane?.windSpeed}m/s</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#CC916AFF" }}
                  ></i>
                  风速
                </span>
              </div>
              <div className="item">
                <h4>{currentCrane?.swingWidth}m</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#35ED88FF" }}
                  ></i>
                  吊钩摆幅
                </span>
              </div>
              <div className="item">
                <h4>{currentCrane?.armInclinationAngle}°</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#357BE6FF" }}
                  ></i>
                  大臂倾角
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
                连接
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
                断开
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
