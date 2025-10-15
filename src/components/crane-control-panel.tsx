import { useStore } from "../store";
import { EventBus, EventName } from "../utils/event";
import CraneListItem from "./crane-list-item";
import "../styles/crane-control-panel.css";
import { Button, Collapse } from "antd";

export default function CraneControlPanel() {
  const cranes = useStore((state) => state.cranes);
  const removeCrane = useStore((state) => state.removeCrane);
  const clearAllCranes = useStore((state) => state.clearAllCranes);

  const handleAddCrane = () => {
    EventBus.emit(EventName.ADD_CRANE);
  };

  const handleRemoveCrane = (id: string) => {
    removeCrane(id);
    if (window.viewer) {
      window.viewer.getCraneManager().removeCrane(id);
    }
  };

  const handleClearAll = () => {
    clearAllCranes();
    if (window.viewer) {
      window.viewer.getCraneManager().clearAllCranes();
    }
  };

  const handleResetCamera = () => {
    if (window.viewer) {
      window.viewer.resetCamera();
    }
  };

  return (
    <div className="crane-control-panel">
      <div className="panel-header">
        <h4>塔吊控制</h4>
      </div>

      <div className="panel-actions">
        <button className="btn btn-primary" onClick={handleAddCrane}>
          添加塔吊
        </button>
        <button className="btn btn-secondary" onClick={handleResetCamera}>
          重置相机
        </button>
        {cranes.length > 0 && (
          <button className="btn btn-danger" onClick={handleClearAll}>
            清除所有
          </button>
        )}
      </div>

      <div className="crane-list">
        {cranes.length === 0 ? (
          <p className="empty-message">暂无塔吊</p>
        ) : (
          <Collapse
            style={{ backgroundColor: "#FEFEFE7A" }}
            accordion
            defaultActiveKey={["1"]}
            expandIconPosition="end"
            ghost
          >
            {cranes.map((crane) => (
              <Collapse.Panel
                key={crane.id}
                extra={
                  <Button
                    type="text"
                    size="small"
                    style={{
                      border: "0.5px solid #F30000FF",
                      borderRadius: "12px",
                      padding: "4px 10px",
                    }}
                    danger
                    onClick={() => handleRemoveCrane(crane.id)}
                  >
                    删除
                  </Button>
                }
                header={
                  <p
                    className="crane-name"
                    style={{
                      color: "#000000FF",
                      width: "100%",
                      textAlign: "left",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    {crane.name}
                  </p>
                }
              >
                <CraneListItem key={crane.id} craneId={crane.id} />
              </Collapse.Panel>
            ))}
          </Collapse>
        )}
      </div>
    </div>
  );
}
