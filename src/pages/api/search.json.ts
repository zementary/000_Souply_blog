import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { transformVideosToSearchItems } from '../../features/search/utils/transform-data';

/**
 * API Endpoint: GET /api/search.json
 * 返回所有视频的搜索数据（已转换为 SearchItem 格式）
 */
export const GET: APIRoute = async () => {
  try {
    // 获取所有视频
    const videos = await getCollection('videos');
    
    // 转换为搜索引擎格式
    const searchData = transformVideosToSearchItems(videos);
    
    return new Response(JSON.stringify(searchData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // 缓存 5 分钟
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Search API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch search data' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
