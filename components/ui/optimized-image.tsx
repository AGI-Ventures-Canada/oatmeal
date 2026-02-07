import NextImage, { ImageProps } from "next/image"

function isLocalDevUrl(src: string | undefined): boolean {
  if (process.env.NODE_ENV !== "development") return false
  if (!src || typeof src !== "string") return false
  return src.includes("127.0.0.1") || src.includes("localhost")
}

export function OptimizedImage({ src, unoptimized, ...props }: ImageProps) {
  const shouldSkipOptimization = unoptimized ?? isLocalDevUrl(src as string)

  return <NextImage src={src} unoptimized={shouldSkipOptimization} {...props} />
}
