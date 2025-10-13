# AlertModal 通用弹窗组件使用指南

## 概述

这是一个使用 `useImperativeHandle` 和 `forwardRef` 封装的通用 Alert 弹窗组件，支持多种类型的警告和自定义配置。

## 特性

✅ **命令式调用** - 通过 ref 调用 show/hide 方法  
✅ **多种类型** - danger、warning、info、success  
✅ **自动关闭** - 可配置自动关闭时间  
✅ **动画效果** - 淡入淡出 + 下滑动画  
✅ **TypeScript** - 完整的类型支持  
✅ **响应式设计** - 适配不同屏幕尺寸

## 快速开始

### 1. 基本使用

```tsx
import { useRef } from "react";
import AlertModal, { AlertModalRef } from "./components/alert-model";

function App() {
  const alertRef = useRef<AlertModalRef>(null);

  const handleClick = () => {
    alertRef.current?.show({
      title: "危险警告",
      message: "塔吊碰撞风险！请立即停止操作！",
      type: "danger",
      duration: 5000,
    });
  };

  return (
    <div>
      <button onClick={handleClick}>显示警告</button>
      <AlertModal ref={alertRef} />
    </div>
  );
}
```

### 2. API 参考

#### AlertOptions 配置项

```typescript
interface AlertOptions {
  title?: string;        // 标题，默认 "ALERT"
  message: string;       // 消息内容（必填）
  type?: "danger" | "warning" | "info" | "success";  // 类型，默认 "danger"
  duration?: number;     // 自动关闭时间（毫秒），0 表示不自动关闭，默认 3000
}
```

#### AlertModalRef 方法

```typescript
interface AlertModalRef {
  show: (options: AlertOptions) => void;  // 显示弹窗
  hide: () => void;                       // 隐藏弹窗
}
```

### 3. 使用示例

#### 危险警告（红色）

```tsx
alertRef.current?.show({
  title: "危险警告",
  message: "塔吊碰撞风险！",
  type: "danger",
  duration: 5000,
});
```

#### 操作警告（橙色）

```tsx
alertRef.current?.show({
  title: "操作警告",
  message: "当前风速过大，建议暂停作业",
  type: "warning",
  duration: 4000,
});
```

#### 提示信息（蓝色）

```tsx
alertRef.current?.show({
  title: "系统提示",
  message: "塔吊运行状态正常",
  type: "info",
  duration: 3000,
});
```

#### 成功信息（绿色）

```tsx
alertRef.current?.show({
  title: "操作成功",
  message: "塔吊参数已成功更新",
  type: "success",
  duration: 3000,
});
```

#### 不自动关闭

```tsx
alertRef.current?.show({
  title: "重要通知",
  message: "此警告需要手动关闭",
  type: "warning",
  duration: 0,  // 设置为 0 不自动关闭
});

// 手动关闭
alertRef.current?.hide();
```

### 4. 实际应用场景

#### 塔吊碰撞检测

```tsx
function TowerCraneMonitor() {
  const alertRef = useRef<AlertModalRef>(null);

  const checkCollision = () => {
    const hasCollisionRisk = detectCollision();
    
    if (hasCollisionRisk) {
      alertRef.current?.show({
        title: "碰撞警告",
        message: "检测到塔吊碰撞风险，请立即调整位置！",
        type: "danger",
        duration: 0, // 严重警告不自动关闭
      });
    }
  };

  return <AlertModal ref={alertRef} />;
}
```

#### 操作确认

```tsx
function OperationPanel() {
  const alertRef = useRef<AlertModalRef>(null);

  const handleSave = async () => {
    try {
      await saveData();
      alertRef.current?.show({
        title: "保存成功",
        message: "数据已成功保存",
        type: "success",
        duration: 2000,
      });
    } catch (error) {
      alertRef.current?.show({
        title: "保存失败",
        message: "数据保存失败，请重试",
        type: "danger",
        duration: 4000,
      });
    }
  };

  return <AlertModal ref={alertRef} />;
}
```

## 样式自定义

你可以通过修改 `src/styles/alert-modal.css` 来自定义样式：

- `.alert-type-danger` - 危险警告样式
- `.alert-type-warning` - 警告样式
- `.alert-type-info` - 提示样式
- `.alert-type-success` - 成功样式

## 注意事项

1. 每个页面/组件只需要挂载一个 `<AlertModal ref={alertRef} />` 实例
2. 可以在不同的地方调用 `alertRef.current?.show()` 来显示不同的提示
3. 如果设置 `duration: 0`，弹窗不会自动关闭，需要用户点击关闭按钮或调用 `hide()` 方法
4. 弹窗会自动显示在页面最上层（z-index: 9999）

## 完整示例

查看 `src/components/alert-modal-example.tsx` 文件获取完整的使用示例。

