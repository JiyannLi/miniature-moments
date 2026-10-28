# 海洋参考核查

2026-10-28 重新核查指定仓库，并通过 GitHub 仓库搜索 `threejs ripple simulation` 补充案例。仅只读检查代码与文档，未执行这些项目、复制代码或引入其资产。下表日期是所检出分支的最近提交日期，不代表其仍在积极维护。

| 项目                                                                      | 核查结果与维护信息                               | 许可与兼容性                                    | 采用 / 舍弃                                                                                                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Three.js 官方 r180 `webgl_gpgpu_water.html`、本地 GPUComputationRenderer  | 官方 r180 源码可访问；与本项目版本匹配           | Three.js MIT                                    | 检查高度/上一帧高度、双缓冲、鼠标源、顶点采样。GPU 方案需要浮点渲染目标和额外计算 pass；本次小水域改用可测试 CPU 高度场，GPU 执行最终位移 |
| [WaterThreeJS](https://github.com/achrefelouafi/WaterThreeJS)             | `4f85f4a557da`，2026-07-23                       | MIT；较新 Three.js 架构                         | 借鉴基础波、法线、水体外观的分离；不移植 SSR / 重型水体引擎                                                                               |
| [threejs-water-free](https://github.com/baditaflorin/threejs-water-free)  | `4a2dd82ed439`，2026-06-04                       | MIT；WebGPU / TSL / FFT                         | 研究成本和质量控制；不将 WebGL 项目迁移至 WebGPU                                                                                          |
| [momokula123/threejs-water](https://github.com/momokula123/threejs-water) | `46fe7366c8c2`，2026-06-10                       | README 声明 MIT，未发现根目录 LICENSE           | 只参考水体分层，不复制代码或资源                                                                                                          |
| [Cinematic Ocean](https://github.com/nguyencongnamit/threejs-ocean)       | 返回 repository not found                        | 无法核实                                        | 跳过，不阻塞                                                                                                                              |
| [evanw/webgl-water](https://github.com/evanw/webgl-water)                 | `73eda8be832b`，2016-01-07，长期未更新的经典案例 | `water.js` 文件头声明 MIT，非现代 Three.js 模块 | 研究浮点纹理高度/速度、局部注入和法线更新；独立实现波动方程，不引入旧 LightGL                                                             |
| [tahabakri/webgl-fluid-lab](https://github.com/tahabakri/webgl-fluid-lab) | 搜索发现，`5f5d01b`，2026-06-03                  | 根目录 MIT，Three ^.184 / Vite 8                | 研究阻尼高度场和轨迹输入；其主体为文字折射，不等于本项目几何水体，未移植                                                                  |
| [avish/ripplez](https://github.com/avish/ripplez)                         | 搜索发现，`838757e`，2017-03-29                  | 未发现根目录许可证，旧 Three.js / AMD           | 只观察离散物理状态组织，不复制旧模块                                                                                                      |

## 视频观察

检查用户提供的约 11.8 秒视频，在不同时间点观察相机变化与水面局部波峰：鼠标附近出现局部峰谷，水纹沿周围扩散；水面轮廓和剖面顶部同时运动，水下岩石仍可见。这个目标需要实际高度变化，不能用涟漪贴图或法线扰动替代。保留本项目 Low-poly 风格，不复制视频模型。

## 方案的实际成本

桌面高度场 96×48、触屏 64×32，三个 Float32Array，固定步长 1/120 秒。按世界尺寸缩放二维拉普拉斯，最大传播速度 2.2，满足 CFL 稳定限制；阻尼和吸收边界抑制长时间反复振荡。

初始为静水；只有输入后才更新纹理。每个模拟帧上传一张 Red/Float DataTexture（桌面约 18 KB）。GPU 在顶点阶段手动双线性采样，避免依赖浮点线性过滤扩展。没有 GPU 读回、浮点颜色附件、双缓冲计算 pass 或额外场景反射。水面与侧壁共享总位移，法线来自总位移的局部差分。

该方案适用于当前小型水域，CPU 成本需实际测量；若未来扩大分辨率或水域数量，再考虑 GPU 双缓冲。限制与性能结果写入交付报告。
