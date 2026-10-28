# 第二轮技术调研与方案选择

## 核查方式

通过平台 HTTPS Git 代理浅克隆并读取 README、依赖清单和相关实现。以下五个新增仓库均实际可访问。未复制这些项目的源代码、Shader、图片或模型。本轮没有新增 npm 依赖。

Three.js 在线文档 `https://threejs.org/docs/pages/Water.html` 被当前网络代理返回 CONNECT 403，因此直接检查项目所安装 Three.js r180 的官方 `examples/jsm/objects/Water.js`、`CSS2DRenderer.js`、`CSS3DRenderer.js`，不以访问失败认定功能不可用。

| 参考                           | 实际技术                                                                             | 许可核查与适用性                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Three.js 官方 Water            | WebGL Shader、法线纹理、镜面相机和 WebGLRenderTarget；onBeforeRender 会再渲染场景    | Three.js MIT。可兼容现有 WebGLRenderer，但反射额外渲染整个场景，对此微缩水域不合算                           |
| VictorZakharov/beautiful-water | Three.js 0.185.1；WebGPU / WebGL 双路径、程序化波谱、浅海及水下表现                  | 根 LICENSE 为 MIT。借鉴分层波纹与深浅水组织，不引入其 WebGPU 或镜头系统                                      |
| stas4000/luminous-lake         | Three.js 0.179；MeshPhysicalMaterial、CPU 顶点波、滚动法线、CubeCamera，多档更新频率 | 根 LICENSE 为 MIT。物理材质方案可行，但 CubeCamera 最多需要六面额外场景渲染，本项目不采用                    |
| momokula123/threejs-water      | Three.js r160、自定义 GLSL、Fresnel、深度混色、多层噪声、海床                        | README 声明 MIT，但未找到根 LICENSE 正文；不复制代码。其 256²–768² 顶点密度、FBM 和复杂 GUI 不适合本项目预算 |
| lakar-team/solar-punk          | Next.js / React Three Fiber / Drei / Framer Motion；分离 Canvas 与悬浮 UI            | 未找到 LICENSE 授权正文。只研究分层模式，不复用代码、不引入框架、科幻 HUD、音频或移动端重定向                |
| CodeItAlone/3D-portfolio       | 原生 Three.js、HTML/CSS 覆盖层、pointer-events 分离、响应式玻璃面板                  | README 声明 MIT，但所链接 LICENSE 文件未找到；不复制代码。不采用滚动自动运镜、星空或大粒子效果               |

## A / B 水体比较

两种方案均在独立 `water-lab.html?mode=physical` / `?mode=shader` 中实际运行并截图，正式集成前已确认原型能编译和呈现海床。实验页也纳入生产构建。

| 项目         | A：MeshPhysicalMaterial + 滚动法线                                             | B：轻量自定义 Shader（采用）                                                        |
| ------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 顶部         | 标准物理光照、IOR 1.333、roughness .32、64×64 程序化法线贴图；顶点注入共享波场 | 三个低频解析波、解析扰动法线、Fresnel、深浅水色、低强度高光和暖/冷环境近似          |
| 动态波形     | onBeforeCompile 接入共享小幅波纹，纹理偏移提供微波纹                           | 顶点直接计算波场，不需要每帧上传顶点或法线                                          |
| 颜色和昼夜   | 内置材质好维护，但体积侧面与海床需要另外协调                                   | 同一组 uTime / uNight 驱动顶部、侧壁与海床，时间连续性简单                          |
| 反射         | 若需环境反射还要提供 envMap 或反射目标                                         | 近似天空色反射；没有反射建筑物，也没有真实折射                                      |
| 原型渲染开销 | 5 次绘制，5 个 geometry，1 张纹理                                              | 5 次绘制，5 个 geometry，0 张纹理                                                   |
| 兼容性       | Three.js WebGL 2 标准材质，支持 Safari WebGL 2；未做真实 iPad 测试             | WebGL 常规 GLSL，无噪声库、导数扩展、屏幕空间读回或 WebGPU 依赖；未做真实 iPad 测试 |
| 集成/维护    | 较少自定义片元代码，但波浪与侧壁需维护两条材质路径                             | 一套短波场和水色逻辑，侧壁/表面水位共用，边界可直接测试                             |

以上开销是浏览器 renderer.info 记录的结构计数，不是 GPU 时间或硬件帧率结论。

选择 B 的原因是更容易用少量透明层保持整个水体一致，且不需要额外场景渲染。它不是流体模拟或完整物理水体。

## 最终水体组成

- 顶部：64×24 分段平面，小幅解析波纹，总振幅不超过 .031 单位；法线细节不改变大尺度水位。
- 侧壁：四面实际几何，顶部边缘与水面使用同一公式及相同边界采样，水位 .12、海床底界 -.78，水深约 .9。
- 海床：40×12 的缓坡几何、轻量动态焦散明暗与程序化沙粒。
- 岩石：22 个低面数实例，不伸出水体边界或沙盘底座。
- 陆地底座在海岸边界停止，避免原有整块不透明底座遮住水下剖面。
- 透明层 depthWrite=false；海床和岩石先绘制，水面 renderOrder=2、侧壁=3。双面侧壁只绘制一次，不采样屏幕颜色。
- 资源释放沿用 SceneManager 的 geometry/material/instance 生命周期；不新增 render target。

## UI 方案

CSS2DRenderer 适合跟随三维物体的标签；CSS3DRenderer 适合需要三维透视变换的 HTML。本项目大多数 UI 是固定的工具按钮，不需要额外 Renderer。采用全视口 WebGL + 普通固定 HTML 覆盖层：装饰与文本 pointer-events:none，按钮和紧凑面板 pointer-events:auto。

删除左侧大标题区；品牌位于左上，场景信息为小字，底部保留场景和天气/时间/重置。包围盒投影决定正交视锥；宽屏降低默认俯视角以兼顾完整显示与 65%–75% 的目标宽度。用户仍可手动旋转，未添加任何自动镜头运动。

约 5 秒无输入后非必要 UI 淡化至 .36，仍可点击和键盘聚焦；鼠标、触摸、滚轮或键盘输入立即恢复，不改变场景状态。
