import AppTopbar from "@/components/AppTopbar"

export default function AlertesPage() {
  const alerts = [
    {
      title: "Alerte météo",
      category: "Météo",
      status: "À surveiller",
      description: "Les alertes et incidents locaux apparaîtront ici.",
    },
    {
      title: "Travaux voirie",
      category: "Circulation",
      status: "Aucune active",
      description: "Cette zone affichera les perturbations et coupures utiles.",
    },
  ]

  return (
    <div className="min-h-screen bg-white pb-20">
      <AppTopbar
        title="Alertes"
        filterPanel={
          <select className="w-full rounded-2xl bg-[#F8F8F8] px-3 py-3 text-sm font-medium text-[#1A1A1A] outline-none">
            <option>Toutes les alertes</option>
            <option>Météo</option>
            <option>Circulation</option>
            <option>Sécurité</option>
          </select>
        }
        searchPanel={
          <input
            placeholder="Rechercher une alerte..."
            className="w-full rounded-2xl bg-[#F8F8F8] px-4 py-3 text-sm outline-none placeholder:text-gray-400"
          />
        }
      />
      <div className="mx-auto max-w-md px-4 pt-4">
        <div className="border-b border-gray-100 pb-4">
          <p className="text-sm leading-6 text-[#666666]">
            Coupures, météo, circulation et incidents de proximité.
          </p>
        </div>

        <div>
          {alerts.map((alert) => (
            <section key={alert.title} className="border-b border-gray-100 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[#1A1A1A]">
                    {alert.title}
                  </p>
                  <p className="mt-1 text-sm text-[#666666]">
                    {alert.description}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-[#E30613]">
                  {alert.category}
                </span>
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-gray-400">
                {alert.status}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
