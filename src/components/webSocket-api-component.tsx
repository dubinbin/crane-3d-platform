import { useEffect } from "react";
import { webSocketService } from "../services/websocket";
// import { Button } from "antd";
import { Deserialize, type Message } from "../utils/deserialize";
import { WEBSOCKET_RESPONSE_CODE_MAP } from "../constants";
import { useStore } from "../store";
import {
  calcRotationAngle,
  calculatePostureAbility,
} from "../utils/posture-ability";
import { AlertModalManager } from "./alert-model";
import { CraneType } from "../types";
// import { useStore } from "../store";

export const WebSocketAPIComponent = () => {
  const updateCraneArmPitch = useStore((state) => state.updateCraneArmPitch);
  const updateRopeLength = useStore((state) => state.updateRopeLength);
  const updateCraneRotation = useStore((state) => state.updateCraneRotation);
  const updateCraneRotationText = useStore(
    (state) => state.updateCraneRotationText
  );
  const updateCraneArmPitchText = useStore(
    (state) => state.updateCraneArmPitchText
  );
  const updateCraneCarDistance = useStore((state) => state.updateCraneCarDistance);
  
  const updateCraneCarDistanceText = useStore((state) => state.updateCraneCarDistanceText);
  const cranelist = useStore((state) => state.cranes);

  useEffect(() => {
    // 先连接websocket
    webSocketService.connect();

    // 定义事件处理函数
    const handleConnect = () => {
      console.log("Socket connected!");
    };

    const handleServerMsg = (data: unknown) => {
      console.log("Received server-msg:", data);
      console.log(
        "Data type:",
        typeof data,
        "Constructor:",
        data?.constructor?.name
      );

      let buffer: Uint8Array | null = null;

      if (data instanceof ArrayBuffer) {
        console.log("Data is ArrayBuffer");
        // 直接从 ArrayBuffer 创建 Int8Array 视图来访问 [[Int8Array]] 数据
        const int8Array = new Int8Array(data);
        console.log("[[Int8Array]] data:", int8Array);
        console.log("Int8Array length:", int8Array.length);
        console.log("Int8Array values:", Array.from(int8Array));

        // 转换为 Uint8Array 进行处理
        buffer = new Uint8Array(
          int8Array.buffer,
          int8Array.byteOffset,
          int8Array.byteLength
        );
      }
      // 统一处理提取到的 buffer
      if (buffer && buffer.length > 0) {
        console.log("Final buffer processing:");
        console.log("Buffer extracted:", buffer);
        console.log("Buffer length:", buffer.length);
        console.log(
          "Buffer bytes (hex):",
          Array.from(buffer)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ")
        );

        try {
          // 调用deserialize方法，对应Flutter的处理逻辑
          const message: Message = Deserialize.deserialize(buffer);
          console.log("Deserialized message:", message);

          // 处理解析后的消息，对应Flutter的handleSocketMessage().onData(message)
          handleSocketMessage(message);
        } catch (error) {
          console.error("Error deserializing:", error);
        }
      } else {
        console.log("Could not extract valid buffer from data");
        console.log("Full object inspection:");
        console.log("Object keys:", Object.keys(data as object));
        console.log(
          "Object properties:",
          Object.getOwnPropertyNames(data as object)
        );
      }
    };

    // 对应Flutter的handleSocketMessage().onData(message)
    const handleSocketMessage = (message: Message) => {
      console.log("Processing socket message:", message);
      console.log("UserID:", message.userID);
      console.log("TimeStamp:", message.timeStamp);
      console.log("Type:", message.type);
      console.log("ValueArray1 (Int16):", message.valueArray1);
      console.log("ValueArray2 (Float64):", message.valueArray2);


      if (message.type === WEBSOCKET_RESPONSE_CODE_MAP.TASK_CURRENT_STATUS) {
        const eventData: number[] = message.valueArray1;
        handleTaskCurrentStatus(eventData);
        return;
      }

      // if (message.type >= 100 && message.type <= 200) {
      //   const eventData: number[] = message.valueArray2;
      //   const craneId = message.type;
      //   sendToDifferentCrane(eventData, craneId);
      //   return;
      // }


      if (message.type === 20) {
        console.error("message.valueArray2", message.valueArray2);
        // const craneId = message.type;
        sendToDifferentCrane(message.valueArray2, 101 as unknown as number);
        return;
      }
    };

    const handleTaskCurrentStatus = (eventData: number[]) => {
      if (eventData[0] === 1) {
        AlertModalManager.current?.show({
          title: "碰撞预警",
          message: "塔吊碰撞预警，请及时处理",
          type: "warning",
          duration: 2000,
        });
      }
    };

    const handleDisconnect = () => {
      console.log("Socket disconnected");
    };

    // 使用WebSocketService的方法来监听事件
    webSocketService.on("connect", handleConnect);
    webSocketService.on("server-msg", handleServerMsg);
    webSocketService.on("disconnect", handleDisconnect);

    // 清理函数
    return () => {
      webSocketService.off("connect", handleConnect);
      webSocketService.off("server-msg", handleServerMsg);
      webSocketService.off("disconnect", handleDisconnect);
    };
  }, [cranelist]);

  const sendToDifferentCrane = (eventData: number[], craneId: number) => {
    const matchItem = cranelist.find((c) => c.id === craneId.toString());
    console.log("matchItem", matchItem);
    const craneType = matchItem?.type;
    if (matchItem) {
      const originalRotation = parseFloat(eventData[0].toFixed(2));
      const rotation = calcRotationAngle(originalRotation);
      updateCraneRotationText(matchItem.id, originalRotation.toFixed(2));
      console.error("rotation", rotation);
      updateCraneRotation(matchItem.id, rotation);
      if (window.viewer) {
        window.viewer
          .getCraneManager()
          .updateCraneRotation(matchItem.id, rotation);
      }

      if (craneType === CraneType.BOOM) {
        const carDistance = calculatePostureAbility(
          matchItem.radius || 0,
          parseFloat(eventData[1].toFixed(2))
        );
        const originalArmPitch = parseFloat(eventData[1].toFixed(2));
      
        updateCraneArmPitchText(matchItem.id, originalArmPitch.toFixed(2));
        updateCraneArmPitch(matchItem.id, carDistance);
        if (window.viewer) {
          window.viewer
            .getCraneManager()
            .updateCraneArmPitch(matchItem.id, carDistance);
        }
  
        
      } else {
        console.error("eventData-sss", eventData);
        const carDistance = parseFloat(eventData[1].toFixed(2));
        updateCraneCarDistanceText(matchItem.id, carDistance.toFixed(2));
        updateCraneCarDistance(matchItem.id, carDistance);
        if (window.viewer) {
          window.viewer
            .getCraneManager()
            .updateCraneCarDistance(matchItem.id, carDistance);
        }
      }

      const ropeLength = parseFloat((eventData[2] / 10).toFixed(2));
      updateRopeLength(matchItem.id, ropeLength);
      if (window.viewer) {
        window.viewer
          .getCraneManager()
          .updateRopeLength(matchItem.id, ropeLength);
      }
    } else {
      console.error("No match item found");
    }
  };

  return (
    <div style={{ position: "absolute", top: 0, right: 0, zIndex: 1000 }}></div>
  );
};
