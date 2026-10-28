export type WeatherCondition = "sunny" | "cloudy" | "rain";
export type OceanPreset = "calm" | "breeze" | "windy";
export type OceanMode = "auto" | "manual";
export const oceanRanges = {
  waveHeight: [0.015, 0.12],
  waveSpeed: [0.2, 1.6],
  waveLength: [0.65, 1.8],
  choppiness: [0, 0.65],
  rippleStrength: [0, 1],
  transparency: [0.25, 0.85],
  glassiness: [0, 1],
  reflection: [0, 0.8],
} as const;
export type OceanKey = keyof typeof oceanRanges;
export type OceanValues = Record<OceanKey, number>;
export const oceanPresets: Record<OceanPreset, OceanValues> = {
  calm: {
    waveHeight: 0.027,
    waveSpeed: 0.42,
    waveLength: 1.35,
    choppiness: 0.12,
    rippleStrength: 0.12,
    transparency: 0.72,
    glassiness: 0.72,
    reflection: 0.28,
  },
  breeze: {
    waveHeight: 0.067,
    waveSpeed: 0.8,
    waveLength: 1.12,
    choppiness: 0.32,
    rippleStrength: 0.3,
    transparency: 0.58,
    glassiness: 0.56,
    reflection: 0.4,
  },
  windy: {
    waveHeight: 0.105,
    waveSpeed: 1.2,
    waveLength: 0.9,
    choppiness: 0.56,
    rippleStrength: 0.48,
    transparency: 0.46,
    glassiness: 0.4,
    reflection: 0.48,
  },
};
export class OceanController {
  mode: OceanMode = "auto";
  preset: OceanPreset = "breeze";
  weather: WeatherCondition = "rain";
  rain = 1;
  private manual: OceanValues = { ...oceanPresets.breeze };
  readonly current: OceanValues = { ...oceanPresets.breeze };
  private listeners = new Set<() => void>();
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private changed() {
    this.listeners.forEach((fn) => fn());
  }
  setMode(mode: OceanMode) {
    if (mode !== this.mode) {
      if (mode === "manual") this.manual = { ...this.target() };
      this.mode = mode;
      this.changed();
    }
  }
  setPreset(preset: OceanPreset) {
    this.preset = preset;
    this.manual = { ...oceanPresets[preset] };
    this.changed();
  }
  setParameter(key: OceanKey, value: number) {
    if (!Number.isFinite(value)) return;
    if (this.mode !== "manual") this.manual = { ...this.target() };
    this.mode = "manual";
    const [min, max] = oceanRanges[key];
    this.manual[key] = Math.min(max, Math.max(min, value));
    this.changed();
  }
  setWeather(weather: WeatherCondition, rain = this.rain) {
    this.weather = weather;
    if (Number.isFinite(rain)) this.rain = Math.max(0, Math.min(2, rain));
    this.changed();
  }
  target(): OceanValues {
    if (this.mode === "manual") return { ...this.manual };
    const v = { ...oceanPresets[this.preset] };
    if (this.weather === "sunny") {
      v.rippleStrength *= 0.65;
      v.transparency = Math.min(0.85, v.transparency + 0.05);
    } else if (this.weather === "cloudy") {
      v.reflection *= 0.75;
      v.rippleStrength += 0.06;
    } else {
      v.rippleStrength = Math.min(
        1,
        v.rippleStrength + 0.12 + this.rain * 0.13,
      );
      v.reflection *= 0.82;
      v.transparency = Math.max(0.25, v.transparency - 0.035);
    }
    return v;
  }
  update(dt: number) {
    const target = this.target(),
      k = 1 - Math.exp(-Math.max(0, dt) * 3.5);
    for (const key of Object.keys(oceanRanges) as OceanKey[])
      this.current[key] += (target[key] - this.current[key]) * k;
  }
  snapshot() {
    return {
      mode: this.mode,
      preset: this.preset,
      weather: this.weather,
      rain: this.rain,
      target: this.target(),
      current: { ...this.current },
    };
  }
}
