"use client"

export default function AdminPageSkeleton({
  title = "Chargement",
  description = "Préparation des données du backoffice…",
  metrics = 4,
  sections = 2,
}: {
  title?: string
  description?: string
  metrics?: number
  sections?: number
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(250,196,17,0.15),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(3,55,170,0.08),_transparent_22%),linear-gradient(180deg,#f8fbff_0%,#edf4ff_100%)]">
      <div className="mx-auto max-w-[1600px] px-6 py-6 lg:px-10 lg:py-8">
        <div className="rounded-[32px] border border-[#0337AA]/8 bg-white/78 px-6 py-6 shadow-[0_18px_48px_rgba(3,55,170,0.08)] backdrop-blur-xl">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[#E7EEF9]" />
          <div className="mt-4 h-9 w-72 animate-pulse rounded-2xl bg-[#E7EEF9]" />
          <div className="mt-4 h-4 w-full max-w-3xl animate-pulse rounded-full bg-[#EEF4FF]" />
          <div className="mt-2 h-4 w-full max-w-2xl animate-pulse rounded-full bg-[#EEF4FF]" />
        </div>

        <div className="mt-6 rounded-[28px] border border-[#0337AA]/8 bg-[#FFF8DF] px-5 py-4 text-sm text-[#7B5B00] shadow-[0_12px_32px_rgba(3,55,170,0.05)]">
          <p className="font-semibold text-[#18212B]">{title}</p>
          <p className="mt-1">{description}</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: metrics }).map((_, index) => (
            <div
              key={index}
              className="rounded-[28px] border border-[#0337AA]/8 bg-white px-5 py-5 shadow-[0_12px_32px_rgba(3,55,170,0.08)]"
            >
              <div className="h-4 w-24 animate-pulse rounded-full bg-[#E7EEF9]" />
              <div className="mt-5 h-9 w-20 animate-pulse rounded-2xl bg-[#EEF4FF]" />
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6">
          {Array.from({ length: sections }).map((_, index) => (
            <section
              key={index}
              className="rounded-[32px] border border-[#0337AA]/8 bg-white p-6 shadow-[0_18px_48px_rgba(3,55,170,0.08)]"
            >
              <div className="h-5 w-40 animate-pulse rounded-full bg-[#E7EEF9]" />
              <div className="mt-5 space-y-3">
                {Array.from({ length: 4 }).map((__, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="rounded-[24px] bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8ff_100%)] px-4 py-4"
                  >
                    <div className="h-4 w-48 animate-pulse rounded-full bg-[#E7EEF9]" />
                    <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-[#EEF4FF]" />
                    <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-[#EEF4FF]" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
