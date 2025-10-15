import CraneInfo from "../assets/boom_type_crane.png";
import { useStore } from "../store";
import "../styles/current-crane-info.css";

export default function CurrentCraneInfo() {
  const currentCrane = useStore((state) => state.currentCrane);
  return (
    <div className="current-crane-main-wrapper">
      <div className="current-crane-info">
        <p className="current-crane-info-title">{currentCrane?.craneId}</p>
        <div className="current-crane-info-wrapper">
          <div className="crane-info-container">
            <img src={CraneInfo} className="crane-info-img" alt="CraneInfo" />
            <div className="info-box">
              <p>吊物高度：{currentCrane?.craneLoadHeight}米</p>
              <p>小车距离：{currentCrane?.currentCarDistance}米</p>
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
        </div>
      </div>
    </div>
  );
}
