/**
 * 点云查看器核心模块
 * 负责Three.js场景管理、点云渲染等核心功能
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { PCDParser } from './pcd-parser';
import { FileUtils } from './file-util';
import { CraneManager, type CraneUserData } from './crane-manager';
import { EventBus, EventName } from './event';
import { useStore } from '../store';

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
  private fbxLoader: FBXLoader;
  private craneManager: CraneManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor(containerId: string, options: ViewerOptions = {}) {
    const containerElement = document.getElementById(containerId);
    
    if (!containerElement) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }
    
    this.container = containerElement;

    this.options = {
      width: options.width || this.container.offsetWidth || 800,
      height: options.height || this.container.offsetHeight || 600,
      pointSize: options.pointSize || 0.01,
      backgroundColor: options.backgroundColor || 0x00001e,
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
    this.camera.position.set(0, -50, 0);
    
    this.fbxLoader = new FBXLoader();

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(this.options.width, this.options.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(this.options.backgroundColor, 1);
    
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

    // 初始化 Raycaster 和鼠标位置
    this.raycaster = new THREE.Raycaster();
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

    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const pcdId = urlParams.get('pcdId');

    if (pcdId) {
      console.log('pcdId', pcdId);
      this.fetchFileAndHandle(`https://file.hkcrc.live/${pcdId}.pcd`, `${pcdId}.pcd`);
    }
  }

  /**
   * 设置点击交互
   */
  private setupClickInteraction(): void {
    this.renderer.domElement.addEventListener('click', (event) => {
      this.onCanvasClick(event);
    });

    // 可选：添加悬停效果
    this.renderer.domElement.addEventListener('mousemove', (event) => {
      this.onCanvasMouseMove(event);
    });
  }

  /**
   * 处理画布点击事件
   */
  private onCanvasClick(event: MouseEvent): void {
    // 计算鼠标在归一化设备坐标中的位置 (-1 to +1)
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 更新射线
    this.raycaster.setFromCamera(this.mouse, this.camera);

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
        
        if (craneInfo) {
          console.log('点击塔吊:', craneInfo);
          
          // 发出事件
          EventBus.emit(EventName.CRANE_CLICKED, {
            crane: craneInfo,
            screenPosition: {
              x: event.clientX,
              y: event.clientY
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
   * 显示加载状态
   * @param message - 加载消息
   */
  showLoading(message: string = '正在加载...'): void {
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
    this.showLoading(`正在从服务器加载 ${fileName}...`);
    try {
      const fileObj = await FileUtils.fetchFileFromServer(url, fileName);
      
      if (fileObj) {
        try {
          this.showLoading(`正在解析和渲染 ${fileName}...`);
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

      // 保存原始数据供重新解析使用
      window.currentPCDData = data;

      const pointData = PCDParser.parsePCD(data);
      this.renderPointCloud(pointData);

      return pointData;
    } catch (error) {
      console.error('加载PCD文件失败:', error);
      throw error;
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
    this.camera.position.set(0, -distance, 0);
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
   * 设置背景颜色
   * @param color - 背景颜色
   */
  setBackgroundColor(color: number): void {
    this.options.backgroundColor = color;
    this.renderer.setClearColor(color, 1);
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
      this.camera.position.set(0, -distance, 0);
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

    // 清理渲染器
    this.renderer.dispose();

    // 移除窗口事件监听
    window.removeEventListener('resize', this.onWindowResize);

    console.log('点云查看器已销毁');
  }
}

