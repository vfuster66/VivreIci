import Link from "next/link"
import AppTopbar from "@/components/AppTopbar"

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-white pb-20">
      <AppTopbar title="Confidentialité" backHref="/profil" />

      <div className="mx-auto max-w-md space-y-6 px-4 pt-4 text-sm leading-7 text-[#1A1A1A]">
        <section className="space-y-2 border-b border-gray-100 pb-4">
          <h2 className="text-base font-semibold">Données collectées</h2>
          <p>
            VivreIci collecte les données strictement utiles au fonctionnement
            du service : compte utilisateur, profil, signalements créés,
            géolocalisation associée à un signalement et médias envoyés.
          </p>
        </section>

        <section className="space-y-2 border-b border-gray-100 pb-4">
          <h2 className="text-base font-semibold">Finalités</h2>
          <p>
            Ces données servent à identifier le créateur d&apos;un signalement,
            afficher son suivi, sécuriser les modifications et améliorer la
            qualité des remontées locales.
          </p>
          <p>
            Si vous l&apos;acceptez explicitement, vos préférences permettent aussi
            de savoir si un suivi peut être fait directement par la mairie ou
            par VivreIci à propos d&apos;un signalement.
          </p>
        </section>

        <section className="space-y-2 border-b border-gray-100 pb-4">
          <h2 className="text-base font-semibold">Vos droits</h2>
          <p>
            Vous pouvez accéder à vos données, corriger votre profil et demander
            la suppression de votre compte depuis la page Profil. Les demandes
            sont conservées pour traitement administratif.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Contact</h2>
          <p>
            Pour toute demande relative à vos données personnelles, utilisez la
            page Profil ou contactez l&apos;administrateur du service.
          </p>
          <Link href="/profil" className="font-semibold text-[#D6A100]">
            Revenir au profil
          </Link>
        </section>
      </div>
    </div>
  )
}
