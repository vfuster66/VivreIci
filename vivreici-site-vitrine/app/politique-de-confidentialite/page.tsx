import type { Metadata } from "next"
import Link from "next/link"

import { LegalLayout } from "@/components/legal/legal-layout"

export const metadata: Metadata = {
  title: "Politique de confidentialité — VivreIci",
  description:
    "Politique de confidentialité et traitement des données personnelles pour le site et l'application VivreIci.",
}

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <p className="text-muted-foreground text-sm">
        Dernière mise à jour : [date]. Cette politique s&apos;applique au site vitrine et à l&apos;application web
        VivreIci utilisée sur navigateur (PWA).
      </p>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">1. Responsable du traitement</h2>
        <p className="text-muted-foreground">
          Le responsable du traitement des données est : <strong className="text-foreground">[Raison sociale]</strong>,
          [adresse], [email de contact dédié RGPD].
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">2. Données collectées</h2>
        <p className="text-muted-foreground">
          VivreIci collecte les données strictement utiles au fonctionnement du service, notamment :
        </p>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          <li>Données de compte et de profil (identité, coordonnées, préférences) ;</li>
          <li>Contenus que vous créez : signalements, messages d&apos;entraide, alertes animaux, médias associés ;</li>
          <li>
            Données de localisation lorsque vous les associez volontairement à un signalement ou à une fonctionnalité qui
            l&apos;exige ;
          </li>
          <li>Données techniques minimales (logs, identifiants de session, diagnostics) nécessaires à la sécurité.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">3. Finalités et bases légales</h2>
        <p className="text-muted-foreground">Les traitements poursuivent notamment les finalités suivantes :</p>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Exécution du service</strong> (création de compte, publication et suivi
            des signalements, notifications techniques) — base légale : contrat / mesures précontractuelles ;
          </li>
          <li>
            <strong className="text-foreground">Obligations légales</strong> le cas échéant (conservation, réponse aux
            autorités) ;
          </li>
          <li>
            <strong className="text-foreground">Intérêt légitime</strong> pour la sécurité, la lutte contre les abus et
            l&apos;amélioration du service, dans le respect de vos droits ;
          </li>
          <li>
            <strong className="text-foreground">Consentement</strong> lorsque la loi l&apos;exige (ex. communications
            commerciales, certains cookies non strictement nécessaires — voir la{" "}
            <Link href="/politique-cookies" className="text-foreground font-semibold underline">
              politique cookies
            </Link>
            ).
          </li>
        </ul>
        <p className="text-muted-foreground">
          Si vous acceptez explicitement dans l&apos;application, des préférences peuvent permettre un suivi de vos
          signalements par la mairie ou par VivreIci : ce choix repose sur votre consentement, que vous pouvez retirer à
          tout moment depuis votre profil.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">4. Destinataires</h2>
        <p className="text-muted-foreground">
          Les données peuvent être accessibles aux équipes habilitées de l&apos;éditeur, ainsi qu&apos;à des prestataires
          techniques (hébergement, messagerie, base de données) soumis à des obligations contractuelles de
          confidentialité et de sécurité. Les collectivités ou partenaires ne reçoivent des informations que dans le
          cadre prévu par le service et la réglementation.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">5. Durée de conservation</h2>
        <p className="text-muted-foreground">
          Les données sont conservées pendant la durée nécessaire aux finalités décrites, puis archivées ou supprimées
          selon des règles documentées [à préciser : durées par type de donnée]. Les comptes inactifs peuvent faire
          l&apos;objet d&apos;une suppression ou d&apos;une anonymisation après [délai].
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">6. Transferts hors Union européenne</h2>
        <p className="text-muted-foreground">
          Lorsque des prestataires sont situés hors UE, des garanties appropriées (clauses contractuelles types de la
          Commission européenne ou mécanismes équivalents) sont mises en place [à compléter selon votre pile technique].
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">7. Vos droits</h2>
        <p className="text-muted-foreground">
          Vous pouvez accéder à vos données, les rectifier et, dans les cas prévus par la loi, demander leur effacement,
          la limitation du traitement ou vous opposer à certains traitements. Vous disposez également d&apos;un droit à la
          portabilité lorsque le traitement est fondé sur le consentement ou le contrat et automatisé.
        </p>
        <p className="text-muted-foreground">
          Pour exercer vos droits : [procédure : email, formulaire]. Vous pouvez aussi introduire une réclamation auprès
          de la CNIL (
          <a href="https://www.cnil.fr" className="text-foreground font-semibold underline" target="_blank" rel="noreferrer">
            cnil.fr
          </a>
          ).
        </p>
        <p className="text-muted-foreground">
          Depuis l&apos;application, certaines actions (profil, suppression de compte [si disponible]) complètent ces
          droits.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">8. Sécurité</h2>
        <p className="text-muted-foreground">
          Des mesures techniques et organisationnelles appropriées sont mises en œuvre pour protéger les données contre
          la destruction accidentelle ou illicite, la perte, l&apos;altération, la divulgation ou l&apos;accès non
          autorisé.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">9. Évolution</h2>
        <p className="text-muted-foreground">
          Cette politique peut être mise à jour. La date de mise à jour figure en tête de page. En cas de changement
          substantiel, vous serez informé par un moyen adapté (notification dans l&apos;application, email si nécessaire).
        </p>
      </section>

      <section className="border-border bg-card space-y-3 rounded-2xl border p-6">
        <h2 className="font-heading text-xl font-bold sm:text-2xl">Documents associés</h2>
        <ul className="text-muted-foreground list-none space-y-2 pl-0">
          <li>
            <Link href="/conditions-generales-d-utilisation" className="text-foreground font-semibold underline">
              Conditions générales d&apos;utilisation
            </Link>
          </li>
          <li>
            <Link href="/politique-cookies" className="text-foreground font-semibold underline">
              Politique relative aux cookies
            </Link>
          </li>
          <li>
            <Link href="/mentions-legales" className="text-foreground font-semibold underline">
              Mentions légales
            </Link>
          </li>
        </ul>
      </section>
    </LegalLayout>
  )
}
