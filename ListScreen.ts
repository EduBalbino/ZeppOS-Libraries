import {
  BASE_FONT_SIZE,
  ICON_SIZE_SMALL,
  SCREEN_MARGIN_X,
  SCREEN_MARGIN_Y,
  SCREEN_WIDTH,
  WIDGET_WIDTH
} from "./UiParams";
import { TouchEventManager } from "./TouchEventManager";

// Use native types
type HmUIWidget = HmWearableProgram.DeviceSide.HmUI.IHmUIWidget;
type HmUIWidgetOptions = HmWearableProgram.DeviceSide.HmUI.HmUIWidgetOptions;
type HmUIPropertyValue = HmWearableProgram.DeviceSide.HmUI.HmUIPropertyValue;
type HmUIAlign = HmWearableProgram.DeviceSide.HmUI.IHmUIAlign;
type HmUIWrapTextStyle = HmWearableProgram.DeviceSide.HmUI.IHmUIWrapTextStyle;
type HmUIWidgetType = HmWearableProgram.DeviceSide.HmUI.HmUIWidgetType;

interface ListEntry {
  widget: HmUIWidget;
  viewHeight: number;
  positionY: number;
  _lastHeight?: number;
  _index?: number;
  _setPositionY: (y: number) => void;
  group?: HmUIWidget;
  iconView?: HmUIWidget;
  textView?: HmUIWidget;
  value?: any;
  touchManager?: TouchEventManager;
}

interface CardConfig {
  color?: number;
  offsetX?: number;
  radius?: number;
  width?: number;
  height?: number;
  hiddenButton?: string;
  hiddenButtonCallback?: () => void;
  onTap?: () => void;
  dontChangePosY?: boolean;
}

interface RowConfig {
  color?: number;
  fontSize?: number;
  text: string;
  description?: string;
  icon?: string;
  onTap?: () => void;
  card?: {
    width?: number;
    height?: number;
    radius?: number;
    hiddenButton?: string;
    hiddenButtonCallback?: () => void;
  };
  oneLine?: boolean;
  headlineWidth?: number;
}

interface DataFieldConfig {
  color?: number;
  headlineColor?: number;
  fontSize?: number;
  headlineFontSize?: number;
  headline?: string;
  text?: string;
  allowOneLine?: boolean;
  headlineWidth?: number;
  onTap?: () => void;
  card?: {
    color?: number;
    width?: number;
    height?: number;
    offsetX?: number;
  };
}

interface TextEntryConfig {
  color?: number;
  fontSize?: number;
  align?: HmUIAlign[keyof HmUIAlign];
  topOffset?: number;
  bottomOffset?: number;
  card?: Record<string, any>;
  text: string;
}

interface ActionBarItem {
  icon: string;
  callback?: () => void;
  text?: string;
  card?: {
    width: number;
    radius: number;
  };
}

interface CheckboxConfig {
  value: boolean;
  iconTrue: string;
  iconFalse: string;
  callback: (value: boolean) => void;
  text?: string;
}

interface ImageConfig {
  height: number;
  width: number;
  auto_scale?: boolean;
  src: string;
}

interface ToggleGroupConfig {
  value: any;
  iconTrue: string;
  iconFalse: string;
  callback: (value: any) => void;
  options: Array<{
    name: string;
    value: any;
  }>;
}

export class ListScreen {
  protected positionY: number = SCREEN_MARGIN_Y;
  protected fontSize: number = BASE_FONT_SIZE;
  protected accentColor: number = 0x0077AA;
  protected entries: ListEntry[] = [];
  private _brh_lastheight?: number;
  private _brh_cached?: number;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private frameTimes: number[] = [];

  private frameMetrics = {
    lastFrameTime: 0,
    frames: [] as number[],
    layoutTimes: [] as number[],
    renderTimes: [] as number[],
    totalFrames: 0,
    
    logMetrics() {
      if (this.frames.length >= 1000) {
        const meanFrameTime = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
        const meanLayoutTime = this.layoutTimes.reduce((a, b) => a + b, 0) / this.layoutTimes.length;
        const meanRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
        
        console.log(`[ListScreen] Performance (1000 frames):
          Mean frame time: ${meanFrameTime.toFixed(2)}ms
          Mean layout time: ${meanLayoutTime.toFixed(2)}ms 
          Mean render time: ${meanRenderTime.toFixed(2)}ms
          Total frames: ${this.totalFrames}
        `);
        
        // Reset metrics
        this.frames = [];
        this.layoutTimes = [];
        this.renderTimes = [];
      }
    }
  };

