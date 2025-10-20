// 对应Flutter的Message类
export interface Message {
  userID: string;
  timeStamp: number;
  type: number;
  valueArray1: number[]; // 3个Int16
  valueArray2: number[]; // 3个Float64
}

export class Deserialize {
  // 对应Flutter的Message.deserialize(data, {offset = 0, length = 40})
  static deserialize(data: Uint8Array, offset: number = 0, length: number = 40): Message {
    console.log("Deserializing message with length:", data.length);
    console.log("Offset:", offset, "Length:", length);
    console.log("Raw bytes:", Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // debugPrint equivalent - 对应Flutter: 'first byte ===> ${data[0+offset*length]}'
    // 注意：这个调试打印在 offset *= length 之前执行
    console.log('first byte ===>', data[0 + offset * length]);
    
    // offset *= length (对应Flutter代码)
    offset *= length;
    
    // 确保有足够的数据
    if (data.length < offset + length) {
      throw new Error(`Not enough data: need ${offset + length} bytes, got ${data.length}`);
    }
    
    // 创建DataView来读取二进制数据（对应Flutter的ByteData）
    const buffer = new DataView(data.buffer, data.byteOffset + offset, length);
    
    // 按照Flutter代码的格式解析数据
    const deUserID = buffer.getUint8(0); // 对应Flutter: buffer.getUint8(0 + offset)
    const deTimeStamp = buffer.getBigInt64(1, true); // 对应Flutter: buffer.getInt64(1 + offset, Endian.little)
    const deType = buffer.getUint8(9); // 对应Flutter: buffer.getUint8(9 + offset)
    
    // 读取3个Int16值
    const deValueArray1: number[] = [];
    for (let i = 0; i < 3; i++) {
      deValueArray1.push(buffer.getInt16(10 + 2 * i, true)); // 对应Flutter: buffer.getInt16(10 + 2 * index + offset, Endian.little)
    }
    
    // 读取3个Float64值
    const deValueArray2: number[] = [];
    for (let i = 0; i < 3; i++) {
      deValueArray2.push(buffer.getFloat64(16 + 8 * i, true)); // 对应Flutter: buffer.getFloat64(16 + 8 * index + offset, Endian.little)
    }
    
    console.log("Parsed data:", {
      deUserID,
      deTimeStamp: deTimeStamp.toString(),
      deType,
      deValueArray1,
      deValueArray2
    });
    
    // 返回Message对象（对应Flutter的Message构造器）
    return {
      userID: deUserID.toString(),
      timeStamp: Number(deTimeStamp),
      type: deType,
      valueArray1: deValueArray1,
      valueArray2: deValueArray2
    };
  }
  
  // 保留原来的方法用于特殊情况
  static deserializeWithOffset(data: Uint8Array, offset: number = 0, length?: number): Uint8Array {
    // 如果没有指定长度，使用数据的完整长度
    const actualLength = length || (data.length - offset);
    
    // 确保 offset 和 length 在有效范围内
    if (offset < 0 || offset >= data.length) {
      throw new Error(`Offset ${offset} is out of range for data of length ${data.length}`);
    }
    
    if (actualLength <= 0 || offset + actualLength > data.length) {
      throw new Error(`Length ${actualLength} is invalid for offset ${offset} and data length ${data.length}`);
    }
    
    // 直接从 Uint8Array 中提取指定区域
    const buffer = new Uint8Array(data.buffer, data.byteOffset + offset, actualLength);
    return buffer;
  }
  
  // 添加一个方法来解析特定格式的数据
  static parseMessage(data: Uint8Array): { type: number; length: number; payload: Uint8Array } | null {
    console.log("Parsing message with length:", data.length);
    console.log("Raw bytes:", Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // 这里可以根据您的协议格式来解析数据
    // 例如，如果前4个字节是消息类型，接下来4个字节是长度等
    
    if (data.length < 4) {
      console.warn("Message too short, length:", data.length);
      return null;
    }
    
    // 示例解析逻辑 - 您需要根据实际协议调整
    try {
      const messageType = new DataView(data.buffer, data.byteOffset, 4).getUint32(0, true);
      console.log("Message type:", messageType);
      
      // 假设接下来4个字节是数据长度
      const dataLength = new DataView(data.buffer, data.byteOffset + 4, 4).getUint32(0, true);
      console.log("Data length:", dataLength);
      
      // 剩余的数据
      const payload = new Uint8Array(data.buffer, data.byteOffset + 8, Math.min(dataLength, data.length - 8));
      
      return {
        type: messageType,
        length: dataLength,
        payload: payload
      };
    } catch (error) {
      console.error("Error parsing message:", error);
      return null;
    }
  }
}
