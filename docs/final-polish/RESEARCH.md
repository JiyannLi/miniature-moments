# 局部礁石方案核查

2026-10-28 通过官方 r180 示例源代码和 GitHub 搜索 `threejs procedural rocks` / `procedural coastline threejs` 检查适用方法。没有复制外部代码、纹理或模型，也没有执行这些仓库或安装依赖。

| 参考                                                                                                                   | 访问与许可                                    | 取舍                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [Three.js r180 曲线挤出示例](https://github.com/mrdoob/three.js/blob/r180/examples/webgl_geometry_extrude_shapes.html) | 可访问；Three.js MIT                          | 使用原生 CatmullRomCurve3 的 centripetal 曲线采样，再自行建立横截面；不引入地形依赖                                    |
| [Three.js r180 地形顶点示例](https://github.com/mrdoob/three.js/blob/r180/examples/webgl_geometry_terrain.html)        | 可访问；Three.js MIT                          | 参考 BufferGeometry 顶点塑形、法线与局部地形组织；保留低面数                                                           |
| [threejs-procedural-rocks-cliffs](https://github.com/maxliebscher/threejs-procedural-rocks-cliffs)                     | `94629ea`，2026-10-23，根目录 MIT；Three .185 | 研究连续地质体、闭合边界与拓扑审计，避免石块内部穿插。其标量场、精细提取、Worker 与 PBR 管线超出本轮小岸带需要，未移植 |
| [rock-lab](https://github.com/smithmw7/rock-lab)                                                                       | `c1006cb`，2026-09-10，根目录 MIT             | 参考风格化石体的形态和面色变化；未引入完整资产工作室、碎裂或外部资产                                                   |

采用一条不规则曲线、45 个截面、每截面 7 点的闭合 BufferGeometry，共 626 个三角面。岩石顶部、外缘、露水肩部和埋入海床的底缘具有不同的高低与宽窄变化；各段共享连接，使用低饱和顶点颜色和切面法线。

相较独立石块堆叠，这个方案不会留下相邻模块间的缝隙；相较完整地形引擎，只有一个岩石 Mesh、一个材质。以每条几何边被恰好两个三角面共享、体积方向、海床埋深和水域留空进行验证。原海床高度函数只读复用，海洋模拟和 Shader 均未修改。
