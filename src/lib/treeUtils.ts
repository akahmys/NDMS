import { ProjectMetadata, Category, DocumentMetadata } from '@/types/project';
import { TreeData } from '@/types/tree';
import { PROJECT_CONSTANTS } from './constants';

/**
 * ProjectMetadata を react-arborist 用の TreeData[] に変換する
 */
export function convertMetadataToTreeData(
  metadata: ProjectMetadata,
  unclassifiedFiles: string[] = []
): TreeData[] {
  const { categories, documents } = metadata;

  // 1. カテゴリ ID をキーとしたドキュメントのマップを作成
  const docsByCatId: Record<string, DocumentMetadata[]> = {};
  documents.forEach(doc => {
    const catId = doc.categoryId || 'unclassified';
    if (!docsByCatId[catId]) docsByCatId[catId] = [];
    docsByCatId[catId].push(doc);
  });

  // 2. ツリー構造を再帰的に構築する関数
  const buildCategoryTree = (parentId: string | null): TreeData[] => {
    const subCategories = categories
      .filter(cat => cat.parentId === parentId);
    
    // ルートレベルの書類は 'unclassifiedSection' で一括管理するため、ここでは取得しない
    const subDocs = parentId === null ? [] : (docsByCatId[parentId] || []);

    // フォルダと書類を混在させてソートする
    return [
      ...subCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        type: 'category' as const,
        order: cat.displayOrder,
        children: buildCategoryTree(cat.id),
        data: cat
      })),
      ...subDocs.map(doc => ({
        id: doc.id,
        name: doc.documentName || doc.fileName,
        type: 'document' as const,
        order: doc.sortOrder || 0,
        data: doc
      }))
    ].sort((a, b) => (a.order - b.order) || (a.type === 'category' ? -1 : 1));
  };

  // 3. 特殊セクションの構築

  // 未分類 (Unclassified / Raw files in directory but not in metadata)
  // metadata.documents で categoryId が null のもの
  const unclassifiedDocsInMetadata: TreeData[] = (docsByCatId['unclassified'] || [])
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map(doc => ({
      id: doc.id,
      name: doc.documentName || doc.fileName,
      type: 'document' as const,
      order: doc.sortOrder || 0,
      data: doc
    }));

  // fs 上にあるが metadata にないファイル (unclassifiedFiles)
  const rawUnclassifiedDocs: TreeData[] = unclassifiedFiles.map((file, idx) => ({
    id: `raw:${file}`,
    name: file,
    type: 'document' as const,
    order: 1000 + idx, // 末尾
    data: { fileName: file, id: `raw:${file}` }
  }));

  const unclassifiedSection: TreeData = {
    id: 'unclassified-root',
    name: '未分類のファイル',
    type: 'unclassified-root' as const,
    order: 0,
    children: [...unclassifiedDocsInMetadata, ...rawUnclassifiedDocs]
  };

  // ルート直下のカテゴリ
  const rootCategories = buildCategoryTree(null);

  // 全体を統合して返す
  return [
    unclassifiedSection,
    ...rootCategories
  ];
}
