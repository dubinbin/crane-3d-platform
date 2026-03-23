/**
 * 点云查看器核心模块
 * 负责Three.js场景管理、点云渲染等核心功能
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { PCDParser } from './pcd-parser';
import { FileUtils } from './file-util';
import { CraneManager, type CraneUserData } from './crane-manager';
import { useStore } from '../store';
import { OnlineStatus, type CraneInfo, type CraneType } from '../types';
import { config } from '../assets/config';
import pcdFile from '../assets/model/1_clean_1.pcd?url';

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
  // 点吊（pointLift）轨迹线
  private pointLiftTrailLine: THREE.Line | null = null;
  private pointLiftTrailGeometry: THREE.BufferGeometry | null = null;
  private pointLiftTrailMaterial: THREE.LineBasicMaterial | null = null;
  private pointLiftTrailPoints: THREE.Vector3[] = [];
  private pointLiftTrailCraneId: string | null = null;
  private pointLiftTrailRecording: boolean = false;
  private pointLiftTrailMaxPoints: number = 3000;
  private pointLiftTrailMinStep: number = 0.001; // 最小采样位移（世界坐标）
  private pointLiftTrailSampleIntervalMs: number = 50; // 兜底采样间隔（避免纯Z小步进时漏点）
  private pointLiftTrailLastSampleTime: number = 0;
  // 预测路径线
  private predictedPathLine: THREE.Line | null = null;
  private predictedPathGeometry: THREE.BufferGeometry | null = null;
  private predictedPathMaterial: THREE.LineBasicMaterial | null = null;
  private predictedPathPoints: THREE.Vector3[] = [];
  private fbxLoader: FBXLoader;
  private pcdLoader: PCDLoader;
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
        
        setCurrentOperationCraneId(craneId);
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
   * 从本地资源加载并处理PCD文件
   * @param _url - 文件URL（已废弃，保留用于兼容）
   * @param fileName - 文件名
   */
  async fetchFileAndHandle(_url: string, fileName: string): Promise<void> {
    this.showLoading(`Loading ${fileName}...`);
    try {
      // 直接从本地资源加载PCD文件
      window.currentFileName = fileName;
      const pointData = await this.loadPCD(pcdFile);
      this.updateFileInfo(pointData, fileName);
    } catch (error) {
      alert('加载PCD文件失败: ' + (error as Error).message);
      console.error(error);
    } finally {
      this.hideLoading();
    }
  }

  async fetchJsonAndHandle(): Promise<void> {
    try {
      const { addCrane } = useStore.getState();
      const pcd_file_name = config.pcd_file_name;
      const craneList = config.craneList;
      // 从本地服务器获取 PCD 文件
      await this.fetchFileAndHandle(`/pcd/${pcd_file_name}.pcd`, `${pcd_file_name}.pcd`);
      if (craneList.length > 0) {
        craneList.forEach((crane: { crane_id: string; crane_name: string; crane_type: CraneType; crane_position: { x: number; y: number; z: number }; crane_height: number; crane_radius: number; crane_rope_percent: number }) => {
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
            radius: crane.crane_radius,
            height: crane.crane_height / 3,
            originalHeight: crane.crane_height,
            ropePercent: crane.crane_rope_percent,
          };
          this.craneManager.addCrane(craneInfo);
          this.craneManager.updateCranePosition(craneInfo.id, 'z', craneInfo?.position?.z || 0);
          addCrane(craneInfo);
        });
      } else {
        console.error('JSON文件加载失败: craneList is empty');
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

    // 点吊轨迹：采样吊钩位置并更新线
    if (this.pointLiftTrailRecording && this.pointLiftTrailCraneId) {
      const crane = this.craneManager.getCraneById(this.pointLiftTrailCraneId);
      if (crane) {
        const userData = crane.userData as CraneUserData;
        const hookPos = new THREE.Vector3();

        if (userData.hook) {
          hookPos.copy(userData.hook.position);
        } else if (userData.hooksHeader) {
          // 兜底：用 hooksHeader 世界坐标 - ropeLength
          userData.hooksHeader.getWorldPosition(hookPos);
          hookPos.z -= userData.ropeLength || 3.0;
        }

        const now = performance.now();
        const last = this.pointLiftTrailPoints[this.pointLiftTrailPoints.length - 1];
        const movedEnough = !last || hookPos.distanceTo(last) >= this.pointLiftTrailMinStep;
        const timeDue =
          !this.pointLiftTrailLastSampleTime ||
          now - this.pointLiftTrailLastSampleTime >= this.pointLiftTrailSampleIntervalMs;
        // 如果只有一个点，强制添加第二个点（即使移动很小）以确保线能显示
        const needsSecondPoint = this.pointLiftTrailPoints.length === 1;
        const shouldAdd = needsSecondPoint || movedEnough || timeDue;

        if (shouldAdd) {
          this.pointLiftTrailLastSampleTime = now;
          this.pointLiftTrailPoints.push(hookPos.clone());

          if (this.pointLiftTrailPoints.length > this.pointLiftTrailMaxPoints) {
            this.pointLiftTrailPoints.shift();
          }

          this.updatePointLiftTrailGeometry();
        }
      }
    }

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

  private updatePointLiftTrailGeometry(): void {
    if (!this.pointLiftTrailGeometry || !this.pointLiftTrailLine) return;
    if (this.pointLiftTrailPoints.length < 2) return; // Line 至少需要 2 个点

    const positions = new Float32Array(this.pointLiftTrailPoints.length * 3);
    for (let i = 0; i < this.pointLiftTrailPoints.length; i++) {
      const p = this.pointLiftTrailPoints[i];
      positions[i * 3 + 0] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    }

    this.pointLiftTrailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.pointLiftTrailGeometry.computeBoundingSphere();
    this.pointLiftTrailGeometry.attributes.position.needsUpdate = true;
  }

  private ensurePointLiftTrailLine(): void {
    if (this.pointLiftTrailLine) return;

    this.pointLiftTrailGeometry = new THREE.BufferGeometry();
    this.pointLiftTrailMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00, // 黄色
      transparent: true,
      opacity: 0.9,
      // 轨迹线更希望"永远可见"（避免被点云/模型遮挡导致看起来缺段）
      depthTest: false,
    });
    this.pointLiftTrailLine = new THREE.Line(this.pointLiftTrailGeometry, this.pointLiftTrailMaterial);
    this.pointLiftTrailLine.name = 'point-lift-trail';
    this.scene.add(this.pointLiftTrailLine);
  }

  private removePointLiftTrailLine(): void {
    if (this.pointLiftTrailLine) {
      this.scene.remove(this.pointLiftTrailLine);
      this.pointLiftTrailLine = null;
    }
    if (this.pointLiftTrailGeometry) {
      this.pointLiftTrailGeometry.dispose();
      this.pointLiftTrailGeometry = null;
    }
    if (this.pointLiftTrailMaterial) {
      this.pointLiftTrailMaterial.dispose();
      this.pointLiftTrailMaterial = null;
    }
  }

  /**
   * 开始记录"点吊"轨迹（从当前 hook 位置开始，随后按帧采样）
   */
  startPointLiftTrail(craneId: string): void {
    this.pointLiftTrailCraneId = craneId;
    this.pointLiftTrailRecording = true;
    this.pointLiftTrailPoints = [];
    this.pointLiftTrailLastSampleTime = performance.now();
    this.ensurePointLiftTrailLine();
    // 立即采样一次作为起点（Line 至少需要 2 个点才能显示，因此先写入重复点）
    const crane = this.craneManager.getCraneById(craneId);
    if (!crane) {
      console.warn(`[pointLiftTrail] crane not found: ${craneId}`);
      return;
    }
    const userData = crane.userData as CraneUserData;
    const hookPos = new THREE.Vector3();
    if (userData.hook) {
      hookPos.copy(userData.hook.position);
    } else if (userData.hooksHeader) {
      userData.hooksHeader.getWorldPosition(hookPos);
      hookPos.z -= userData.ropeLength || 3.0;
    }
    this.pointLiftTrailPoints.push(hookPos.clone(), hookPos.clone());
    this.updatePointLiftTrailGeometry();
  }

  /**
   * 停止记录"点吊"轨迹（默认保留线，便于回看）
   */
  stopPointLiftTrail(): void {
    this.pointLiftTrailRecording = false;
    this.pointLiftTrailCraneId = null;
    this.pointLiftTrailLastSampleTime = 0;
  }

  /**
   * 清空"点吊"轨迹并移除线
   */
  clearPointLiftTrail(): void {
    this.pointLiftTrailRecording = false;
    this.pointLiftTrailCraneId = null;
    this.pointLiftTrailPoints = [];
    this.pointLiftTrailLastSampleTime = 0;
    this.removePointLiftTrailLine();
  }

  /**
   * 绘制预测路径
   * @param craneId - 塔吊ID
   * @param pathData - 路径数据数组，每个元素为 [旋转角度(度), 小车距离(米), 吊钩高度(米)]
   */
  drawPredictedPath(craneId: string, pathData: Array<[number, number, number]>): void {
    const crane = this.craneManager.getCraneById(craneId);
    if (!crane) {
      console.warn(`[predictedPath] crane not found: ${craneId}`);
      return;
    }

    // 获取塔吊信息
    const craneInfo = useStore.getState().cranes.find(c => c.id === craneId);
    if (!craneInfo || !craneInfo.position) {
      console.warn(`[predictedPath] crane info not found: ${craneId}`);
      return;
    }

    const userData = crane.userData as CraneUserData;
    const cranePosition = new THREE.Vector3(
      craneInfo.position.x,
      craneInfo.position.y,
      craneInfo.position.z
    );

    // 使用 hook.position 作为起点（吊钩当前位置，已经在正确的世界坐标系下）
    if (!userData.hook) {
      console.warn(`[predictedPath] hook not found for crane: ${craneId}`);
      return;
    }

    const startPos = new THREE.Vector3();
    userData.hook.getWorldPosition(startPos);

    // 以塔身中心（cranePosition）作为极坐标中心
    const towerCenter = cranePosition.clone();

    // 获取 hooksHeader 的世界坐标（作为塔顶参考点）
    const hooksHeaderWorldPos = new THREE.Vector3();
    if (userData.hooksHeader) {
      userData.hooksHeader.getWorldPosition(hooksHeaderWorldPos);
    } else {
      // 如果没有 hooksHeader，使用 cranePosition + height 作为塔顶
      hooksHeaderWorldPos.set(
        cranePosition.x,
        cranePosition.y,
        cranePosition.z + (craneInfo.height || 0)
      );
    }

    // 计算塔顶高度（米）：originalHeight * ropePercent / 100
    const towerTopHeightMeters = craneInfo.originalHeight * ((craneInfo.ropePercent || 100) / 100);

    // 转换路径点到世界坐标
    const worldPoints: THREE.Vector3[] = [startPos.clone()];
    
    for (const [angle, radius, height] of pathData) {
      // 角度直接使用后端给的角度（0-360°），不再加偏移
      const angleRad = angle * Math.PI / 180;

      // 半径：直接使用后端给的半径做一个简单缩放，避免过大
      // 当前路径点数据中 radius 大约在 20~40 左右，这里按 1/10 缩放到与场景接近的尺度
      let r = radius / 10.8;
      if (isNaN(r)) r = 0;

      // 高度计算：与 ropeLength 计算方式一致
      // ropeLength = (originalHeight * ropePercent / 100) - height
      // 所以：ropeLength = towerTopHeightMeters - height（米）
      const ropeLengthMeters = towerTopHeightMeters - height;
      // 转换为模型单位（与 updateRopeLength 保持一致：除以 10）
      const clampedRopeLength = ropeLengthMeters / 10;
      
      // 吊钩的 Z 坐标 = hooksHeader 的 Z 坐标 - 吊绳长度（模型单位）
      const worldZ = hooksHeaderWorldPos.z - clampedRopeLength;

      // 计算世界坐标（极坐标 -> 笛卡尔），以塔身中心为原点
      const worldX = towerCenter.x + Math.cos(angleRad) * r;
      const worldY = towerCenter.y + Math.sin(angleRad) * r;
      

      worldPoints.push(new THREE.Vector3(worldX, worldY, worldZ));
    }

    // 更新预测路径线
    this.predictedPathPoints = worldPoints;
    this.updatePredictedPathGeometry();
  }

  /**
   * 更新预测路径几何体
   */
  private updatePredictedPathGeometry(): void {
    if (this.predictedPathPoints.length < 2) {
      this.removePredictedPathLine();
      return;
    }

    if (!this.predictedPathGeometry) {
      this.predictedPathGeometry = new THREE.BufferGeometry();
    }

    const positions = new Float32Array(this.predictedPathPoints.length * 3);
    for (let i = 0; i < this.predictedPathPoints.length; i++) {
      const p = this.predictedPathPoints[i];
      positions[i * 3 + 0] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    }

    this.predictedPathGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.predictedPathGeometry.computeBoundingSphere();
    this.predictedPathGeometry.attributes.position.needsUpdate = true;

    this.ensurePredictedPathLine();
  }

  /**
   * 确保预测路径线存在
   */
  private ensurePredictedPathLine(): void {
    if (this.predictedPathLine) return;

    if (!this.predictedPathGeometry) {
      this.predictedPathGeometry = new THREE.BufferGeometry();
    }

    this.predictedPathMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00, // 绿色，用于区分实际轨迹（黄色）
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
      depthTest: false,
    });

    this.predictedPathLine = new THREE.Line(this.predictedPathGeometry, this.predictedPathMaterial);
    this.predictedPathLine.name = 'predicted-path';
    this.scene.add(this.predictedPathLine);
  }

  /**
   * 移除预测路径线
   */
  private removePredictedPathLine(): void {
    if (this.predictedPathLine) {
      this.scene.remove(this.predictedPathLine);
      this.predictedPathLine = null;
    }
    if (this.predictedPathGeometry) {
      this.predictedPathGeometry.dispose();
      this.predictedPathGeometry = null;
    }
    if (this.predictedPathMaterial) {
      this.predictedPathMaterial.dispose();
      this.predictedPathMaterial = null;
    }
    this.predictedPathPoints = [];
  }

  /**
   * 清空预测路径
   */
  clearPredictedPath(): void {
    this.removePredictedPathLine();
  }

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
    this.clearPointLiftTrail();
    this.clearPredictedPath();

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

