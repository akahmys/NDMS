import { Utils } from '../lib/utils';
import { FileSystemService } from './fileSystemService';
import { 
  ProjectMetadata, 
  Category, 
  DocumentMetadata 
} from '@/types/project';
import { PROJECT_CONSTANTS } from '@/lib/constants';

/**
 * ProjectService - プロジェクトのビジネスロジックとメタデータ管理を担当。
 * 状態更新メソッドは新しいメタデータオブジェクトを返す（Immutable Update）。
 */
export class ProjectService {
  private _metadata: ProjectMetadata | null = null;

  constructor(private fs: FileSystemService, initialMetadata?: ProjectMetadata | null) {
    if (initialMetadata) {
      // 外部から渡された場合はクローンして保持（不変性を保つため）
      this._metadata = JSON.parse(JSON.stringify(initialMetadata));
    }
  }

  public get metadata(): ProjectMetadata | null {
    return this._metadata;
  }

  /**
   * プロジェクトを初期化する。
   */
  async init(): Promise<ProjectMetadata> {
    try {
      const json = await this.fs.readFileAsText(PROJECT_CONSTANTS.METADATA_FILENAME);
      let metadata: ProjectMetadata;

      if (json) {
        metadata = JSON.parse(json) as ProjectMetadata;
        
        // 簡易スキーマ検証
        if (!metadata.config || !Array.isArray(metadata.categories) || !Array.isArray(metadata.documents)) {
          throw new Error('プロジェクトファイルの形式が正しくありません。');
        }
      } else {
        // 初期状態の作成
        metadata = {
          config: {
            projectName: '',
            orderNumber: '',
            wbs: '',
            customer: '',
            user: '',
            customFields: [],
          },
          categories: [],
          documents: [],
        };
      }
      
      this._metadata = metadata;
      return metadata;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[ProjectService] init failed:', e);
      throw new Error(`プロジェクトの初期化に失敗しました: ${msg}`);
    }
  }

  /**
   * メタデータを保存する。
   */
  async saveMetadata(overrideMetadata?: ProjectMetadata): Promise<boolean> {
    const data = overrideMetadata || this._metadata;
    if (!data) return false;
    return await this.fs.writeFile(PROJECT_CONSTANTS.METADATA_FILENAME, JSON.stringify(data, null, 2));
  }

  /**
   * カテゴリの深さを取得する（1-based）
   */
  getCategoryDepth(catId: string | null): number {
    if (!catId || !this._metadata) return 0;
    let depth = 0;
    let currentId: string | null = catId;
    while (currentId) {
      const cat = this._metadata.categories.find(c => c.id === currentId);
      if (!cat) break;
      depth++;
      currentId = cat.parentId;
    }
    return depth;
  }

  /**
   * 指定した ID のカテゴリまたは親からパスを解決する。
   */
  private _resolvePath(name: string, parentId: string | null): string {
    if (!this._metadata) return Utils.sanitize(name);
    const parent = parentId ? this._metadata.categories.find(c => c.id === parentId) : null;
    return parent ? `${parent.path}/${Utils.sanitize(name)}` : Utils.sanitize(name);
  }