  private measureFrame(phase: 'layout' | 'render', callback: () => void) {
    const start = Date.now();
    callback();
    const duration = Date.now() - start;

    if (phase === 'layout') {
      this.frameMetrics.layoutTimes.push(duration);
    } else {
      this.frameMetrics.renderTimes.push(duration);
      
      // Track full frame time
      const frameTime = duration + (this.frameMetrics.layoutTimes[this.frameMetrics.layoutTimes.length - 1] || 0);
      this.frameMetrics.frames.push(frameTime);
      this.frameMetrics.totalFrames++;
      
      this.frameMetrics.logMetrics();
    }
  }

  protected createWidget(
    type: HmUIWidgetType,
    options: HmUIWidgetOptions
  ): HmUIWidget {
    return hmUI.createWidget(type, options);
  }

  protected createChildWidget(
    parent: HmUIWidget,
    type: HmUIWidgetType, 
    options: HmUIWidgetOptions
  ): HmUIWidget {
    return (parent as any).createWidget(type, options);
  }

  protected updateWidget(
    widget: HmUIWidget,
    options: HmUIWidgetOptions
  ): void {
    widget.setProperty(hmUI.prop.MORE, options as unknown as HmUIPropertyValue);
  }

  build(): void { }

  private _createBaseEntry(): ListEntry {
    return {
      widget: {} as HmWearableProgram.DeviceSide.HmUI.IHmUIWidget,
      viewHeight: 0,
      positionY: this.positionY,
      _setPositionY: (y: number) => { },
    };
  }

  private _registerRow(entry: ListEntry): void {
    entry._lastHeight = entry.viewHeight;
    entry._index = this.entries.length;
    this.entries.push(entry);
    this.positionY += entry.viewHeight;
  }
  get baseRowHeight(): number {
    if (this.fontSize !== this._brh_lastheight) {
      this._brh_lastheight = this.fontSize;
      this._brh_cached = hmUI.getTextLayout(" ", {
        text_size: this.fontSize,
        text_width: 96,
      }).height + 36;
    }
    return this._brh_cached || 0;
  }

  headline(text: string): ListEntry {
    const lineHeight = Math.floor(BASE_FONT_SIZE * 1.5);
    const config = {
      x: SCREEN_MARGIN_X + 4,
      w: WIDGET_WIDTH - 8,
      h: lineHeight,
      color: this.accentColor,
      align_v: hmUI.align.CENTER_V,
      y: this.positionY,
      text_size: BASE_FONT_SIZE - 4,
      text
    };
    const widget = hmUI.createWidget(hmUI.widget.TEXT, config);
    const entry: ListEntry = {
      ...this._createBaseEntry(),
      widget,
      viewHeight: lineHeight,
      positionY: this.positionY,
      _setPositionY: (y: number) => {
        entry.positionY = y;
        this.updateWidget(widget, { ...config, y: y });
      }
    };
    this._registerRow(entry);
    return entry;
  }

  offset(height: number = SCREEN_MARGIN_Y): ListEntry {
    const config = {
      x: 0,
      y: this.positionY,
      w: SCREEN_WIDTH,
      h: height
    };
    const widget = hmUI.createWidget(hmUI.widget.IMG, config);
    const entry: ListEntry = {
      ...this._createBaseEntry(),
      widget,
      positionY: this.positionY,
      viewHeight: height,
      _setPositionY: (y: number) => {
        entry.positionY = y;
        this.updateWidget(widget, { ...config, y: y });
      }
    };
    this._registerRow(entry);
    return entry;
  }

