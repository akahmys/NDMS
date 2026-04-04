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
  categoryId: string | null;
  fileName: string;
  documentName: string;
  number?: string;
  date?: string;
  sortOrder?: number;
}

export interface ProjectMetadata {
  config: ProjectConfig;
  categories: Category[];
  documents: DocumentMetadata[];
}
