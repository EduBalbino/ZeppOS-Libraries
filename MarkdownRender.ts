import { ListScreen } from "./ListScreen";
import { Path } from "./Path";
import { SCREEN_WIDTH } from "./UiParams";

export class ResolveFromAssets {
  private path: Path;
  private pageRoot: string;
  private assetsRoot: string;

  constructor(textFilesRoot: string, pagesRoot: string = "page/", assetsRoot: string = "") {
    this.path = new Path("assets", textFilesRoot);
    this.pageRoot = pagesRoot;
    this.assetsRoot = assetsRoot;
  }

  getText(path: string): string {
    return this.path.get(path).fetchText();
  }

  assetPath(path: string): string {
    return this.assetsRoot + path;
  }

  pagePath(path: string): string {
    return this.pageRoot + path;
  }
}

export class MarkdownRenderScreen extends ListScreen {
  private resolver: ResolveFromAssets;
  private url: string;
  private selfPage: string;

  constructor(resolver: ResolveFromAssets, url: string, selfPage: string = "MarkdownReader") {
    super();
    this.resolver = resolver;
    this.url = url;
    this.selfPage = selfPage;
  }

  start(): void {
    const lines = this.resolver.getText(this.url).replaceAll("\r", "").split("\n");

    for(const line of lines) {
      if(line === "") continue;

      switch (line[0]) {
        case "[":
          this.mdLink(line);
          break;
        case "!":
          this.mdImage(line);
          break;
        case "#":
          this.mdHeadline(line);
          break;
        default:
          this.text({ text: line });
      }
    }

    this.offset();
  }

  private mdLink(line: string): void {
    const label = line.substring(line.indexOf("[") + 1, line.indexOf("]"));
    const url = line.substring(line.indexOf("(") + 1, line.indexOf(")"));
    this.row({
      text: label,
      icon: "icon_s/link.png",
      onTap: () => {
        if(url.startsWith("page://")) {
          hmApp.gotoPage({
            url: this.resolver.pagePath(url.substring(7))
          });
        } else {
          hmApp.gotoPage({
            url: this.resolver.pagePath(this.selfPage),
            param: url
          });
        }
      }
    });
  }

  private mdImage(line: string): void {
    const props = line.substring(line.indexOf("[") + 1, line.indexOf("]"));
    const url = line.substring(line.indexOf("(") + 1, line.indexOf(")"));
    const [width, height] = props.split("x").map(Number);
    const offsetX = Math.floor((SCREEN_WIDTH - width) / 2);

    hmUI.createWidget(hmUI.widget.IMG, {
      x: offsetX,
      y: this.positionY,
      src: this.resolver.assetPath(url)
    });

    this.positionY += height + 8;
  }

  private mdHeadline(line: string): void {
    this.headline(line.substring(line.indexOf(" ")));
  }
} 