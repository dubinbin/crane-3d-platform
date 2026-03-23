/**
 * 塔吊管理模块
 * 负责塔吊的添加、删除、更新等操作
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CraneType, type CraneInfo, type OnlineStatus } from '../types';
import db1Model from '../assets/resource/model/db1.fbx?url';
import floor2Model from '../assets/resource/model/floor2.fbx?url';

export interface CraneUserData {
  radius: number;
  id: string;
  name: string;
  type: CraneType;
  topController: THREE.Object3D | null;
  neckController: THREE.Object3D | null;
  hooksHeader: THREE.Object3D | null;
  rope: THREE.Group | null;
  hook: THREE.Group | null;
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
      db1Model,
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
      floor2Model,
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
   * @returns 包含吊绳组与吊钩组 { rope, hook }
   */
  createRope(hooksHeader: THREE.Object3D | null, ropeLength: number = 3.0): { rope: THREE.Group; hook: THREE.Group } | null {
    if (!hooksHeader) {
      console.warn('未找到吊钩头部，无法创建吊绳');
      return null;
    }

    const ropeRadius = 0.006;
    // 绳组绕 X 转 90° 后，局部 Z 对应世界水平 Y（小车前后方向），两根绳前后各一根
    const ropeHalfGap = 0.022;

    const ropeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd650,
      transparent: false,
    });

    const ropeGroup = new THREE.Group();
    ropeGroup.name = 'crane-rope';

    const addRopeStrand = (offsetZ: number): void => {
      const geom = new THREE.CylinderGeometry(ropeRadius, ropeRadius, ropeLength, 6);
      const strand = new THREE.Mesh(geom, ropeMaterial);
      strand.name = 'crane-rope-strand';
      strand.position.set(0, 0, offsetZ);
      ropeGroup.add(strand);
    };
    addRopeStrand(ropeHalfGap);
    addRopeStrand(-ropeHalfGap);

    const hookYellow = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: false,
    });
    const hookMetal = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: false,
    });

    const hookGroup = new THREE.Group();
    hookGroup.name = 'crane-hook';

    // 上宽下窄的圆台，形似倒梯形块（与绳底衔接的一端较宽）
    const blockHeight = 0.11;
    const blockTopR = 0.075;
    const blockBottomR = 0.042;
    const block = new THREE.Mesh(
      new THREE.CylinderGeometry(blockTopR, blockBottomR, blockHeight, 20),
      hookYellow,
    );
    block.name = 'crane-hook-block';
    block.position.z = -blockHeight / 2;
    block.rotation.set(Math.PI / 2, 0, 0);
    hookGroup.add(block);

    // 弯钩：圆环弧 + 竖向钩柄（整体朝向在 updateRopePosition 里对 hook 组绕 Z 校正）
    const curveR = 0.05;
    const curveTube = 0.009;
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(curveR, curveTube, 10, 24, Math.PI * 1.35),
      hookMetal,
    );
    arc.name = 'crane-hook-curve';
    arc.rotation.y = Math.PI / 2;
    arc.rotation.z = Math.PI * 1;
    const blockBottomZ = -blockHeight;
    arc.position.set(0, 0, blockBottomZ - curveR * 0.7);
    hookGroup.add(arc);

    this.scene.add(ropeGroup);
    this.scene.add(hookGroup);

    console.log('创建吊绳和钩子成功，长度:', ropeLength);
    return { rope: ropeGroup, hook: hookGroup };
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
   
    // 组整体绕 x 轴旋转 90°，子绳沿组局部 Y，在世界中竖直下垂
    rope.rotation.set(Math.PI / 2, 0, 0);
   
    // 设置钩子位置：在吊绳末尾（吊钩位置向下偏移整个吊绳长度）
    if (hook) {
      hook.position.copy(hookWorldPosition);
      hook.position.z -= ropeLength; // 钩子在吊绳末尾
      // 沿世界 Z 俯视顺时针 90°，修正倒梯形与弯钩朝向
      hook.rotation.set(0, 0, -Math.PI / 2);
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
          // 偏红/橙的工程黄（挖掘机式涂装），带一点金属漆质感
          const newMaterial = new THREE.MeshStandardMaterial({
            color: 0xe89e18,
            metalness: 0.5,
            roughness: 0.4,
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
   * 调整塔身高度：根据 targetHeight 按 tower-joint 标准节堆叠，并与 tower-footer / hooks-angle 做接缝对齐。
   *
   * 你当前的 Blender 拆分约定：tower-joint 只有 1 节，对应 1m
   * 因此：targetHeight=10 => 堆叠 10 节 tower-joint
   * @param crane - 塔吊对象
   * @param targetHeight - 目标高度（米）
   */
  private adjustTowerHeight(crane: THREE.Object3D, targetHeight: number, craneData: CraneInfo): void {
    // 新模型：你已在 Blender 把 tower-base 删除，并提取了标准节 tower-joint
    // 逻辑：按 targetHeight 计算需要多少个 tower-joint -> 堆叠到 tower-footer -> 最后把 hooks-angle 接到顶部最后一节

    const towerFooter = this.findFirstDescendantByName(crane, 'tower-footer');
    const joints = this.findAllDescendantsByName(crane, 'tower-joint');
    const hooksAngleNode = this.findFirstDescendantByName(crane, 'hooks-angle');

    if (!towerFooter) {
      console.warn('未找到 tower-footer，无法调整塔身高度');
      return;
    }
    if (!joints.length) {
      console.warn('未找到 tower-joint，无法调整塔身高度');
      return;
    }

    const jointTemplate = joints[0];


    // 约定：Blender 里 tower-joint 只有 1 节，且该节对应高度单位为 1m
    // 因此：targetHeight=10 => 堆叠 10 节 tower-joint

    crane.updateMatrixWorld(true);

    const footerBox = new THREE.Box3().setFromObject(towerFooter);
    const jointBox = new THREE.Box3().setFromObject(jointTemplate);
    // setupCraneTemplate 里对模板做了 rotation.x = Math.PI / 2，
    // 因此“塔身竖直方向”更可能对应世界 Z，而不是世界 Y。
    const jointHeightWorld = jointBox.max.z - jointBox.min.z;

    const desiredJointCount = Math.max(1, Math.round(targetHeight));

    // 仅需要缩放（方向/位置用世界姿态来重建堆叠）
    const jointTemplateScale = jointTemplate.scale.clone();
    // 用世界坐标存储第 1 节的起始位姿，后续把标准节堆叠成一个“整体组”
    const jointTemplateWorldPos = jointTemplate.getWorldPosition(new THREE.Vector3());
    const jointTemplateWorldQuat = jointTemplate.getWorldQuaternion(new THREE.Quaternion());
    

    // 如果 hooks-angle 本身在某个 tower-joint 子树里，那么下面删除 joints 时会把 hooks-angle 一起删掉，
    // 导致“加了位移但 world 坐标不变”。这种情况下：先把 hooks-angle 从 joints 子树里解挂到 crane 根，
    // 并保留其世界变换，重建完标准节后再做塔顶接缝。
    if (hooksAngleNode) {
      const hooksInsideAnyJoint = joints.some((j) => this.isDescendantOf(j, hooksAngleNode));
      if (hooksInsideAnyJoint) {
        crane.updateMatrixWorld(true);
        const hooksWorldPos = new THREE.Vector3();
        const hooksWorldQuat = new THREE.Quaternion();
        hooksAngleNode.getWorldPosition(hooksWorldPos);
        hooksAngleNode.getWorldQuaternion(hooksWorldQuat);

        // 先换父级
        crane.add(hooksAngleNode);

        // 再把 local transform 设回“保持原世界姿态”
        const invCraneWorldQuat = crane.getWorldQuaternion(new THREE.Quaternion()).invert();
        hooksAngleNode.quaternion.copy(invCraneWorldQuat.multiply(hooksWorldQuat));
        hooksAngleNode.position.copy(crane.worldToLocal(hooksWorldPos));

        hooksAngleNode.updateMatrixWorld(true);
        crane.updateMatrixWorld(true);
        console.log('hooks-angle 被解挂以避免与 tower-joint 一起删除');
      }
    }

    // 删除旧的 tower-joint（包含 template 本体）
    joints.forEach((j) => {
      if (j.parent) j.parent.remove(j);
    });

    // 先把 n 节标准节作为一个整体堆叠
    const stackGroup = new THREE.Group();
    stackGroup.name = "tower-joint-stack";
    crane.add(stackGroup);
    crane.updateMatrixWorld(true);

    const invStackWorldQuat = stackGroup
      .getWorldQuaternion(new THREE.Quaternion())
      .invert();

    for (let i = 0; i < desiredJointCount; i++) {
      const joint = jointTemplate.clone(true);
      joint.visible = true;
      joint.scale.copy(jointTemplateScale);

      const jointWorldPos = jointTemplateWorldPos
        .clone()
        .add(new THREE.Vector3(0, 0, i * jointHeightWorld));
      joint.position.copy(stackGroup.worldToLocal(jointWorldPos));
      joint.quaternion.copy(invStackWorldQuat.multiply(jointTemplateWorldQuat));
      stackGroup.add(joint);
    }

    crane.updateMatrixWorld(true);

    // 再连接 tower-footer：stackGroup 底部对齐 footer 顶部
    const stackBoxAfterStack = new THREE.Box3().setFromObject(stackGroup);
    const deltaZToFooter = footerBox.max.z - stackBoxAfterStack.min.z;
    const deltaLocalStack = this.worldVectorToParentLocal(
      new THREE.Vector3(0, 0, deltaZToFooter),
      crane,
    );
    stackGroup.position.add(deltaLocalStack);
    console.log(
      `连接footer: stackBox.min.z=${stackBoxAfterStack.min.z.toFixed(4)} footerTopZ=${footerBox.max.z.toFixed(
        4,
      )} deltaZToFooter=${deltaZToFooter.toFixed(4)} deltaLocalStack=(${deltaLocalStack.x.toFixed(
        4,
      )},${deltaLocalStack.y.toFixed(4)},${deltaLocalStack.z.toFixed(4)})`,
    );
    crane.updateMatrixWorld(true);

    // 接缝②：让 hooks-angle 与最后一节 joint 的顶部贴合
    if (hooksAngleNode) {
      // 如果重建过程中 hooks-angle 丢失了父级，先强制挂回 crane，避免坐标系失配
      if (!hooksAngleNode.parent) {
        crane.add(hooksAngleNode);
      }
      hooksAngleNode.updateMatrixWorld(true);
      crane.updateMatrixWorld(true);

      // 用 stackGroup 的顶部对齐 hooks-angle 底部
      const stackBoxAfterFooter = new THREE.Box3().setFromObject(stackGroup);
      const hooksBox = new THREE.Box3().setFromObject(hooksAngleNode);
      console.log(crane);
      const differentCraneTypeGap = craneData.type === CraneType.BOOM ? 0.08 : 0;
      const gapZTop = stackBoxAfterFooter.max.z - hooksBox.min.z  - differentCraneTypeGap;
      console.log(
        `连接hooks: stackTopZ=${stackBoxAfterFooter.max.z.toFixed(4)} hooksBox.min.z=${hooksBox.min.z.toFixed(
          4,
        )} gapZTop=${gapZTop.toFixed(4)}`,
      );

      const hooksParent = hooksAngleNode.parent ?? crane;
      const hooksBefore = new THREE.Vector3();
      hooksAngleNode.getWorldPosition(hooksBefore);

      // 关键：用 worldToLocal 直接设置 hooks-angle 的 world->local 位置，
      // 避免通过 quaternion 转换时忽略 parent 的 scale 导致“看起来没动”的问题。
      const desiredHooksWorldPos = hooksBefore.clone().add(new THREE.Vector3(0, 0, gapZTop));
      hooksAngleNode.position.copy(hooksParent.worldToLocal(desiredHooksWorldPos));

      const hooksInHierarchyBefore = this.isDescendantOf(crane, hooksAngleNode);
      console.log(
        `hooks-angle hierarchy: hooksInHierarchyBefore=${hooksInHierarchyBefore} hooksParentNow=${(hooksAngleNode.parent?.name || '(null)')}`,
      );
      hooksAngleNode.updateMatrixWorld(true);
      crane.updateMatrixWorld(true);
      const hooksAfter = new THREE.Vector3();
      hooksAngleNode.getWorldPosition(hooksAfter);
      console.log(
        `接缝② tower-joint(last)→hooks-angle(沿Z): gapZTop=${gapZTop.toFixed(4)} hooksParent=${hooksParent.name || '(unnamed)'} hooksWorldBefore=(${hooksBefore.x.toFixed(
          2,
        )},${hooksBefore.y.toFixed(2)},${hooksBefore.z.toFixed(2)}) hooksWorldAfter=(${hooksAfter.x.toFixed(2)},${hooksAfter.y.toFixed(
          2,
        )},${hooksAfter.z.toFixed(2)})`,
      );
    } else {
      console.warn('未找到 hooks-angle，无法做塔顶接缝（仅完成标准节堆叠和 tower-footer 接缝）');
    }

    crane.updateMatrixWorld(true);
  }

  /**
   * 深度查找所有匹配 name 的节点（包括 root 自身）。
   */
  private findAllDescendantsByName(root: THREE.Object3D, name: string): THREE.Object3D[] {
    const res: THREE.Object3D[] = [];
    root.traverse((child) => {
      if (child.name === name) {
        res.push(child as THREE.Object3D);
      }
    });
    return res;
  }

  /**
   * 世界坐标系里的平移向量 worldVec，换算成 parent 局部空间中的平移向量（用于改子节点 position）
   */
  private worldVectorToParentLocal(worldVec: THREE.Vector3, parent: THREE.Object3D): THREE.Vector3 {
    const v = worldVec.clone();
    const invQ = new THREE.Quaternion();
    parent.getWorldQuaternion(invQ);
    invQ.invert();
    v.applyQuaternion(invQ);
    return v;
  }

  /** 深度优先查找第一个匹配 name 的节点（含 root 自身） */
  private findFirstDescendantByName(root: THREE.Object3D, name: string): THREE.Object3D | null {
    if (root.name === name) {
      return root;
    }
    for (const child of root.children) {
      const hit = this.findFirstDescendantByName(child, name);
      if (hit) {
        return hit;
      }
    }
    return null;
  }

  private isDescendantOf(ancestor: THREE.Object3D, node: THREE.Object3D): boolean {
    let p: THREE.Object3D | null = node.parent;
    while (p) {
      if (p === ancestor) {
        return true;
      }
      p = p.parent;
    }
    return false;
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
      this.adjustTowerHeight(newCrane, craneData.height, craneData);
    }

    if (craneData.type === CraneType.FLOOR) {
      let topController: THREE.Object3D | null = null;
      let hooksHeader: THREE.Object3D | null = null;

      newCrane.traverse((child) => {
        if (child.name === 'hooks-angle') {
          topController = child;
        }
        if (child.name === 'main-car') {
          hooksHeader = child;
        }
      });

      // 创建吊绳和钩子
      const initialRopeLength = craneData.currentRopeLength || 3.0;
      const ropeSystem = this.createRope(hooksHeader, initialRopeLength);


      const userData: CraneUserData = { 
        radius: craneData.radius,
        id: craneData.id, 
        name: craneData.name,
        topController: topController,
        type: craneData.type,
        hooksHeader: hooksHeader,
        neckController: null,
        rope: ropeSystem ? ropeSystem.rope : null,
        hook: ropeSystem ? ropeSystem.hook : null,
        rotationAngle: craneData.currentRotationAngle || 0, // 初始旋转角度（水平）
        armPitchAngle: craneData.currentArmPitchAngle || 0, // 初始俯仰角度（上下）
        ropeLength: craneData.currentRopeLength || 3.0, // 初始吊绳长度
        label: null,
        onlineStatus: craneData.onlineStatus,
      };
      newCrane.userData = userData;  
    } else {
      // 查找并保存塔吊上半部分控制器
      let topController: THREE.Object3D | null = null;
      let neckController: THREE.Object3D | null = null;
      let hooksHeader: THREE.Object3D | null = null;
      newCrane.traverse((child) => {

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
        radius: craneData.radius,
        id: craneData.id, 
        name: craneData.name,
        topController: topController,
        neckController: neckController,
        hooksHeader: hooksHeader,
        type: craneData.type,
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
    console.log('userData', userData);
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

   // 这里需要换算一下，已经塔吊臂膀是按照60去划分的物理模型长度，类似于现在1个单位是1/60
    // 所以如果传入臂膀长度是40米，那么实际的臂膀1个档位的长度应该 （40 / 60）

    const changedDistancetoworld = distance * (60 / userData.radius);



    // 限制距离范围，避免小车移出吊臂范围
    let clampedDistance = parseFloat(changedDistancetoworld.toString()) / 3;

    if (isNaN(clampedDistance)) clampedDistance = 0;
    clampedDistance = Math.max(0, Math.min(20, clampedDistance)) + 3; // 限制范围0-100

    // 小车沿着吊臂的局部Z轴方向移动
    // 由于main-car是main-arm的子对象，它会自动跟随hooks的旋转
    // 当塔吊旋转时，小车的移动方向也会随之旋转，无需手动计算旋转角度
    userData.hooksHeader.position.y = -clampedDistance;
   
    // 更新吊绳和钩子位置
    this.updateRopePosition(crane);
   
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

    const ropeGroup = userData.rope;
    const ropeRadius = 0.006;
    ropeGroup.children.forEach((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const strand = child as THREE.Mesh;
        strand.geometry.dispose();
        strand.geometry = new THREE.CylinderGeometry(ropeRadius, ropeRadius, clampedLength, 6);
      }
    });
   
    // 更新吊绳位置
    this.updateRopePosition(crane);
   
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
