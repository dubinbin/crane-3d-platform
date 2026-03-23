import { useEffect, useRef } from "react";
import { Deserialize, type Message } from "../utils/deserialize";
import {
  SYSTEM_INFO_TYPE_MAP,
  WEBSOCKET_RESPONSE_CODE_MAP,
} from "../constants";
import { useStore } from "../store";
import {
  calcRotationAngle,
  calculatePostureAbility,
} from "../utils/posture-ability";
import { AlertModalManager } from "./alert-model";
import { CraneType } from "../types";
import { handleServerWebsocketMsg } from "./server-websocket-handle";

export const WebSocketAPIComponent = () => {
  const updateCraneArmPitch = useStore((state) => state.updateCraneArmPitch);
  const updateRopeLength = useStore((state) => state.updateRopeLength);
  const updateCraneRotation = useStore((state) => state.updateCraneRotation);
  const setIsInPointLift = useStore((state) => state.setIsInPointLift);
  const setCurrentMovingCraneId = useStore(
    (state) => state.setCurrentMovingCraneId,
  );
  const updateCraneRotationText = useStore(
    (state) => state.updateCraneRotationText,
  );
  const updateCraneArmPitchText = useStore(
    (state) => state.updateCraneArmPitchText,
  );
  const updateCraneCarDistance = useStore(
    (state) => state.updateCraneCarDistance,
  );

  const updateCraneCarDistanceText = useStore(
    (state) => state.updateCraneCarDistanceText,
  );
  const cranelist = useStore((state) => state.cranes);

  // 使用 ref 保存最新的值，避免闭包问题
  const cranelistRef = useRef(cranelist);
  cranelistRef.current = cranelist;

  const updateFunctionsRef = useRef({
    updateCraneArmPitch,
    updateRopeLength,
    updateCraneRotation,
    updateCraneRotationText,
    updateCraneArmPitchText,
    updateCraneCarDistance,
    updateCraneCarDistanceText,
  });
  // 更新 ref 中的函数引用
  updateFunctionsRef.current = {
    updateCraneArmPitch,
    updateRopeLength,
    updateCraneRotation,
    updateCraneRotationText,
    updateCraneArmPitchText,
    updateCraneCarDistance,
    updateCraneCarDistanceText,
  };

  // 在组件挂载时设置 Flutter JS channel 消息处理
  useEffect(() => {
    const FRAME_LEN = 40; // 与后端 serializeMessage 中的 byteNumber 保持一致

    // 将数据转换为 Uint8Array
    const toUint8Array = async (data: unknown): Promise<Uint8Array | null> => {
      if (data instanceof Uint8Array) return data;
      if (data instanceof ArrayBuffer) return new Uint8Array(data);
      if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());

      // socket.io 在 polling 等情况下可能给 { type: 'Buffer', data: number[] }
      if (
        data &&
        typeof data === "object" &&
        "type" in data &&
        (data as { type?: unknown }).type === "Buffer" &&
        "data" in data &&
        Array.isArray((data as { data?: unknown }).data)
      ) {
        return new Uint8Array((data as { data: number[] }).data);
      }

      return null;
    };

    // 处理从 Flutter JS channel 接收的消息
    const handleServerMsg = async (data: unknown) => {
      const buffer = await toUint8Array(data);

      if (!buffer || buffer.length === 0) {
        console.error("Could not extract valid buffer from data", data);
        return;
      }

      // TCP chunk 可能一次带多帧（40 bytes/帧），这里按帧解包
      const frames = Math.floor(buffer.length / FRAME_LEN);
      if (frames === 0) {
        console.warn(
          `Got ${buffer.length} bytes (<${FRAME_LEN}), skip`,
          buffer,
        );
        return;
      }

      for (let i = 0; i < frames; i++) {
        try {
          const message: Message = Deserialize.deserialize(
            buffer,
            i,
            FRAME_LEN,
          );
          handleSocketMessage(message);
        } catch (error) {
          console.error("Error deserializing frame:", i, error);
        }
      }
    };

    // 对应Flutter的handleSocketMessage().onData(message)
    const handleSocketMessage = (message: Message) => {
      // console.log("Processing socket message:", message);
      // console.log("UserID:", message.userID);
      // console.log("TimeStamp:", message.timeStamp);
      // console.log("Type:", message.type);
      // console.log("ValueArray1 (Int16):", message.valueArray1);
      // console.log("ValueArray2 (Float64):", message.valueArray2);

      if (message.type === WEBSOCKET_RESPONSE_CODE_MAP.TASK_CURRENT_STATUS) {
        const eventData: number[] = message.valueArray1;
        handleTaskCurrentStatus(eventData);
        return;
      }

      if (message.type === WEBSOCKET_RESPONSE_CODE_MAP.SYSTEM_INFO) {
        if (message.valueArray1?.[0] === SYSTEM_INFO_TYPE_MAP.pointLift) {
          setIsInPointLift(true);
        } else {
          setIsInPointLift(false);
        }
      }

      if (
        [
          WEBSOCKET_RESPONSE_CODE_MAP.TASK_CURRENT_STATUS,
          WEBSOCKET_RESPONSE_CODE_MAP.EMERGENCY_STOP,
          WEBSOCKET_RESPONSE_CODE_MAP.AUTO_TRANSPORT_END,
        ].includes(message.type)
      ) {
        setIsInPointLift(false);
      }

      // if (message.type >= 100 && message.type <= 200) {
      //   const eventData: number[] = message.valueArray2;
      //   const craneId = message.type;
      //   sendToDifferentCrane(eventData, craneId);
      //   return;
      // }

      if (message.type === WEBSOCKET_RESPONSE_CODE_MAP.CURRENT_MOVING_POSTURE) {
        // const craneId = message.type;
        const craneId = 101 as unknown as number;
        setCurrentMovingCraneId(craneId.toString());
        sendToDifferentCrane(message.valueArray2, craneId);
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

    // 定义 sendToDifferentCrane 函数，使用 ref 访问最新的值
    const sendToDifferentCrane = (eventData: number[], craneId: number) => {
      const matchItem = cranelistRef.current.find(
        (c) => c.id === craneId.toString(),
      );
      const craneType = matchItem?.type;
      const updates = updateFunctionsRef.current;

      if (matchItem) {
        const originalRotation = parseFloat(eventData[0].toFixed(2));
        const rotation = calcRotationAngle(originalRotation);
        updates.updateCraneRotationText(
          matchItem.id,
          originalRotation.toFixed(2),
        );
        updates.updateCraneRotation(matchItem.id, rotation);
        if (window.viewer) {
          window.viewer
            .getCraneManager()
            .updateCraneRotation(matchItem.id, rotation);
        }

        if (craneType === CraneType.BOOM) {
          const carDistance = calculatePostureAbility(
            matchItem.radius || 0,
            parseFloat(eventData[1].toFixed(2)),
          );
          const originalArmPitch = parseFloat(eventData[1].toFixed(2));

          updates.updateCraneArmPitchText(
            matchItem.id,
            originalArmPitch.toFixed(2),
          );
          updates.updateCraneArmPitch(matchItem.id, carDistance);
          if (window.viewer) {
            window.viewer
              .getCraneManager()
              .updateCraneArmPitch(matchItem.id, carDistance);
          }
        } else {
          const carDistance = parseFloat(eventData[1].toFixed(2));
          updates.updateCraneCarDistanceText(
            matchItem.id,
            carDistance.toFixed(2),
          );
          updates.updateCraneCarDistance(matchItem.id, carDistance);
          if (window.viewer) {
            window.viewer
              .getCraneManager()
              .updateCraneCarDistance(matchItem.id, carDistance);
          }
        }

        const ropeLength =
          matchItem.originalHeight * ((matchItem.ropePercent || 100) / 100) -
          eventData[2];

        updates.updateRopeLength(matchItem.id, ropeLength);
        if (window.viewer) {
          window.viewer
            .getCraneManager()
            .updateRopeLength(matchItem.id, ropeLength);
        }
      } else {
        console.error("No match item found");
      }
    };

    // 将消息处理函数挂载到 window 对象，供 Flutter JS channel 调用
    window.handleServerMsg = handleServerMsg;
    window.handleServerWebsocketMsg = handleServerWebsocketMsg;

    // 清理函数
    return () => {
      if (window.handleServerMsg === handleServerMsg) {
        delete window.handleServerMsg;
      }
      if (window.handleServerWebsocketMsg === handleServerWebsocketMsg) {
        delete window.handleServerWebsocketMsg;
      }
    };
  }, [setCurrentMovingCraneId, setIsInPointLift]); // 依赖 zustand actions（稳定引用）

  return (
    <div style={{ position: "absolute", top: 0, right: 0, zIndex: 1000 }}></div>
  );
};
