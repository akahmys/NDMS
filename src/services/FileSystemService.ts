import { Utils } from '../lib/utils';
import { PROJECT_CONSTANTS } from '../lib/constants';

export interface FileEntry {
  name: string;
  kind: 'file' | 'directory';
}

/**
 * File System Access API の実験的・未定義メソッドを補完するインターフェース
 */
interface FileSystemHandleExt extends FileSystemHandle {
  move?: (parent: FileSystemDirectoryHandle, newName?: string) => Promise<void>;
}

interface FileSystemDirectoryHandleExt extends FileSystemDirectoryHandle {
  values: () => AsyncIterableIterator<FileSystemHandle | FileSystemDirectoryHandle | FileSystemFileHandle>;
}

/**
 * FileSystemService - File System Access API ラッパー
 */
export class FileSystemService {
  public directoryHandle: FileSystemDirectoryHandle | null = null;

  /**
   * パスからディレクトリハンドルを再帰的に取得するヘルパー。
   */
  private async _getDirectoryHandle(path: string | null, options: { create?: boolean } = {}): Promise<FileSystemDirectoryHandle> {
    if (!this.directoryHandle) throw new Error('Root directory handle is not set');
    if (!path) return this.directoryHandle;

    const parts = Utils.norm(path).split('/').filter(Boolean);
    let current = this.directoryHandle;
    for (const part of parts) {
      current = await this._getDirectoryHandleFuzzy(current, part, options).catch((e) => {
        throw new Error(`Failed to get directory handle for "${part}": ${e.message}`);
      });
    }
    return current;
  }

