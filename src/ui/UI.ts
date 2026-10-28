export class UI {
  readonly host: HTMLElement;
  private toast: HTMLElement;
  private timer = 0;
  private idleTimer = 0;
  private activity = new AbortController();
  constructor() {
    document.querySelector("#app")!.innerHTML =
      `<main id="world"></main><div class="grain" aria-hidden="true"></div>
      <header class="floating"><a class="brand" href="./" aria-label="Miniature Moments 首页"><span class="brand-mark">雨</span><span>MINIATURE MOMENTS<small>QUIET PLACES, LITTLE STORIES</small></span></a><button class="about-btn" aria-label="查看操作说明">?</button></header>
      <section class="scene-heading floating" aria-label="当前场景"><span class="eyebrow"><span class="dot"></span> A MOMENT IN THE RAIN</span><h1 id="scene-name">Rainy Konbini</h1><p id="scene-description">雨夜便利店 · 一盏灯，等一场雨停。</p></section>
      <nav class="scene-selector floating" aria-label="选择场景"><button class="scene-card active" data-scene="0" aria-pressed="true"><span class="scene-number">01</span><span><strong>Rainy Konbini</strong><small>雨夜便利店</small></span></button><button class="scene-card" data-scene="1" aria-pressed="false"><span class="scene-number">02</span><span><strong>Coastal Tram</strong><small>海岸电车</small></span></button></nav>
      <div class="location floating"><span id="location-title">雨の街角</span><small id="location-sub">A LITTLE LIGHT IN THE NIGHT</small></div>
      <div class="hint floating" id="hint">拖动探索 · 滚轮缩放 · 点击发光物件</div>
      <footer class="floating"><div class="toolbar"><div class="weather"><span class="tool-label">雨量</span><div class="segmented" role="group" aria-label="降雨强度"><button data-rain="0" aria-pressed="false">小雨</button><button data-rain="1" class="selected" aria-pressed="true">中雨</button><button data-rain="2" aria-pressed="false">大雨</button></div></div><span class="divider"></span><button id="time" class="tool-button" aria-label="切换昼夜">☾ <span>夜晚</span></button><span class="divider"></span><button id="reset" class="tool-button" aria-label="重置视角">⟲ <span>重置视角</span></button></div></footer>
      <div class="toast" role="status" aria-live="polite"></div><dialog><button class="close" aria-label="关闭说明">×</button><span class="eyebrow">FIELD NOTES / 操作手记</span><h2>每个角落，都有小小的故事。</h2><p>鼠标或单指拖动旋转，滚轮或双指缩放。点击画面里的物件，看看会发生什么。</p><p><b>雨夜便利店</b><br>点招牌开关店内灯光；点玻璃门开关店门；点路灯切换照明。售货机后还藏着一只小猫。</p><p><b>海岸电车</b><br>点道口信号，观看警示、落杆、电车通行和抬杆。点击车厢切换灯光。通行过程中会锁定新的通行请求。</p><p class="muted">按 R 重置视角 · 1 / 2 切换场景 · Esc 关闭手记<br>全屏沙盘 · 静态樱花 · 没有自动运镜</p></dialog>`;
    const wake = () => {
      document.body.classList.remove("ui-idle");
      clearTimeout(this.idleTimer);
      this.idleTimer = window.setTimeout(
        () => document.body.classList.add("ui-idle"),
        5000,
      );
    };
    for (const event of ["pointermove", "pointerdown", "wheel", "keydown"])
      document.addEventListener(event, wake, {
        passive: true,
        signal: this.activity.signal,
      });
    wake();
    window.addEventListener(
      "pagehide",
      () => {
        this.activity.abort();
        clearTimeout(this.idleTimer);
        clearTimeout(this.timer);
      },
      { once: true },
    );
    this.host = document.querySelector("#world")!;
    this.toast = document.querySelector(".toast")!;
    const dialog = document.querySelector("dialog")!;
    document
      .querySelector(".about-btn")!
      .addEventListener("click", () => dialog.showModal());
    document
      .querySelector(".close")!
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  }
  notify = (s: string) => {
    this.toast.textContent = s;
    this.toast.classList.add("visible");
    clearTimeout(this.timer);
    this.timer = window.setTimeout(
      () => this.toast.classList.remove("visible"),
      3500,
    );
  };
  hint = (s: string) => {
    document.querySelector("#hint")!.textContent = s;
  };
  bind(
    change: (n: number) => void,
    rain: (n: number) => void,
    time: () => void,
    reset: () => void,
  ) {
    document
      .querySelectorAll<HTMLButtonElement>("button[data-scene]")
      .forEach((b) => (b.onclick = () => change(Number(b.dataset.scene))));
    document.querySelectorAll<HTMLButtonElement>("[data-rain]").forEach(
      (b) =>
        (b.onclick = () => {
          rain(Number(b.dataset.rain));
          document.querySelectorAll("[data-rain]").forEach((el) => {
            el.classList.toggle("selected", el === b);
            el.setAttribute("aria-pressed", String(el === b));
          });
        }),
    );
    document.querySelector("#time")!.addEventListener("click", time);
    document.querySelector("#reset")!.addEventListener("click", reset);
    window.addEventListener("keydown", (e) => {
      if (document.querySelector("dialog")!.open) return;
      if (e.key.toLowerCase() === "r") reset();
      if (e.key === "1" || e.key === "2") change(Number(e.key) - 1);
    });
  }
  scene(n: number) {
    this.hint("拖动探索 · 滚轮缩放 · 点击发光物件");
    this.toast.classList.remove("visible");
    document
      .querySelectorAll<HTMLButtonElement>("button[data-scene]")
      .forEach((b) => {
        b.classList.toggle("active", Number(b.dataset.scene) === n);
        b.setAttribute("aria-pressed", String(Number(b.dataset.scene) === n));
      });
    document.querySelector("#location-title")!.textContent = n
      ? "海へつづく坂道"
      : "雨の街角";
    document.querySelector("#location-sub")!.textContent = n
      ? "THE LAST TRAM TO THE SEA"
      : "A LITTLE LIGHT IN THE NIGHT";
    document.querySelector("#scene-name")!.textContent = n
      ? "Coastal Tram"
      : "Rainy Konbini";
    document.querySelector("#scene-description")!.textContent = n
      ? "海岸电车 · 沿着暮色，去看一片海。"
      : "雨夜便利店 · 一盏灯，等一场雨停。";
    document.body.dataset.world = String(n);
  }
  time(night: boolean, coast: boolean) {
    document.querySelector("#time")!.innerHTML =
      `${night ? "☾" : "◒"} <span>${night ? "夜晚" : coast ? "黄昏" : "白天"}</span>`;
    document
      .querySelector("#time")!
      .setAttribute("aria-pressed", String(night));
  }
}
