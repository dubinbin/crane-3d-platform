# 快速开始指南

## 安装和运行

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview
```

## 项目启动后

访问 `http://localhost:5173`

## 主要功能

### 1. 加载点云文件

**通过URL参数：**
```
http://localhost:5173/?pcdId=your-file-id
```

**手动加载：**
暂时需要通过代码调用 `viewer.loadPCD(file)` 方法

### 2. 控制面板（右侧）

- 📏 **点大小**：拖动滑块调整点的显示大小
- 🎨 **背景颜色**：点击颜色选择器更改背景
- 📊 **点云密度**：选择渲染质量
  - 快速预览（2.5万点）- 最快
  - 标准密度（5万点）- 推荐
  - 增强密度（20万点）
  - 高清密度（50万点）
  - 完整点云（全部点）- 最慢但最详细

### 3. 视图操作

- **旋转**：鼠标左键拖拽
- **缩放**：鼠标滚轮
- **平移**：鼠标右键拖拽
- **重置**：点击"🔄 重置视角"按钮

### 4. 塔吊功能

**添加塔吊：**
点击"🏗️ 添加塔吊"按钮，会在随机位置添加一个塔吊模型

**控制塔吊：**
每个塔吊都有独立的控制面板，可以调整：
- **位置**：X/Y/Z 三个轴向
- **缩放**：整体大小
- **水平旋转**：0-360度旋转（控制吊臂方向）
- **臂膀俯仰**：-90到+90度（控制吊臂上下角度）
- **吊绳长度**：0.1m到10m

**删除塔吊：**
点击塔吊控制面板上的"删除"按钮

**清空所有：**
点击"🗑️ 清除所有塔吊"按钮

## 技术栈

- **React 19** + **TypeScript**
- **Three.js** - 3D渲染
- **Vite** - 构建工具
- **原生Three.js**（非React Three Fiber）用于更好的控制

## 文件说明

| 文件 | 说明 |
|------|------|
| `src/App.tsx` | 主应用入口 |
| `src/components/three-3d-view.tsx` | 3D视图容器 |
| `src/components/pointCloud-helper-panel.tsx` | 控制面板UI |
| `src/utils/pointcloud-viewer.ts` | 点云查看器核心 |
| `src/utils/ui-controller.ts` | UI控制逻辑 |
| `src/utils/crane-manager.ts` | 塔吊管理器 |
| `src/utils/pcd-parser.ts` | PCD文件解析 |
| `src/utils/file-util.ts` | 文件工具 |

## 常见问题

**Q: 点云加载很慢？**  
A: 尝试降低点云密度设置，使用"快速预览"或"标准密度"

**Q: 塔吊模型不显示？**  
A: 检查网络连接，模型从 `https://file.hkcrc.live/crane3.fbx` 加载

**Q: 如何添加文件上传功能？**  
A: 可以在PointCloudHelperPanel中添加文件输入控件，然后调用 `viewer.loadPCD(file)`

## 下一步

查看 `INTEGRATION_README.md` 了解详细的技术文档和架构说明。

