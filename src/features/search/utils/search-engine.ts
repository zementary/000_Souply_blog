import MiniSearch from 'minisearch';

/**
 * 搜索项接口 - 定义可搜索的视频/作品数据结构
 */
export interface SearchItem {
  id: string;
  title: string;
  artist: string;
  director: string;
  tags: string;
  production: string;
  cover?: string;
  youtubeId?: string;
}

/**
 * 搜索结果接口 - 包含匹配分数和高亮信息
 */
export interface SearchResult extends SearchItem {
  score: number;
  match: Record<string, string[]>;
}

/**
 * 搜索配置选项
 */
export interface SearchOptions {
  /** 模糊匹配容错度 (0-1) */
  fuzzy?: number | boolean;
  /** 前缀匹配 */
  prefix?: boolean;
  /** 字段权重提升 */
  boost?: Record<string, number>;
  /** 组合查询策略 */
  combineWith?: 'AND' | 'OR';
  /** 最大返回结果数 */
  limit?: number;
}

/**
 * SearchEngine - 基于 MiniSearch 的全文搜索引擎
 * 
 * 特性:
 * - 实时 "as you type" 搜索
 * - 支持模糊匹配和前缀搜索
 * - 字段权重和排名优化
 * - 中文分词友好
 * - TypeScript 类型安全
 */
export class SearchEngine {
  private miniSearch: MiniSearch<SearchItem>;
  private indexed: boolean = false;

  constructor() {
    this.miniSearch = new MiniSearch<SearchItem>({
      // 定义要索引的字段
      fields: ['title', 'artist', 'director', 'tags', 'production'],
      
      // 存储所有字段用于结果返回
      storeFields: ['id', 'title', 'artist', 'director', 'tags', 'production', 'cover', 'youtubeId'],
      
      // 字段权重配置 - 标题和艺术家权重更高
      boost: {
        title: 2.5,
        artist: 2.0,
        director: 1.5,
        tags: 1.2,
        production: 1.0,
      },
      
      // 搜索选项默认值
      searchOptions: {
        fuzzy: 0.2,        // 轻度模糊匹配
        prefix: true,       // 启用前缀搜索
        combineWith: 'OR',  // OR 策略更宽松
      },
      
      // 分词器 - 处理中英文混合
      tokenize: (text: string) => {
        // 保留原始 minisearch 分词逻辑，同时增强中文支持
        return text
          .toLowerCase()
          .split(/[\s\-_\/,，、]+/)  // 支持中文标点
          .filter(token => token.length > 0);
      },
    });
  }

  /**
   * 批量添加文档到索引
   */
  addAll(documents: SearchItem[]): void {
    this.miniSearch.addAll(documents);
    this.indexed = true;
  }

  /**
   * 异步批量添加 - 适用于大数据集
   */
  async addAllAsync(documents: SearchItem[]): Promise<void> {
    await this.miniSearch.addAllAsync(documents);
    this.indexed = true;
  }

  /**
   * 添加单个文档
   */
  add(document: SearchItem): void {
    this.miniSearch.add(document);
    this.indexed = true;
  }

  /**
   * 移除文档
   */
  remove(document: SearchItem): void {
    this.miniSearch.remove(document);
  }

  /**
   * 执行搜索
   * @param query 搜索查询字符串
   * @param options 搜索选项
   * @returns 搜索结果数组（按相关度排序）
   */
  search(query: string, options?: SearchOptions): SearchResult[] {
    if (!query.trim()) {
      return [];
    }

    // 使用防御性默认值，避免访问 undefined
    const defaultSearchOptions = {
      fuzzy: 0.2,
      prefix: true,
      combineWith: 'OR' as const,
    };

    const searchOptions = {
      ...defaultSearchOptions,
      ...options,
    };

    console.log('[SearchEngine] 执行搜索:', { query, searchOptions });

    try {
      const results = this.miniSearch.search(query, searchOptions);
      console.log('[SearchEngine] MiniSearch 返回结果数:', results.length);
      return results as SearchResult[];
    } catch (err) {
      console.error('[SearchEngine] MiniSearch 搜索失败:', err);
      return [];
    }
  }

  /**
   * 自动建议 - 用于搜索框自动完成
   * @param query 部分输入的查询
   * @param options 搜索选项
   * @returns 建议结果
   */
  autoSuggest(query: string, options?: SearchOptions): SearchResult[] {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    return this.search(query, {
      prefix: true,
      fuzzy: 0.3,
      limit: 10,
      ...options,
    });
  }

  /**
   * 优化索引 - 清理已删除文档占用的内存
   */
  vacuum(): void {
    this.miniSearch.discard();
  }

  /**
   * 获取索引统计信息
   */
  getStats() {
    return {
      indexed: this.indexed,
      documentCount: this.miniSearch.documentCount,
      termCount: this.miniSearch.termCount,
    };
  }

  /**
   * 清空索引
   */
  clear(): void {
    this.miniSearch.removeAll();
    this.indexed = false;
  }

  /**
   * 检查是否已建立索引
   */
  isIndexed(): boolean {
    return this.indexed;
  }
}

/**
 * 单例模式 - 全局共享的搜索引擎实例
 */
let searchEngineInstance: SearchEngine | null = null;

/**
 * 获取或创建搜索引擎单例
 */
export function getSearchEngine(): SearchEngine {
  if (!searchEngineInstance) {
    searchEngineInstance = new SearchEngine();
  }
  return searchEngineInstance;
}

/**
 * 初始化搜索引擎并加载数据
 * @param documents 要索引的文档数组
 * @returns 配置好的搜索引擎实例
 */
export async function setupSearchEngine(documents: SearchItem[]): Promise<SearchEngine> {
  const engine = getSearchEngine();
  
  console.log('[SearchEngine] setupSearchEngine 调用:', {
    文档数量: documents.length,
    已索引: engine.isIndexed(),
    当前文档数: engine.getStats().documentCount
  });
  
  // 如果已经索引过，清空并重新索引（确保数据最新）
  if (engine.isIndexed()) {
    console.log('[SearchEngine] 清空现有索引...');
    engine.clear();
  }
  
  if (documents.length > 1000) {
    console.log('[SearchEngine] 使用异步方法索引大数据集...');
    await engine.addAllAsync(documents);
  } else {
    console.log('[SearchEngine] 索引文档...');
    engine.addAll(documents);
  }
  
  const stats = engine.getStats();
  console.log('[SearchEngine] 索引完成:', stats);
  
  return engine;
}

/**
 * 默认导出搜索引擎类
 */
export default SearchEngine;
