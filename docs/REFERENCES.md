# 参考仓库与依赖许可核查

2026-10-28 使用平台 HTTPS Git 代理对以下五个仓库执行 `git ls-remote` 并浅克隆，全部成功。GitHub API 路径被代理返回 403；没有据此认定仓库不存在。

| 仓库                                   | 检查结果与适用思路                                                 | 根目录许可证                      |
| -------------------------------------- | ------------------------------------------------------------------ | --------------------------------- |
| xiaoninemao/japanese-miniature-scenes  | Three.js / TypeScript / Vite，完整沙盘、独立场景、程序化店铺及天气 | 未找到 LICENSE；不假定允许复用    |
| shellcat-com/formwork-isometria        | 正交视角、Raycaster、昼夜灯光、柔和阴影                            | MIT，Copyright 2026 bswxyz        |
| george3232-foo/threejs-isometric-house | 程序化建模、材质分桶合并与重复物体实例化                           | 未找到 LICENSE；不假定允许复用    |
| bugman-007/Rain-cliptus                | 雨量驱动湿润材质、实例化雨滴与涟漪；其 React 技术栈对本项目偏重    | GPL-3.0                           |
| HiliMor/after-rain                     | 观察其独立天气、微交互和粗糙度分离的设计方式                       | All rights reserved，禁止代码复用 |

本项目采用独立编写的 Three.js 几何和动画实现，未复制上述仓库的代码、纹理、模型、字体或其他资源。用户提供的参考图只用于观察布局，没有作为场景平面贴图。

## 安装依赖

- Three.js、@types/three、Vite、tsx、Prettier：MIT。
- TypeScript：Apache-2.0。
- Playwright / @playwright/test：Apache-2.0（仅开发测试）。
- @types/node：MIT（仅开发类型）。
- 完整版本及传递依赖见 `package-lock.json`；第三方软件继续受各自随包 LICENSE 约束。
- 无外部字体、CDN、远程美术资源或 API 凭据。运行时仅 Three.js 是直接第三方依赖。
