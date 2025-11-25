/**
 * PCD文件解析器模块
 * 负责解析PCD文件格式，支持ASCII和二进制格式
 */

export class PCDParser {
    /**
     * 解析PCD文件
     * @param {ArrayBuffer|string} data - PCD文件数据
     * @returns {Object} 解析后的点云数据
     */
    static parsePCD(data: ArrayBuffer | string) {
      console.log(
        "开始解析PCD文件，数据类型:",
        data instanceof ArrayBuffer ? "ArrayBuffer" : "String"
      );
      console.log(
        "数据大小:",
        data instanceof ArrayBuffer ? data.byteLength : data.length
      );
  
      let textData;
      let binaryData = null;
  
      if (data instanceof ArrayBuffer) {
        console.log("处理二进制PCD文件");
        const view = new Uint8Array(data);
        let headerText = "";
        let dataStart = 0;
  
        // 查找DATA行
        for (let i = 0; i < Math.min(view.length, 2048); i++) {
          const char = String.fromCharCode(view[i]);
          headerText += char;
  
          // 检查是否到达DATA行
          if (
            headerText.includes("DATA binary") ||
            headerText.includes("DATA ascii")
          ) {
            // 找到完整的DATA行
            while (i < view.length && view[i] !== 10) {
              // 找到行尾
              i++;
            }
            dataStart = i + 1;
            console.log("找到DATA行，数据开始位置:", dataStart);
            break;
          }
        }
  
        textData = headerText;
        binaryData = data.slice(dataStart);
        console.log(
          "头部长度:",
          textData.length,
          "二进制数据长度:",
          binaryData.byteLength
        );
      } else {
        textData = data;
        console.log("处理文本PCD文件");
      }
  
      const lines = textData.split("\n");
      let headerEnd = 0;
      let pointsCount = 0;
      let fields: string[] = [];
      let sizes: number[] = [];
      let types: string[] = [];
      let dataType = "ascii";
  
      // 解析头部
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
  
        if (line.startsWith("FIELDS")) {
          fields = line.split(" ").slice(1);
        } else if (line.startsWith("SIZE")) {
          sizes = line
            .split(" ")
            .slice(1)
            .map((s) => parseInt(s));
        } else if (line.startsWith("TYPE")) {
          types = line.split(" ").slice(1);
        } else if (line.startsWith("POINTS")) {
          pointsCount = parseInt(line.split(" ")[1]);
        } else if (line.startsWith("DATA")) {
          dataType = line.split(" ")[1];
          headerEnd = i + 1;
          break;
        }
      }
  
      console.log(
        `解析PCD文件: ${pointsCount}个点, 字段: ${fields.join(
          ","
        )}, 数据类型: ${dataType}`
      );
  
      const positions: number[] = [];
      const colors: number[] = [];
  
      if (dataType === "ascii") {
        this.parseASCIIData(lines, headerEnd, positions, colors, pointsCount);
      } else if (dataType === "binary" && binaryData) {
        this.parseBinaryData(binaryData, fields, sizes, types, positions, colors, pointsCount);
      }
  
      if (positions.length === 0) {
        throw new Error("无法解析PCD文件或文件中没有有效的点数据");
      }
  
      // 计算边界框和尺寸
      const boundingBox = this.calculateBoundingBox(positions);
      
      console.log("点云边界信息:", boundingBox);
  
