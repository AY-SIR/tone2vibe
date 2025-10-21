import { cn } from "@/lib/utils"
import { Marquee } from "@/components/ui/marquee"
const reviews = [
  { body: "Supports 52 languages for TTS and voice generation." },
  { body: "Instant AI voice generation for any content or website." },
  { body: "Seamless integration with websites, apps, and social media." },
  { body: "Your website speaks for itself with live AI-powered voices." }, // stronger 4th
  { body: "Engage visitors with dynamic, natural-sounding AI voices." },
  { body: "Boost audience interaction with instant, high-quality voice output." }
]

const firstRow = reviews.slice(0, reviews.length / 2)
const secondRow = reviews.slice(reviews.length / 2)


 const ReviewCard = ({ body }: { body: string }) => {
  return (
    <figure
      className={cn(
        "relative h-full w-64 cursor-pointer overflow-hidden rounded-xl border p-4",
        "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
        "dark:border-gray-950/[.1] dark:bg-gray-950/[.01] dark:hover:bg-gray-950/[.05]"
      )}
    >
      <blockquote className="text-sm">{body}</blockquote>
    </figure>
  )
}

export function Marque2() {
  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
      <Marquee pauseOnHover className="[--duration:20s]">
        {reviews.map((review, index) => (
          <ReviewCard key={index} body={review.body} />
        ))}
      </Marquee>

      <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r"></div>
      <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l"></div>
    </div>
  )
}
