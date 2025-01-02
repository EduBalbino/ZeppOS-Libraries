import { deviceName, deviceClass } from "../DeviceIdentifier";

const DeviceInfo = hmSetting.getDeviceInfo();

interface DeviceProfile {
  rowHeight: number;
  titleHeight: number;
  screenHeight: number;
  fontSize: number;
  buttonFontSize: number;
  layouts: string[];
  circle: boolean;
}

let profile: DeviceProfile;

switch(deviceName) {
  case "Mi Band 7":
    profile = {
      rowHeight: 56,
      titleHeight: 60,
      screenHeight: 140,
      fontSize: 18,
      buttonFontSize: 24,
      layouts: ["t9"],
      circle: false
    };
    break;
  case "Band 7":
    profile = {
      rowHeight: 48,
      titleHeight: 32,
      screenHeight: 100,
      fontSize: 18,
      buttonFontSize: 24,
      layouts: ["t9"],
      circle: false
    };
    break;
  case "GTR mini":
    profile = {
      rowHeight: 48,
      titleHeight: 32,
      screenHeight: 100,
      fontSize: 18,
      buttonFontSize: 24,
      layouts: ["t9"],
      circle: true
    };
    break;
  default:
    profile = {
      rowHeight: 48,
      titleHeight: 48,
      screenHeight: DeviceInfo.height - 48 * 4 - 32 - 64,
      fontSize: 18,
      buttonFontSize: 24,
      layouts: ["t9"],
      circle: deviceClass === "circle"
    };
    break;
}

export default profile; 