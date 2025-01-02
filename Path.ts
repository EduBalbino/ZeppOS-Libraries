const deviceID = hmSetting.getDeviceInfo().deviceName;
export const isMiBand7 = deviceID === "Xiaomi Smart Band 7";
const appContext = getApp();

type Scope = "assets" | "data" | "full";

interface FileStat {
  size?: number;
  mode?: number;
}

interface FileHandle {
  _f: number;
}

interface IHmFsStat {
  size: number;
  mtime: number;
}

export class Path implements FileHandle {
  private scope: Scope;
  private path: string;
  private relativePath: string;
  private absolutePath: string;
  public _f: number = 0;

  constructor(scope: Scope, path: string) {
    if(path[0] !== "/") path = "/" + path;

    this.scope = scope;
    this.path = path;

    if (scope === "assets") {
      this.relativePath = path;
      this.absolutePath = FsTools.fullAssetPath(path);
    } else if (scope === "data") {
      this.relativePath = path;
      this.absolutePath = FsTools.fullDataPath(path);
    } else if (scope === "full") {
      this.relativePath = `../../../${path.substring(9)}`;
      if(this.relativePath.endsWith("/")) {
        this.relativePath = this.relativePath.substring(0, this.relativePath.length - 1);
      }
      this.absolutePath = path;
    } else {
      throw new Error("Unknown scope provided");
    }
  }

  public get(path: string): Path {
    if(path === "") {
      return this;
    } else if (this.path === "/" || this.path === ".") {
      return new Path(this.scope, path);
    } else {
      return new Path(this.scope, `${this.path}/${path}`);
    }
  }

  public resolve(): Path {
    return new Path("full", this.absolutePath);
  }

  public src(): string {
    if(this.scope !== "assets") {
      throw new Error("Can't get src for non-asset");
    }
    return this.relativePath.substring(1);
  }

  public stat(): [IHmFsStat, number] {
    if (this.scope === "data") {
      return hmFS.stat(this.relativePath);
    } else {
      return hmFS.stat_asset(this.relativePath);
    }
  }

  public size(): number {
    const [st, e] = this.stat();
    if(st.size) {
      // Is file, nothing to do anymore
      return st.size;
    }

    let output = 0;
    const [files] = this.list();
    if (files) {
      for(const file of files) {
        output += this.get(file).size();
      }
    }

    return output;
  }

  public open(flags: number): number {
    if (this.scope === "data") {
      this._f = hmFS.open(this.relativePath, flags);
    } else {
      this._f = hmFS.open_asset(this.relativePath, flags);
    }

    return this._f;
  }

  public remove(): boolean {
    if(this.scope === "assets") {
      return this.resolve().remove();
    }

    try {
      hmFS.remove(isMiBand7 ? this.absolutePath : this.relativePath);
      return true;
    } catch (e) {
      return false;
    }
  }

  public removeTree(): void {
    // Recursive !!!
    const [files] = this.list();
    if (files) {
      for(const file of files) {
        this.get(file).removeTree();
      }
    }

    this.remove();
  }

  public fetch(limit: number = Infinity): ArrayBuffer | null {
    const [st, e] = this.stat();
    if (e !== 0) return null;

    const length = Math.min(limit, st.size || 0);
    const buffer = new ArrayBuffer(st.size || 0);
    this.open(hmFS.O_RDONLY);
    hmFS.read(this._f, 0, buffer, length);
    this.close();

    return buffer;
  }

  public fetchText(limit: number = Infinity): string {
    const buf = this.fetch(limit);
    if (!buf) return "";
    const view = new Uint8Array(buf);
    return FsTools.decodeUtf8(view, limit)[0];
  }

  public fetchJSON<T>(): T {
    return JSON.parse(this.fetchText());
  }

  public override(buffer: ArrayBuffer): void {
    this.remove();

    this.open(hmFS.O_WRONLY | hmFS.O_CREAT);
    hmFS.write(this._f, 0, buffer, buffer.byteLength);
    this.close();
  }

  public overrideWithText(text: string): void {
    this.override(FsTools.strToUtf8(text));
  }

  public overrideWithJSON(data: any): void {
    this.overrideWithText(JSON.stringify(data));
  }

  public copy(destEntry: Path): void {
    const buf = this.fetch();
    if (buf) destEntry.override(buf);
  }

  public copyTree(destEntry: Path, move: boolean = false): void {
    // Recursive !!!
    if(this.isFile()) {
      this.copy(destEntry);
    } else {
      destEntry.mkdir();
      const [files] = this.list();
      if (files) {
        for(const file of files) {
          this.get(file).copyTree(destEntry.get(file));
        }
      }
    }

    if(move) this.removeTree();
  }

  public isFile(): boolean {
    const [st, e] = this.stat();
    return e === 0 && st.size > 0;
  }

  public isFolder(): boolean {
    if(this.absolutePath === "/storage") return true;
    const [st, e] = this.stat();
    return e === 0 && st.size === 0;
  }

  public exists(): boolean {
    return this.stat()[1] === 0;
  }

