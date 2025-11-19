/**
 * 塔吊管理模块
 * 负责塔吊的添加、删除、更新等操作
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CraneType, type CraneInfo, type OnlineStatus } from '../types';

export interface CraneUserData {
  id: string;
  name: string;
  topController: THREE.Object3D | null;
  neckController: THREE.Object3D | null;
  hooksHeader: THREE.Object3D | null;
  rope: THREE.Mesh | null;
  hook: THREE.Mesh | null;
  rotationAngle: number;
  armPitchAngle: number;
  ropeLength: number;
  label: CSS2DObject | null;
  onlineStatus: OnlineStatus;
}

export class CraneManager {
  private scene: THREE.Scene;
  private fbxLoader: FBXLoader;
  private cranes: THREE.Object3D<THREE.Object3DEventMap>[] = []; // 存储所有塔吊实例
  private boomCraneTemplate: THREE.Object3D<THREE.Object3DEventMap> | null = null; // 动臂式塔吊模板
  private floorCraneTemplate: THREE.Object3D<THREE.Object3DEventMap> | null = null; // 固定式塔吊模板
  constructor(scene: THREE.Scene, fbxLoader: FBXLoader) {
    this.scene = scene;
    this.fbxLoader = fbxLoader;
  }

  /**
   * 加载FBX塔吊模型
   */
  loadFBX(): void {
    this.fbxLoader.load(
      'https://file.hkcrc.live/db1.fbx',
      (object) => {
        // 保存原始模型作为模板
        this.boomCraneTemplate = object.clone();
        this.setupCraneTemplate(this.boomCraneTemplate);
        console.log('塔吊模板加载完成');
      },
      (xhr) => {
        console.log('FBX加载进度:', (xhr.loaded / xhr.total) * 100 + '% loaded');
      },
      (error) => {
        console.error('FBX加载错误:', error);
      }
    );
  }


  /**
     * 加载FBX塔吊模型
     */
  loadFloorFBX(): void {
    this.fbxLoader.load(
      'https://file.hkcrc.live/floor2.fbx',
      (object) => {
        // 保存原始模型作为模板
        this.floorCraneTemplate = object.clone();
        this.setupCraneTemplate(this.floorCraneTemplate);
        console.log('固定式塔吊模板加载完成');
      },
      (xhr) => {
        console.log('FBX加载进度:', (xhr.loaded / xhr.total) * 100 + '% loaded');
      },
      (error) => {
        console.error('FBX加载错误:', error);
      }
    );
  }

  /**
   * 创建吊绳和钩子
   * @param hooksHeader - 吊钩头部对象
   * @param ropeLength - 吊绳长度
   * @returns 包含吊绳和钩子的对象 {rope, hook}
   */
  createRope(hooksHeader: THREE.Object3D | null, ropeLength: number = 3.0): { rope: THREE.Mesh; hook: THREE.Mesh } | null {
    if (!hooksHeader) {
      console.warn('未找到吊钩头部，无法创建吊绳');
      return null;
    }

    // 创建吊绳几何体（圆柱体）
    const ropeRadius = 0.02; // 吊绳半径
    const ropeGeometry = new THREE.CylinderGeometry(ropeRadius, ropeRadius, ropeLength, 8);
   
    // 创建吊绳材质（黑色）
    const ropeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x333333,
      transparent: false
    });
   
    // 创建吊绳网格
    const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
    rope.name = 'crane-rope';
   
    // 创建钩子（黄色球体）
    const hookRadius = 0.08; // 钩子半径，比吊绳粗一些
    const hookGeometry = new THREE.SphereGeometry(hookRadius, 16, 12);
   
    // 创建钩子材质（黄色）
    const hookMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFFD700, // 金黄色
      transparent: false
    });
   
    // 创建钩子网格
    const hook = new THREE.Mesh(hookGeometry, hookMaterial);
    hook.name = 'crane-hook';
   
    // 将吊绳和钩子添加到场景中
    this.scene.add(rope);
    this.scene.add(hook);
   
    console.log('创建吊绳和钩子成功，长度:', ropeLength);
    return { rope, hook };
  }

  /**
   * 更新吊绳和钩子位置，使其始终从吊钩垂直向下
   * @param crane - 塔吊对象
   */
  updateRopePosition(crane: THREE.Object3D): void {
    const userData = crane.userData as CraneUserData;
    if (!userData.rope || !userData.hooksHeader) {
      return;
    }

    const rope = userData.rope;
    const hook = userData.hook;
    const hooksHeader = userData.hooksHeader;
    const ropeLength = userData.ropeLength || 3.0;
   
    // 获取吊钩在世界坐标系中的位置
    const hookWorldPosition = new THREE.Vector3();
    hooksHeader.getWorldPosition(hookWorldPosition);
   
    // 设置吊绳位置：吊钩位置向下偏移吊绳长度的一半
    rope.position.copy(hookWorldPosition);
    rope.position.z -= ropeLength / 2; // 改为沿z轴向下
   
    // 设置吊绳方向：绕x轴旋转90度，使其沿z轴方向
    rope.rotation.set(Math.PI / 2, 0, 0);
   
    // 设置钩子位置：在吊绳末尾（吊钩位置向下偏移整个吊绳长度）
    if (hook) {
      hook.position.copy(hookWorldPosition);
      hook.position.z -= ropeLength; // 钩子在吊绳末尾
    }
  }

  /**
   * 设置塔吊模板
   * @param template - 塔吊模板对象
   */
  setupCraneTemplate(template: THREE.Object3D): void {
    // 遍历所有子对象，调整材质
    template.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          // 直接创建红色的标准材质，可以接收光照
          const newMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,  // 红色
            metalness: 0.3,   // 金属度
            roughness: 0.7,   // 粗糙度
            transparent: false,
            opacity: 1.0,
          });
          
          // 替换材质
          mesh.material = newMaterial;
          
          // 确保网格可以投射和接收阴影
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }
    });


    // 计算模型的边界框
    const box = new THREE.Box3().setFromObject(template);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    console.log('FBX模型原始尺寸:', size);
    console.log('FBX模型中心点:', center);
   
    // 将模型移动到原点
    template.position.sub(center);
   
    // 计算合适的缩放比例，让模型大小适中
    const maxSize = Math.max(size.x, size.y, size.z);
    const targetSize = 5; // 目标大小
    const scale = targetSize / maxSize;

    template.scale.setScalar(scale);
   
    // 旋转模型让z轴向上 (绕x轴旋转90度)
    template.rotation.x = Math.PI / 2;
   
    // 隐藏模板，只用于克隆
    template.visible = false;
    this.scene.add(template);
  }

  /**
   * 创建塔吊名称标签
   * @param name - 塔吊名称
   * @returns CSS2DObject 标签
   */
  private createLabel(name: string): CSS2DObject {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'crane-label';
    labelDiv.textContent = name;
    labelDiv.style.color = '#1300DEFF';
    labelDiv.style.fontSize = '30px';
    labelDiv.style.fontWeight = 'bold';
    labelDiv.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
    labelDiv.style.fontFamily = 'Arial, sans-serif';
    labelDiv.style.pointerEvents = 'none';
    labelDiv.style.userSelect = 'none';

    const label = new CSS2DObject(labelDiv);
    return label;
  }

  /**
   * 调整塔身高度（从底部延伸）并重新定位顶部组件
   * @param crane - 塔吊对象
   * @param targetHeight - 目标高度（米）
   */
  private adjustTowerHeight(crane: THREE.Object3D, targetHeight: number): void {
    let towerBase: THREE.Object3D | null = null;
    const topComponents: THREE.Object3D[] = []; // 存储需要重新定位的顶部组件
    
    // 查找 tower-base 和其他顶部组件
    crane.children.forEach((child) => {
      if (child.name === 'tower-base') {
        towerBase = child as THREE.Object3D;
      } else {
        // 其他所有直接子组件都是顶部组件
        topComponents.push(child as THREE.Object3D);
      }
    });

    if (!towerBase) {
      console.warn('未找到 tower-base，无法调整塔身高度');
      return;
    }

    const tower = towerBase as THREE.Object3D;

    // 计算 tower-base 的原始高度（使用 Y 轴，因为模型旋转后 Y 轴是高度方向）
    const originalBox = new THREE.Box3().setFromObject(tower);
    const originalHeight = originalBox.max.y - originalBox.min.y;
    const originalTopY = originalBox.max.y; // 记录原始顶部位置
    
    console.log(`tower-base 原始信息: 高度=${originalHeight}, 顶部Y=${originalTopY}, 边界=[${originalBox.min.y}, ${originalBox.max.y}]`);
    console.log(`找到 ${topComponents.length} 个顶部组件:`, topComponents.map(c => c.name));
    
    if (originalHeight === 0) {
      console.warn('tower-base 高度为0，无法计算缩放比例');
      return;
    }

    // 基准高度（可以根据实际模型调整）
    const baseHeight = 10; // 假设模型默认高度为10米
    
    // 计算缩放比例
    const scaleRatio = targetHeight / baseHeight;
    
    console.log(`调整塔身高度: 目标=${targetHeight}米, 基准=${baseHeight}米, 缩放比例=${scaleRatio}`);

    // 在 Y 轴（高度方向）应用缩放
    // 因为锚点在基座，所以直接缩放即可，不需要调整 tower-base 的位置
    tower.scale.y = scaleRatio;

    // 计算拉伸后的新顶部位置
    const newBox = new THREE.Box3().setFromObject(tower);
    const newTopY = newBox.max.y;
    const topOffsetY = newTopY - originalTopY; // 顶部位置的变化量

    console.log(`tower-base 缩放完成: scale.y=${scaleRatio}, 原顶部Y=${originalTopY}, 新顶部Y=${newTopY}, 顶部偏移=${topOffsetY}`);

    // 重新定位所有顶部组件，让它们"安装"在新的塔顶上
    topComponents.forEach((component) => {
      const originalY = component.position.y + ((targetHeight - baseHeight)  * 180);
      component.position.y = originalY + topOffsetY;
      console.log(`调整组件 ${component.name} 位置: ${originalY.toFixed(2)} -> ${component.position.y.toFixed(2)} (偏移 ${topOffsetY.toFixed(2)})`);
    });

    console.log(`塔身高度调整完成: 原始=${baseHeight}米, 新高度=${targetHeight}米, 缩放比例=${scaleRatio}`);
  }

  /**
   * 添加塔吊
   * @param craneData - 塔吊数据
   * @returns 新添加的塔吊对象
   */
  addCrane(craneData: CraneInfo): THREE.Object3D | null {
    if (!this.boomCraneTemplate || !this.floorCraneTemplate) {
      console.error('塔吊模板未加载完成');
      return null;
    }
    
    let craneTemplate: THREE.Object3D<THREE.Object3DEventMap> | null = null;
    if (craneData.type === CraneType.FLOOR) {
      craneTemplate = this.floorCraneTemplate?.clone();
    } else {
      craneTemplate = this.boomCraneTemplate?.clone();
    }
    // 克隆模板创建新的塔吊
    const newCrane = craneTemplate?.clone();
    if (!newCrane) {
      console.error('克隆塔吊模板失败');
      return null;
    }
    newCrane.visible = true;
    newCrane.position.set(craneData.position?.x || 0, craneData.position?.y || 0, craneData.position?.z || 0);
    newCrane.position.z = 0;

    // 根据输入的高度调整塔身
    if (craneData.height && craneData.height > 0) {
      this.adjustTowerHeight(newCrane, craneData.height);
    }

    if (craneData.type === CraneType.FLOOR) {
      let topController: THREE.Object3D | null = null;
      let hooksHeader: THREE.Object3D | null = null;

      newCrane.traverse((child) => {
        console.log('child.name', child.name);
        if (child.name === 'main-arm') {
          topController = child;
        }
        if (child.name === 'main-car') {
          hooksHeader = child;
        }
      });

      // 创建吊绳和钩子
      const initialRopeLength = craneData.currentRopeLength || 3.0;
      const ropeSystem = this.createRope(hooksHeader, initialRopeLength);

      // 创建名称标签
      const label = this.createLabel(craneData.name);
      // 将标签放置在塔吊上方
      label.position.set(0, 2000, 0); // Z轴向上偏移3个单位
      newCrane.add(label);

      const userData: CraneUserData = { 
        id: craneData.id, 
        name: craneData.name,
        topController: topController,
        hooksHeader: hooksHeader,
        neckController: null,
        rope: ropeSystem ? ropeSystem.rope : null,
        hook: ropeSystem ? ropeSystem.hook : null,
        rotationAngle: craneData.currentRotationAngle || 0, // 初始旋转角度（水平）
        armPitchAngle: craneData.currentArmPitchAngle || 0, // 初始俯仰角度（上下）
        ropeLength: craneData.currentRopeLength || 3.0, // 初始吊绳长度
        label: label,
        onlineStatus: craneData.onlineStatus,
      };
      newCrane.userData = userData;  
    } else {
      // 查找并保存塔吊上半部分控制器
      let topController: THREE.Object3D | null = null;
      let neckController: THREE.Object3D | null = null;
      let hooksHeader: THREE.Object3D | null = null;
      newCrane.traverse((child) => {
        console.log('child.name', child.name);
        if (child.name === 'hooks-angle') {
          topController = child;
        }
        if (child.name === 'hooks-main') {
          neckController = child;
        }
        if (child.name === 'hooks') {
          hooksHeader = child;
        }
      });
    
      // 创建吊绳和钩子
      const initialRopeLength = craneData.currentRopeLength || 3.0;
      const ropeSystem = this.createRope(hooksHeader, initialRopeLength);

      // 创建名称标签
      const label = this.createLabel(craneData.name);
      // 将标签放置在塔吊上方
      label.position.set(0, 2000, 0); // Z轴向上偏移3个单位
      newCrane.add(label);

      const userData: CraneUserData = { 
        id: craneData.id, 
        name: craneData.name,
        topController: topController,
        neckController: neckController,
        hooksHeader: hooksHeader,
        rope: ropeSystem ? ropeSystem.rope : null,
        hook: ropeSystem ? ropeSystem.hook : null,
        rotationAngle: craneData.currentRotationAngle || 0, // 初始旋转角度（水平）
        armPitchAngle: craneData.currentArmPitchAngle || 0, // 初始俯仰角度（上下）
        ropeLength: craneData.currentRopeLength || 3.0, // 初始吊绳长度
        label: label,
        onlineStatus: craneData.onlineStatus,
      };
      newCrane.userData = userData;   
    }

    this.scene.add(newCrane);
    this.cranes.push(newCrane);

    this.updateRopePosition(newCrane);
   
    return newCrane;
  }

  /**
   * 移除塔吊
   * @param craneId - 塔吊ID
   */
  removeCrane(craneId: string): void {
    const index = this.cranes.findIndex(crane => (crane.userData as CraneUserData).id === craneId);
    if (index !== -1) {
      const crane = this.cranes[index];
      const userData = crane.userData as CraneUserData;
     
      // 移除吊绳
      if (userData.rope) {
        this.scene.remove(userData.rope);
        userData.rope = null;
      }
     
      // 移除钩子
      if (userData.hook) {
        this.scene.remove(userData.hook);
        userData.hook = null;
      }

      // 移除标签
      if (userData.label) {
        crane.remove(userData.label);
        userData.label = null;
      }
     
      this.scene.remove(crane);
      this.cranes.splice(index, 1);
      console.log(`移除塔吊: ${craneId}`);
    }
  }

  /**
   * 清除所有塔吊
   */
  clearAllCranes(): void {
    this.cranes.forEach(crane => {
      const userData = crane.userData as CraneUserData;
      // 移除吊绳
      if (userData.rope) {
        this.scene.remove(userData.rope);
      }
      // 移除钩子
      if (userData.hook) {
        this.scene.remove(userData.hook);
      }
      // 移除标签
      if (userData.label) {
        crane.remove(userData.label);
      }
      this.scene.remove(crane);
    });
    this.cranes = [];
    console.log('清除所有塔吊');
  }

  /**
   * 更新塔吊位置
   * @param craneId - 塔吊ID
   * @param axis - 坐标轴 ('x', 'y', 'z')
   * @param value - 新值
   */
  updateCranePosition(craneId: string, axis: 'x' | 'y' | 'z', value: number): void {
    const crane = this.cranes.find(c => (c.userData as CraneUserData).id === craneId);
    if (crane) {
      crane.position[axis] = parseFloat(value.toString());
     
      // 更新吊绳位置
      this.updateRopePosition(crane);
     
      console.log(`更新塔吊 ${craneId} ${axis} 位置: ${value}`);
    }
  }

  /**
   * 更新塔吊旋转
   * @param craneId - 塔吊ID
   * @param angle - 旋转角度（度）
   */
  updateCraneRotation(craneId: string, angle: number): void {
    const crane = this.cranes.find(c => (c.userData as CraneUserData).id === craneId);
    if (crane) {
      const userData = crane.userData as CraneUserData;
      if (userData.topController) {
        const rotationAngle = parseFloat(angle.toString()) * Math.PI / 180; // 转换为弧度
        userData.rotationAngle = rotationAngle;
        userData.topController.rotation.z = rotationAngle;
       
        // 更新吊绳位置
        this.updateRopePosition(crane);
       
        console.log(`更新塔吊 ${craneId} 上半部分旋转角度: ${angle}°`);
      } else {
        console.warn(`塔吊 ${craneId} 没有找到上半部分控制器 (test_parent)`);
      }
    }
  }

  /**
   * 更新塔吊臂膀俯仰（上下）角度，限制为±90°（总计180°）
   * @param craneId - 塔吊ID
   * @param angle - 俯仰角度（度），向上为正，向下为负
   */
  updateCraneArmPitch(craneId: string, angle: number): void {
    const crane = this.cranes.find(c => (c.userData as CraneUserData).id === craneId);
    if (!crane) return;
    
    const userData = crane.userData as CraneUserData;
    if (!userData.neckController) {
      console.warn(`塔吊 ${craneId} 没有找到臂膀控制器 (hooks-main)`);
      return;
    }

    let clampedAngle = parseFloat(angle.toString());
    if (isNaN(clampedAngle)) clampedAngle = 0;
    clampedAngle = Math.max(-90, Math.min(90, clampedAngle));

    const radians = clampedAngle * Math.PI / 180;
    userData.armPitchAngle = radians;

    // 仅上下俯仰：通常为绕X轴旋转。如果模型轴向不同，可按需改为Y。
    userData.neckController.rotation.x = radians;
   
    // 更新吊绳位置
    this.updateRopePosition(crane);
   
    console.log(`更新塔吊 ${craneId} 臂膀俯仰角度: ${clampedAngle}°`);
  }

  /**
   * 更新小车距离（固定式塔吊专用）
   * 小车在吊臂上前后移动，带着吊绳和钩子一起移动
   * @param craneId - 塔吊ID
   * @param distance - 小车距离（从吊臂尾部开始，正值向前移动）
   */
  updateCraneCarDistance(craneId: string, distance: number): void {
    const crane = this.cranes.find(c => (c.userData as CraneUserData).id === craneId);
    if (!crane) return;
    
    const userData = crane.userData as CraneUserData;
    if (!userData.hooksHeader) {
      console.warn(`塔吊 ${craneId} 没有找到小车 (main-car)`);
      return;
    }

    // 限制距离范围，避免小车移出吊臂范围
    let clampedDistance = parseFloat(distance.toString()) / 3;
    if (isNaN(clampedDistance)) clampedDistance = 0;
    clampedDistance = Math.max(0, Math.min(20, clampedDistance)) + 3; // 限制范围0-100

    // 小车沿着吊臂的局部Z轴方向移动
    // 由于main-car是main-arm的子对象，它会自动跟随main-arm的旋转
    // 当塔吊旋转时，小车的移动方向也会随之旋转，无需手动计算旋转角度
    userData.hooksHeader.position.y = -clampedDistance;
   
    // 更新吊绳和钩子位置
    this.updateRopePosition(crane);
   
    console.log(`更新塔吊 ${craneId} 小车距离: ${clampedDistance}`);
  }

  /**
   * 更新吊绳长度
   * @param craneId - 塔吊ID
   * @param length - 吊绳长度，限制为0.1-10.0
   */
  updateRopeLength(craneId: string, length: number): void {
    const crane = this.cranes.find(c => (c.userData as CraneUserData).id === craneId);
    if (!crane) return;
    
    const userData = crane.userData as CraneUserData;
    if (!userData.rope) {
      console.warn(`塔吊 ${craneId} 没有找到吊绳`);
      return;
    }

    let clampedLength = parseFloat(length.toString()) / 10;
    if (isNaN(clampedLength)) clampedLength = 3.0;
    clampedLength = Math.max(0.1, Math.min(10.0, clampedLength)); // 限制长度范围

    // 更新塔吊数据中的吊绳长度
    userData.ropeLength = clampedLength;

    // 重新创建吊绳几何体以更新长度
    const rope = userData.rope;
    const ropeRadius = 0.02;
   
    // 移除旧的几何体
    rope.geometry.dispose();
   
    // 创建新的几何体
    rope.geometry = new THREE.CylinderGeometry(ropeRadius, ropeRadius, clampedLength, 8);
   
    // 更新吊绳位置
    this.updateRopePosition(crane);
   
    console.log(`更新塔吊 ${craneId} 吊绳长度: ${clampedLength}`);
  }

  /**
   * 获取所有塔吊
   * @returns 塔吊数组
   */
  getCranes(): THREE.Object3D[] {
    return this.cranes;
  }

  /**
   * 根据ID获取塔吊
   * @param craneId - 塔吊ID
   * @returns 塔吊对象
   */
  getCraneById(craneId: string): THREE.Object3D | undefined {
    return this.cranes.find(c => (c.userData as CraneUserData).id === craneId);
  }
}