  /**
   * 正規化の違いを考慮したディレクトリハンドル取得ルーチン。
   */
  private async _getDirectoryHandleFuzzy(parent: FileSystemDirectoryHandle, name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle> {
    const normName = Utils.norm(name);
    try {
      // 1. 直接試行
      return await parent.getDirectoryHandle(normName, options);
    } catch (e: any) {
      // 2. NotFound の場合、正規化違いを考慮して走査
      if (e.name === 'NotFoundError' && !options?.create) {
        const extParent = parent as unknown as FileSystemDirectoryHandleExt;
        for await (const entry of extParent.values()) {
          if (entry.kind === 'directory' && Utils.norm(entry.name) === normName) {
            return entry as FileSystemDirectoryHandle;
          }
        }
      }
      throw e;
    }
  }

  /**
   * 正規化の違いを考慮したファイルハンドル取得ルーチン。
   */
  private async _getFileHandleFuzzy(parent: FileSystemDirectoryHandle, name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle> {
    const normName = Utils.norm(name);
    try {
      // 1. 直接試行
      return await parent.getFileHandle(normName, options);
    } catch (e: any) {
      // 2. NotFound の場合、正規化違いを考慮して走査
      if (e.name === 'NotFoundError' && !options?.create) {
        const extParent = parent as unknown as FileSystemDirectoryHandleExt;
        for await (const entry of extParent.values()) {
          if (entry.kind === 'file' && Utils.norm(entry.name) === normName) {
            return entry as FileSystemFileHandle;
          }
        }
      }
      throw e;
    }
  }

  /**
   * OS のフォルダ選択ダイアログを開き、選択したフォルダハンドルを保持する。
   */
  async selectDirectory(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const showPicker = (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
      if (!showPicker) {
        throw new Error('showDirectoryPicker is not supported in this browser.');
      }
      this.directoryHandle = await showPicker.call(window);
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
    try {
      const name = Utils.norm(fileName);
      const dir = await this._getDirectoryHandle(null);
      const fileHandle = await this._getFileHandleFuzzy(dir, name);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (e) {
      console.warn(`[FS] Could not read file as text: ${fileName}`, e);
      return null;
    }
  }

  /**
   * ルートフォルダ直下または相対パスにファイルを書き込む。
   */
  async writeFile(filePath: string, content: string | BufferSource): Promise<boolean> {
    try {
      const normPath = Utils.norm(filePath);
      const parts = normPath.split('/').filter(Boolean);
      const fileName = parts.pop()!;
      const dirPath = parts.join('/');

      const dirHandle = await this._getDirectoryHandle(dirPath, { create: true });
      const fileHandle = await this._getFileHandleFuzzy(dirHandle, Utils.norm(fileName), { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (e) {
      console.error(`[FS] Failed to write file: ${filePath}`, e);
      return false;
    }
  }

  /**
   * 指定フォルダ配下のエントリを取得する。
   */
  async listEntries(dirPath: string | null = null): Promise<FileEntry[]> {
    try {
      const targetHandle = await this._getDirectoryHandle(dirPath);
      const entries: FileEntry[] = [];
      const extHandle = targetHandle as unknown as FileSystemDirectoryHandleExt;
      for await (const entry of extHandle.values()) {
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
    try {
      await this._getDirectoryHandle(dirPath, { create: true });
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
    try {
      const oldNorm = Utils.norm(oldPath);
      const newNorm = Utils.norm(newPath);
      if (oldNorm === newNorm) return true;

      const oldParts = oldNorm.split('/').filter(Boolean);
      const oldName = oldParts.pop()!;
      const oldParentPath = oldParts.join('/');
      const oldParent = await this._getDirectoryHandle(oldParentPath);
      const dirHandle = await oldParent.getDirectoryHandle(oldName);

      const newParts = newNorm.split('/').filter(Boolean);
      const newName = newParts.pop()!;
      const newParentPath = newParts.join('/');
      const newParent = await this._getDirectoryHandle(newParentPath, { create: true });

      const extDirHandle = dirHandle as unknown as FileSystemHandleExt;
      if (extDirHandle.move) {
        await extDirHandle.move(newParent, newName);
      } else {
        await this._copyRecursive(dirHandle, newParent, newName);
        await oldParent.removeEntry(oldName, { recursive: true });
      }
      return true;
    } catch (e) {
      console.error(`[FS] renameDirectory failed from ${oldPath} to ${newPath}`, e);
      return false;
    }
  }

  private async _copyRecursive(srcHandle: FileSystemDirectoryHandle, destParentHandle: FileSystemDirectoryHandle, targetName: string) {
    const destHandle = await destParentHandle.getDirectoryHandle(targetName, { create: true });
    const extSrcHandle = srcHandle as unknown as FileSystemDirectoryHandleExt;
    for await (const entry of extSrcHandle.values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const newFileHandle = await destHandle.getFileHandle(entry.name, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(file);
        await writable.close();
      } else if (entry.kind === 'directory') {
        await this._copyRecursive(entry as FileSystemDirectoryHandle, destHandle, entry.name);
      }
    }
  }

  /**
   * ファイルの移動・リネームを行う。
   */
  async moveAndRenameFile(sourcePath: string, targetDirPath: string, newFileName: string): Promise<boolean> {
    try {
      const sourceNorm = Utils.norm(sourcePath);
      const newNameNorm = Utils.norm(newFileName);

      const sourceParts = sourceNorm.split('/').filter(Boolean);
      const sourceName = sourceParts.pop()!;
      const sourceDir = await this._getDirectoryHandle(sourceParts.join('/'));
      const sourceFileHandle = await sourceDir.getFileHandle(sourceName);

      const targetDir = await this._getDirectoryHandle(targetDirPath, { create: true });

      const extFileHandle = sourceFileHandle as unknown as FileSystemHandleExt;
      if (extFileHandle.move) {
        await extFileHandle.move(targetDir, newNameNorm);
      } else {
        const file = await sourceFileHandle.getFile();
        const newFileHandle = await targetDir.getFileHandle(newNameNorm, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(file);
        await writable.close();
        await sourceDir.removeEntry(sourceName);
      }
      return true;
    } catch (e) {
      console.error(`[FS] moveAndRenameFile failed: ${sourcePath} -> ${targetDirPath}/${newFileName}`, e);
      return false;
    }
  }

  /**
   * ファイルプレビュー用 URL を配布する。
   */
  async readFileAsUrl(path: string): Promise<string | null> {
    try {
      const normPath = Utils.norm(path);
      const parts = normPath.split('/').filter(Boolean);
      const fileName = parts.pop()!;
      const dir = await this._getDirectoryHandle(parts.join('/'));
      const fileHandle = await this._getFileHandleFuzzy(dir, fileName);
      const file = await fileHandle.getFile();
      return URL.createObjectURL(file);
    } catch (e) {
      console.error(`[FS] readFileAsUrl failed: ${path}`, e);
      return null;
    }
  }

  /**
   * ファイルまたはディレクトリを削除する。
   */
  async removeEntry(path: string, recursive: boolean = false): Promise<boolean> {
    try {
      const normPath = Utils.norm(path);
      const parts = normPath.split('/').filter(Boolean);
      const name = parts.pop()!;
      const dirPath = parts.join('/');
      const dirHandle = await this._getDirectoryHandle(dirPath);
      await dirHandle.removeEntry(name, { recursive });
      return true;
    } catch (e) {
      console.error(`[FS] removeEntry(${path}) failed`, e);
      return false;
    }
  }

  /**
   * ディレクトリ構造を再帰的に走査し、全アイテムを取得する。
   * 隠しファイルやシステム生成ファイルは除外する。
   */
  async getAllEntriesRecursive(dirHandle?: FileSystemDirectoryHandle, currentPath = ''): Promise<(FileEntry & { path: string })[]> {
    const target = dirHandle || this.directoryHandle;
    if (!target) return [];
    
    let results: (FileEntry & { path: string })[] = [];
    try {
      const extHandle = target as unknown as FileSystemDirectoryHandleExt;
      for await (const entry of extHandle.values()) {
        const name = Utils.norm(entry.name);
        
        // 除外対象: 隠しファイル、システム生成ファイル、メタデータファイル
        if (
          name.startsWith('.') || 
          name === PROJECT_CONSTANTS.METADATA_FILENAME ||
          name === 'node_modules' ||
          name === 'out' ||
          name === '.next'
        ) continue;
        
        const entryPath = currentPath ? `${currentPath}/${name}` : name;
        results.push({ 
          name, 
          kind: entry.kind, 
          path: Utils.norm(entryPath) 
        });
        
        if (entry.kind === 'directory') {
          const subResults = await this.getAllEntriesRecursive(entry as FileSystemDirectoryHandle, entryPath);
          results = [...results, ...subResults];
        }
      }
    } catch (e) {
      console.error(`[FS] getAllEntriesRecursive failed at "${currentPath}"`, e);
    }
    return results;
  }
}
