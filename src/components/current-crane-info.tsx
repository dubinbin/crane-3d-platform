import CraneInfo from "../assets/boom_type_crane.png";
import "../styles/current-crane-info.css";

export default function CurrentCraneInfo() {
  return (
    <div className="current-crane-main-wrapper">
      <div className="current-crane-info">
        <p className="current-crane-info-title">TC1</p>
        <div className="current-crane-info-wrapper">
          <div className="crane-info-container">
            <img src={CraneInfo} className="crane-info-img" alt="CraneInfo" />
            <div className="info-box">
              <p>吊物高度：100米</p>
              <p>小车距离：30米</p>
              <p>吊钩高度：50米</p>
              <p>回转角度: 0度</p>
            </div>
          </div>

          <div className="crane-params-info-container">
            <p>小车距离：30米</p>
            <p>吊钩高度：50米</p>
            <p>回转角度: 0度</p>
          </div>

          <div className="overview panel">
            <div className="inner">
              <div className="item">
                <h4>10%</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#006cff" }}
                  ></i>
                  载矩
                </span>
              </div>
              <div className="item">
                <h4>0.8T</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#6acca3" }}
                  ></i>
                  重量
                </span>
              </div>
              <div className="item">
                <h4>3m/s</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#CC916AFF" }}
                  ></i>
                  风速
                </span>
              </div>
              <div className="item">
                <h4>10m</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#35ED88FF" }}
                  ></i>
                  吊钩摆幅
                </span>
              </div>
              <div className="item">
                <h4>0°</h4>
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