  card(userConfig: CardConfig): ListEntry {
    const config: Required<CardConfig> = {
      color: 0x111111,
      offsetX: 0,
      radius: 8,
      width: WIDGET_WIDTH,
      height: 0,
      hiddenButton: '',
      hiddenButtonCallback: () => { },
      onTap: () => { },
      dontChangePosY: false,
      ...userConfig
    };

    const entry = { ...this._createBaseEntry() };
    entry.positionY = this.positionY;
    
    // Add proper margin between cards
    const marginY = 8;
    const effectiveY = this.positionY + (config.dontChangePosY ? 0 : marginY / 2);

    // Create group with proper dimensions
    entry.group = hmUI.createWidget(hmUI.widget.GROUP, {
      x: SCREEN_MARGIN_X + config.offsetX,
      y: effectiveY,
      w: config.width,
      h: config.height
    });
    entry.widget = entry.group;

    // Create background with proper styling
    const bg = this.createChildWidget(entry.group, hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: config.width,
      h: config.height,
      color: config.color,
      radius: config.radius
    });

    // Create touch area for the entire card
    const touchArea = this.createChildWidget(entry.group, hmUI.widget.BUTTON, {
      x: 0,
      y: 0,
      w: config.width,
      h: config.height,
      text: '',
      color: 0x000000,
      alpha: 0,
      click_func: () => {
        if (config.onTap) config.onTap();
      }
    });

    // Handle dontChangePosY properly
    entry.viewHeight = config.dontChangePosY ? 0 : config.height + marginY;
    
    entry._setPositionY = (y: number) => {
      const effectiveNewY = y + (config.dontChangePosY ? 0 : marginY / 2);
      entry.positionY = y;
      entry.group?.setProperty(hmUI.prop.Y, effectiveNewY);
      bg.setProperty(hmUI.prop.Y, 0);
    };

    if (config.hiddenButton) {
      const buttonWidth = 96;
      const buttonConfig = {
        x: config.width - buttonWidth,
        y: 0,
        w: buttonWidth,
        h: config.height,
        text: config.hiddenButton,
        text_size: this.fontSize - 4,
        color: 0xFFFFFF,
        normal_color: this.accentColor,
        press_color: 0x005588,
        radius: config.radius,
        text_style: hmUI.text_style.NONE,
        click_func: () => {
          if (config.hiddenButtonCallback) config.hiddenButtonCallback();
        }
      };
      const button = this.createChildWidget(entry.group, hmUI.widget.BUTTON, buttonConfig);
    }

