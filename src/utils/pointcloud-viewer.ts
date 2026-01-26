/**
 * 点云查看器核心模块
 * 负责Three.js场景管理、点云渲染等核心功能
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PCDParser } from './pcd-parser';
import { FileUtils } from './file-util';
import { CraneManager, type CraneUserData } from './crane-manager';
import { EventBus, EventName } from './event';
import { useStore } from '../store';
import { fetchJson } from './json-parser';
import { OnlineStatus, type CraneInfo, type CraneType } from '../types';

interface ViewerOptions {
  width?: number;
  height?: number;
  pointSize?: number;
  backgroundColor?: number;
}

export class PointCloudViewer {
  private container: HTMLElement;
  private options: Required<ViewerOptions>;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private controls: OrbitControls;
  private pointCloud: THREE.Points | null = null;
  private arcLine: THREE.Points | null = null;
  private arcTargetMarker: THREE.Object3D | null = null;
  private fbxLoader: FBXLoader;
  private pcdLoader: PCDLoader;
  private gltfLoader: GLTFLoader;
  private locationPinTemplate: THREE.Object3D | null = null;
  private craneManager: CraneManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private touchPreventHandler: ((e: TouchEvent) => void) | null = null;
  // 弧线路径动画：保存整条路径点数量，用于线性“填充”显示
  private arcTotalPoints: number = 0;
  private arcAnimationStartTime: number | null = null;
  private arcAnimationDuration = 1500; // ms，整条路径出现时间
  // 是否循环播放弧线绘制动画
  private arcLoopEnabled: boolean = false;
  constructor(containerId: string, options: ViewerOptions = {}) {
    const containerElement = document.getElementById(containerId);
    
    if (!containerElement) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }
    
    this.container = containerElement;

    // 从URL参数获取宽度和高度（如果options中没有提供）
    const urlParamsForSize = new URLSearchParams(window.location.search);
    const urlWidth = urlParamsForSize.get('width');
    const urlHeight = urlParamsForSize.get('height');

    this.options = {
      width: options.width || (urlWidth ? parseInt(urlWidth, 10) : undefined) || this.container.offsetWidth || 800,
      height: options.height || (urlHeight ? parseInt(urlHeight, 10) : undefined) || this.container.offsetHeight || 600,
      pointSize: options.pointSize || 0.01,
      backgroundColor: options.backgroundColor || 0x0000214f,
    };

    // 创建场景
    this.scene = new THREE.Scene();

    // 创建相机
    this.camera = new THREE.PerspectiveCamera(
      20,
      this.options.width / this.options.height ,
      0.1,
      1000
    );
    
    // 设置Z轴为向上方向（默认是Y轴）
    this.camera.up.set(0, 0, 1);
    // this.camera.position.set(0, 50, 0);
    
    this.fbxLoader = new FBXLoader();
    this.pcdLoader = new PCDLoader();
    this.gltfLoader = new GLTFLoader();

    // 加载背景图片
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      new URL('../assets/bg.png', import.meta.url).href,
      (texture) => {
        // 设置纹理属性，确保颜色正确显示
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        // 确保纹理使用正确的颜色空间（SRGB 保持原始颜色）
        texture.colorSpace = THREE.SRGBColorSpace;
        // 使用 EquirectangularReflectionMapping 让纹理填充整个背景
        texture.mapping = THREE.EquirectangularReflectionMapping;
        
        // 设置场景背景为纹理
        this.scene.background = texture;
      },
      undefined,
      (error) => {
        console.error('加载背景图片失败:', error);
        // 如果加载失败，使用默认背景色
        this.scene.background = new THREE.Color(this.options.backgroundColor);
      }
    );

    // 预加载位置标记模型（location pin）
    this.gltfLoader.load(
      new URL('../assets/location-pin.glb', import.meta.url).href,
      (gltf) => {
        this.locationPinTemplate = gltf.scene;
        // 可选：统一缩放 / 调整朝向
        this.locationPinTemplate.scale.set(0.2, 0.2, 0.2);
        this.locationPinTemplate.rotation.x =  Math.PI / 2;
      },
      undefined,
      (error) => {
        console.error('加载 location-pin.glb 失败:', error);
      },
    );

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(this.options.width, this.options.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    // 设置输出编码为 sRGB，确保颜色正确显示
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // 允许触控事件直接作用于 OrbitControls，避免浏览器默认滚动
    this.renderer.domElement.style.touchAction = 'none';
    // 部分移动端浏览器需要显式阻止默认滚动行为
    this.touchPreventHandler = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
      }
    };
    this.renderer.domElement.addEventListener('touchstart', this.touchPreventHandler, { passive: false });
    this.renderer.domElement.addEventListener('touchmove', this.touchPreventHandler, { passive: false });
    
    // 启用阴影
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // 创建 CSS2D 渲染器用于文字标签
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(this.options.width, this.options.height);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.labelRenderer.domElement);

    // 初始化塔吊管理器
    this.craneManager = new CraneManager(this.scene, this.fbxLoader);
    this.craneManager.loadFBX();
    this.craneManager.loadFloorFBX();

    // 创建控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 0, 0);
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    this.controls.enableRotate = true;
    // 移动端：单指旋转，双指缩放+平移
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // 初始化 Raycaster 和鼠标位置
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 0.15; // 提升点云拾取精度
    this.mouse = new THREE.Vector2();

    // 添加点击事件监听
    this.setupClickInteraction();

    // 添加强光照系统
    this.setupLighting();

    // 添加坐标轴
    // const axesHelper = new THREE.AxesHelper(5);
    // this.scene.add(axesHelper);

    // 开始渲染
    this.animate();

    // 监听窗口大小变化
    window.addEventListener('resize', () => this.onWindowResize());

    console.log('点云查看器初始化完成');


    async function init(_this: PointCloudViewer) {

    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const densityParam = urlParams.get('density');
    await _this.fetchJsonAndHandle();
    // 设置点云密度选择框的值（等待DOM加载完成）
    // React组件也会设置，这里作为备用确保在加载点云前值已设置
    const setDensitySelect = () => {
      const densitySelect = document.getElementById('point-density') as HTMLSelectElement;
      if (densitySelect) {
        const valueToSet = densityParam || "0"; // 默认值为 "0"（完整点云）
        densitySelect.value = valueToSet;
      }
    };
    
    // 如果DOM已加载，立即设置；否则等待
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setDensitySelect);
    } else {
      // DOM已加载，但React组件可能还没渲染，延迟一点设置
      setTimeout(setDensitySelect, 100);
    }
    }
    init.call(this, this);
  }

  /**
   * 设置点击交互
   */
  private setupClickInteraction(): void {
    this.renderer.domElement.addEventListener('click', (event) => {
      this.onCanvasClick(event, 'mouse');
    });

    this.renderer.domElement.addEventListener("touchstart", (event: TouchEvent) => {
      event.preventDefault();
      // 封装触摸事件参数
  
      this.onCanvasClick(event, 'touch');
    }, { passive: false });
    

    // 可选：添加悬停效果
    this.renderer.domElement.addEventListener('mousemove', (event) => {
      this.onCanvasMouseMove(event);
    });
  }

  /**
   * 处理画布点击事件
   */
  private onCanvasClick(event: MouseEvent | TouchEvent,  type: 'mouse' | 'touch'): void {
    let clientX: number, clientY: number;
    if (type === 'touch') {
      const touchEvent = event as TouchEvent;
      clientX = touchEvent.touches[0].clientX;
      clientY = touchEvent.touches[0].clientY;
    } else {
      const mouseEvent = event as MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    const { setCurrentOperationCraneId } = useStore.getState();
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    console.log('mouse', this.mouse);

    // 更新射线
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 尝试拾取点云上的点，并绘制弧线
    if (this.pointCloud) {
      const pointHits = this.raycaster.intersectObject(this.pointCloud, false);
      if (pointHits.length > 0) {
        // this.drawArcFromCraneToPoint(pointHits[0].point.clone());
      }
    }

    // 获取所有塔吊对象
    const cranes = this.craneManager.getCranes();
    
    // 检测射线与塔吊的交集
    const intersects = this.raycaster.intersectObjects(cranes, true);

    if (intersects.length > 0) {
      // 找到被点击的塔吊根对象
      let clickedCrane = intersects[0].object;
      while (clickedCrane.parent && !cranes.includes(clickedCrane)) {
        clickedCrane = clickedCrane.parent;
      }

      if (cranes.includes(clickedCrane)) {
        const craneId = (clickedCrane.userData as unknown as CraneUserData).id;
        
        // 从 store 中获取塔吊信息
        const craneInfo = useStore.getState().cranes.find(c => c.id === craneId);
        setCurrentOperationCraneId(craneId);
        
        if (craneInfo) {
          console.log('点击塔吊:', craneInfo);
          
          // 发出事件
          EventBus.emit(EventName.CRANE_CLICKED, {
            crane: craneInfo,
            screenPosition: {
              x: clientX,
              y: clientY
            }
          });
        }
      }
    }
  }

  /**
   * 处理鼠标移动事件（可选：用于悬停高亮）
   */
  private onCanvasMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const cranes = this.craneManager.getCranes();
    const intersects = this.raycaster.intersectObjects(cranes, true);

    // 改变鼠标样式
    if (intersects.length > 0) {
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  /**
   * 设置光照系统
   */
  private setupLighting(): void {
    // 环境光：提供基础照明，确保模型不会完全黑暗
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // 主光源：从上方照射
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // 补光1：从侧面照射
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight2.position.set(-10, -10, 10);
    this.scene.add(directionalLight2);

    // 补光2：从另一侧照射
    const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight3.position.set(10, -10, 10);
    this.scene.add(directionalLight3);

    // 底部补光：确保底部也能被照亮
    const directionalLight4 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight4.position.set(0, 0, -10);
    this.scene.add(directionalLight4);
  }

  public flipTheMapView(): void {
    if (!this.pointCloud) return;
    const box = new THREE.Box3().setFromObject(this.pointCloud);
    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    const distance = maxSize * 1.5;
    this.camera.position.set(0, 0, distance);
    this.controls.update();
  }


  /**
   * 启动弧线动画
   * @param loop 是否循环播放
   */
  // private startArcAnimation(loop: boolean): void {
  //   this.arcLoopEnabled = loop;
  //   this.arcAnimationStartTime = performance.now();
  // }

  /**
   * 绘制吊钩到目标点的弧线并带箭头
   *  计算动画路径，如果是动臂式塔吊，看看距离决定 1，先旋转后移动小车 2，先移动小车后旋转，尽量减少直接甩大臂
   *  动臂，如果小车 大转小半径，先移动小车，再转臂
   *  如果小转大半径，先转臂，再移动小车
   *  平头塔吊，无论如何先旋转大臂，然后推动小车。
   */
  // private drawArcFromCraneToPoint(targetPoint: THREE.Vector3, targetCraneId?: string): void {
  //   const { currentOperationCraneId } = useStore.getState();
  //   const resolvedCraneId = targetCraneId || currentOperationCraneId || 'tc1';
    
  //   let crane = this.craneManager.getCraneById(resolvedCraneId);
  //   if (!crane) {
  //     // 如果指定ID不存在，退回到第一台塔吊
  //     crane = this.craneManager.getCranes()[0];
  //     if (!crane) {
  //       console.warn('场景中没有可用的塔吊，无法绘制弧线');
  //       return;
  //     }
  //   }

  //   const userData = crane.userData as CraneUserData;
  //   if (!userData.hooksHeader) {
  //     console.warn(`塔吊 ${resolvedCraneId} 缺少 hooksHeader，无法绘制弧线`);
  //     return;
  //   }

  //   const start = new THREE.Vector3();
  //   userData.hooksHeader.getWorldPosition(start);

  //   // 吊钩位置(小车位置)
  //   const carPostion = new THREE.Vector3(start.x, start.y, 0);

  //   const end = targetPoint.clone();

  //   // 标记的目标点
  //   const endToZ0 = new THREE.Vector3(end.x, end.y, 0);

  //   // 塔机的位置点
  //   const towerPostion = new THREE.Vector3(0.69, -0.52, 0);

  //   // 小车位置到塔机距离
  //   const distanceToTower = carPostion.distanceTo(towerPostion);

  //   // 目标点到塔机距离
  //   const towerDistanceToTargeDistance = towerPostion.distanceTo(endToZ0);

  //   // 统一在地面平面 (z = 0) 上做路径规划（只考虑平面运动）
  //   const car2D = new THREE.Vector3(carPostion.x, carPostion.y, 0);
  //   const target2D = new THREE.Vector3(end.x, end.y, 0);

  //   // 当前小车和目标点相对塔机的极坐标（半径 + 角度）
  //   const rCar = distanceToTower;
  //   const rTarget = towerDistanceToTargeDistance;
  //   const angleCar = Math.atan2(car2D.y - towerPostion.y, car2D.x - towerPostion.x);
  //   const angleTarget = Math.atan2(target2D.y - towerPostion.y, target2D.x - towerPostion.x);

  //   // 规范化角度差，使其在 [-PI, PI]，走最短圆弧
  //   let deltaAngle = angleTarget - angleCar;
  //   if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
  //   if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

  //   const points: THREE.Vector3[] = [];
    
  //   // 生成圆弧上的点
  //   const pushArcPoints = (
  //     center: THREE.Vector3,
  //     radius: number,
  //     fromAngle: number,
  //     toAngle: number,
  //     segments: number,
  //   ) => {
  //     for (let i = 0; i <= segments; i++) {
  //       const t = i / segments;
  //       const angle = fromAngle + (toAngle - fromAngle) * t;
  //       const x = center.x + Math.cos(angle) * radius;
  //       const y = center.y + Math.sin(angle) * radius;
  //       points.push(new THREE.Vector3(x, y, 0));
  //     }
  //   };

  //   // 生成直线上的点
  //   const pushLinePoints = (
  //     from: THREE.Vector3,
  //     to: THREE.Vector3,
  //     segments: number,
  //     skipFirst: boolean = false, // 避免和前一段重复一个点
  //   ) => {
  //     for (let i = 0; i <= segments; i++) {
  //       if (skipFirst && i === 0) continue;
  //       const t = i / segments;
  //       points.push(new THREE.Vector3().lerpVectors(from, to, t));
  //     }
  //   };

  //   // 当前小车的径向方向
  //   const dirCarNorm = new THREE.Vector3(
  //     car2D.x - towerPostion.x,
  //     car2D.y - towerPostion.y,
  //     0,
  //   ).normalize();

  //   // 分两种策略生成运动规划路径
  //   if (rTarget > rCar) {
  //     // 策略一：目标点半径更大 -> 先转臂（圆弧，半径保持 rCar），再小车走直线到目标半径
  //     const arcRadius = rCar;
  //     const midOnArc = new THREE.Vector3(
  //       towerPostion.x + Math.cos(angleTarget) * arcRadius,
  //       towerPostion.y + Math.sin(angleTarget) * arcRadius,
  //       0,
  //     );

  //     // 相对半径差：当差值足够小的时候，可以认为不需要最后那一小段直线
  //     const radialDiff = rTarget - rCar;
  //     const radialRatio = radialDiff / Math.max(rTarget, 1e-6);

  //     // 先在半径 rCar 上，从当前角度转到目标角度
  //     pushArcPoints(towerPostion, arcRadius, angleCar, angleCar + deltaAngle, rTarget * 20);

  //     // 半径差占比较大时，再补一小段直线到真实目标点
  //     if (radialRatio >= 0.05) {
  //       pushLinePoints(midOnArc, target2D, 24, true);
  //     }
  //   } else {
  //     // 策略二：目标点半径更小 -> 先小车沿径向到同半径位置，再转臂（圆弧，半径保持 rTarget）
  //     const midOnLine = new THREE.Vector3(
  //       towerPostion.x + dirCarNorm.x * rTarget,
  //       towerPostion.y + dirCarNorm.y * rTarget,
  //       0,
  //     );

  //     // 先从当前小车位置径向运动到与目标同半径的位置
  //     pushLinePoints(car2D, midOnLine, 24);


  //     console.error(`rTarget: ${rTarget}`)
  //     // 然后在半径 rTarget 上，从当前角度转到目标角度
  //     const arcRadius = rTarget;
  //     pushArcPoints(towerPostion, arcRadius, angleCar, angleCar + deltaAngle, rTarget * 20);
  //   }

  //   // 估算路径总长度
  //   let totalDistance = 0;
  //   for (let i = 1; i < points.length; i++) {
  //     totalDistance += points[i - 1].distanceTo(points[i]);
  //   }

  //   // 记录完整路径点数量，用于后续线性填充动画
  //   this.arcTotalPoints = points.length;
  //   // 启动一次弧线动画，这里选择循环播放；如不需要循环可传 false
  //   this.startArcAnimation(true);

  //   // 创建路径几何：先写入所有点，再通过 drawRange 控制显示进度
  //   const arcGeometry = new THREE.BufferGeometry().setFromPoints(points);
  //   // 一开始只画前两个点
  //   arcGeometry.setDrawRange(0, Math.min(2, points.length));

  // // 2. 点精灵着色器（修正线宽计算）
  // const shaderMaterial = new THREE.ShaderMaterial({
  //   uniforms: {
  //       u_pointSize: { value: 10.0 }, // 点的大小（对应线宽）
  //       u_color: { value: new THREE.Color(0xff0000) }
  //   },
  //   vertexShader: `
  //       uniform float u_pointSize;
  //       void main() {
  //           gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  //           gl_PointSize = u_pointSize; // 控制每个点的大小（像素）
  //       }
  //   `,
  //   fragmentShader: `
  //       uniform vec3 u_color;
  //       void main() {
  //           // 只渲染点的圆形区域（避免方形色块）
  //           float dist = distance(gl_PointCoord, vec2(0.5));
  //           if (dist < 0.5) { // 0.5是点的中心，只保留圆形区域
  //               gl_FragColor = vec4(u_color, 1.0);
  //           } else {
  //               discard;
  //           }
  //       }
  //   `,
  //   transparent: true
  // });


  //   const arcLine = new THREE.Points(arcGeometry, shaderMaterial);
  //   arcLine.name = 'crane-arc-line';

  //   // 创建箭头，箭头指向路径末端
  //   const lastPoint = points[points.length - 1];
  //   const prevPoint = points[points.length - 2] || points[points.length - 1];
  //   const tangent = lastPoint.clone().sub(prevPoint).normalize();
  //   const arrowLength = Math.max(0.5, totalDistance * 0.08);
  //   const arrowOrigin = lastPoint.clone().addScaledVector(tangent, -arrowLength);
  //   const arrow = new THREE.ArrowHelper(tangent, arrowOrigin, arrowLength, 0xffa500);
  //   arrow.name = 'crane-arc-arrow';

  //   // 目标点标记，方便观察点击位置：优先使用 pin 模型，未加载时退回红色小球
  //   let marker: THREE.Object3D;
  //   if (this.locationPinTemplate) {
  //     marker = this.locationPinTemplate.clone(true);
  //   } else {
  //     const markerGeometry = new THREE.SphereGeometry(0.12, 12, 12);
  //     const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  //     marker = new THREE.Mesh(markerGeometry, markerMaterial);
  //   }
  //   marker.name = 'crane-arc-target';
  //   end.setZ(0);
  //   marker.position.copy(end);

  //   // 清理旧的可视化
  //   this.clearArcVisualization();

  //   // 保存并添加到场景
  //   this.arcLine = arcLine;
  //   this.arcTargetMarker = marker;

  //   this.scene.add(arcLine);
  //   // this.scene.add(arrow);
  //   this.scene.add(marker);

  //   console.log(`规划路径总长度约为 ${totalDistance.toFixed(2)}，起点:`, start, '终点:', end);
  // }

  /**
   * 清除弧线、箭头和目标点标记
   */
  private clearArcVisualization(): void {
    if (this.arcLine) {
      this.scene.remove(this.arcLine);
      this.arcLine.geometry.dispose();
      (this.arcLine.material as THREE.Material).dispose();
      this.arcLine = null;
    }


    if (this.arcTargetMarker) {
      this.scene.remove(this.arcTargetMarker);
      // 尽量释放 pin 模型中的 Mesh 资源
      this.arcTargetMarker.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            (mesh.material as THREE.Material).dispose();
          }
        }
      });
      this.arcTargetMarker = null;
    }
  }

  /**
   * 显示加载状态
   * @param message - 加载消息
   */
  showLoading(message: string = 'Loading...'): void {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      const textElement = loadingOverlay.querySelector('p');
      if (textElement) {
        textElement.textContent = message;
      }
      loadingOverlay.style.display = 'flex';
    }
  }

  /**
   * 隐藏加载状态
   */
  hideLoading(): void {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }

  /**
   * 从服务器获取并处理文件
   * @param url - 文件URL
   * @param fileName - 文件名
   */
  async fetchFileAndHandle(url: string, fileName: string): Promise<void> {
    this.showLoading(`Loading ${fileName} from server...`);
    try {
      const fileObj = await FileUtils.fetchFileFromServer(url, fileName);
      
      if (fileObj) {
        try {
          this.showLoading(`Loading ${fileName}...`);
          window.currentFileName = fileObj.name;
          const pointData = await this.loadPCD(fileObj);
          this.updateFileInfo(pointData, fileObj.name);
        } catch (error) {
          alert('加载PCD文件失败: ' + (error as Error).message);
          console.error(error);
        }
      }
    } catch (error) {
      alert(`从服务器获取文件失败: ${(error as Error).message}`);
    } finally {
      this.hideLoading();
    }
  }

  async fetchJsonAndHandle(): Promise<void> {
    try {
      const { addCrane } = useStore.getState();
      const jsonData = await fetchJson();
      // 从本地服务器获取 PCD 文件
      await this.fetchFileAndHandle(`/pcd/${jsonData.pcd_file_name}.pcd`, `${jsonData.pcd_file_name}.pcd`);
      if (jsonData) {
        const {craneList} = jsonData;
        craneList.forEach((crane: { crane_id: string; crane_name: string; crane_type: CraneType; crane_position: { x: number; y: number; z: number }; crane_height: number }) => {
          const craneInfo: CraneInfo = {
            id: crane.crane_id,
            name: crane.crane_name,
            socketId: '',
            onlineStatus: OnlineStatus.OFFLINE,
            type: crane.crane_type,
            position: {
              x: crane.crane_position.x,
              y: crane.crane_position.y,
              z: crane.crane_position.z,
            },
            radius: 60,
            height: crane.crane_height / 3,
          };
          this.craneManager.addCrane(craneInfo);
          this.craneManager.updateCranePosition(craneInfo.id, 'z', craneInfo?.position?.z || 0);
          addCrane(craneInfo);
        });
      } else {
        console.error('JSON文件加载失败:', jsonData);
      }
    } catch (error) {
      console.error('加载JSON文件失败:', error);
      throw error;
    }
  }

  /**
   * 加载PCD文件
   * @param source - 文件对象或URL
   * @returns 点云数据
   */
  async loadPCD(source: File | string): Promise<{
    positions: Float32Array;
    colors: Float32Array;
    count: number;
  }> {
    try {
      let url: string;

      if (source instanceof File) {
        // 如果是文件对象，创建临时URL
        url = URL.createObjectURL(source);
        window.currentFileName = source.name;
      } else if (typeof source === 'string') {
        url = source;
      } else {
        throw new Error('不支持的数据源类型');
      }

      // 保存原始数据供重新解析使用（在加载前保存）
      let shouldCleanupUrl = false;
      if (source instanceof File) {
        const result = await FileUtils.readFile(source);
        if (typeof result === 'string' || result instanceof ArrayBuffer) {
          window.currentPCDData = result;
        }
        shouldCleanupUrl = true; // 标记需要清理临时URL
      } else {
        // 对于URL，尝试获取数据
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.text();
            window.currentPCDData = data;
          }
        } catch (e) {
          console.warn('无法保存PCD数据供重新解析:', e);
        }
      }

      // 使用Three.js官方的PCDLoader加载
      const points = await new Promise<THREE.Points>((resolve, reject) => {
        this.pcdLoader.load(
          url,
          (points) => {
            // 加载完成后清理临时URL
            if (shouldCleanupUrl) {
              URL.revokeObjectURL(url);
            }
            resolve(points);
          },
          undefined,
          (error) => {
            // 即使失败也要清理临时URL
            if (shouldCleanupUrl) {
              URL.revokeObjectURL(url);
            }
            reject(error);
          }
        );
      });

      // 从Three.js的Points对象中提取数据
      const geometry = points.geometry;
      const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
      const colorAttribute = geometry.getAttribute('color') as THREE.BufferAttribute;

      if (!positionAttribute) {
        throw new Error('PCD文件不包含位置数据');
      }

      const positions = positionAttribute.array as Float32Array;
      let colors: Float32Array;

      if (colorAttribute) {
        colors = colorAttribute.array as Float32Array;
      } else {
        // 如果没有颜色数据，创建默认颜色
        const count = positions.length / 3;
        colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const t = i / count;
          colors[i * 3] = 0.2 + t * 0.3;
          colors[i * 3 + 1] = 0.6 + t * 0.2;
          colors[i * 3 + 2] = 1.0 - t * 0.3;
        }
      }

      const pointData = {
        positions: positions,
        colors: colors,
        count: positions.length / 3,
      };

      this.renderPointCloud(pointData);

      return pointData;
    } catch (error) {
      console.error('加载PCD文件失败:', error);
      // 如果PCDLoader失败，尝试使用自定义解析器作为后备
      console.log('尝试使用自定义解析器作为后备...');
      try {
        let data: ArrayBuffer | string;

        if (source instanceof File) {
          const result = await FileUtils.readFile(source);
          if (typeof result === 'string' || result instanceof ArrayBuffer) {
            data = result;
          } else {
            throw new Error('读取文件返回了未知类型');
          }
        } else if (typeof source === 'string') {
          const response = await fetch(source);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          data = await response.text();
        } else {
          throw new Error('不支持的数据源类型');
        }

        window.currentPCDData = data;
        const pointData = PCDParser.parsePCD(data);
        this.renderPointCloud(pointData);
        return pointData;
      } catch (fallbackError) {
        console.error('自定义解析器也失败:', fallbackError);
        throw error; // 抛出原始错误
      }
    }
  }

  /**
   * 渲染点云
   * @param pointData - 点云数据
   */
  renderPointCloud(pointData: {
    positions: Float32Array;
    colors: Float32Array;
    count: number;
  }): void {
    // 清除旧的渲染对象
    if (this.pointCloud) {
      this.scene.remove(this.pointCloud);
      if (this.pointCloud.geometry) this.pointCloud.geometry.dispose();
      if (this.pointCloud.material) {
        if (Array.isArray(this.pointCloud.material)) {
          this.pointCloud.material.forEach((m) => m.dispose());
        } else {
          this.pointCloud.material.dispose();
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(pointData.positions, 3)
    );
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(pointData.colors, 3)
    );

    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return;
    
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    geometry.translate(-center.x, -center.y, -center.z);

    console.log('渲染标准点云模式');

    // 优化的点云材质
    const densitySelect = document.getElementById('point-density') as HTMLSelectElement;
    const density = densitySelect ? parseInt(densitySelect.value) : 50000;

    // 根据密度动态调整点大小和透明度
    let pointSize = this.options.pointSize;
    let opacity = 1.0;

    if (density >= 500000) {
      pointSize *= 0.8; // 高密度时点稍小
      opacity = 0.9;
    } else if (density >= 200000) {
      pointSize *= 1.0; // 增强密度正常大小
      opacity = 0.95;
    } else if (density >= 50000) {
      pointSize *= 1.2; // 标准密度稍大
      opacity = 1.0;
    } else {
      pointSize *= 1.5; // 快速预览时点更大更明显
      opacity = 1.0;
    }

    const material = new THREE.PointsMaterial({
      size: pointSize,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: opacity < 1.0,
      opacity: opacity,
      alphaTest: 0.1,
    });

    this.pointCloud = new THREE.Points(geometry, material);

    const maxSize = Math.max(size.x, size.y, size.z);
    const scale = 10 / maxSize;
    this.pointCloud.scale.setScalar(scale);

    this.scene.add(this.pointCloud);

    const distance = maxSize * scale * 1.5;
    // 使用Y轴作为观察距离，因为Z轴是向上方向
    this.camera.position.set(-10, -distance + 4, 15);
    this.camera.lookAt(0, 0, 0);
    this.controls.update();

    console.log(`点云渲染完成: ${pointData.count}个点`);
  }

  /**
   * 设置点大小
   * @param size - 点大小
   */
  setPointSize(size: number): void {
    this.options.pointSize = size;
    if (this.pointCloud && this.pointCloud.material) {
      const material = this.pointCloud.material as THREE.PointsMaterial;
      material.size = size;
      material.needsUpdate = true;
    }
  }
  
  /**
   * 重置相机
   */
  resetCamera(): void {
    if (this.pointCloud) {
      const box = new THREE.Box3().setFromObject(this.pointCloud);
      const size = box.getSize(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z);
      const distance = maxSize * 1.5;

      // 使用Y轴作为观察距离，因为Z轴是向上方向
      this.camera.position.set(-10, -distance + 4, 5);
      this.camera.lookAt(0, 0, 0);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  /**
   * 窗口大小变化处理
   */
  private onWindowResize(): void {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }

  /**
   * 渲染循环
   */
  private animate = (): void => {
    requestAnimationFrame(this.animate);

    // 如果有规划路径，则做一个 0 -> 100% 的线性填充动画
    if (this.arcLine && this.arcTotalPoints > 1 && this.arcAnimationStartTime !== null) {
      const now = performance.now();
      const elapsed = now - this.arcAnimationStartTime;
      const t = Math.min(1, elapsed / this.arcAnimationDuration); // 0~1

      const totalPoints = this.arcTotalPoints + 50;
      const visibleCount = Math.max(2, Math.floor(totalPoints * t));

      // 通过 drawRange 控制当前绘制的段数（几何中已经包含全部点）
      (this.arcLine.geometry as THREE.BufferGeometry).setDrawRange(0, visibleCount);

      if (t >= 1) {
        if (this.arcLoopEnabled) {
          // 循环模式：从头再来一遍
          this.arcAnimationStartTime = performance.now() + 200;
        } else {
          // 动画结束，清理计时器，保留完整路径
          this.arcAnimationStartTime = null;
        }
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  };

  /**
   * 更新文件信息显示
   * @param pointData - 点云数据
   * @param fileName - 文件名
   */
  updateFileInfo(pointData: { count: number } | null, fileName: string = ''): void {
    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
      if (pointData) {
        fileInfo.innerHTML = `
          <strong>文件:</strong> ${fileName}<br>
          <strong>点数:</strong> ${pointData.count.toLocaleString()}<br>
          <strong>状态:</strong> 加载成功
        `;
      } else {
        fileInfo.textContent = '未加载文件';
      }
    }
  }

  /**
   * 获取塔吊管理器
   * @returns 塔吊管理器实例
   */
  getCraneManager(): CraneManager {
    return this.craneManager;
  }

  /**
   * 销毁查看器，释放资源
   */
  dispose(): void {
    // 移除渲染器DOM元素
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }

    this.clearArcVisualization();

    // 清理点云
    if (this.pointCloud) {
      this.scene.remove(this.pointCloud);
      if (this.pointCloud.geometry) this.pointCloud.geometry.dispose();
      if (this.pointCloud.material) {
        if (Array.isArray(this.pointCloud.material)) {
          this.pointCloud.material.forEach((m) => m.dispose());
        } else {
          this.pointCloud.material.dispose();
        }
      }
    }

    // 清理控制器
    this.controls.dispose();

    // 清理触控事件
    if (this.touchPreventHandler) {
      this.renderer.domElement.removeEventListener('touchstart', this.touchPreventHandler);
      this.renderer.domElement.removeEventListener('touchmove', this.touchPreventHandler);
      this.touchPreventHandler = null;
    }

    // 清理渲染器
    this.renderer.dispose();

    // 移除窗口事件监听
    window.removeEventListener('resize', this.onWindowResize);

    console.log('点云查看器已销毁');
  }
}

