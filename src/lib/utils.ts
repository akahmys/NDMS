import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * NDMS Utils - 共通ユーティリティクラス
 */
export class Utils {
  /**
   * UUID 互換の一意な ID を生成する。
   */
  static id(): string {
    return typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  /**
   * 文字列に Unicode NFC 正規化を適用する。
   * macOS (NFD) と Windows (NFC) の間のファイル名不整合を吸収。
   */
  static norm(str: string): string {
    return typeof str === 'string' ? str.normalize('NFC') : str;
  }

  /**
   * Windows の禁則文字 (\/:*?"<>|) をアンダースコアに置換し、
   * ファイルシステムで安全なパス名を返す。
   */
  static sanitize(name: string): string {
    return this.norm(name).replace(/[\\/:*?"<>|]/g, '_').trim();
  }

  /**
   * ファイルサイズを人間が読める形式に変換する。
   */
  static formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
}

