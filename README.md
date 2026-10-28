# Miniature Moments

两个可以自由探索的 Three.js 微缩沙盘：**Rainy Konbini / 雨夜便利店** 与 **Coastal Tram / 海岸电车**。

真实三维几何、正交视角、雨滴和涟漪、暖光与湿润路面。所有建筑和道具均由代码建模；没有将参考图片贴在平面上，没有自动环绕、游戏系统或声音开关。

## 运行

需要 Node.js 22.12+（本环境为 24.19）和支持 WebGL 2 的浏览器。

```bash
npm ci
npm run dev -- --port 5173
```

浏览器打开开发服务器显示的地址。开发服务器监听 `0.0.0.0`，供环境的端口转发使用。GitHub Pages 部署由 `.github/workflows/pages.yml` 负责，推送 `main` 后自动构建并发布。

```bash
npm run build     # TypeScript 检查 + Vite 生产构建，输出 dist/
npm run preview   # 本地检查生产构建
npm test          # 道口、几何、道具与海洋参数安全测试
npm run test:browser  # Chromium 浏览器交互与资源生命周期测试
npm run format    # 格式化源码
```

浏览器测试默认使用 `/usr/bin/chromium`；其他机器通过 `CHROMIUM_PATH=/path/to/chromium npm run test:browser` 指定。或者执行 `npx playwright install chromium` 后，将配置中的 executablePath 改为相应浏览器位置。软件 WebGL 测试验证功能，不代表真实设备帧率。

## 操作

| 操作     | 桌面                | 触屏         |
| -------- | ------------------- | ------------ |
| 旋转     | 拖动画面            | 单指拖动     |
| 缩放     | 滚轮                | 双指缩放     |
| 交互     | 点击物件            | 轻触物件     |
| 重置     | 底部按钮 / R        | 底部按钮     |
| 切换场景 | 底部场景按钮 / 1、2 | 底部场景按钮 |

相机禁止平移，限制俯仰角与缩放范围，以避免穿地和进入建筑。拖动超过 6 CSS 像素或发生多指操作后不执行点击交互。悬停交互物件有淡色边框与提示。

**雨夜便利店：** 点招牌开关室内灯光；点门开关店门；点路灯切换照明；点售货机后面的小猫触发跳跃。左侧有住宅与台阶，前方是人行道、斑马线和湿润街道；店内有独立货架、商品与收银台。

**海岸电车：** 点道口信号启动完整演示。状态依次为 `idle → warning → lowering → passing → raising → idle`；忙碌时拒绝新的请求。警灯交替闪烁，栏杆落下后电车才通过，电车完整离开道路后抬杆，并停在另一侧；下一次演示沿相反方向行驶。点车厢切换车灯和窗边乘客效果。中央坡道连接横向铁路与海岸，住宅、石墙、樱花位于两侧，后方是有厚度的微缩海面；黄昏通过光色表现，不设置太阳圆盘。

不包含飘落花瓣动画；4.0 中树木仅有极轻微、不同频率的整体偏航，枝干连接保持完整。

两个场景均有小雨 / 中雨 / 大雨。雨量影响雨线数量、透明度、速度和地面涟漪数量。便利店支持白天 / 夜晚；海岸支持黄昏 / 夜晚，光照平滑过渡。

4.0 增加晴天 / 阴天 / 雨天天气选择；点击雨量按钮会恢复雨天。Coastal Tram 底部的“海洋”按钮展开八参数面板，默认 **Auto / Breeze**。三个预设 Calm / Breeze / Windy 平滑切换；拖动任意滑块进入 Manual，天气不会覆盖手动值，返回 Auto 后平滑恢复天气联动。海洋设置在本次页面会话的场景切换间保留，刷新后恢复默认。

## 结构

```text
src/
  main.ts                    入口与帧循环
  core/
    Renderer.ts              WebGL、DPR 上限、性能降级
    CameraController.ts      包围盒自适应取景与 OrbitControls
    SceneManager.ts          切换、静态合批、GPU 资源释放
    Environment.ts           昼夜光照平滑过渡
    WeatherSystem.ts         共享雨线与实例化涟漪
    InteractionManager.ts    Raycaster、悬停、拖动防误触
    Crossing.ts              独立、可测试的道口状态机
    geometry.ts              建模辅助、程序化招牌、反光碎片
    types.ts                 场景生命周期接口
  scenes/
    SceneA.ts                便利店几何、门动画与灯光
    Storefront.ts            共用尺寸的门框、固定窗和门扇
    CrossingArm.ts           两侧独立的栏杆枢轴
    SceneB.ts                海岸几何、电车与波浪
  ocean/                     海况控制器、安全范围、CPU/GPU 共用 Gerstner 模型
  water/                     分层透明水体、海床与岩石
  props/                     程序化生活道具、按材质合批、场景布置
  lab/water-lab.ts            两种水体方案的隔离原型
  ui/                        主界面、操作说明、折叠 OceanPanel
  style.css                  响应式布局
```

## 性能与生命周期

