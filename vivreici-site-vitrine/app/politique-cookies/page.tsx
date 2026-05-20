import type { Metadata } from "next"
import Link from "next/link"

import { LegalLayout } from "@/components/legal/legal-layout"

export const metadata: Metadata = {
  title: "Politique relative aux cookies — VivreIci",
  description: "Informations sur les cookies et traceurs utilisés par VivreIci.",
}

export default function PolitiqueCookiesPage() {
  return (
    <LegalLayout title="Politique relative aux cookies">
      <p className="text-muted-foreground text-sm">
        Dernière mise à jour : [date]. Cette politique complète la{" "}
        <Link href="/politique-de-confidentialite" className="text-foreground font-semibold underline">
          politique de confidentialité
        </Link>
        .
      </p>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
        <p className="text-muted-foreground">
          Un cookie est un petit fichier déposé sur votre terminal lors de la visite d&apos;un site ou de
          l&apos;utilisation d&apos;une application web. Les traceurs équivalents (stockage local, pixels) peuvent avoir
          des finalités comparables.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">2. Cookies strictement nécessaires</h2>
        <p className="text-muted-foreground">
          Ils sont indispensables au fonctionnement du service : session, sécurité, équilibrage de charge, préférences
          essentielles. Ils ne peuvent pas être désactivés depuis notre interface sans empêcher l&apos;usage normal du
          service. Ils ne requièrent pas de consentement au sens de la directive ePrivacy lorsqu&apos;ils sont strictement
          nécessaires à la fourniture du service sollicité.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">3. Cookies de mesure d&apos;audience</h2>
        <p className="text-muted-foreground">
          Si elles sont activées, des solutions de mesure d&apos;audience [à nommer : ex. Matomo, Plausible, autre]
          permettent de comprendre comment le service est utilisé. Ces traceurs ne sont déposés qu&apos;avec votre
          consentement lorsque la loi l&apos;exige. Vous pouvez retirer votre consentement à tout moment [décrire le
          mécanisme : bannière, page paramètres].
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">4. Durée de conservation</h2>
        <p className="text-muted-foreground">
          Les durées varient selon le type de cookie [à compléter : tableau nom, finalité, durée]. Les cookies de session
          expirent à la fermeture du navigateur sauf mention contraire.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">5. Gestion depuis le navigateur</h2>
        <p className="text-muted-foreground">
          Vous pouvez configurer votre navigateur pour refuser ou supprimer des cookies. Cela peut dégrader certaines
          fonctionnalités. Les instructions varient selon Chrome, Firefox, Safari, Edge, etc.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">6. Cookies tiers</h2>
        <p className="text-muted-foreground">
          Lorsque le service intègre des contenus ou services tiers (cartes, vidéos, authentification), ces tiers peuvent
          déposer leurs propres cookies. Nous vous invitons à consulter leurs politiques [à lister si applicable].
        </p>
      </section>

      <section className="border-border bg-card space-y-3 rounded-2xl border p-6">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">Contact</h2>
        <p className="text-muted-foreground">
          Pour toute question sur les cookies : [email]. Voir aussi les{" "}
          <Link href="/mentions-legales" className="text-foreground font-semibold underline">
            mentions légales
          </Link>{" "}
          et la{" "}
          <Link href="/politique-de-confidentialite" className="text-foreground font-semibold underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  )
}