  public list(): [string[], number] {
    const result = hmFS.readdir(isMiBand7 ? this.absolutePath : this.relativePath);
    return result as unknown as [string[], number];
  }

  public mkdir(): number {
    return hmFS.mkdir(isMiBand7 ? this.absolutePath : this.relativePath);
  }

  public seek(val: number): void {
    hmFS.seek(this._f, val, hmFS.SEEK_SET);
  }

  public read(buffer: ArrayBuffer, offset: number, length: number): void {
    hmFS.read(this._f, offset, buffer, length);
  }

  public write(buffer: ArrayBuffer, offset: number, length: number): void {
    hmFS.write(this._f, offset, buffer, length);
  }

  public close(): void {
    hmFS.close(this._f);
  }
}

export class FsTools {
  private static appTags?: [string, string];
  private static cachedAppLocation?: [string, string];

  public static getAppTags(): [string, string] {
    if(FsTools.appTags) return FsTools.appTags;

    try {
      const [id, type] = (appContext._options.globalData as any).appTags;
      return [id, type];
    } catch(e) {
      console.log(`Calling hmApp.packageInfo(), this may cause black screen in some cases. Reason: ${e}`);
      const packageInfo = hmApp.packageInfo();
      return [String(packageInfo.appId), packageInfo.type];
    }
  }

  public static getAppLocation(): [string, string] {
    if (!FsTools.cachedAppLocation) {
      const [id, type] = FsTools.getAppTags();
      const idn = id.toString();
      FsTools.cachedAppLocation = [`js_${type}s`, idn];
    }

    return FsTools.cachedAppLocation;
  }

  public static fullAssetPath(path: string): string {
    const [base, idn] = FsTools.getAppLocation();
    return `/storage/${base}/${idn}/assets${path}`;
  }

  public static fullDataPath(path: string): string {
    const [base, idn] = FsTools.getAppLocation();
    return `/storage/${base}/data/${idn}${path}`;
  }

  // https://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
  public static strToUtf8(str: string): ArrayBuffer {
    const utf8: number[] = [];
    for (let i = 0; i < str.length; i++) {
      let charcode = str.charCodeAt(i);
      if (charcode < 0x80) utf8.push(charcode);
      else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6),
          0x80 | (charcode & 0x3f));
      } else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(0xe0 | (charcode >> 12),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f));
      } else {
        i++;
        // UTF-16 encodes 0x10000-0x10FFFF by
        // subtracting 0x10000 and splitting the
        // 20 bits of 0x0-0xFFFFF into two halves
        charcode = 0x10000 + (((charcode & 0x3ff) << 10)
          | (str.charCodeAt(i) & 0x3ff));
        utf8.push(0xf0 | (charcode >> 18),
          0x80 | ((charcode >> 12) & 0x3f),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f));
      }
    }

    const result = new ArrayBuffer(utf8.length);
    const view = new Uint8Array(result);
    for(let i = 0; i < utf8.length; i++) {
      view[i] = utf8[i];
    }
    return result;
  }

  public static decodeUtf8(array: Uint8Array, outLimit: number = Infinity, startPosition: number = 0): [string, number] {
    let outString = "";
    let position = startPosition;

    while (position < array.length && outString.length < outLimit) {
      const byte1 = array[position++];
      if (byte1 === undefined) break;

      if ((byte1 & 0x80) === 0) {
        // 1 byte
        outString += String.fromCharCode(byte1);
        continue;
      }

      const byte2 = array[position++] & 0x3f;
      if ((byte1 & 0xe0) === 0xc0) {
        // 2 bytes
        outString += String.fromCharCode(((byte1 & 0x1f) << 6) | byte2);
        continue;
      }

      const byte3 = array[position++] & 0x3f;
      if ((byte1 & 0xf0) === 0xe0) {
        // 3 bytes
        outString += String.fromCharCode(((byte1 & 0x0f) << 12) |
          (byte2 << 6) | byte3);
        continue;
      }

      const byte4 = array[position++] & 0x3f;
      if ((byte1 & 0xf8) === 0xf0) {
        // 4 bytes
        let codepoint = ((byte1 & 0x07) << 18) |
          (byte2 << 12) |
          (byte3 << 6) |
          byte4;
        if (codepoint > 0xffff) {
          // Split into surrogate pair
          codepoint -= 0x10000;
          outString += String.fromCharCode(
            (codepoint >> 10) | 0xd800,
            (codepoint & 0x3ff) | 0xdc00
          );
        } else {
          outString += String.fromCharCode(codepoint);
        }
      }
    }

    return [outString, position];
  }

  public static Utf8ArrayToStr(array: Uint8Array): string {
    return FsTools.decodeUtf8(array)[0];
  }

  public static printBytes(val: number, base2: boolean = false): string {
    const units = base2 ? ["B", "KiB", "MiB", "GiB"] : ["B", "KB", "MB", "GB"];
    const divider = base2 ? 1024 : 1000;
    let current = val;
    let pow = 0;

    while(current > divider && pow < units.length - 1) {
      current = current / divider;
      pow++;
    }

    return `${Math.round(current * 100) / 100}${units[pow]}`;
  }
} 