  /**
   * 書類を追加（インポート）する。
   * 物理的な移動や書き込みもここで行う。
   */
  /**
   * 書類を追加（インポート）する。
   * 物理的な移動や書き込みもここで行う。
   * categoryId が null の場合はルートディレクトリ（未分類）への追加となる。
   */
  async importDocument(handle: FileSystemFileHandle, categoryId: string | null = null): Promise<ProjectMetadata> {
    if (!this._metadata) throw new Error('Project not initialized');

    const cat = categoryId ? this._metadata.categories.find(c => c.id === categoryId) : null;
    if (categoryId && !cat) throw new Error('Target category not found');

    const fileName = Utils.norm(handle.name);
    const targetPath = cat ? `${cat.path}/${fileName}` : fileName;

    // 1. 物理的な書き込み/移動
    // ルートに既に存在するか確認
    const entries = await this.fs.listEntries();
    const existsInRoot = entries.some(e => e.name === fileName && e.kind === 'file');

    if (existsInRoot && cat) {
      // ルートからサブフォルダへ移動
      await this.fs.moveAndRenameFile(fileName, cat.path, fileName);
    } else if (!existsInRoot) {
      // 外部から書き込み
      const file = await handle.getFile();
      const content = await file.arrayBuffer();
      await this.fs.writeFile(targetPath, content);
    }

    // 2. メタデータ更新 (Immutable)
    const newDoc: DocumentMetadata = {
      id: Utils.id(),
      categoryId,
      fileName,
      documentName: fileName.replace(/\.pdf$/i, ''),
      number: '',
      date: new Date().toISOString().split('T')[0],
      sortOrder: this._metadata.documents.filter(d => d.categoryId === categoryId).length,
    };

    const nextMetadata: ProjectMetadata = {
      ...this._metadata,
      documents: [...this._metadata.documents, newDoc]
    };

    this._metadata = nextMetadata; // 内部状態も同期
    await this.saveMetadata(nextMetadata);
    return nextMetadata;
  }

  /**
   * 書類を移動する。
   */
  async moveDocument(docId: string, targetCategoryId: string): Promise<ProjectMetadata> {
    if (!this._metadata) throw new Error('Project not initialized');

    const docIdx = this._metadata.documents.findIndex(d => d.id === docId);
    if (docIdx === -1) throw new Error('Document not found');
    
    const doc = this._metadata.documents[docIdx];
    if (doc.categoryId === targetCategoryId) return this._metadata;

    const oldCat = this._metadata.categories.find(c => c.id === doc.categoryId);
    const newCat = this._metadata.categories.find(c => c.id === targetCategoryId);
    if (!newCat) throw new Error('Target category not found');

    // 物理移動
    const oldPath = oldCat ? `${oldCat.path}/${doc.fileName}` : doc.fileName;
    const success = await this.fs.moveAndRenameFile(oldPath, newCat.path, doc.fileName);
    if (!success) throw new Error('Failed to move physical file');

    // メタデータ更新 (Immutable)
    const nextDocs = [...this._metadata.documents];
    nextDocs[docIdx] = {
      ...doc,
      categoryId: targetCategoryId,
      sortOrder: this._metadata.documents.filter(d => d.categoryId === targetCategoryId).length
    };

    const nextMetadata: ProjectMetadata = {
      ...this._metadata,
      documents: nextDocs
    };

    this._metadata = nextMetadata;
    await this.saveMetadata(nextMetadata);
    return nextMetadata;
  }

  /**
   * カテゴリを追加する。
   */
  async createCategory(name: string, parentId: string | null = null): Promise<ProjectMetadata> {
    if (!this._metadata) throw new Error('Project not initialized');

    if (this.getCategoryDepth(parentId) >= PROJECT_CONSTANTS.MAX_DEPTH) {
      throw new Error(`フォルダの階層は最大${PROJECT_CONSTANTS.MAX_DEPTH}階層までです。`);
    }

    const path = this._resolvePath(name, parentId);
    const newCat: Category = {
      id: Utils.id(),
      name,
      path,
      parentId,
      displayOrder: this._metadata.categories.filter(c => c.parentId === parentId).length,
    };

    // 物理作成
    await this.fs.createDirectory(path);

    // メタデータ更新 (Immutable)
    const nextMetadata: ProjectMetadata = {
      ...this._metadata,
      categories: [...this._metadata.categories, newCat]
    };

    this._metadata = nextMetadata;
    await this.saveMetadata(nextMetadata);
    return nextMetadata;
  }

