import { deviceClass, isLowRamDevice } from "./DeviceIdentifier";

interface DeviceInfo {
  width: number;
  height: number;
}

const info: DeviceInfo = hmSetting.getDeviceInfo();

export const SCREEN_WIDTH: number = info.width;
export const SCREEN_HEIGHT: number = info.height;

export const IS_MI_BAND_7: boolean = deviceClass === "miband";
export const IS_LOW_RAM_DEVICE: boolean = isLowRamDevice;

let SCREEN_MARGIN_Y: number = 0;
let SCREEN_MARGIN_X: number = 0;
let ICON_SIZE_SMALL: number = 24;
let ICON_SIZE_MEDIUM: number = 48;
let BASE_FONT_SIZE: number = 18;

switch(deviceClass) {
  case "miband": // mb7
    SCREEN_MARGIN_Y = 96;
    break;
  case "band": // ab7
    SCREEN_MARGIN_Y = 48;
    break;
  case "square": // gts series
    SCREEN_MARGIN_Y = 64;
    BASE_FONT_SIZE = 24;
    ICON_SIZE_SMALL = 32;
    break;
  case "circle": // gtr/falcon/t-rex
    SCREEN_MARGIN_Y = 96;
    SCREEN_MARGIN_X = 48;
    BASE_FONT_SIZE = 24;
    ICON_SIZE_SMALL = 32;
    break;
}

export {
  SCREEN_MARGIN_Y,
  SCREEN_MARGIN_X,
  ICON_SIZE_SMALL,
  ICON_SIZE_MEDIUM,
  BASE_FONT_SIZE,
}

export const WIDGET_WIDTH: number = SCREEN_WIDTH - SCREEN_MARGIN_X * 2; 