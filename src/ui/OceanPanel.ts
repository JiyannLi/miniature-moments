import {
  OceanController,
  oceanRanges,
  type OceanKey,
  type OceanPreset,
} from "../ocean/OceanController";
const labels: Record<OceanKey, [string, string]> = {
  waveHeight: ["波高", "Wave height"],
  waveSpeed: ["速度", "Wave speed"],
  waveLength: ["波长", "Wave length"],
  choppiness: ["陡度", "Choppiness"],
  rippleStrength: ["细涟漪", "Ripple strength"],
  transparency: ["通透度", "Transparency"],
  glassiness: ["玻璃质感", "Glassiness"],
  reflection: ["反射", "Reflection"],
  interactionStrength: ["交互强度", "Interaction strength"],
  ripplePropagation: ["传播速度", "Ripple propagation"],
  rippleDamping: ["衰减速度", "Ripple damping"],
};
export class OceanPanel {
  private panel = document.createElement("section");
  private toggle: HTMLButtonElement;
  private timer = 0;
  private unsubscribe: () => void;
  constructor(private ocean: OceanController) {
    this.toggle = document.querySelector("#ocean-toggle")!;
    this.panel.id = "ocean-panel";
    this.panel.className = "ocean-panel floating";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-labelledby", "ocean-title");
    this.panel.innerHTML = `<div class="ocean-heading"><div><span class="eyebrow">海的呼吸</span><h2 id="ocean-title">Ocean studies</h2></div><button id="ocean-close" aria-label="收起海洋面板">×</button></div><div class="ocean-modes" role="group" aria-label="海洋模式"><button data-ocean-mode="auto">自动 <small>Auto</small></button><button data-ocean-mode="manual">手动 <small>Manual</small></button></div><div class="ocean-presets" role="group" aria-label="海洋预设">${(["calm", "breeze", "windy"] as const).map((p, i) => `<button data-ocean-preset="${p}">${["静谧", "微风", "起风"][i]} <small>${["Calm", "Breeze", "Windy"][i]}</small></button>`).join("")}</div><div class="ocean-sliders">${(
      Object.keys(oceanRanges) as OceanKey[]
    )
      .map((key) => {
        const [min, max] = oceanRanges[key];
        return `<label class="ocean-field"><span>${labels[key][0]}<small>${labels[key][1]}</small><output for="ocean-${key}"></output></span><input id="ocean-${key}" data-ocean-key="${key}" type="range" min="${min}" max="${max}" step="${key === "waveHeight" ? ".001" : ".01"}" aria-label="${labels[key][0]}" /></label>`;
      })
      .join(
        "",
      )}</div><p class="ocean-note">在海面移动鼠标，涟漪会传播并逐渐消散；按住拖动仍可旋转。拖动滑块进入手动，风浪与降雨强度独立。</p>`;
    document.querySelector("#app")!.append(this.panel);
    this.toggle.onclick = () =>
      this.open(!this.panel.classList.contains("is-open"));
    this.panel
      .querySelector("#ocean-close")!
      .addEventListener("click", () => this.open(false));
    this.panel
      .querySelectorAll<HTMLButtonElement>("[data-ocean-mode]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            ocean.setMode(b.dataset.oceanMode as "auto" | "manual")),
      );
    this.panel
      .querySelectorAll<HTMLButtonElement>("[data-ocean-preset]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            ocean.setPreset(b.dataset.oceanPreset as OceanPreset)),
      );
    this.panel
      .querySelectorAll<HTMLInputElement>("[data-ocean-key]")
      .forEach(
        (input) =>
          (input.oninput = () =>
            ocean.setParameter(
              input.dataset.oceanKey as OceanKey,
              Number(input.value),
            )),
      );
    const scene = (event: Event) => {
      if ((event as CustomEvent).detail === 0) this.open(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") this.open(false);
    };
    window.addEventListener("miniature-scene", scene);
    window.addEventListener("keydown", key);
    this.unsubscribe = ocean.subscribe(() => this.sync());
    this.sync();
    window.addEventListener(
      "pagehide",
      () => {
        this.unsubscribe();
        clearTimeout(this.timer);
        window.removeEventListener("miniature-scene", scene);
        window.removeEventListener("keydown", key);
      },
      { once: true },
    );
  }
  private sync() {
    const s = this.ocean.snapshot();
    this.panel
      .querySelectorAll<HTMLButtonElement>("[data-ocean-mode]")
      .forEach((b) => {
        b.classList.toggle("selected", b.dataset.oceanMode === s.mode);
        b.setAttribute("aria-pressed", String(b.dataset.oceanMode === s.mode));
      });
    this.panel
      .querySelectorAll<HTMLButtonElement>("[data-ocean-preset]")
      .forEach((b) => {
        b.classList.toggle("selected", b.dataset.oceanPreset === s.preset);
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.oceanPreset === s.preset),
        );
      });
    this.panel
      .querySelectorAll<HTMLInputElement>("[data-ocean-key]")
      .forEach((input) => {
        const key = input.dataset.oceanKey as OceanKey,
          value = s.target[key];
        input.value = String(value);
        input.parentElement!.querySelector("output")!.textContent =
          key === "waveHeight" ? value.toFixed(3) : value.toFixed(2);
      });
  }
  private open(value: boolean) {
    clearTimeout(this.timer);
    this.toggle.setAttribute("aria-expanded", String(value));
    if (value) {
      this.panel.hidden = false;
      requestAnimationFrame(() => this.panel.classList.add("is-open"));
    } else {
      this.panel.classList.remove("is-open");
      this.timer = window.setTimeout(
        () => (this.panel.hidden = true),
        matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 280,
      );
    }
  }
}