- 桌面 DPR 上限 1.75，粗指针设备上限 1.35；持续低帧率时降到 1。
- 阴影贴图桌面 2048、触屏 1024。仅主方向光投影，不对全部点光源投影。
- 重复静态模型按材质合批；铁路枕木和涟漪实例化。雨滴使用单个动态线段缓冲区。
- 场景切换清除悬停并释放旧场景 geometry、material、texture、light 与实例缓冲。共享天气保留，只有当前场景存在。
- 页面隐藏时停止更新；delta 限幅，防止恢复标签页时动画跳变。`prefers-reduced-motion` 下暂停雨的运动，道口仍可主动演示。
- 湿路使用低粗糙度材质、程序化积水和半透明碎片化暖光反射，不使用昂贵的实时镜面反射或 Bloom。
- 所有字体、招牌与模型在本地生成；无需 API、凭据、数据库或联网素材。

## 图片与验证说明

最新截图、动态海浪录像、参数和验收结果见 [4.0 交付报告](docs/v4/REPORT.md)，参考访问与许可证核查见 [4.0 调研](docs/v4/RESEARCH.md)。

`docs/round2/konbini-wide.png`、`docs/round2/coast-wide.png`、`docs/round2/coast-phone.png` 是实际浏览器生成的 WebGL 截图。参考图片中的构图被压缩为完整沙盘；画风为简化 Low-poly，未追求照片级复原。

浏览器测试覆盖实际 Raycaster 点击、相机拖动防误触、昼夜雨量切换、道口完整动画、连续点击锁定、触摸旋转/缩放，以及反复切换后的 GPU 资源数量。单元测试独立验证状态序列和栏杆未落下时禁止通车。

当前没有真实 iPad / Safari 硬件验证；移动兼容已通过 Chromium 触屏模拟检查。反射是艺术化近似；旋转时不等同于物理镜面。窗口内灯光与乘客为简化几何。

依赖与参考仓库的许可核查见 [docs/REFERENCES.md](docs/REFERENCES.md)。

## GitHub Pages 部署

仓库自带 GitHub Actions 部署流程：推送 main → npm ci → 单元测试 → 生产构建 → 上传 dist → 部署 Pages。构建使用相对资源路径，兼容 `/miniature-moments/` 子目录。

首次部署若自动启用 Pages 被 GitHub 权限策略拒绝，请进入仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。然后在 **Actions → Deploy GitHub Pages** 中重新运行工作流。

预期访问地址：`https://jiyannli.github.io/miniature-moments/`。只有工作流部署成功后此地址才表示可用。

## 第二轮修复与沉浸式界面

本轮在原场景上修复了店门与窗框重叠、门前障碍物侵入开门范围、道口栏杆反向旋入地下，以及电车周期边界瞬移。门扇与两侧栏杆的完整扫掠范围有几何测试。太阳圆盘已移除，黄昏/夜晚继续通过平滑光色变化呈现。

界面改为全视口沙盘与悬浮控件，正交相机按模型包围盒和屏幕比例取景。水体包含动态表面、透明侧壁、可见海床和实例化岩石。樱花依然静态，没有自动运镜。

调研与水体方案比较见 [docs/round2/RESEARCH.md](docs/round2/RESEARCH.md)，本轮关键截图和验收记录见 [docs/round2/REPORT.md](docs/round2/REPORT.md)。水体隔离原型可以访问开发/预览服务器下的 `water-lab.html?mode=shader` 或 `?mode=physical`。

水体 Shader 使用近似 Fresnel 与天空光色，不提供真实建筑倒影或物理折射。iPad 横竖屏检查为 Chromium 触屏模拟，不能替代真实 Safari 硬件测试。

## 第三轮：结构修复与海水稳定性

本轮修复截图涉及的树枝连接、便利店白护栏、两栋双坡住宅及道口路基地形；海水去除与陆地共面的透明侧壁，保留深度测试，改进波浪、冷暖水色，并将水下岩石减少为 8 块贴地的不规则模型。UI、相机操作、其他正常道路设施保持不变。

[本轮交付报告、根因、截图与动态录屏](docs/round3/REPORT.md)。相关浏览器回归：

```bash
npm run test:browser -- tests/browser/round3.spec.ts tests/browser/worlds.spec.ts
```

录屏为可选测试输出；如需重新录制，可先准备 Playwright FFmpeg，再设置 `RECORD_WATER_VIDEO=1` 运行本轮水体用例。正常浏览器测试无需视频编码器。

## 4.0：Quiet Living Diorama

便利店向侧面扩建约 23%，增加有街道入口的单车/汽车停放空间、促销牌、透明雨伞、玻璃贴纸和服务设施；海岸总面积增加 25%，主要扩展海域，补充住宅盆栽、信箱、门牌、自行车和海边长椅。原有主体、道口、门和相机操作继续保留。

海面采用三组 Gerstner 波，具有连续水平/垂直位移、岸线衰减、共享位移的侧壁、可见海床、Fresnel 和吸收近似。八个参数都有安全范围；雨量调节细涟漪，风浪由预设决定，夜晚改变光色。没有真实建筑反射、FFT 或高成本海洋引擎。

```bash
npm test
npm run build
npm run test:browser
# 可选录制：安装 Playwright FFmpeg 后
RECORD_OCEAN_VIDEO=1 npm run test:browser -- tests/browser/v4.spec.ts --grep Gerstner
```

原 GitHub Pages 工作流继续负责发布。测试截图和视频仅作为仓库文档，不打包到网页运行资源中。
