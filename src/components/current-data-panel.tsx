import "../styles/current-crane-data.css";

export default function CurrentDataPanel() {
  return (
    <div className="current-crane-main-wrapper">
      <div className="current-crane-data">
        <div className="current-crane-data-wrapper">
          <div className="overview panel">
            <div className="inner">
              <div className="item">
                <h4>4</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#006cff" }}
                  ></i>
                  塔吊总数
                </span>
              </div>
              <div className="item">
                <h4>1</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#6acca3" }}
                  ></i>
                  塔吊新增
                </span>
              </div>
              <div className="item">
                <h4>3</h4>
                <span>
                  <i
                    className="icon-dot"
                    style={{ backgroundColor: "#6acca3" }}
                  ></i>
                  运营塔吊
                </span>
              </div>
              <div className="item">
                <h4>1</h4>
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
