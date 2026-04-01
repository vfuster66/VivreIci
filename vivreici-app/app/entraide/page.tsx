import AppTopbar from "@/components/AppTopbar"

export default function EntraidePage() {
  const items = [
    {
      title: "Demander un coup de main",
      meta: "Courses, déplacement, petit besoin ponctuel",
    },
    {
      title: "Proposer son aide",
      meta: "Voisinage, matériel, présence, disponibilité",
    },
  ]

  return (
    <div className="min-h-screen bg-white pb-20">
      <AppTopbar
        title="Entraide"
        filterPanel={
          <select className="w-full rounded-2xl bg-[#F8F8F8] px-3 py-3 text-sm font-medium text-[#1A1A1A] outline-none">
            <option>Toutes les demandes</option>
            <option>Besoin d&apos;aide</option>
            <option>Je peux aider</option>
          </select>
        }
        searchPanel={
          <input
            placeholder="Rechercher une aide..."
            className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none placeholder:text-gray-400"
          />
        }
      />
      <div className="mx-auto max-w-md px-4 pt-4">
        <div className="border-b border-gray-100 pb-4">
          <p className="text-sm leading-6 text-[#666666]">
            Un espace local pour demander de l&apos;aide ou en proposer.
          </p>
        </div>

        <div>
          {items.map((item) => (
            <section key={item.title} className="border-b border-gray-100 py-4">
              <p className="text-base font-semibold text-[#1A1A1A]">
                {item.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#666666]">
                {item.meta}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
