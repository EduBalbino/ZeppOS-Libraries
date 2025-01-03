import { ListScreen } from "./ListScreen";
import { ConfigStorage } from "./ConfigStorage";
import { Path } from "./Path";
import { BoardTools } from "./ScreenBoardData/BoardTools";
import { SCREEN_BOARD_VER } from "./ScreenBoardData/VERSION";
import DeviceParams from "./ScreenBoardData/DeviceParams";
import { ICON_SIZE_SMALL } from "./UiParams";
import { ScreenBoard } from "./ScreenBoard";

interface LayoutOption {
  name: string;
  value: string;
}

export class ScreenBoardSetup extends ListScreen {
  protected config: ConfigStorage;
  protected tools: BoardTools;

  constructor() {
    super();
    this.accentColor = 0xFF9900;
    this.config = new ConfigStorage(new Path("data", "screenboard.json"));
    this.config.load();
    
    // Create a dummy ScreenBoard instance that won't be used
    const dummyBoard = new ScreenBoard();
    this.tools = new BoardTools(dummyBoard, this.config);
  }

  getSupportedLayouts(): LayoutOption[] {
    const selected: LayoutOption[] = [];
    const known: LayoutOption[] = [
      {name: "T9", value: "t9"},
      {name: "T14", value: "t14"},
      {name: "Full", value: "qwerty"},
    ];

    for(const layout of known) {
      if(DeviceParams.layouts.indexOf(layout.value) > -1) {
        selected.push(layout);
      }
    }

    return selected;
  }

  start(): void {
    this.headline("Layout:")
    this.toggleGroup({
      options: this.getSupportedLayouts(),
      value: this.config.get("layout", DeviceParams.layouts[0]),
      iconTrue: `screen_board/${ICON_SIZE_SMALL}/true.png`,
      iconFalse: `screen_board/${ICON_SIZE_SMALL}/false.png`,
      callback: (val: string) => {
        this.config.set("layout", val);
      }
    });

    this.headline("About:");
    this.text({
      text: `ScreenBoard, ver.${SCREEN_BOARD_VER}\nby melianmiko`
    });

    this.offset();
  }
}