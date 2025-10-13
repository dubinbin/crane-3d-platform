/**
 * 工具函数模块
 * 包含文件读取、数据处理等通用工具函数
 */

export class FileUtils {
    /**
     * 读取文件内容
     * @param {File} file - 文件对象
     * @returns {Promise<ArrayBuffer|string>} 文件内容
     */
    static readFile(file: File) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
  
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const view = new Uint8Array(arrayBuffer);
          const sample = Math.min(1024, view.length);
          let isText = true;
  
          for (let i = 0; i < sample; i++) {
            const byte = view[i];
            if (byte < 9 || (byte > 13 && byte < 32) || byte > 126) {
              if (byte !== 0) {
                isText = false;
                break;
              }
            }
          }
  
          if (isText) {
            const decoder = new TextDecoder("utf-8");
            resolve(decoder.decode(arrayBuffer));
          } else {
            resolve(arrayBuffer);
          }
        };
  
        reader.onerror = () => reject(new Error("文件读取失败"));
        reader.readAsArrayBuffer(file);
      });
    }
  
    /**
     * 从服务器获取文件
     * @param {string} url - 文件URL
     * @param {string} fileName - 文件名
     * @returns {Promise<File>} 文件对象
     */
    static async fetchFileFromServer(url: string, fileName: string) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`网络响应异常: ${response.status}`);
        }
        
        const blob = await response.blob();
        const file = new File([blob], fileName, {
          type: blob.type,
          lastModified: Date.now()
        });
  
        return file;
      } catch (error) {
        console.error('获取或转换文件时出错:', error);
        throw error;
      }
    }
  }
  
  export class MathUtils {
    /**
     * 将角度转换为弧度
     * @param {number} degrees - 角度
     * @returns {number} 弧度
     */
    static degreesToRadians(degrees: number) {
      return degrees * Math.PI / 180;
    }
  
    /**
     * 将弧度转换为角度
     * @param {number} radians - 弧度
     * @returns {number} 角度
     */
    static radiansToDegrees(radians: number) {
      return radians * 180 / Math.PI;
    }
  
    /**
     * 限制数值在指定范围内
     * @param {number} value - 数值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 限制后的数值
     */
    static clamp(value: number, min: number, max: number) {
      return Math.min(Math.max(value, min), max);
    }
  }
  
  export class ColorUtils {
    /**
     * 将十六进制颜色转换为THREE.js颜色值
     * @param {string} hexColor - 十六进制颜色字符串
     * @returns {number} THREE.js颜色值
     */
    static hexToThreeColor(hexColor: string) {
      return parseInt(hexColor.replace("#", "0x"));
    }
  
    /**
     * 生成渐变色
     * @param {number} index - 当前索引
     * @param {number} total - 总数
     * @returns {Array<number>} RGB颜色数组
     */
    static generateGradientColor(index: number, total: number) {
      const t = index / total;
      return [
        0.2 + t * 0.3,
        0.6 + t * 0.2,
        1.0 - t * 0.3
      ];
    }
  }
  