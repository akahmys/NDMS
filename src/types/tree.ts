export type NodeType = 'category' | 'document' | 'unclassified-root' | 'merged-root';

export interface TreeData {
  id: string;
  name: string;
  type: NodeType;
  children?: TreeData[];
  order: number;
  data?: any; // Original metadata for documents/categories
}
