import { useStore } from "../store";
import { EventBus, EventName } from "../utils/event";
import CraneListItem from "./crane-list-item";
import "../styles/crane-control-panel.css";
import { Button, Collapse, Flex } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

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
        <Flex gap="small" wrap>
          <Button
            color="green"
            size="middle"
            variant="outlined"
            className="panel-action-button"
            onClick={handleAddCrane}
          >
            添加塔吊
          </Button>
          <Button
            color="blue"
            variant="outlined"
            className="panel-action-button"
            onClick={handleResetCamera}
          >
            重置相机
          </Button>
          {cranes.length > 0 && (
            <Button
              color="red"
              variant="outlined"
              className="panel-action-button"
              onClick={handleClearAll}
            >
              清除所有
            </Button>
          )}
        </Flex>
      </div>

      <div className="crane-list">
        {cranes.length === 0 ? (
          <p className="empty-message">暂无塔吊</p>
        ) : (
          <Collapse
            style={{
              backgroundColor: "transparent",
              border: "0.5px solid #FFFFFF5E",
            }}
            accordion
            defaultActiveKey={["1"]}
            expandIconPosition="end"
            expandIcon={(iconProps) =>
              iconProps.isActive ? (
                <ArrowUpOutlined style={{ color: "#FFFFFFFF" }} />
              ) : (
                <ArrowDownOutlined style={{ color: "#FFFFFFFF" }} />
              )
            }
            ghost
          >
            {cranes.map((crane) => (
              <Collapse.Panel
                key={crane.id}
                extra={
                  <Button
                    type="text"
                    size="small"
                    icon={
                      <DeleteOutlined
                        size={10}
                        style={{ color: "#F300009F" }}
                      />
                    }
                    style={{
                      borderRadius: "12px",
                      padding: "4px 10px",
                    }}
                    danger
                    onClick={() => handleRemoveCrane(crane.id)}
                  >
                    <p style={{ color: "#F300009F" }}>删除</p>
                  </Button>
                }
                header={
                  <p
                    className="crane-name"
                    style={{
                      color: "#FFFFFFFF",
                      width: "100%",
                      textAlign: "left",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    塔吊编号：{crane.name}
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
