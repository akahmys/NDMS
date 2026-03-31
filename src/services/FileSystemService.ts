import { Utils } from '../lib/utils';

export interface FileEntry {
  name: string;
  kind: 'file' | 'directory';
}

/**
 * FileSystemService - File System Access API ラッパー
 */
export class FileSystemService {
  public directoryHandle: FileSystemDirectoryHandle | null = null;

  /**
   * OS のフォルダ選択ダイアログを開き、選択したフォルダハンドルを保持する。
   */
  async selectDirectory(): Promise<FileSystemDirectoryHandle | null> {
    try {
      this.directoryHandle = await window.showDirectoryPicker();
      return this.directoryHandle;
    } catch (e) {
      console.error('[FS] Directory selection failed or cancelled', e);
      return null;
    }
  }

  /**
   * ルートフォルダ直下の指定ファイルをテキストとして読み込む。
   */
  async readFileAsText(fileName: string): Promise<string | null> {
    if (!this.directoryHandle) return null;
    const name = Utils.norm(fileName);
    try {
      const fileHandle = await this.directoryHandle.getFileHandle(name);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch {
      return null;
    }
  }

  /**
   * ルートフォルダ直下または相対パスにファイルを書き込む。
   */
  async writeFile(filePath: string, content: string | ArrayBuffer): Promise<boolean> {
    if (!this.directoryHandle) return false;
    const normPath = Utils.norm(filePath);
    try {
      const parts = normPath.split('/').filter(Boolean);
      const fileName = parts.pop()!;
      let dirHandle = this.directoryHandle;
      for (const part of parts) {
        dirHandle = await dirHandle.getDirectoryHandle(Utils.norm(part), { create: true });
      }
      const fileHandle = await dirHandle.getFileHandle(Utils.norm(fileName), { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 指定フォルダ配下のエントリを取得する。
   */
  async listEntries(dirPath: string | null = null): Promise<FileEntry[]> {
    if (!this.directoryHandle) return [];
    try {
      let targetHandle = this.directoryHandle;
      if (dirPath) {
        const parts = Utils.norm(dirPath).split('/').filter(Boolean);
        for (const part of parts) {
          targetHandle = await targetHandle.getDirectoryHandle(part).catch(() => null as any);
          if (!targetHandle) return [];
        }
      }
      const entries: FileEntry[] = [];
      for await (const entry of (targetHandle as any).values()) {
        entries.push({
          name: Utils.norm(entry.name),
          kind: entry.kind,
        });
      }
      return entries;
    } catch (e) {
      console.error(`[FS] listEntries(${dirPath || 'root'}) failed`, e);
      return [];
    }
  }

  /**
   * ディレクトリを再帰的に作成する。
   */
  async createDirectory(dirPath: string): Promise<boolean> {
    if (!this.directoryHandle) return false;
    try {
      const parts = Utils.norm(dirPath).split('/').filter(Boolean);
      let current = this.directoryHandle;
      for (const part of parts) {
        current = await current.getDirectoryHandle(part, { create: true });
      }
      return true;
    } catch (e) {
      console.error(`[FS] createDirectory(${dirPath}) failed`, e);
      return false;
    }
  }

  /**
   * ディレクトリのリネーム・移動を行う。
   */
  async renameDirectory(oldPath: string, newPath: string): Promise<boolean> {
    if (!this.directoryHandle) return false;
    try {
      const oldNorm = Utils.norm(oldPath);
      const newNorm = Utils.norm(newPath);
      if (oldNorm === newNorm) return true;

      const oldParts = oldNorm.split('/').filter(Boolean);
      const oldName = oldParts.pop()!;
      let oldParent = this.directoryHandle;
      for (const p of oldParts) {
        oldParent = await oldParent.getDirectoryHandle(p);
      }
      const dirHandle = await oldParent.getDirectoryHandle(oldName);

      const newParts = newNorm.split('/').filter(Boolean);
      const newName = newParts.pop()!;
      let newParent = this.directoryHandle;
      for (const p of newParts) {
        newParent = await newParent.getDirectoryHandle(p, { create: true });
      }

      if ((dirHandle as any).move) {
        await (dirHandle as any).move(newParent, newName);
      } else {
        // フォールバック: 再帰コピー (簡略化)
        await this._copyRecursive(dirHandle, newParent, newName);
        await oldParent.removeEntry(oldName, { recursive: true });
      }
      return true;
    } catch (e) {
      console.error(`[FS] renameDirectory failed`, e);
      return false;
    }
  }

  private async _copyRecursive(srcHandle: FileSystemDirectoryHandle, destParentHandle: FileSystemDirectoryHandle, targetName: string) {
    const destHandle = await destParentHandle.getDirectoryHandle(targetName, { create: true });
    for await (const entry of (srcHandle as any).values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        const newFileHandle = await destHandle.getFileHandle(entry.name, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(file);
        await writable.close();
      } else if (entry.kind === 'directory') {
        await this._copyRecursive(entry, destHandle, entry.name);
      }
    }
  }

  /**
   * ファイルの移動・リネームを行う。
   */
  async moveAndRenameFile(sourcePath: string, targetDirPath: string, newFileName: string): Promise<boolean> {
    if (!this.directoryHandle) return false;
    try {
      const sourceNorm = Utils.norm(sourcePath);
      const newNameNorm = Utils.norm(newFileName);

      const sourceParts = sourceNorm.split('/').filter(Boolean);
      const sourceName = sourceParts.pop()!;
      let sourceDirHandle = this.directoryHandle;
      for (const part of sourceParts) {
        sourceDirHandle = await sourceDirHandle.getDirectoryHandle(Utils.norm(part));
      }
      const sourceFileHandle = await sourceDirHandle.getFileHandle(sourceName);

      const targetNorm = Utils.norm(targetDirPath);
      const targetDirHandle = targetNorm
        ? await this.directoryHandle.getDirectoryHandle(targetNorm)
        : this.directoryHandle;

      if ((sourceFileHandle as any).move) {
        await (sourceFileHandle as any).move(targetDirHandle, newNameNorm);
      } else {
        const file = await sourceFileHandle.getFile();
        const newFileHandle = await targetDirHandle.getFileHandle(newNameNorm, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(file);
        await writable.close();
        await sourceDirHandle.removeEntry(sourceName);
      }
      return true;
    } catch (e) {
      console.error(`[FS] moveAndRenameFile failed`, e);
      return false;
    }
  }

  /**
   * ファイルプレビュー用 URL を配布する。
   */
  async readFileAsUrl(path: string): Promise<string | null> {
    if (!this.directoryHandle) return null;
    try {
      const normPath = Utils.norm(path);
      const parts = normPath.split('/').filter(Boolean);
      const fileName = parts.pop()!;
      let targetHandle = this.directoryHandle;
      for (const part of parts) {
        targetHandle = await targetHandle.getDirectoryHandle(Utils.norm(part));
      }
      const fileHandle = await targetHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      return URL.createObjectURL(file);
    } catch (e) {
      console.error('[FS] readFileAsUrl failed', e, path);
      return null;
    }
  }
}
