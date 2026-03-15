import type { CollectionEntry } from 'astro:content';
import type { SearchItem } from './search-engine';
import { extractYouTubeId, detectVideoPlatform } from '@utils/video';

export function transformVideosToSearchItems(
  videos: CollectionEntry<'videos'>[]
): SearchItem[] {
  return videos.map((video) => {
    const platform = detectVideoPlatform(video.data.video_url);
    const youtubeId = platform === 'youtube' ? extractYouTubeId(video.data.video_url) ?? undefined : undefined;
    let cover = video.data.cover;

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
