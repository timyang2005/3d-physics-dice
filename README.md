# 3D 物理骰子应用

一款高度拟真的 3D 骰子模拟应用，基于 Android WebView + Three.js + Cannon.js 技术栈。

## 核心功能

- 7种骰子类型：D4、D6、D8、D10、D12、D20、D100
- 物理引擎驱动真实重力、碰撞、弹跳
- Three.js WebGL 3D 渲染
- 陀螺仪感应投掷
- 深色模式三模式
- 历史记录与统计图表

## 技术架构

Android WebView + Three.js + Cannon.js + Web Audio API

## 系统要求

- Android 8.0+ (API 26)
- Chromium 90+ WebView

## 构建方式

```bash
cd DiceApp
./gradlew assembleDebug
```

## 开源协议

MIT License
