import { Utils } from '../lib/utils';
import { FileSystemService } from './FileSystemService';

export interface ProjectConfig {
  projectName: string;
  orderNumber: string;
  wbs: string;
  customer: string;
  user: string;
  customFields: Array<{ label: string; value: string }>;
}

export interface Category {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  displayOrder: number;
}

export interface DocumentMetadata {
  id: string;
  categoryId: string;
  fileName: string;
  documentName: string;
  number: string;
  date: string;
  sortOrder: number;
}

export interface ProjectMetadata {
  config: ProjectConfig;
  categories: Category[];
  documents: DocumentMetadata[];
}

export class ProjectService {
  public metadata: ProjectMetadata | null = null;
  private static readonly METADATA_FILENAME = 'project.json';

  constructor(private fs: FileSystemService) {}

  /**
   * プロジェクトを初期化する。
   */
  async init(): Promise<boolean> {
    const json = await this.fs.readFileAsText(ProjectService.METADATA_FILENAME);
    if (json) {
      this.metadata = JSON.parse(json);
      return true;
    }
    // 初期状態の作成（簡易版）
    this.metadata = {
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
    return true;
  }

  /**
   * メタデータを保存する。
   */
  async save(): Promise<boolean> {
    if (!this.metadata) return false;
    return await this.fs.writeFile(ProjectService.METADATA_FILENAME, JSON.stringify(this.metadata, null, 2));
  }

  /**
   * 書類を追加する。
   */
  async addDocument(doc: Partial<DocumentMetadata> & { categoryId: string; fileName: string }): Promise<string> {
    if (!this.metadata) throw new Error('Project not initialized');
    const id = Utils.id();
    const newDoc: DocumentMetadata = {
      id,
      documentName: doc.documentName || doc.fileName,
      number: doc.number || '',
      date: doc.date || new Date().toISOString().split('T')[0],
      sortOrder: this.metadata.documents.filter(d => d.categoryId === doc.categoryId).length,
      ...doc,
    };
    this.metadata.documents.push(newDoc);
    return id;
  }

  /**
   * カテゴリを追加する。
   */
  async addCategory(name: string, parentId: string | null = null): Promise<string> {
    if (!this.metadata) throw new Error('Project not initialized');
    const id = Utils.id();
    const path = Utils.sanitize(name);
    const newCat: Category = {
      id,
      name,
      path,
      parentId,
      displayOrder: this.metadata.categories.filter(c => c.parentId === parentId).length,
    };
    this.metadata.categories.push(newCat);
    await this.fs.createDirectory(path);
    return id;
  }
}
