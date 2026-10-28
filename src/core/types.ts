import * as T from "three";
export interface Target {
  object: T.Object3D;
  name: string;
  action: () => void;
}
export interface World {
  root: T.Group;
  targets: Target[];
  update: (dt: number, time: number) => void;
  setNight: (night: number) => void;
  inspect?: () => Record<string, unknown>;
  dispose?: () => void;
}
