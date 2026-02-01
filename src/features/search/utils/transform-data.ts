import type { CollectionEntry } from 'astro:content';
import type { SearchItem } from './search-engine';

/**
 * 将 Astro content collection 视频数据转换为搜索引擎所需的格式
 * @param videos - Astro getCollection('videos') 返回的视频集合
 * @returns 符合 SearchItem 接口的数组
 */
export function transformVideosToSearchItems(
  videos: CollectionEntry<'videos'>[]
): SearchItem[] {
  return videos.map((video) => {
    const youtubeId = video.data.youtubeId;
    let cover = video.data.cover;
    
    // 如果没有 cover 但有 youtubeId，生成 YouTube 缩略图 URL
    if (!cover && youtubeId) {
      cover = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    }
    
    return {
      id: video.slug,
      title: video.data.title,
      artist: video.data.artist || '',
      director: video.data.director || '',
      tags: video.data.tags?.join(' ') || '',
      production: video.data.production || '',
      cover,
      youtubeId,
    };
  });
}

/**
 * 从视频条目中提取用于展示的数据
 * @param video - 视频 collection entry
 * @returns 包含展示所需字段的对象
 */
export function extractDisplayData(video: CollectionEntry<'videos'>) {
  return {
    slug: video.slug,
    title: video.data.title,
    artist: video.data.artist,
    cover: video.data.cover,
    director: video.data.director,
  };
}
