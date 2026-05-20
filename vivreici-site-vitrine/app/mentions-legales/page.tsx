import type { Metadata } from "next"
import Link from "next/link"

import { LegalLayout } from "@/components/legal/legal-layout"

export const metadata: Metadata = {
  title: "Mentions légales — VivreIci",
  description: "Mentions légales du site et de l'application VivreIci.",
}

export default function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales">
      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">1. Éditeur du site</h2>
        <p className="text-muted-foreground">
          Le site et l&apos;application <strong className="text-foreground">VivreIci</strong> sont édités par :
        </p>
        <ul className="text-muted-foreground list-none space-y-1 pl-0">
          <li>
            <strong className="text-foreground">Raison sociale :</strong> [Nom de la société / association]
          </li>
          <li>
            <strong className="text-foreground">Forme juridique :</strong> [SAS / Association loi 1901 / etc.]
          </li>
          <li>
            <strong className="text-foreground">Siège social :</strong> [Adresse complète]
          </li>
          <li>
            <strong className="text-foreground">SIRET :</strong> [Numéro SIRET]
          </li>
          <li>
            <strong className="text-foreground">Directeur de la publication :</strong> [Prénom Nom]
          </li>
          <li>
            <strong className="text-foreground">Contact :</strong> [adresse email]
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">2. Hébergement</h2>
        <p className="text-muted-foreground">Ce site est hébergé par :</p>
        <ul className="text-muted-foreground list-none space-y-1 pl-0">
          <li>
            <strong className="text-foreground">Hébergeur :</strong> [Nom de l&apos;hébergeur]
          </li>
          <li>
            <strong className="text-foreground">Adresse :</strong> [Adresse de l&apos;hébergeur]
          </li>
          <li>
            <strong className="text-foreground">Téléphone :</strong> [Numéro de téléphone]
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">3. Propriété intellectuelle</h2>
        <p className="text-muted-foreground">
          L&apos;ensemble des contenus présents sur les supports VivreIci (textes, images, logos, icônes, vidéos,
          structure) est protégé par le droit de la propriété intellectuelle. Toute reproduction, représentation,
          modification, publication ou adaptation, totale ou partielle, est interdite sans l&apos;accord préalable écrit
          de l&apos;éditeur.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">4. Protection des données personnelles</h2>
        <p className="text-muted-foreground">
          Le traitement des données à caractère personnel est décrit en détail dans la{" "}
          <Link href="/politique-de-confidentialite" className="text-foreground font-semibold underline">
            politique de confidentialité
          </Link>
          . Les cookies et traceurs sont présentés dans la{" "}
          <Link href="/politique-cookies" className="text-foreground font-semibold underline">
            politique relative aux cookies
          </Link>
          .
        </p>
        <p className="text-muted-foreground">
          Conformément au RGPD et à la loi Informatique et Libertés, vous disposez de droits d&apos;accès, de
          rectification, d&apos;effacement, de limitation, d&apos;opposition et de portabilité. Pour les exercer,
          reportez-vous à la politique de confidentialité.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">5. Limitation de responsabilité</h2>
        <p className="text-muted-foreground">
          L&apos;éditeur s&apos;efforce de fournir des informations aussi précises que possible. Toutefois, il ne pourra
          être tenu responsable des omissions, inexactitudes ou carences dans la mise à jour, qu&apos;elles soient de son
          fait ou du fait de tiers partenaires qui lui fournissent ces informations.
        </p>
        <p className="text-muted-foreground">
          Les signalements et contenus publiés par les utilisateurs relèvent de leur responsabilité. L&apos;éditeur ne
          garantit pas le traitement des signalements par les collectivités ou services concernés.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">6. Droit applicable</h2>
        <p className="text-muted-foreground">
          Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux français
          seront seuls compétents.
        </p>
      </section>

      <section className="border-border bg-card space-y-3 rounded-2xl border p-6">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">7. Crédits</h2>
        <p className="text-muted-foreground">
          <strong className="text-foreground">Conception et développement :</strong> [Nom / Studio]
        </p>
        <p className="text-muted-foreground">
          <strong className="text-foreground">Icônes :</strong> Lucide Icons (licence MIT)
        </p>
        <p className="text-muted-foreground">
          <strong className="text-foreground">Typographies :</strong> Plus Jakarta Sans, Inter (Google Fonts, licence SIL
          Open Font)
        </p>
      </section>
    </LegalLayout>
  )
}
