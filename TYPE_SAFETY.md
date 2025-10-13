# TypeScript 类型安全改进

## Window 对象类型扩展

### 问题
在将自定义属性挂载到 `window` 对象时，如果使用 `as any` 或 `@ts-expect-error` 等方式，会导致：
- ❌ 类型不安全
- ❌ 失去IDE智能提示
- ❌ 违反TypeScript最佳实践
- ❌ 容易引入运行时错误

### 解决方案

通过创建全局类型声明文件来扩展 `Window` 接口：

#### 1. 创建类型声明文件

**文件位置**: `src/types/window.d.ts`

```typescript
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
```

#### 2. 使用方式

改造前（❌ 不推荐）：
```typescript
// 使用 any 类型
(window as any).viewer = viewer;

// 使用 @ts-expect-error
//@ts-expect-error ignore
window.currentPCDData = data;
```

改造后（✅ 推荐）：
```typescript
// 直接使用，类型安全且有智能提示
window.viewer = viewer;
window.currentPCDData = data;

// 访问时也有类型检查
if (window.viewer) {
  window.viewer.resetCamera(); // IDE会提示可用方法
}
```

### 优势

#### ✅ 1. 类型安全
```typescript
// TypeScript 会检查类型
window.viewer = new PointCloudViewer(); // ✓ 正确
window.viewer = "string";                // ✗ 编译错误
```

#### ✅ 2. IDE 智能提示
```typescript
// 输入 window.viewer. 后会自动提示所有可用方法
window.viewer?.resetCamera();
window.viewer?.setPointSize(0.1);
```

#### ✅ 3. 可选属性
```typescript
// 使用 ?. 操作符安全访问
window.viewer?.getCraneManager();

// 或使用条件检查
if (window.viewer) {
  window.viewer.resetCamera();
}
```

#### ✅ 4. 文档化
```typescript
// JSDoc 注释会在 IDE 中显示
interface Window {
  /** 点云查看器实例 */
  viewer?: PointCloudViewer;  // 悬停时显示注释
}
```

### 关键点说明

#### 1. `declare global`
```typescript
declare global {
  interface Window {
    // 扩展内容
  }
}
```
- 用于声明全局类型
- 扩展现有的全局接口

#### 2. `export {}`
```typescript
export {};
```
- 确保文件被视为模块
- 必须包含，否则声明可能不生效

#### 3. 可选属性 `?`
```typescript
viewer?: PointCloudViewer;
```
- 属性标记为可选
- 允许 `undefined`
- 需要使用可选链或条件检查访问

### 实际应用示例

#### 初始化
```typescript
// src/components/three-3d-view.tsx
const viewer = new PointCloudViewer("viewer-container");
const uiController = new UIController(viewer);

// 挂载到全局
window.viewer = viewer;
window.uiController = uiController;
```

#### 使用
```typescript
// src/utils/pointcloud-viewer.ts
window.currentPCDData = data;
window.currentFileName = file.name;
```

#### 访问
```typescript
// src/utils/ui-controller.ts
if (window.currentPCDData) {
  const data = window.currentPCDData;
  await this.viewer.loadPCD(data);
}
```

#### 清理
```typescript
// React cleanup
delete window.viewer;
delete window.uiController;
```

### TypeScript 配置

确保 `tsconfig.json` 包含 `src` 目录：

```json
{
  "include": ["src"]
}
```

这样 `src/types/window.d.ts` 会被自动包含。

### 其他全局类型扩展示例

#### 扩展其他全局对象
```typescript
// 扩展 NodeJS 全局
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CUSTOM_ENV: string;
    }
  }
}

// 扩展全局变量
declare global {
  var myGlobalVar: string;
}

// 扩展 globalThis
declare global {
  interface GlobalThis {
    myProperty: number;
  }
}
```

### 最佳实践

1. ✅ **使用类型声明文件** 而不是 `any`
2. ✅ **添加 JSDoc 注释** 提供文档
3. ✅ **使用可选属性** `?` 标记可能不存在的属性
4. ✅ **导出接口类型** 便于其他模块引用
5. ✅ **集中管理** 所有全局类型声明

### 相关文件

- `src/types/window.d.ts` - Window 接口扩展
- `src/utils/crane-manager.ts` - 导出 `CraneUserData` 接口
- `src/utils/ui-controller.ts` - 导入并使用类型
- `src/components/three-3d-view.tsx` - 使用扩展的 Window 接口

### 编译验证

```bash
# 类型检查
npm run build

# 开发模式（自动类型检查）
npm run dev
```

### 总结

通过创建 `window.d.ts` 类型声明文件：
- 🎯 完全类型安全
- 🎯 零 `any` 类型
- 🎯 完整的 IDE 支持
- 🎯 符合 TypeScript 最佳实践
- 🎯 更好的开发体验

这是 TypeScript 项目中处理全局变量的标准做法！

---

**相关链接**:
- [TypeScript 官方文档 - Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- [TypeScript 官方文档 - Global Augmentation](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/global-modifying-module-d-ts.html)