  /**
   * カテゴリをリネームする。
   */
  async renameCategory(catId: string, newName: string): Promise<ProjectMetadata> {
    if (!this._metadata) throw new Error('Project not initialized');

    const catIdx = this._metadata.categories.findIndex(c => c.id === catId);
    if (catIdx === -1) throw new Error('Category not found');
    
    const cat = this._metadata.categories[catIdx];
    if (cat.name === newName) return this._metadata;

    const oldPath = cat.path;
    const newPath = this._resolvePath(newName, cat.parentId);

    // 物理リネーム
    const success = await this.fs.renameDirectory(oldPath, newPath);
    if (!success) throw new Error('Failed to rename physical directory');

    // メタデータ更新 (Immutable) & 子孫パス更新
    const nextCategories = [...this._metadata.categories];
    nextCategories[catIdx] = { ...cat, name: newName, path: newPath };

    this._updateDescendantPaths(nextCategories, catId, oldPath, newPath);

    const nextMetadata: ProjectMetadata = {
      ...this._metadata,
      categories: nextCategories
    };

    this._metadata = nextMetadata;
    await this.saveMetadata(nextMetadata);
    return nextMetadata;
  }

  /**
   * カテゴリを移動（親の変更）する。
   */
  async moveCategory(catId: string, targetParentId: string | null): Promise<ProjectMetadata> {
    if (!this._metadata) throw new Error('Project not initialized');

    const catIdx = this._metadata.categories.findIndex(c => c.id === catId);
    if (catIdx === -1) throw new Error('Category not found');
    
    const cat = this._metadata.categories[catIdx];
    if (cat.parentId === targetParentId || cat.id === targetParentId) return this._metadata;

    // 循環参照チェック
    if (targetParentId && this._isDescendantOf(targetParentId, catId)) {
      throw new Error('フォルダを自分自身や自分の子フォルダの中へ移動することはできません。');
    }

    // 階層数チェック
    const targetDepth = this.getCategoryDepth(targetParentId);
    const mySubtreeDepth = this._getMaxSubtreeDepth(catId);
    if (targetDepth + mySubtreeDepth > PROJECT_CONSTANTS.MAX_DEPTH) {
      throw new Error(`移動後の階層が${PROJECT_CONSTANTS.MAX_DEPTH}階層を超えるため、移動できません。`);
    }

    const oldPath = cat.path;
    const newPath = this._resolvePath(cat.name, targetParentId);

    // 物理移動
    const success = await this.fs.renameDirectory(oldPath, newPath);
    if (!success) throw new Error('Failed to move physical directory');

    // メタデータ更新 (Immutable)
    const nextCategories = [...this._metadata.categories];
    const siblings = nextCategories.filter(c => c.parentId === targetParentId && c.id !== catId);
    
    nextCategories[catIdx] = { 
      ...cat, 
      parentId: targetParentId, 
      path: newPath, 
      displayOrder: siblings.length 
    };

    this._updateDescendantPaths(nextCategories, catId, oldPath, newPath);

    const nextMetadata: ProjectMetadata = {
      ...this._metadata,
      categories: nextCategories
    };

    this._metadata = nextMetadata;
    await this.saveMetadata(nextMetadata);
    return nextMetadata;
  }

  /**
   * 書類をリネームする。
   */
  async renameDocument(docId: string, newName: string): Promise<ProjectMetadata> {
    if (!this._metadata) throw new Error('Project not initialized');
    
    const docIdx = this._metadata.documents.findIndex(d => d.id === docId);
    if (docIdx === -1) throw new Error('Document not found');
    
    const doc = this._metadata.documents[docIdx];
    const cat = this._metadata.categories.find(c => c.id === doc.categoryId);
    const parentPath = cat ? cat.path : '.';
    
    const oldPath = cat ? `${cat.path}/${doc.fileName}` : doc.fileName;
    // 拡張子を維持
    const ext = doc.fileName.split('.').pop();
    const newFileName = `${Utils.sanitize(newName.replace(/\.pdf$/i, ''))}.${ext}`;
    const newPath = `${parentPath}/${newFileName}`;

    // 物理リネーム
    if (oldPath !== newPath) {
      const success = await this.fs.moveAndRenameFile(oldPath, parentPath, newFileName);
      if (!success) throw new Error('Failed to rename physical file');
    }

    // メタデータ更新 (Immutable)
    const nextDocs = [...this._metadata.documents];
    nextDocs[docIdx] = {
      ...doc,
      fileName: newFileName,
      documentName: newName
    };

    const nextMetadata: ProjectMetadata = {
      ...this._metadata,
      documents: nextDocs
    };

    this._metadata = nextMetadata;
    await this.saveMetadata(nextMetadata);
    return nextMetadata;
  }

