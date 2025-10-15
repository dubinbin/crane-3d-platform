import { useStore } from "../store";
import "../styles/current-crane-data.css";

export default function CurrentDataPanel() {
  const cranes = useStore((state) => state.cranes);
  return (
    <div className="current-crane-main-wrapper">
      <div className="current-crane-data">
        <div className="current-crane-data-wrapper">
          <div className="overview panel">
            <div className="inner">
              <div className="item">
                <h4>{cranes.length}</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#006cff" }}
                  ></i>
                  塔吊总数
                </span>
              </div>

              <div className="item">
                <h4>{cranes.length}</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#6acca3" }}
                  ></i>
                  正常运行塔吊
                </span>
              </div>
              <div className="item">
                <h4>0</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#ed3f35" }}
                  ></i>
                  异常塔吊
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