    this._registerRow(entry);
    return entry;
  }

  private _getButtonConfig(config: CardConfig, y: number): HmUIWidgetOptions {
    return {
      x: config.offsetX! + config.width! - 96,
      y: 0,
      w: 96,
      h: config.height!,
      color: 0xFFFFFF,
      radius: config.radius,
      text: config.hiddenButton,
      text_size: this.fontSize - 4,
      normal_color: this.accentColor,
      press_color: this.accentColor,
    };
  }

  private _createCenteredIcon(parent: HmUIWidget, config: {
    x: number;
    y: number;
    size: number;
    src: string;
  }): HmUIWidget {
    return this.createChildWidget(parent, hmUI.widget.IMG, {
      x: config.x,
      y: config.y,
      w: config.size,
      h: config.size,
      src: config.src
    });
  }

  private logFrameTime() {
    const currentTime = Date.now();
    if (this.lastFrameTime !== 0) {
      const frameTime = currentTime - this.lastFrameTime;
      this.frameTimes.push(frameTime);
      this.frameCount++;

      if (this.frameCount % 1000 === 0) {
        const meanFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        console.log(`[ListScreen] Performance: Mean frame time over last 1000 frames: ${meanFrameTime.toFixed(2)}ms`);
        this.frameTimes = []; // Reset for next batch
      }
    }
    this.lastFrameTime = currentTime;
  }

  row(userConfig: RowConfig): ListEntry {
    // Measure layout phase
    let layoutData: any;
    this.measureFrame('layout', () => {
      layoutData = this.calculateRowLayout(userConfig);
    });

    // Measure render phase 
    let entry: ListEntry;
    this.measureFrame('render', () => {
      entry = this.createRowWidgets(layoutData);
    });

    return entry!;
  }

  private calculateRowLayout(userConfig: RowConfig) {
    const config: Required<RowConfig> = {
      color: userConfig.color || 0xFFFFFF,
      fontSize: userConfig.fontSize || 20,
      text: userConfig.text ?? '',
      icon: userConfig.icon ?? '',
      description: userConfig.description ?? '',
      onTap: userConfig.onTap || (userConfig as any).callback || (() => {}),
      card: userConfig.card || {},
      oneLine: userConfig.oneLine ?? false,
      headlineWidth: userConfig.headlineWidth ?? 0
    };

    const verticalPadding = 12;
    const iconSize = ICON_SIZE_SMALL;
    const textPaddingLeft = iconSize * 2;
    
    // Calculate text heights with proper wrapping
    const textWidth = this._getTextWidthForRow(config);
    const textHeight = hmUI.getTextLayout(config.text, {
      text_size: config.fontSize,
      text_width: textWidth
    }).height;
    
    const descHeight = config.description ? hmUI.getTextLayout(config.description, {
      text_size: config.fontSize - 2,
      text_width: textWidth
    }).height : 0;

    // Calculate total row height with proper spacing
    const rowHeight = Math.max(
      iconSize + (verticalPadding * 2),
      textHeight + (config.description ? descHeight + 8 : 0) + (verticalPadding * 2)
    );

    const groupConfig = {
      x: SCREEN_MARGIN_X,
      y: this.positionY,
      w: WIDGET_WIDTH,
      h: rowHeight
    };

    const textY = config.description 
      ? verticalPadding 
      : Math.floor((rowHeight - textHeight) / 2);

    return {
      config,
      dimensions: {
        textWidth,
        textHeight,
        descHeight,
        rowHeight,
        textY,
        verticalPadding,
        iconSize,
        textPaddingLeft,
        groupConfig
      }
    };
  }

  private createRowWidgets(layoutData: any): ListEntry {
    const { config, dimensions } = layoutData;
    const entry = { ...this._createBaseEntry() };
    
    entry.viewHeight = dimensions.rowHeight + 8; // Add margin between rows
    entry.positionY = this.positionY;

    entry.group = this.createWidget(hmUI.widget.GROUP, dimensions.groupConfig);
    entry.widget = entry.group;

    // Use TouchEventManager for touch handling
    if (config.onTap) {
      entry.touchManager = new TouchEventManager(entry.group);
      entry.touchManager.ontouch = () => {
        config.onTap();
      };
    }

    // Main text with proper vertical centering
    const textView = this.createChildWidget(entry.group, hmUI.widget.TEXT, {
      x: dimensions.textPaddingLeft,
      y: dimensions.textY,
      w: dimensions.textWidth,
      h: dimensions.textHeight,
      text_style: hmUI.text_style.WRAP,
      align_v: hmUI.align.TOP,
      text_size: config.fontSize,
      color: config.color,
      text: config.text
    });
    entry.textView = textView;

    // Icon with proper vertical centering
    if (config.icon) {
      const iconY = Math.floor((dimensions.rowHeight - dimensions.iconSize) / 2);
      entry.iconView = this._createCenteredIcon(entry.group, {
        x: Math.floor(dimensions.iconSize / 2),
        y: iconY,
        size: dimensions.iconSize,
        src: config.icon
      });
    }

    // Description text with proper spacing
    if (config.description) {
      this.createChildWidget(entry.group, hmUI.widget.TEXT, {
        x: dimensions.textPaddingLeft,
        y: dimensions.textY + dimensions.textHeight + 4,
        w: dimensions.textWidth,
        h: dimensions.descHeight,
        text_style: hmUI.text_style.WRAP,
        align_v: hmUI.align.TOP,
        text_size: config.fontSize - 2,
        color: 0x999999,
        text: config.description
      });
    }

    // Create a "hidden" button if provided in config.card
    if (config.card.hiddenButton) {
      const buttonWidth = 96;
      this.createChildWidget(entry.group, hmUI.widget.BUTTON, {
        x: WIDGET_WIDTH - buttonWidth,
        y: 0,
        w: buttonWidth,
        h: dimensions.rowHeight,
        text: config.card.hiddenButton,
        text_size: this.fontSize - 4,
        color: 0xFFFFFF,
        normal_color: this.accentColor,
        press_color: 0x005588,
        radius: config.card.radius ?? 8,
        text_style: hmUI.text_style.NONE,
        click_func: config.card.hiddenButtonCallback
      });
    }

    entry._setPositionY = (y: number) => {
      entry.positionY = y;
      this.updatePosition(entry.group!, y, dimensions.groupConfig);
    };

    this._registerRow(entry);
    return entry;
  }

  private _getTextWidthForRow(config: RowConfig): number {
    const baseWidth = WIDGET_WIDTH - (ICON_SIZE_SMALL * 2) - 8;
    return config.oneLine ? baseWidth - (config.headlineWidth || 0) : baseWidth;
  }

  field(userConfig: DataFieldConfig): ListEntry {
    const config: Required<DataFieldConfig> = {
      color: userConfig.color || 0xFFFFFF,
      headlineColor: userConfig.headlineColor || 0x999999,
      fontSize: userConfig.fontSize || 20,
      headlineFontSize: userConfig.headlineFontSize || 18,
      headline: userConfig.headline ?? '',
      text: userConfig.text ?? '',
      allowOneLine: userConfig.allowOneLine !== undefined ? userConfig.allowOneLine : true,
      headlineWidth: userConfig.headlineWidth || 140,
      onTap: userConfig.onTap || (() => { }),
      card: userConfig.card || {},
    };

    const oneLine = config.allowOneLine && WIDGET_WIDTH >= 300;
    const verticalPadding = 4;
    
    // Improved height calculations
    const headHeight = this._getTextHeight(config.headline, config.headlineFontSize, oneLine ? config.headlineWidth : WIDGET_WIDTH);
    const textHeight = this._getTextHeight(config.text, config.fontSize, WIDGET_WIDTH - (oneLine ? config.headlineWidth + 8 : 0));
    
    // Calculate total height with proper vertical alignment
    const rowHeight = oneLine 
      ? Math.max(textHeight, headHeight) + (verticalPadding * 2)
      : headHeight + textHeight + (verticalPadding * 3);

    const entry = { ...this._createBaseEntry() };
    entry.viewHeight = rowHeight + 8; // Add margin between fields
    entry.positionY = this.positionY;

    const groupConfig = {
      x: SCREEN_MARGIN_X + (config.card?.offsetX || 0),
      y: this.positionY,
      w: WIDGET_WIDTH,
      h: rowHeight
    };

    entry.group = this.createWidget(hmUI.widget.GROUP, groupConfig);
    entry.widget = entry.group;
    entry.touchManager = new TouchEventManager(entry.group);

    // Headline with proper vertical alignment
    const headlineView = this.createChildWidget(entry.group, hmUI.widget.TEXT, {
      x: 0,
      y: verticalPadding,
      w: oneLine ? config.headlineWidth : WIDGET_WIDTH,
      h: oneLine ? rowHeight - (verticalPadding * 2) : headHeight,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.WRAP,
      text_size: config.headlineFontSize,
      color: config.headlineColor,
      text: config.headline
    });

    // Text with proper alignment and wrapping
    const textView = this.createChildWidget(entry.group, hmUI.widget.TEXT, {
      x: oneLine ? config.headlineWidth + 8 : 0,
      y: oneLine ? verticalPadding : headHeight + verticalPadding,
      w: WIDGET_WIDTH - (oneLine ? config.headlineWidth + 8 : 0),
      h: oneLine ? rowHeight - (verticalPadding * 2) : textHeight,
      align_h: oneLine ? hmUI.align.RIGHT : hmUI.align.LEFT,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.WRAP,
      text_size: config.fontSize,
      color: config.color,
      text: config.text
    });

    entry._setPositionY = (y: number) => {
      entry.positionY = y;
      entry.group?.setProperty(hmUI.prop.Y, y);
    };

    if (config.onTap) {
      entry.touchManager.ontouch = config.onTap;
    }

    this._registerRow(entry);
    return entry;
  }

  text(userConfig: TextEntryConfig): ListEntry {
    const config: Required<TextEntryConfig> = {
      color: userConfig.color || 0xFFFFFF,
      fontSize: userConfig.fontSize || 20,
      align: userConfig.align || hmUI.align.LEFT,
      topOffset: userConfig.topOffset || 0,
      bottomOffset: userConfig.bottomOffset || 0,
      card: userConfig.card || {},
      text: userConfig.text,
    };

    const verticalPadding = 4;
    const horizontalPadding = 4;
    const textWidth = WIDGET_WIDTH - (horizontalPadding * 2);
    
    // Improved height calculation with proper padding
    const textHeight = this._getTextHeight(config.text, config.fontSize, textWidth);
    const totalPadding = config.topOffset + config.bottomOffset + (verticalPadding * 2);
    const rowHeight = textHeight + totalPadding;

    const entry = { ...this._createBaseEntry() };
    entry.viewHeight = rowHeight + 8; // Add margin between text entries
    entry.positionY = this.positionY;

    // Text widget with proper alignment and wrapping
    entry.widget = this.createWidget(hmUI.widget.TEXT, {
      x: SCREEN_MARGIN_X + horizontalPadding,
      y: this.positionY + config.topOffset + verticalPadding,
      w: textWidth,
      h: rowHeight - totalPadding,
      align_v: hmUI.align.CENTER_V,
      align_h: config.align,
      text_style: hmUI.text_style.WRAP,
      text_size: config.fontSize,
      color: config.color,
      text: config.text
    });

    entry._setPositionY = (y: number) => {
      entry.positionY = y;
      entry.widget.setProperty(hmUI.prop.Y, y + config.topOffset + verticalPadding);
    };

    this._registerRow(entry);
    return entry;
  }

  twoActionBar(items: [Required<ActionBarItem>, Required<ActionBarItem>]): ListEntry {
    if (WIDGET_WIDTH < 300) {
      const row1 = this.row(items[0]);
      this.row(items[1]);
      return row1;
    }

    const secondSize = this.baseRowHeight;
    const firstWidth = WIDGET_WIDTH - secondSize - 8;

    const button = this.card({
      width: secondSize,
      height: secondSize,
      offsetX: firstWidth + 8,
      radius: Math.floor(secondSize / 2),
      color: this.accentColor,
      onTap: items[1].callback
    });

    const iconPos = Math.floor((secondSize - ICON_SIZE_SMALL) / 2);
    (button.group as any).createWidget(hmUI.widget.IMG, {
      x: iconPos,
      y: iconPos,
      src: items[1].icon
    });

    const row = this.row({
      ...items[0],
      card: {
        width: firstWidth,
        radius: Math.floor(secondSize / 2),
      },
      onTap: items[0].callback
    });

    return row;
  }

  checkboxRow(config: CheckboxConfig): ListEntry {
    let value = !!config.value;

    const row = this.row({
      ...config,
      text: config.text || '',
      icon: value ? config.iconTrue : config.iconFalse,
      onTap: () => {
        value = !value;
        row.iconView?.setProperty(hmUI.prop.SRC, value ? config.iconTrue : config.iconFalse);
        config.callback(value);
      }
    });
    return row;
  }

  image(config: ImageConfig): ListEntry {
    const card = this.card({ height: config.height + 8, color: 0 });
    (card.group as any).createWidget(hmUI.widget.IMG, {
      x: 0,
      y: 0,
      w: config.width,
      h: config.height,
      auto_scale: config.auto_scale,
      src: config.src
    });
    return card;
  }

  toggleGroup(config: Required<ToggleGroupConfig>): void {
    let value = config.value;
    const views: ListEntry[] = [];

    const callback = (row: ListEntry) => {
      value = row.value;
      for (let i of views) {
        i.iconView?.setProperty(hmUI.prop.SRC,
          value === i.value ? config.iconTrue : config.iconFalse);
      }
      config.callback(value);
    };

    for (const item of config.options) {
      const rowConfig = {
        text: item.name ?? '',
        icon: value === item.value ? config.iconTrue : config.iconFalse,
        onTap: () => callback(rowConfig as any)
      };
      const row = this.row(rowConfig);
      row.value = item.value;
      views.push(row);
    }
  }

  private _getTextHeight(text: string, fontSize: number, maxWidth?: number): number {
    const textWidth = maxWidth || WIDGET_WIDTH - 8;
    return hmUI.getTextLayout(text, {
      text_size: fontSize,
      text_width: textWidth
    }).height;
  }

  protected updatePosition(
    widget: HmUIWidget, 
    y: number, 
    originalConfig: Record<string, any>
  ): void {
    this.updateWidget(widget, {
      ...originalConfig,
      y
    });
  }
} 