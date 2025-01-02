import { Path } from "./Path";

export class ConfigStorage {
  private data: { [key: string]: any };
  private file: Path;

  constructor(file: Path | null = null, defaults: { [key: string]: any } | null = null) {
    this.data = defaults !== null ? defaults : {};

    if(file !== null) {
      this.file = file;
    } else {
      this.file = new Path("data", "config.json");
    }
  }

  public get<T>(key: string, fallback: T | null = null): T | null {
    if(this.data[key] !== undefined) {
      return this.data[key] as T;
    }
    return fallback;
  }

  public set(key: string, value: any): void {
    this.data[key] = value;
    this.save();
  }

  public update(rows: { [key: string]: any }): void {
    for(const key in rows) {
      this.data[key] = rows[key];
    }
    this.save();
  }

  public save(): void {
    this.file.overrideWithJSON(this.data);
  }

  public wipe(): void {
    this.data = {};
    this.file.remove();
  }

  public load(): void {
    try {
      this.data = this.file.fetchJSON();
    } catch(e) {
      // Silently fail if file doesn't exist or is invalid
    }
  }
} 