import type { Metadata } from "next"
import Link from "next/link"

import { LegalLayout } from "@/components/legal/legal-layout"

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — VivreIci",
  description: "Conditions générales d'utilisation du service VivreIci.",
}

export default function CguPage() {
  return (
    <LegalLayout title="Conditions générales d'utilisation">
      <p className="text-muted-foreground text-sm">
        Dernière mise à jour : [date]. Les présentes CGU régissent l&apos;accès et l&apos;utilisation du service VivreIci
        (site vitrine et application web).
      </p>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">1. Objet</h2>
        <p className="text-muted-foreground">
          VivreIci est un service numérique permettant notamment de signaler des problèmes de voirie ou d&apos;espace
          public, de consulter des alertes (météo, pollen, animaux, etc.), d&apos;échanger en entraide entre habitants,
          et plus largement d&apos;agir autour de la vie locale. Les fonctionnalités peuvent évoluer.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">2. Acceptation</h2>
        <p className="text-muted-foreground">
          En créant un compte ou en utilisant le service, vous acceptez sans réserve les présentes CGU et la{" "}
          <Link href="/politique-de-confidentialite" className="text-foreground font-semibold underline">
            politique de confidentialité
          </Link>
          . Si vous n&apos;acceptez pas ces documents, vous ne devez pas utiliser le service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">3. Compte utilisateur</h2>
        <p className="text-muted-foreground">
          Vous vous engagez à fournir des informations exactes et à maintenir la confidentialité de vos identifiants. Toute
          activité réalisée depuis votre compte est réputée effectuée par vous. Vous devez notifier sans délai toute
          utilisation non autorisée.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">4. Règles de comportement et contenus</h2>
        <p className="text-muted-foreground">Vous vous interdisez notamment de :</p>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          <li>publier des contenus illicites, diffamatoires, haineux, discriminatoires ou portant atteinte à la vie privée ;</li>
          <li>usurper l&apos;identité d&apos;autrui ou tenter d&apos;accéder à des comptes tiers ;</li>
          <li>perturber le service, introduire des malwares ou procéder à du scraping abusif ;</li>
          <li>utiliser le service à des fins commerciales non autorisées par l&apos;éditeur.</li>
        </ul>
        <p className="text-muted-foreground">
          L&apos;éditeur peut retirer tout contenu contraire aux présentes règles et suspendre ou clôturer un compte en
          cas de manquement grave ou répété.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">5. Signalements et informations locales</h2>
        <p className="text-muted-foreground">
          Les signalements sont des informations fournies par les utilisateurs. L&apos;éditeur ne garantit ni l&apos;exactitude
          exhaustive des contenus ni la prise en charge par une collectivité ou un tiers. Le traitement opérationnel peut
          dépendre de partenariats locaux et de procédures propres à chaque territoire.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">6. Propriété intellectuelle</h2>
        <p className="text-muted-foreground">
          Les éléments du service (marques, interface, textes, visuels, base logicielle) sont protégés. Sauf mention
          contraire, vous ne pouvez pas les reproduire ou exploiter sans autorisation écrite. Vous conservez les droits
          sur les contenus que vous publiez ; vous accordez à l&apos;éditeur une licence non exclusive, mondiale et
          gratuite pour héberger, afficher et diffuser ces contenus dans le cadre du service [à affiner selon votre
          modèle juridique].
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">7. Disponibilité et évolution</h2>
        <p className="text-muted-foreground">
          Le service est fourni en l&apos;état. L&apos;éditeur peut en modifier les fonctionnalités, procéder à des
          maintenances ou interrompre l&apos;accès temporairement. Sauf disposition légale impérative, aucune garantie de
          disponibilité permanente n&apos;est donnée.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">8. Limitation de responsabilité</h2>
        <p className="text-muted-foreground">
          Dans les limites autorisées par la loi, l&apos;éditeur ne pourra être tenu responsable des dommages indirects
          ou des pertes de données résultant d&apos;une utilisation du service ou de l&apos;impossibilité d&apos;y
          accéder. La responsabilité de l&apos;éditeur, si elle est engagée, pourra être limitée aux dommages directs
          prévisibles [à adapter].
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">9. Résiliation</h2>
        <p className="text-muted-foreground">
          Vous pouvez cesser d&apos;utiliser le service à tout moment et demander la suppression de votre compte selon
          les modalités prévues. L&apos;éditeur peut résilier l&apos;accès en cas de violation des CGU.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">10. Droit applicable et litiges</h2>
        <p className="text-muted-foreground">
          Les présentes CGU sont régies par le droit français. Les tribunaux français seront compétents sous réserve
          d&apos;une attribution légale impérative contraire.
        </p>
      </section>

      <section className="border-border bg-card space-y-3 rounded-2xl border p-6">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">Contact</h2>
        <p className="text-muted-foreground">
          Pour toute question relative aux CGU : [email / adresse]. Voir aussi les{" "}
          <Link href="/mentions-legales" className="text-foreground font-semibold underline">
            mentions légales
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  )
}
