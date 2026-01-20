/**
 * PCD文件解析器模块
 * 负责解析PCD文件格式，支持ASCII和二进制格式
 * 
 * 内存优化说明：
 * - 预分配数组大小，减少动态扩容带来的内存重新分配
 * - 使用索引直接赋值而非push，避免数组增长时的多次内存复制
 * - 解析完成后立即截断数组到实际大小，释放多余内存
 * - 创建Float32Array后立即清理临时数组引用，帮助GC回收
 * 
 * 注意：内存峰值高的原因：
 * 1. 解析过程中原始数据、临时数组、最终数组同时存在
 * 2. JavaScript GC延迟，临时对象不会立即释放
 * 3. Three.js的BufferGeometry也会占用额外内存
 * 4. 如果保存了window.currentPCDData，原始数据会一直占用内存
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
  
      // 预分配数组大小以减少内存重新分配
      // 根据采样设置估算实际需要的点数
      const densitySelect = document.getElementById("point-density");
      const maxPointsSetting = parseInt(
        densitySelect ? (densitySelect as HTMLSelectElement).value : "50000"
      );
      const estimatedPoints = maxPointsSetting === 0
        ? pointsCount
        : Math.min(pointsCount, maxPointsSetting);
      
      // 预分配数组，减少内存重新分配次数
      const positions: number[] = [];
      const colors: number[] = [];
      positions.length = estimatedPoints * 3;
      colors.length = estimatedPoints * 3;
      let actualIndex = 0;

      if (dataType === "ascii") {
        actualIndex = this.parseASCIIData(lines, headerEnd, positions, colors, pointsCount, actualIndex);
      } else if (dataType === "binary" && binaryData) {
        actualIndex = this.parseBinaryData(binaryData, fields, sizes, types, positions, colors, pointsCount, actualIndex);
      }

      if (actualIndex === 0) {
        throw new Error("无法解析PCD文件或文件中没有有效的点数据");
      }

      // 截断数组到实际大小，释放多余内存
      positions.length = actualIndex * 3;
      colors.length = actualIndex * 3;

      // 计算边界框和尺寸（使用实际数据）
      const boundingBox = this.calculateBoundingBox(positions);
      
      console.log("点云边界信息:", boundingBox);

      // 直接创建Float32Array，避免中间数组的额外占用
      const positionsArray = new Float32Array(positions);
      const colorsArray = new Float32Array(colors);
      
      // 清理临时数组引用，帮助GC
      positions.length = 0;
      colors.length = 0;

      return {
        positions: positionsArray,
        colors: colorsArray,
        count: actualIndex,
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
     * @param {number} startIndex - 起始索引
     * @returns {number} 实际解析的点数
     */
    static parseASCIIData(lines: string[], headerEnd: number, positions: number[], colors: number[], pointsCount: number, startIndex: number = 0): number {
      let index = startIndex;
      for (let i = headerEnd; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue;

        const values = line.split(/\s+/).map((v) => parseFloat(v));
        if (values.length >= 3) {
          const posIdx = index * 3;
          positions[posIdx] = values[0];
          positions[posIdx + 1] = values[1];
          positions[posIdx + 2] = values[2];

          const colorIdx = index * 3;
          if (values.length >= 6) {
            colors[colorIdx] = values[3] / 255;
            colors[colorIdx + 1] = values[4] / 255;
            colors[colorIdx + 2] = values[5] / 255;
          } else if (values.length >= 4) {
            // RGB打包格式
            const rgb = parseInt(values[3].toString());
            colors[colorIdx] = ((rgb >> 16) & 0xff) / 255.0;
            colors[colorIdx + 1] = ((rgb >> 8) & 0xff) / 255.0;
            colors[colorIdx + 2] = (rgb & 0xff) / 255.0;
          } else {
            // 默认渐变色
            const t = index / pointsCount;
            colors[colorIdx] = 0.2 + t * 0.3;
            colors[colorIdx + 1] = 0.6 + t * 0.2;
            colors[colorIdx + 2] = 1.0 - t * 0.3;
          }
          index++;
        }
      }
      return index;
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
     * @param {number} startIndex - 起始索引
     * @returns {number} 实际解析的点数
     */
    static parseBinaryData(binaryData: ArrayBuffer, fields: string[], sizes: number[], types: string[], positions: number[], colors: number[], pointsCount: number, startIndex: number = 0): number {
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

      let parsedPoints = startIndex;

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
            // 直接写入预分配的数组位置，避免push操作
            const posIdx = parsedPoints * 3;
            positions[posIdx] = x;
            positions[posIdx + 1] = y;
            positions[posIdx + 2] = z;
            
            const colorIdx = parsedPoints * 3;
            colors[colorIdx] = r;
            colors[colorIdx + 1] = g;
            colors[colorIdx + 2] = b;
            
            parsedPoints++;
          }
        } catch (error) {
          console.warn(`跳过点 ${i}:`, (error as Error).message);
        }

        offset += pointSize * step;
      }

      console.log(`二进制解析完成: ${parsedPoints - startIndex}个点`);
      return parsedPoints;
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
  