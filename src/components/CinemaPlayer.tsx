import { useEffect, useRef, useState } from 'react';

interface CinemaPlayerProps {
  platform: 'youtube' | 'vimeo';
  videoId: string;
  coverImage: string | null;
  nextUrl: string;
  onVideoEnd?: () => void;
}

export default function CinemaPlayer({ 
  platform, 
  videoId, 
  coverImage, 
  nextUrl,
  onVideoEnd 
}: CinemaPlayerProps) {
  const [isEnding, setIsEnding] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<any>(null);

  useEffect(() => {
    if (platform === 'youtube') {
      // Check if API is already loaded
      if ((window as any).YT && (window as any).YT.Player) {
        initYouTubePlayer();
      } else {
        // Load YouTube IFrame API only if not already loaded
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        // Wait for API to be ready
        (window as any).onYouTubeIframeAPIReady = () => {
          initYouTubePlayer();
        };
      }
    } else if (platform === 'vimeo') {
      // Listen for Vimeo postMessage events
      const handleVimeoMessage = (event: MessageEvent) => {
        if (event.origin !== 'https://player.vimeo.com') return;
        
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'ended') {
            handleVideoEnd();
          } else if (data.event === 'ready') {
            setIsLoaded(true);
          } else if (data.event === 'play') {
            // Dispatch video playing event
            window.dispatchEvent(new CustomEvent('video-playing'));
          } else if (data.event === 'pause') {
            // Dispatch video paused event
            window.dispatchEvent(new CustomEvent('video-paused'));
          }
        } catch (e) {
          // Ignore parsing errors
        }
      };

      window.addEventListener('message', handleVimeoMessage);

      // Enable postMessage API for Vimeo (wait for iframe to load)
      const iframe = iframeRef.current;
      if (iframe) {
        iframe.onload = () => {
          if (iframe.contentWindow) {
            // Subscribe to events
            iframe.contentWindow.postMessage(
              JSON.stringify({ method: 'addEventListener', value: 'ended' }),
              'https://player.vimeo.com'
            );
            iframe.contentWindow.postMessage(
              JSON.stringify({ method: 'addEventListener', value: 'ready' }),
              'https://player.vimeo.com'
            );
            iframe.contentWindow.postMessage(
              JSON.stringify({ method: 'addEventListener', value: 'play' }),
              'https://player.vimeo.com'
            );
            iframe.contentWindow.postMessage(
              JSON.stringify({ method: 'addEventListener', value: 'pause' }),
              'https://player.vimeo.com'
            );
          }
        };
      }

      return () => {
        window.removeEventListener('message', handleVimeoMessage);
      };
    }

    // Cleanup YouTube player
    return () => {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [platform, videoId]);

  const initYouTubePlayer = () => {
    if (!document.getElementById(`youtube-player-${videoId}`)) return;

    try {
      ytPlayerRef.current = new (window as any).YT.Player(`youtube-player-${videoId}`, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          mute: 0, // Explicitly unmute
          enablejsapi: 1,
        },
        events: {
          onReady: (event: any) => {
            setIsLoaded(true);
            // Force play on ready
            event.target.playVideo();
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.ENDED = 0, PLAYING = 1, PAUSED = 2
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
      console.error('Failed to initialize YouTube player:', e);
    }
  };

  const handleVideoEnd = () => {
    if (onVideoEnd) {
      onVideoEnd();
    }
    
    // Start fade-out animation
    setIsEnding(true);
    
    // Navigate after fade completes
    setTimeout(() => {
      window.location.href = nextUrl;
    }, 700); // Match CSS transition duration
  };

  return (
    <div 
      ref={playerRef}
      className={`relative aspect-video bg-black transition-opacity duration-700 ${isEnding ? 'opacity-0' : 'opacity-100'}`}
    >
      {platform === 'youtube' ? (
        <div 
          id={`youtube-player-${videoId}`}
          className="w-full h-full"
          style={coverImage && !isLoaded ? { 
            backgroundImage: `url('${coverImage}')`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center' 
          } : {}}
        />
      ) : (
        <div 
          className="relative w-full h-full overflow-hidden bg-black"
          style={coverImage && !isLoaded ? { 
            backgroundImage: `url('${coverImage}')`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center' 
          } : {}}
        >
          <iframe
            ref={iframeRef}
            src={`https://player.vimeo.com/video/${videoId}?autoplay=1&autopause=0&muted=0&title=0&byline=0&portrait=0`}
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