      return {
        positions: new Float32Array(positions),
        colors: new Float32Array(colors),
        count: positions.length / 3,
        boundingBox: boundingBox, // 添加边界框信息
      };
    }
  
    /**
     * 解析ASCII格式数据
     * @param {Array<string>} lines - 文本行数组
     * @param {number} headerEnd - 头部结束位置
     * @param {Array<number>} positions - 位置数组
     * @param {Array<number>} colors - 颜色数组
     * @param {number} pointsCount - 点数量
     */
    static parseASCIIData(lines: string[], headerEnd: number, positions: number[], colors: number[], pointsCount: number) {
      for (let i = headerEnd; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue;
  
        const values = line.split(/\s+/).map((v) => parseFloat(v));
        if (values.length >= 3) {
          positions.push(values[0], values[1], values[2]);
  
          if (values.length >= 6) {
            colors.push(
              values[3] / 255,
              values[4] / 255,
              values[5] / 255
            );
          } else if (values.length >= 4) {
            // RGB打包格式
            const rgb = parseInt(values[3].toString());
            colors.push(
              ((rgb >> 16) & 0xff) / 255.0,
              ((rgb >> 8) & 0xff) / 255.0,
              (rgb & 0xff) / 255.0
            );
          } else {
            // 默认渐变色
            const t = positions.length / 3 / pointsCount;
            colors.push(0.2 + t * 0.3, 0.6 + t * 0.2, 1.0 - t * 0.3);
          }
        }
      }
    }
  
    /**
     * 解析二进制格式数据
     * @param {ArrayBuffer} binaryData - 二进制数据
     * @param {Array<string>} fields - 字段名数组
     * @param {Array<number>} sizes - 字段大小数组
     * @param {Array<string>} types - 字段类型数组
     * @param {Array<number>} positions - 位置数组
     * @param {Array<number>} colors - 颜色数组
     * @param {number} pointsCount - 点数量
     */
    static parseBinaryData(binaryData: ArrayBuffer, fields: string[], sizes: number[], types: string[], positions: number[], colors: number[], pointsCount: number) {
      console.log("开始解析二进制数据");
      console.log("字段:", fields);
      console.log("大小:", sizes);
      console.log("类型:", types);
  
      const view = new DataView(binaryData);
      let offset = 0;
  
      // 计算每个点的字节大小
      let pointSize = 0;
      for (let i = 0; i < fields.length; i++) {
        pointSize += sizes[i] || 4;
      }
  
      console.log(`每个点占用 ${pointSize} 字节`);
  
      // 获取用户设置的点云密度
      const densitySelect = document.getElementById("point-density");
      const maxPointsSetting = parseInt(
        densitySelect ? (densitySelect as HTMLSelectElement).value : "50000"
      );
      const maxPoints =
        maxPointsSetting === 0
          ? pointsCount
          : Math.min(pointsCount, maxPointsSetting);
      const step = Math.max(1, Math.floor(pointsCount / maxPoints)); // 采样步长
  
      console.log(
        `将解析 ${maxPoints} 个点 (原始: ${pointsCount}个点, 采样步长: ${step})`
      );
  
      let parsedPoints = 0;
  
      for (
        let i = 0;
        i < pointsCount &&
        offset + pointSize <= binaryData.byteLength &&
        parsedPoints < maxPoints;
        i += step
      ) {
        let fieldOffset = 0;
        let x = 0, y = 0, z = 0;
        let r = 0.2, g = 0.6, b = 1.0;
  
        try {
          // 读取各个字段
          for (let j = 0; j < fields.length; j++) {
            const field = fields[j];
            const size = sizes[j] || 4;
            const type = types[j] || "F";
  
            let value = 0;
            let floatValue = 0;
            if (type === "F" && size === 4) {
              floatValue = view.getFloat32(offset + fieldOffset, true);
              value = floatValue;
            } else if (type === "U" && size === 1) {
              value = view.getUint8(offset + fieldOffset);
            } else if (type === "U" && size === 4) {
              value = view.getUint32(offset + fieldOffset, true);
            } else if (type === "I" && size === 4) {
              value = view.getInt32(offset + fieldOffset, true);
            }

            // 根据字段名分配值
            if (field === "x") x = value;
            else if (field === "y") y = value;
            else if (field === "z") z = value;
            else if (field === "rgb" || field === "rgba") {
              // RGB字段处理：完全按照U类型的方式处理，无论声明为U还是F类型
              // 因为即使声明为F类型，实际存储的也是打包的RGB整数
              if ((type === "U" || type === "F") && size === 4) {
                // 直接从原始字节读取32位无符号整数（与U类型完全相同）
                // 格式：0xRRGGBB (高位到低位：R, G, B)
                const rgbValue = view.getUint32(offset + fieldOffset, true);
                
                // 使用与U类型完全相同的RGB提取方式
                r = ((rgbValue >> 16) & 0xff) / 255.0;
                g = ((rgbValue >> 8) & 0xff) / 255.0;
                b = (rgbValue & 0xff) / 255.0;
              }
            } else if (field === "r") {
              // 单独的r字段
              if (type === "F" && size === 4) {
                r = floatValue > 1.0 ? Math.min(floatValue / 255.0, 1.0) : Math.max(0, Math.min(floatValue, 1.0));
              } else if (type === "U" && size === 1) {
                r = value / 255.0;
              }
            } else if (field === "g") {
              // 单独的g字段
              if (type === "F" && size === 4) {
                g = floatValue > 1.0 ? Math.min(floatValue / 255.0, 1.0) : Math.max(0, Math.min(floatValue, 1.0));
              } else if (type === "U" && size === 1) {
                g = value / 255.0;
              }
            } else if (field === "b") {
              // 单独的b字段
              if (type === "F" && size === 4) {
                b = floatValue > 1.0 ? Math.min(floatValue / 255.0, 1.0) : Math.max(0, Math.min(floatValue, 1.0));
              } else if (type === "U" && size === 1) {
                b = value / 255.0;
              }
            }
  
            fieldOffset += size;
          }
  
          // 验证坐标有效性
          if (
            !isNaN(x) &&
            !isNaN(y) &&
            !isNaN(z) &&
            Math.abs(x) < 1000 &&
            Math.abs(y) < 1000 &&
            Math.abs(z) < 1000
          ) {
            positions.push(x, y, z);
            colors.push(r, g, b);
            parsedPoints++;
          }
        } catch (error) {
          console.warn(`跳过点 ${i}:`, (error as Error).message);
        }
  
        offset += pointSize * step;
      }
  
      console.log(`二进制解析完成: ${parsedPoints}个点`);
    }
  
    /**
     * 计算点云的边界框和尺寸信息
     * @param {Array<number>} positions - 位置数组 [x1, y1, z1, x2, y2, z2, ...]
     * @returns {Object} 边界框信息
     */
    static calculateBoundingBox(positions: number[]) {
      if (positions.length === 0) {
        return null;
      }
  
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
  
      // 遍历所有点，找到最小和最大值
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
  
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
  
      // 计算尺寸
      const width = maxX - minX;   // X轴方向的长度
      const height = maxY - minY;  // Y轴方向的长度
      const depth = maxZ - minZ;   // Z轴方向的长度
  
      // 计算中心点
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;
  
      // 计算比例
      const maxDimension = Math.max(width, height, depth);
      const aspectRatioXY = height !== 0 ? width / height : 1;  // 宽高比 (XY平面)
      const aspectRatioXZ = depth !== 0 ? width / depth : 1;    // 宽深比
      const aspectRatioYZ = depth !== 0 ? height / depth : 1;   // 高深比
  
      return {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
        center: { x: centerX, y: centerY, z: centerZ },
        size: {
          width: width,      // X轴尺寸
          height: height,    // Y轴尺寸
          depth: depth,      // Z轴尺寸
          maxDimension: maxDimension  // 最大尺寸
        },
        aspectRatio: {
          xy: aspectRatioXY,  // 宽高比
          xz: aspectRatioXZ,  // 宽深比
          yz: aspectRatioYZ   // 高深比
        },
        // 提供更直观的描述
        dimensions: `${width.toFixed(2)} × ${height.toFixed(2)} × ${depth.toFixed(2)}`,
        ratioDescription: `宽:高:深 = ${(width/maxDimension).toFixed(2)}:${(height/maxDimension).toFixed(2)}:${(depth/maxDimension).toFixed(2)}`
      };
    }
  }
  