import DeviceParams from "./DeviceParams";
import { RenderPluginT9 } from "./RenderPluginT9";
import { ConfigStorage } from "../ConfigStorage";
import { ScreenBoard } from "../ScreenBoard";

const DeviceInfo = hmSetting.getDeviceInfo();

type LayoutType = "t9";
type CapsState = "abc" | "Abc" | "ABC";

interface Renderer {
  layoutData: { [key: string]: any };
  extraLayouts: any[];
  hasBackspace: boolean;
  build(): void;
  useLayout(layout: any): void;
}

interface BaseRenderer extends Renderer {
  layoutData: { [key: string]: any };
}

export class BoardTools {
  private board: ScreenBoard;
  private config: ConfigStorage;
  public renderer: BaseRenderer;
  public fallbackLayouts: string[];

  constructor(board: ScreenBoard, config: ConfigStorage) {
    this.board = board;
    this.config = config;
    this.renderer = this._findRenderer();
    this.fallbackLayouts = this._getFallbackLayouts();
  }

  public getRowPosition(i: number): [number, number, number] {
    const roundDelta = 0.04;
    return [
      DeviceParams.circle ? i * roundDelta * DeviceInfo.width : 0,
      DeviceParams.screenHeight + DeviceParams.titleHeight + i * DeviceParams.rowHeight,
      DeviceInfo.width * (1 - (DeviceParams.circle ? i * roundDelta * 2 : 0))
    ];
  }

  public getCapsIcon(): string {
    switch(this.board.capsState) {
      case "abc":
        return "screen_board/caps_off.png";
      case "Abc":
        return "screen_board/caps_mid.png";
      case "ABC":
        return "screen_board/caps_on.png";
      default:
        return "screen_board/caps_off.png";
    }
  }

  private _findRenderer(): BaseRenderer {
    let layout = this.config.get("layout", DeviceParams.layouts[0]) as LayoutType;
    if(this.board && (this.board as any).forceRenderer) layout = (this.board as any).forceRenderer;
    
    return new RenderPluginT9(this.board) as unknown as BaseRenderer;
  }

  private _getFallbackLayouts(): string[] {
    const layouts: string[] = [];
    const langCode = hmSetting.getLanguage();
    // Map language code to ISO 639-1 language code
    const langMap: { [key: number]: string } = {
      0: "en",  // English
      1: "zh",  // Chinese
      2: "es",  // Spanish
      // Add more mappings as needed
    };
    const userLang = langMap[langCode] || "en";
    if(this.renderer.layoutData[userLang] && userLang !== "en") {
      layouts.push(userLang);
    }
    layouts.push("en");
    return layouts;
  }
} 