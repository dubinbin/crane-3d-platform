/**
 * UI控制器模块
 * 负责处理用户界面交互和更新
 */

import { PointCloudViewer } from './pointcloud-viewer';
import type { CraneUserData } from './crane-manager';

export class UIController {
  private viewer: PointCloudViewer;

  constructor(viewer: PointCloudViewer) {
    this.viewer = viewer;
    this.initEventListeners();
  }

  /**
   * 初始化事件监听器
   */
  private initEventListeners(): void {

    // 重置相机按钮
    const resetCameraButton = document.getElementById('reset-camera');
    if (resetCameraButton) {
      resetCameraButton.addEventListener('click', () => {
        this.viewer.resetCamera();
      });
    }

    // 添加塔吊按钮
    const addCraneButton = document.getElementById('add-crane');
    if (addCraneButton) {
      addCraneButton.addEventListener('click', () => {
        this.addCrane();
      });
    }

    // 清除所有塔吊按钮
    const clearCranesButton = document.getElementById('clear-cranes');
    if (clearCranesButton) {
      clearCranesButton.addEventListener('click', () => {
        this.clearAllCranes();
      });
    }

    console.log('UI控制器事件监听器初始化完成');
  }

  /**
   * 添加塔吊
   */
  private addCrane(): void {
    const craneManager = this.viewer.getCraneManager();
    
    // 随机位置
    const x = (Math.random() - 0.5) * 10;
    const y = (Math.random() - 0.5) * 10;
    const z = 0;
    
    const crane = craneManager.addCrane(x, y, z);
    
    if (crane) {
      this.updateCraneList();
      this.showCraneControls();
    }
  }

  /**
   * 清除所有塔吊
   */
  private clearAllCranes(): void {
    const craneManager = this.viewer.getCraneManager();
    craneManager.clearAllCranes();
    this.updateCraneList();
    this.hideCraneControls();
  }

