import { ScreenBoard } from "../ScreenBoard";

interface ButtonWidget {
  setProperty(prop: number, value: string): void;
}

type LayoutData = string | string[];
type LayoutRow = LayoutData[];
type Layout = LayoutRow[];

export interface LayoutMap {
  [key: string]: Layout;
}

export class BaseButtonsManager {
  private board: ScreenBoard;
  private inputButtons: ButtonWidget[];
  protected isSubscreen: boolean;
  private subscreenData: string[];
  private noAutoExit: boolean;
  protected layout: string;
  private layoutData: LayoutMap;

  constructor(board: ScreenBoard, inputButtons: ButtonWidget[], layoutData: LayoutMap) {
    this.board = board;
    this.inputButtons = inputButtons;

    this.isSubscreen = false;
    this.subscreenData = [];
    this.noAutoExit = false;

    this.layout = "";
    this.layoutData = layoutData;

    this.onButtonPress = this.onButtonPress.bind(this);
  }

  public getLayout(): string {
    return this.layout;
  }

  public useLayout(name: string): void {
    const data = this.layoutData[name];
    const isCapsUp = this.board.capsState !== "abc";

    this.layout = name;
    this.isSubscreen = false;

    for(let i = 0; i < this.inputButtons.length; i++) {
      let text = data[i]?.[0] || "";
      if(Array.isArray(text)) text = text.join("");
      if(isCapsUp) text = text.toUpperCase();
      this.inputButtons[i].setProperty(hmUI.prop.TEXT, text.replace(" ", "_"));
    }
  }

  public useSubscreen(data: LayoutRow, i: number, noAutoExit: boolean = false): void {
    const isCapsUp = this.board.capsState !== "abc";

    this.subscreenData = data.map(d => Array.isArray(d) ? d.join("") : String(d));
    this.isSubscreen = true;
    this.noAutoExit = noAutoExit;

    for(let i = 0; i < this.inputButtons.length; i++) {
      let text = this.subscreenData[i] || "";
      if(isCapsUp) text = text.toUpperCase();
      this.inputButtons[i].setProperty(hmUI.prop.TEXT, text.replace(" ", "_"));
    }
  }

  public onButtonPress(ident: string | number): void {
    const identNum = typeof ident === "string" ? parseInt(ident) : ident;
    if(this.isSubscreen) {
      let data = identNum < this.subscreenData.length ? this.subscreenData[identNum] : "";
      if(typeof data === "object") {
        this.useSubscreen(data, identNum);
        return;
      }
      if(this.board.capsState !== "abc" && typeof data === "string") {
        data = data.toUpperCase();
      }

      if(typeof data === "string") {
        this.board.value += data;
      }
      if(!this.noAutoExit) {
        this.useLayout(this.layout);
      }
      return;
    }

    const layoutData = this.layoutData[this.layout];
    let data: any = layoutData[identNum];
    if(typeof data === "object") {
      // Run subscreen
      this.useSubscreen(data, identNum);
    } else {
      if(this.board.capsState !== "abc") {
        data = (data as string).toUpperCase();
      }
      this.board.value += data;
    }
  }
} 