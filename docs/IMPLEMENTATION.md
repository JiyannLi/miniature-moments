# 第一轮阶段交付与验证记录

这是第一轮历史记录；第二轮几何、水体、UI 与部署验收见 [round2/REPORT.md](round2/REPORT.md)。

| 阶段    | 已完成                                                                                                       | 主要修改文件                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 | Vite、TypeScript、Three.js，正交相机、共享渲染与场景生命周期                                                 | package.json、package-lock.json、tsconfig.json、vite.config.ts、index.html、src/main.ts、src/core/Renderer.ts、CameraController.ts、SceneManager.ts |
| Phase 2 | 实体底座、便利店及室内、台阶与住宅；坡路、铁路、电车、道口、石墙、海岸和樱花树                               | src/core/geometry.ts、src/core/types.ts、src/scenes/SceneA.ts、SceneB.ts                                                                            |
| Phase 3 | 冷暖灯光、阴影、雨线、实例化涟漪、低粗糙度湿地与碎片反光、海浪、昼夜渐变                                     | src/core/Environment.ts、WeatherSystem.ts、src/scenes/SceneA.ts、SceneB.ts                                                                          |
| Phase 4 | Raycaster、悬停边框、防误触、店门和灯光、小猫、道口状态机、车灯、雨量、重置、响应式界面                      | src/core/InteractionManager.ts、Crossing.ts、src/ui/UI.ts、src/style.css                                                                            |
| Phase 5 | 静态几何合批、DPR 与阴影限制、窄屏取景、相机重置惯性清理、切换时矩阵同步和 GPU 资源释放；桌面/触屏测试与截图 | src/core/Renderer.ts、CameraController.ts、SceneManager.ts、src/main.ts、tests/、playwright.config.ts、docs/*.png、README.md                        |

## 实际验证

- `npm ci`：成功，可重复安装，保留 lockfile。
- `npm run build`：TypeScript 与生产构建成功；Three.js 分包约 501 kB（gzip 126.6 kB），有 Vite 500 kB 分包提示，不影响构建。
- `npm test`：2 项通过，检查完整状态序列、连续点击拒绝、栏杆角度范围、落杆前禁止通车。
- `npm run test:browser`：2 项通过，实际 Chromium / SwiftShader WebGL 渲染；包含所有物体点击、拖动防误触、昼夜/天气、完整道口周期、资源回收，以及触屏点击、旋转、双指缩放。
- 五轮场景往返切换：几何体 217 → 216，纹理 3 → 3；最后一帧海岸场景绘制调用 220。
- 开发服务器 5173 已启动，HTTP 请求成功。进程不随环境快照保留，需要按保存的启动说明重新启动。
- `git diff --check`：通过。

## 最新调整与边界

按用户后续要求，删除了樱花花瓣实例及其动画更新，保留静态樱花树。未使用参考项目的代码或美术资源。

没有真实 iPad / Safari 测试，也没有公网发布。软件渲染测试不构成硬件性能测量。湿路倒影是低成本近似，未实现实时镜面反射。模型按图片重建空间关系，属于简化艺术化演绎。

安装脚本与启动说明已通过环境工具保存到草稿；草稿保存不等于发布。需要在环境设置中检查并保存后发布环境，才能将准备好的文件系统快照供后续任务恢复。