  /**
   * 更新塔吊列表UI
   */
  private updateCraneList(): void {
    const craneManager = this.viewer.getCraneManager();
    const cranes = craneManager.getCranes();
    const craneList = document.getElementById('crane-list');
    
    if (!craneList) return;

    if (cranes.length === 0) {
      craneList.innerHTML = '<p style="color: #999; text-align: center;">暂无塔吊</p>';
      return;
    }

    craneList.innerHTML = '';
    
    cranes.forEach((crane) => {
      const userData = crane.userData as CraneUserData;
      const craneItem = document.createElement('div');
      craneItem.className = 'crane-item';
      craneItem.style.cssText = `
        background: rgba(255,255,255,0.05);
        padding: 15px;
        margin-bottom: 10px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.1);
      `;
      
      craneItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <strong style="color: #4caf50;">${userData.name}</strong>
          <button class="btn-small btn-danger" data-crane-id="${userData.id}" style="
            padding: 4px 8px;
            font-size: 12px;
            background: #f44336;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
          ">删除</button>
        </div>
        
        <div style="margin-bottom: 8px;">
          <label style="font-size: 12px; color: #ccc;">X位置: <span id="${userData.id}-x-value">${crane.position.x.toFixed(2)}</span></label>
          <input type="range" min="-20" max="20" step="0.1" value="${crane.position.x}" 
                 data-crane-id="${userData.id}" data-axis="x" class="crane-position-slider" 
                 style="width: 100%; margin-top: 4px;">
        </div>
        
        <div style="margin-bottom: 8px;">
          <label style="font-size: 12px; color: #ccc;">Y位置: <span id="${userData.id}-y-value">${crane.position.y.toFixed(2)}</span></label>
          <input type="range" min="-20" max="20" step="0.1" value="${crane.position.y}" 
                 data-crane-id="${userData.id}" data-axis="y" class="crane-position-slider"
                 style="width: 100%; margin-top: 4px;">
        </div>
        
        <div style="margin-bottom: 8px;">
          <label style="font-size: 12px; color: #ccc;">Z位置: <span id="${userData.id}-z-value">${crane.position.z.toFixed(2)}</span></label>
          <input type="range" min="-10" max="10" step="0.1" value="${crane.position.z}" 
                 data-crane-id="${userData.id}" data-axis="z" class="crane-position-slider"
                 style="width: 100%; margin-top: 4px;">
        </div>
        
        <div style="margin-bottom: 8px;">
          <label style="font-size: 12px; color: #ccc;">缩放: <span id="${userData.id}-scale-value">${crane.scale.x.toFixed(2)}</span></label>
          <input type="range" min="0.5" max="3" step="0.1" value="${crane.scale.x}" 
                 data-crane-id="${userData.id}" class="crane-scale-slider"
                 style="width: 100%; margin-top: 4px;">
        </div>
        
        <div style="margin-bottom: 8px;">
          <label style="font-size: 12px; color: #ccc;">水平旋转: <span id="${userData.id}-rotation-value">${(userData.rotationAngle * 180 / Math.PI).toFixed(0)}°</span></label>
          <input type="range" min="0" max="360" step="1" value="${userData.rotationAngle * 180 / Math.PI}" 
                 data-crane-id="${userData.id}" class="crane-rotation-slider"
                 style="width: 100%; margin-top: 4px;">
        </div>
        
        <div style="margin-bottom: 8px;">
          <label style="font-size: 12px; color: #ccc;">臂膀俯仰: <span id="${userData.id}-pitch-value">${(userData.armPitchAngle * 180 / Math.PI).toFixed(0)}°</span></label>
          <input type="range" min="-90" max="90" step="1" value="${userData.armPitchAngle * 180 / Math.PI}" 
                 data-crane-id="${userData.id}" class="crane-pitch-slider"
                 style="width: 100%; margin-top: 4px;">
        </div>
        
        <div style="margin-bottom: 8px;">
          <label style="font-size: 12px; color: #ccc;">吊绳长度: <span id="${userData.id}-rope-value">${userData.ropeLength.toFixed(2)}</span></label>
          <input type="range" min="0.1" max="10" step="0.1" value="${userData.ropeLength}" 
                 data-crane-id="${userData.id}" class="crane-rope-slider"
                 style="width: 100%; margin-top: 4px;">
        </div>
      `;
      
      craneList.appendChild(craneItem);
    });
    
    // 绑定事件
    this.bindCraneControlEvents();
  }

  /**
   * 绑定塔吊控制事件
   */
  private bindCraneControlEvents(): void {
    const craneManager = this.viewer.getCraneManager();

    // 删除按钮
    document.querySelectorAll('.btn-danger').forEach(button => {
      button.addEventListener('click', (e) => {
        const craneId = (e.target as HTMLElement).getAttribute('data-crane-id');
        if (craneId) {
          craneManager.removeCrane(craneId);
          this.updateCraneList();
        }
      });
    });

    // 位置滑块
    document.querySelectorAll('.crane-position-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const craneId = target.getAttribute('data-crane-id');
        const axis = target.getAttribute('data-axis') as 'x' | 'y' | 'z';
        const value = parseFloat(target.value);
        
        if (craneId && axis) {
          craneManager.updateCranePosition(craneId, axis, value);
          const valueSpan = document.getElementById(`${craneId}-${axis}-value`);
          if (valueSpan) valueSpan.textContent = value.toFixed(2);
        }
      });
    });

    // 缩放滑块
    document.querySelectorAll('.crane-scale-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const craneId = target.getAttribute('data-crane-id');
        const value = parseFloat(target.value);
        
        if (craneId) {
          craneManager.updateCraneScale(craneId, value);
          const valueSpan = document.getElementById(`${craneId}-scale-value`);
          if (valueSpan) valueSpan.textContent = value.toFixed(2);
        }
      });
    });

    // 旋转滑块
    document.querySelectorAll('.crane-rotation-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const craneId = target.getAttribute('data-crane-id');
        const value = parseFloat(target.value);
        
        if (craneId) {
          craneManager.updateCraneRotation(craneId, value);
          const valueSpan = document.getElementById(`${craneId}-rotation-value`);
          if (valueSpan) valueSpan.textContent = value.toFixed(0) + '°';
        }
      });
    });

    // 俯仰滑块
    document.querySelectorAll('.crane-pitch-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const craneId = target.getAttribute('data-crane-id');
        const value = parseFloat(target.value);
        
        if (craneId) {
          craneManager.updateCraneArmPitch(craneId, value);
          const valueSpan = document.getElementById(`${craneId}-pitch-value`);
          if (valueSpan) valueSpan.textContent = value.toFixed(0) + '°';
        }
      });
    });

    // 吊绳长度滑块
    document.querySelectorAll('.crane-rope-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const craneId = target.getAttribute('data-crane-id');
        const value = parseFloat(target.value);
        
        if (craneId) {
          craneManager.updateRopeLength(craneId, value);
          const valueSpan = document.getElementById(`${craneId}-rope-value`);
          if (valueSpan) valueSpan.textContent = value.toFixed(2);
        }
      });
    });
  }

  /**
   * 显示塔吊控制面板
   */
  private showCraneControls(): void {
    const craneControls = document.getElementById('crane-controls');
    if (craneControls) {
      craneControls.style.display = 'block';
    }
  }

  /**
   * 隐藏塔吊控制面板
   */
  private hideCraneControls(): void {
    const craneControls = document.getElementById('crane-controls');
    if (craneControls) {
      craneControls.style.display = 'none';
    }
  }

  /**
   * 获取点云查看器
   */
  getViewer(): PointCloudViewer {
    return this.viewer;
  }
}

