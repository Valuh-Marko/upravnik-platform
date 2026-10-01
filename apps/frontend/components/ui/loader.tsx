import { cn } from "@/lib/utils"

/**
 * Four bars in the content-type hues weaving into a #. Decorative only:
 * pair it with visible text or wrap it in an element with role="status".
 * `tone="current"` draws the bars in currentColor, for filled surfaces.
 */
function Loader({
  size = 40,
  tone = "brand",
  className,
}: {
  size?: number
  tone?: "brand" | "current"
  className?: string
}) {
  return (
    <span
      aria-hidden
      data-slot="loader"
      data-tone={tone}
      className={cn("loader", className)}
      style={{ fontSize: size / 2.5 }}
    />
  )
}

export { Loader }
