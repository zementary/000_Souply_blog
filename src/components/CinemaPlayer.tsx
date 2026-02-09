import { useEffect, useRef, useState } from 'react';

// CinemaPlayerProps 类型，保证类型安全
interface CinemaPlayerProps {
  platform: 'youtube' | 'vimeo';
  videoId: string;
  coverImage: string | null;
  nextUrl: string;
  onVideoEnd?: () => void;
}

// 主播放器组件（YouTube / Vimeo）
export default function CinemaPlayer({
  platform,
  videoId,
  coverImage,
  nextUrl,
  onVideoEnd,
}: CinemaPlayerProps) {
  const [isEnding, setIsEnding] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const vimeoPlayerRef = useRef<any>(null);

  // 平台播放器事件装载与清理
  useEffect(() => {
    let vimeoCleanup: (() => void) | null = null;

    if (platform === 'youtube') {
      // YouTube IFrame API 动态注入与绑定
      if ((window as any).YT && (window as any).YT.Player) {
        initYouTubePlayer();
      } else {
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }
        (window as any).onYouTubeIframeAPIReady = () => {
          initYouTubePlayer();
        };
      }
    } else if (platform === 'vimeo') {
      // 动态加载 Vimeo Player SDK
      const loadVimeoSDK = (): Promise<void> => {
        // 已存在则直接resolve
        if ((window as any).Vimeo && (window as any).Vimeo.Player) return Promise.resolve();
        return new Promise<void>((resolve) => {
          if (document.querySelector('script[src="https://player.vimeo.com/api/player.js"]')) {
            // 若已注入则等待加载
            const existingScript = document.querySelector('script[src="https://player.vimeo.com/api/player.js"]') as HTMLScriptElement;
            if (existingScript && existingScript.dataset.loaded) {
              resolve();
            } else {
              existingScript?.addEventListener('load', () => {
                existingScript.setAttribute('data-loaded', 'true');
                resolve();
              });
            }
          } else {
            const script = document.createElement('script');
            script.src = 'https://player.vimeo.com/api/player.js';
            script.async = true;
            script.onload = () => {
              script.setAttribute('data-loaded', 'true');
              resolve();
            };
            document.body.appendChild(script);
          }
        });
      };

      let isUnmounted = false;

      loadVimeoSDK().then(() => {
        if (isUnmounted) return;
        const Vimeo = (window as any).Vimeo;
        const iframe = iframeRef.current;
        if (!iframe || !Vimeo || !Vimeo.Player) return;
        // Vimeo Player 实例化
        const player = new Vimeo.Player(iframe);
        vimeoPlayerRef.current = player;

        // SDK事件绑定
        player.on('ended', handleVideoEnd);
        player.on('play', () => window.dispatchEvent(new CustomEvent('video-playing')));
        player.on('pause', () => window.dispatchEvent(new CustomEvent('video-paused')));
        player.on('loaded', () => setIsLoaded(true));

        // 清理函数
        vimeoCleanup = () => {
          player.off('ended', handleVideoEnd);
          player.off('play');
          player.off('pause');
          player.off('loaded');
          if (typeof player.unload === 'function') {
            player.unload();
          }
          vimeoPlayerRef.current = null;
        };
      });

      return () => {
        isUnmounted = true;
        if (vimeoCleanup) vimeoCleanup();
      };
    }

    // 清理YouTube播放器
    return () => {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          //
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, videoId]);

  // 初始化YouTube播放器逻辑
  const initYouTubePlayer = () => {
    if (!document.getElementById(`youtube-player-${videoId}`)) return;
    try {
      ytPlayerRef.current = new (window as any).YT.Player(`youtube-player-${videoId}`, {
        videoId,
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          controls: 1,
          modestbranding: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: (event: any) => {
            setIsLoaded(true);
            event.target.playVideo();
          },
          onStateChange: (event: any) => {
            // 0: ended, 1: playing, 2: paused
            if (event.data === 0) {
              handleVideoEnd();
            } else if (event.data === 1) {
              window.dispatchEvent(new CustomEvent('video-playing'));
            } else if (event.data === 2) {
              window.dispatchEvent(new CustomEvent('video-paused'));
            }
          },
        },
      });
    } catch (e) {
      // do nothing
    }
  };

  // 视频播放结束时自动跳转
  const handleVideoEnd = () => {
    if (onVideoEnd) onVideoEnd();
    setIsEnding(true);
    setTimeout(() => {
      window.location.href = nextUrl;
    }, 700);
  };

  // 渲染区块
  return (
    <div
      ref={playerRef}
      className={`relative aspect-video bg-black transition-opacity duration-700 ${isEnding ? 'opacity-0' : 'opacity-100'}`}
    >
      {platform === 'youtube' ? (
        <div
          id={`youtube-player-${videoId}`}
          className="w-full h-full"
          style={
            coverImage && !isLoaded
              ? {
                  backgroundImage: `url('${coverImage}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {}
          }
        />
      ) : (
        <div
          className="relative w-full h-full overflow-hidden bg-black"
          style={
            coverImage && !isLoaded
              ? {
                  backgroundImage: `url('${coverImage}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {}
          }
        >
          {/* 必须加api=1参数保证vimeo postmessage事件可用，仅SDK监听事件 */}
          <iframe
            ref={iframeRef}
            src={`https://player.vimeo.com/video/${videoId}?autoplay=1&playsinline=1&dnt=1&api=1&transparent=0&autopause=0&title=0&byline=0&portrait=0`}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
