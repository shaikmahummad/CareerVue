interface CourseVideoPlayerProps {
  url: string;
  title: string;
  className?: string;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1] ?? null;
}

export default function CourseVideoPlayer({
  url,
  title,
  className = "",
}: CourseVideoPlayerProps) {
  const youtubeId = getYouTubeId(url);
  const vimeoId = getVimeoId(url);
  const playerClass = `block w-full aspect-video bg-black ${className}`;

  if (youtubeId) {
    return (
      <iframe
        className={playerClass}
        src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (vimeoId) {
    return (
      <iframe
        className={playerClass}
        src={`https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0`}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <video
      src={url}
      title={title}
      controls
      preload="metadata"
      className={`${playerClass} object-contain`}
    />
  );
}
