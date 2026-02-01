/**
 * Search Feature Module
 * 
 * 导出搜索功能的所有公共 API
 */

// 组件
export { default as SearchPalette } from './components/SearchPalette';

// 工具类
export { SearchEngine, getSearchEngine, setupSearchEngine } from './utils/search-engine';
export { transformVideosToSearchItems, extractDisplayData } from './utils/transform-data';

// 类型
export type { SearchItem, SearchResult, SearchOptions } from './utils/search-engine';
