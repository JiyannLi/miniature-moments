import * as T from "three";
export class Renderer {
  readonly canvas = document.createElement("canvas");
  readonly renderer: T.WebGLRenderer;
  readonly low = matchMedia("(pointer: coarse)").matches;
  private slow = 0;
  private frames = 0;
  constructor(private host: HTMLElement) {
    this.canvas.setAttribute("aria-label", "可旋转的三维微缩沙盘");
    this.canvas.setAttribute("role", "img");
    this.renderer = new T.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, this.low ? 1.35 : 1.75),
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.17;
    host.append(this.canvas);
  }
  resize() {
    this.renderer.setSize(this.host.clientWidth, this.host.clientHeight);
  }
  adapt(dt: number) {
    this.frames++;
    if (dt > 0.045) this.slow++;
    if (this.frames === 180 && this.slow > 70) this.renderer.setPixelRatio(1);
  }
}
