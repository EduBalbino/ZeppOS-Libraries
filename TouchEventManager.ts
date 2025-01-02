interface TouchEvent {
  x: number;
  y: number;
}

type TouchEventCallback = (event: TouchEvent) => void;

export class TouchEventManager {
  public ontouch: TouchEventCallback | null = null;
  public ontouchdown: TouchEventCallback | null = null;
  public ontouchup: TouchEventCallback | null = null;

  constructor(widget: HmWearableProgram.DeviceSide.HmUI.IHmUIWidget | null) {
    if (widget) this._init(widget);
  }

  private _init(widget: HmWearableProgram.DeviceSide.HmUI.IHmUIWidget): void {
    let handleClick = true;

    widget.addEventListener(hmUI.event.CLICK_DOWN, (e: TouchEvent) => {
      console.log("[TouchManager] Click Down");
      if (this.ontouchdown) this.ontouchdown(e);
      handleClick = true;
    });

    widget.addEventListener(hmUI.event.CLICK_UP, (e: TouchEvent) => {
      console.log("[TouchManager] Click Up");
      if (this.ontouchup) this.ontouchup(e);
      if (handleClick && this.ontouch) {
        console.log("[TouchManager] Executing ontouch callback");
        this.ontouch(e);
      }
      handleClick = false;
    });
  }
} 