  /**
   * カテゴリを削除する。
   * 中にある書類はルート（未分類）へ退避し、物理ディレクトリとメタデータを削除する。
   */
  async deleteCategory(catId: string): Promise<ProjectMetadata> {
    if (!this._metadata) throw new Error('Project not initialized');

    const cat = this._metadata.categories.find(c => c.id === catId);
    if (!cat) throw new Error('Category not found');

    // 1. このカテゴリ以下の全ての書類と子カテゴリを特定
    const descendantCatIds = this._getAllDescendantCategoryIds(catId);
    const allTargetCatIds = [catId, ...descendantCatIds];
    const docsToEvacuate = this._metadata.documents.filter(d => d.categoryId && allTargetCatIds.includes(d.categoryId));

    // 2. 書類をルートへ物理移動し、メタデータから削除
    for (const doc of docsToEvacuate) {
      const docCat = this._metadata.categories.find(c => c.id === doc.categoryId);
      const oldPath = docCat ? `${docCat.path}/${doc.fileName}` : doc.fileName;
      await this.fs.moveAndRenameFile(oldPath, '.', doc.fileName);
    }

    // 3. メタデータ更新
    const nextDocs = this._metadata.documents.filter(d => !docsToEvacuate.some(target => target.id === d.id));
    const nextCats = this._metadata.categories.filter(c => !allTargetCatIds.includes(c.id));

    const nextMetadata: ProjectMetadata = {
      ...this._metadata,
      categories: nextCats,
      documents: nextDocs
    };

    // 4. 物理ディレクトリの削除（再帰的）
    await this.fs.removeEntry(cat.path, true);

    this._metadata = nextMetadata;
    await this.saveMetadata(nextMetadata);
    return nextMetadata;
  }

  /**
   * 書類を物理削除する。
   */
  async deleteDocument(docId: string): Promise<ProjectMetadata> {
    if (!this._metadata) throw new Error('Project not initialized');
    
    const docIdx = this._metadata.documents.findIndex(d => d.id === docId);
    if (docIdx === -1) throw new Error('Document not found');
    
    const doc = this._metadata.documents[docIdx];
    const cat = this._metadata.categories.find(c => c.id === doc.categoryId);
    const docPath = cat ? `${cat.path}/${doc.fileName}` : doc.fileName;

    // 1. 物理削除
    await this.fs.removeEntry(docPath, false);

    // 2. メタデータ更新
    const nextMetadata: ProjectMetadata = {
      ...this._metadata,
      documents: this._metadata.documents.filter(d => d.id !== docId)
    };

    this._metadata = nextMetadata;
    await this.saveMetadata(nextMetadata);
    return nextMetadata;
  }

  private _getAllDescendantCategoryIds(parentId: string): string[] {
    if (!this._metadata) return [];
    const children = this._metadata.categories.filter(c => c.parentId === parentId);
    let ids = children.map(c => c.id);
    for (const child of children) {
      ids = [...ids, ...this._getAllDescendantCategoryIds(child.id)];
    }
    return ids;
  }

  private _isDescendantOf(targetId: string, potentialAncestorId: string): boolean {
    if (!this._metadata) return false;
    let currentId: string | null = targetId;
    while (currentId) {
      if (currentId === potentialAncestorId) return true;
      const cat = this._metadata.categories.find(c => c.id === currentId);
      currentId = cat ? cat.parentId : null;
    }
    return false;
  }

