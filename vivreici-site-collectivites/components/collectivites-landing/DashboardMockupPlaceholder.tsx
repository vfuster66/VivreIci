import Image from "next/image"
import { LayoutGrid, MapPin } from "lucide-react"

/** Placer le fichier dans `public/collectivites/map.png`. */
const MAP_IMAGE_SRC = "/collectivites/map.png"

type PinColor = "blue" | "red" | "green"

type Pin = { left: string; top: string; color: PinColor }

const pinIconClass: Record<PinColor, string> = {
  blue: "text-primary",
  red: "text-destructive",
  green: "text-[oklch(from_hsl(152_58%_32%)_l_c_h)]",
}

const listStatusClass: Record<PinColor, string> = {
  blue: "bg-primary/85",
  red: "bg-destructive/85",
  green: "bg-[oklch(from_hsl(152_58%_36%)_l_c_h/0.92)]",
}

const pins: Pin[] = [
  { left: "22%", top: "44%", color: "blue" },
  { left: "50%", top: "30%", color: "red" },
  { left: "64%", top: "58%", color: "green" },
  { left: "82%", top: "40%", color: "blue" },
  { left: "36%", top: "70%", color: "red" },
]

const listRowColors: PinColor[] = ["blue", "red", "green", "blue"]

/** Aperçu type tableau de bord : carte (map.png) + marqueurs. */
export function DashboardMockupPlaceholder() {
  return (
    <div
      className="border-border relative aspect-[16/10] w-full overflow-hidden rounded-xl border bg-gradient-to-br from-muted/80 via-background to-primary/[0.06] shadow-xl"
      role="img"
      aria-label="Aperçu du tableau de bord VivreIci — carte des signalements en ville et liste"
    >
      <div className="relative flex h-full flex-col p-4 sm:p-6 md:p-8">
        <div className="border-border mb-3 flex items-center gap-2 border-b pb-3">
          <LayoutGrid className="text-primary h-5 w-5 shrink-0" aria-hidden />
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Vue d&apos;ensemble</span>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-3 min-[480px]:grid-cols-4">
          <div className="border-border bg-card col-span-2 flex min-h-[11rem] flex-col overflow-hidden rounded-lg border p-3 shadow-sm ring-1 ring-primary/8 min-[480px]:col-span-3">
            <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase sm:text-xs">
              <MapPin className="text-primary h-3.5 w-3.5 shrink-0" aria-hidden />
              Carte des signalements
            </div>
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md border border-border/60 bg-muted shadow-[inset_0_1px_0_oklch(1_0_0/0.35)]">
              <Image
                src={MAP_IMAGE_SRC}
                alt="Carte urbaine — localisation des signalements"
                fill
                className="object-cover object-center"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 72vw, 820px"
                priority={false}
              />
              {pins.map((pin, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute z-10 drop-shadow-[0_2px_6px_oklch(0.25_0.05_250/0.35)]"
                  style={{
                    left: pin.left,
                    top: pin.top,
                    transform: "translate(-50%, -100%)",
                  }}
                  aria-hidden
                >
                  <MapPin
                    className={`${pinIconClass[pin.color]} h-8 w-8 sm:h-9 sm:w-9`}
                    strokeWidth={2.25}
                    fill="currentColor"
                    fillOpacity={0.18}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-1 flex min-h-0 flex-col gap-2">
            <span className="text-muted-foreground px-0.5 text-[10px] font-semibold uppercase sm:text-xs">Liste</span>
            {[0, 1, 2, 3].map((i) => {
              const c = listRowColors[i] ?? "blue"
              return (
                <div
                  key={i}
                  className="border-border bg-card/95 flex min-h-[3rem] flex-1 flex-col justify-center gap-1.5 rounded-lg border px-2.5 py-2 shadow-sm"
                  style={{ opacity: 1 - i * 0.07 }}
                >
                  <div className="bg-muted-foreground/25 h-2 w-[72%] max-w-full rounded-full" />
                  <div className="bg-muted-foreground/18 h-1.5 w-[45%] rounded-full" />
                  <div className={`mt-0.5 h-1.5 w-8 rounded-full ${listStatusClass[c]}`} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
