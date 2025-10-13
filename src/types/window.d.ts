/**
 * 全局 Window 接口扩展
 * 声明挂载到 window 对象上的自定义属性
 */

import { PointCloudViewer } from '../utils/pointcloud-viewer';
import { UIController } from '../utils/ui-controller';

declare global {
  interface Window {
    /** 点云查看器实例 */
    viewer?: PointCloudViewer;
    
    /** UI控制器实例 */
    uiController?: UIController;
    
    /** 当前PCD文件数据（用于重新解析） */
    currentPCDData?: ArrayBuffer | string;
    
    /** 当前文件名 */
    currentFileName?: string;
  }
}

// 确保这个文件被视为模块
export {};