  private _getMaxSubtreeDepth(catId: string): number {
    if (!this._metadata) return 1;
    const children = this._metadata.categories.filter(c => c.parentId === catId);
    if (children.length === 0) return 1;
    return 1 + Math.max(...children.map(c => this._getMaxSubtreeDepth(c.id)));
  }

  private _updateDescendantPaths(categories: Category[], parentId: string, oldParentPath: string, newParentPath: string) {
    const children = categories.filter(c => c.parentId === parentId);
    for (const child of children) {
      const relativePath = child.path.substring(oldParentPath.length);
      child.path = newParentPath + relativePath;
      this._updateDescendantPaths(categories, child.id, oldParentPath, newParentPath);
    }
  }

  /**
   * 物理ディレクトリ構造を走査し、メタデータに未登録のフォルダや書類を自動インポートする。（案A対応）
   */
  async syncWithPhysical(): Promise<{ metadata: ProjectMetadata; changed: boolean }> {
    if (!this._metadata) throw new Error('Project not initialized');

    // 1. 物理エントリの取得
    const physicalEntries = await this.fs.getAllEntriesRecursive();
    
    let changed = false;
    const nextMetadata: ProjectMetadata = JSON.parse(JSON.stringify(this._metadata));
    
    // 2. フォルダ（カテゴリ）の同期
    // 深さ（パスの区切り数）が浅い順にソートして、親から先に処理する
    const physicalDirs = physicalEntries
      .filter(e => e.kind === 'directory')
      .sort((a, b) => a.path.split('/').length - b.path.split('/').length);

    for (const pDir of physicalDirs) {
      const normPath = Utils.norm(pDir.path);
      const existing = nextMetadata.categories.find(c => Utils.norm(c.path) === normPath);
      
      if (!existing) {
        // 未登録のフォルダを発見
        const parts = normPath.split('/');
        const name = parts.pop()!;
        const parentPath = parts.join('/');
        
        // 親カテゴリを探す
        const parent = parentPath ? nextMetadata.categories.find(c => Utils.norm(c.path) === Utils.norm(parentPath)) : null;
        
        const newCat: Category = {
          id: Utils.id(),
          name: name,
          path: normPath,
          parentId: parent ? parent.id : null,
          displayOrder: nextMetadata.categories.filter(c => c.parentId === (parent ? parent.id : null)).length
        };
        
        nextMetadata.categories.push(newCat);
        changed = true;
      }
    }

    // 3. 書類（PDF）の同期
    const physicalFiles = physicalEntries.filter(e => 
      e.kind === 'file' && e.name.toLowerCase().endsWith(PROJECT_CONSTANTS.PDF_EXTENSION)
    );

    for (const pFile of physicalFiles) {
      const normPath = Utils.norm(pFile.path);
      const parts = normPath.split('/');
      const fileName = parts.pop()!;
      const parentPath = parts.join('/');
      
      // 親カテゴリを取得
      const parent = parentPath ? nextMetadata.categories.find(c => Utils.norm(c.path) === Utils.norm(parentPath)) : null;
      const categoryId = parent ? parent.id : 'unclassified'; // ルートの場合は 'unclassified' (metadata.documents では null 扱い)
      
      const existing = nextMetadata.documents.find(d => 
        Utils.norm(d.fileName) === Utils.norm(fileName) && 
        (d.categoryId === (categoryId === 'unclassified' ? null : categoryId))
      );

      if (!existing) {
        // 未登録の書類を発見
        const newDoc: DocumentMetadata = {
          id: Utils.id(),
          categoryId: categoryId === 'unclassified' ? null : categoryId,
          fileName: fileName,
          documentName: fileName.replace(/\.pdf$/i, ''),
          number: '',
          date: new Date().toISOString().split('T')[0],
          sortOrder: nextMetadata.documents.filter(d => d.categoryId === (categoryId === 'unclassified' ? null : categoryId)).length
        };
        nextMetadata.documents.push(newDoc);
        changed = true;
      }
    }

    if (changed) {
      this._metadata = nextMetadata;
      await this.saveMetadata();
    }

    return { metadata: nextMetadata, changed };
  }
}
