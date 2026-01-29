// import { modelRadius } from "three/tsl";
import type { Point3D } from "../types";
import { useStore } from "../store";

export async function handleServerWebsocketMsg(data: unknown) {
    try {
        let uint8Array: Uint8Array | null = null;
        
        // 处理不同类型的数据
        if (data instanceof Uint8Array) {
          uint8Array = data;
        } else if (data instanceof ArrayBuffer) {
          uint8Array = new Uint8Array(data);
        } else if (data instanceof Blob) {
          const buffer = await data.arrayBuffer();
          uint8Array = new Uint8Array(buffer);
        } else {
          console.log('收到其他类型数据:', typeof data, data);
          return;
        }
        
        if (uint8Array) {
          // 二进制数据 - 需要解析命令字和文件数据
          console.log(`收到二进制数据，长度: ${uint8Array.length}`);
          parseBinaryMessage(uint8Array);
        }
      } catch (e) {
        console.error('处理数据时出错: ', e);
      }
}

  /// 解析二进制消息，分离命令字和文件数据
  /// 命令字格式：1 byte (0x01, 0x02, 0x04, 0x05 等)
  function parseBinaryMessage(binaryData: Uint8Array) {
    try {
      if (binaryData.length < 1) {
        console.error('数据太短，无法解析');
        return;
      }

      // 获取第1个字节作为命令字（1 byte）
      const commandInt = binaryData[0];
      console.log(
          `解析出命令字: 0x${commandInt.toString(16).padStart(2, '0').toUpperCase()} (${commandInt})`);

      // 根据命令字处理不同类型的文件
      handleCommandWithFile(commandInt, binaryData);
    } catch (e) {
      console.error('解析二进制消息时出错: ', e);
    }
  }

  function handleCommandWithFile(command: number, binaryData: Uint8Array) {
    console.log(
        `command ===> 0x${command.toString(16).padStart(2, '0').toUpperCase()} (${command})`);
    try {
      switch (command) {
        case 0x01: // (待定义)
          console.log('命令字 0x01 暂未实现');
          break;
        case 0x02: // Path list
          // eslint-disable-next-line no-case-declarations
          const pathListData = binaryData.subarray(1);
          console.log('Path list data: ', pathListData);
          handlePathListData(pathListData);
          break;
        default:
          console.log(
              `未知命令字: 0x${command.toString(16).padStart(2, '0').toUpperCase()} (${command})`);
      }
    } catch (e) {
      console.error(
          `处理命令 0x${command.toString(16).padStart(2, '0').toUpperCase()} 时出错: ${e}`);
    }
  }

function handlePathListData(pathListData: Uint8Array) {
    try {
      if (pathListData.length < 1 + 4) {
        console.error('Path list 数据太短，无法解析: len=${pathListData.length}');
        return;
      }

      const bytes = new Uint8Array(pathListData);
      const bd = new DataView(bytes.buffer);

      let offset = 0;
      const type = bd.getUint8(offset);
      offset += 1;

      const pointNum = bd.getUint32(offset, true);
      offset += 4;

      // 每个 Point3D 都是 3 个 double (Float64)，每个 8 字节，共 24 字节
      const expectedLen = 1 + 4 + pointNum * 24;
      if (bytes.length < expectedLen) {
        console.error(
            'Path list 数据长度不足: len=${bytes.length}, expected=$expectedLen, point_num=$pointNum');
        return;
      }

      const points: Point3D[] = [];

      for (let i = 0; i < pointNum; i++) {
        if (type == 0) {
          // type == 0: Point3D { radius, angle, h } (极坐标)
          // 注意：后端发送的数据格式为 {radius, angle, h}
          // - radius: 半径（已计算好的）
          // - angle: 角度（0-360度）
          // - h: 高度
          const radius = bd.getFloat64(offset, true);
          offset += 8;
          const angle = bd.getFloat64(offset, true);
          offset += 8;
          const h = bd.getFloat64(offset, true);
          offset += 8;

          // 将极坐标转换为笛卡尔坐标，以便与 PathPlanNewPainter 配合
          // 角度从度数转换为弧度
          // const angleRad = angle * (Math.PI / 180);

          // 极坐标转笛卡尔坐标：
          // x = radius * cos(angle)
          // y = radius * sin(angle)
          // z = h (高度保持不变)
          const x = radius;
          const y = angle;
          const z = h;

          // Point x=24.98618682225545, y=130.4053077697754° ->  z = 32.602776845296226
          points.push({ x, y, z });


          if (i < 3) {
            console.log(
                `Point[${i}]: radius=${radius}, angle=${angle}° -> (x=${x}, y=${y}, z=${z})`);
          }
        } else if (type == 1) {
          // type == 1: Point3D { x, y, z } (笛卡尔坐标，直接使用)
          const x = bd.getFloat64(offset, true);
          offset += 8;
          const y = bd.getFloat64(offset, true);
          offset += 8;
          const z = bd.getFloat64(offset, true);
          offset += 8;

          points.push({ x, y, z });
        }
      }

      console.log('Path type: ', type, '(0=reference path, 1=actual path)');
      console.log('Path point_num: ', pointNum);
      console.log('Path points: ', points);

      const payload = { type, points };

      console.log('Path list handlePathListData payload: ', payload);

      // 获取当前操作的塔吊ID
      const { currentMovingCraneId, currentOperationCraneId, isInPointLift } = useStore.getState();
      console.log('currentMovingCraneId: ', currentMovingCraneId);
      console.log('isInPointLift: ', isInPointLift);

        console.log('isInPointLift: ', isInPointLift);
        const craneId = currentMovingCraneId || currentOperationCraneId;
        console.log('craneId: ', craneId);
        if (craneId && window.viewer) {
          // 将 points 转换为 [angle, distance, height] 格式
          // 根据用户修改，points 格式为 { x: radius, y: angle, z: height }
          const pathData: Array<[number, number, number]> = points.map(p => [p.y, p.x, p.z]);
          window.viewer.drawPredictedPath(craneId, pathData);
          console.log(`绘制预测路径: craneId=${craneId}, points=${pathData.length}`);
        } else {
          console.warn('无法绘制预测路径: 缺少 craneId 或 viewer');
        }
      




      console.log('Path list payload: ', payload);
    } catch (e) {
      console.error('解析 Path list 数据失败: ', e);
    }
  }
