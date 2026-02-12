import { getYouTubeEmbedUrl } from "@/lib/utils/youtube"

interface YouTubeEmbedProps {
  videoId: string
}

export function YouTubeEmbed({ videoId }: YouTubeEmbedProps) {
  return (
    <div className="aspect-video w-full rounded-md overflow-hidden bg-muted">
      <iframe
        src={getYouTubeEmbedUrl(videoId)}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="size-full"
      />
    </div>
  )
}
