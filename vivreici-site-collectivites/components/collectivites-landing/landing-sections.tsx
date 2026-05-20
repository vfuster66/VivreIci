import Link from "next/link"
import {
  Activity,
  BarChart3,
  Building2,
  Check,
  ClipboardCheck,
  Clock,
  Database,
  Eye,
  EyeOff,
  Filter,
  Layers,
  List,
  Map,
  MapPin,
  MessageSquare,
  Plug,
  Server,
  Shield,
  TrendingUp,
  Zap,
  CheckCircle,
} from "lucide-react"

import {
  COLLECTIVITES_LINKS,
  mailtoContactCollectivites,
  mailtoDemoCollectivites,
} from "@/lib/collectivites-links"

import { DashboardMockupPlaceholder } from "./DashboardMockupPlaceholder"
import { VivreIciMark } from "./VivreIciMark"

const btnHero =
  "bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-11 items-center justify-center rounded-md px-8 text-sm font-semibold shadow-lg transition-colors"
/** Voir `.btn-outline-on-hero` dans globals.css (contraste sur dégradé clair) */
const btnHeroOutline = "btn-outline-on-hero"
const btnDefault =
  "bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium transition-colors"
const btnOutline =
  "border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-10 w-full items-center justify-center rounded-md border border-solid px-4 text-sm font-medium transition-colors"

export function CollectivitesHero() {
  return (
    <section className="gradient-hero relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="container-landing px-4 md:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/collectivites/2.svg" alt="VivreIci" className="mx-auto mb-6 h-20 w-auto md:h-24" />
          <h1 className="text-on-hero-title mb-6 text-3xl leading-tight font-extrabold text-balance md:text-5xl lg:text-6xl">
            <strong className="text-primary">Visualisez</strong> et <strong className="text-secondary">suivez</strong> les
            signalements citoyens simplement
          </h1>
          <p className="text-on-hero-body mb-8 text-lg text-balance md:text-xl">
            Une solution <strong className="text-primary">locale</strong> pour mieux comprendre et{" "}
            <strong className="text-secondary">agir</strong> sur votre territoire
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
            <a href={mailtoDemoCollectivites()} className={btnHero}>
              Demander une démo
            </a>
            <a href="#solution" className={btnHeroOutline}>
              Découvrir la solution
            </a>
            <Link href={COLLECTIVITES_LINKS.adminAppUrl} className={btnHeroOutline}>
              Accéder à la plateforme
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-4xl">
          <DashboardMockupPlaceholder />
        </div>
      </div>
    </section>
  )
}

const problems = [
  {
    icon: EyeOff,
    title: "Manque de visibilité",
    desc: "Difficile de savoir ce qui se passe réellement sur le territoire au quotidien.",
  },
  {
    icon: Layers,
    title: "Informations dispersées",
    desc: "Appels, courriers, e-mails… les signalements arrivent de partout, sans centralisation.",
  },
  {
    icon: Clock,
    title: "Suivi difficile",
    desc: "Impossible de savoir où en est un signalement et qui s'en occupe.",
  },
  {
    icon: Database,
    title: "Pas d'historique",
    desc: "Aucune donnée exploitable pour analyser les récurrences et prioriser.",
  },
] as const

export function CollectivitesProblem() {
  return (
    <section className="section-padding section-alt">
      <div className="container-landing">
        <h2 className="mb-4 text-center text-2xl font-bold md:text-3xl">
          Les <strong className="text-secondary">défis</strong> que vous rencontrez au quotidien
        </h2>
        <p className="text-muted-foreground mx-auto mb-12 max-w-2xl text-center">
          Les collectivités font face à des problèmes <strong className="text-foreground">concrets</strong> que les outils
          actuels ne résolvent pas.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map((p) => (
            <div key={p.title} className="border-border bg-card rounded-xl border p-6 shadow-sm">
              <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <p.icon className="text-primary" size={24} />
              </div>
              <h3 className="mb-2 font-semibold">{p.title}</h3>
              <p className="text-muted-foreground text-sm">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const solutions = [
  { icon: MapPin, title: "Centralisation des signalements", desc: "Tous les signalements citoyens au même endroit, en temps réel." },
  { icon: Map, title: "Visualisation sur carte", desc: "Localisez chaque signalement sur une carte interactive de votre commune." },
  { icon: TrendingUp, title: "Suivi dans le temps", desc: "Suivez l'évolution, les statuts et l'historique de chaque signalement." },
] as const

export function CollectivitesSolution() {
  return (
    <section id="solution" className="section-padding">
      <div className="container-landing">
        <h2 className="mb-4 text-center text-2xl font-bold md:text-3xl">
          Une solution pensée pour le <strong className="text-secondary">terrain</strong>
        </h2>
        <p className="text-muted-foreground mx-auto mb-12 max-w-2xl text-center">
          <VivreIciMark className="font-semibold" /> centralise, visualise et structure les données de votre territoire.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {solutions.map((s) => (
            <div key={s.title} className="text-center">
              <div className="bg-accent/20 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl">
                <s.icon className="text-primary" size={32} />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
              <p className="text-muted-foreground mx-auto max-w-xs text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const steps = [
  {
    icon: MessageSquare,
    step: "1",
    title: "Les habitants signalent",
    desc: "Via l'application, les citoyens remontent les problèmes en quelques secondes.",
  },
  {
    icon: Server,
    step: "2",
    title: "Les données sont centralisées",
    desc: "Chaque signalement est catégorisé, géolocalisé et horodaté automatiquement.",
  },
  {
    icon: Eye,
    step: "3",
    title: "La collectivité visualise",
    desc: "Vous accédez à une vue carte et liste de tous les signalements de votre territoire.",
  },
  {
    icon: CheckCircle,
    step: "4",
    title: "Vous suivez et priorisez",
    desc: "Gérez les statuts, assignez et suivez la résolution de chaque signalement.",
  },
] as const

export function CollectivitesHowItWorks() {
  return (
    <section id="fonctionnement" className="section-padding section-yellow">
      <div className="container-landing">
        <h2 className="mb-4 text-center text-2xl font-bold md:text-3xl">Comment ça fonctionne ?</h2>
        <p className="text-muted-foreground mx-auto mb-12 max-w-2xl text-center">
          Un processus simple, du signalement citoyen à l&apos;action terrain.
        </p>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.step} className="relative">
              <div className="bg-primary text-primary-foreground mb-4 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                {s.step}
              </div>
              <h3 className="mb-2 font-semibold">{s.title}</h3>
              <p className="text-muted-foreground text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const productFeatures = [
  { icon: Map, label: "Carte interactive" },
  { icon: List, label: "Liste des signalements" },
  { icon: Filter, label: "Filtres avancés" },
  { icon: Activity, label: "Statuts en temps réel" },
  { icon: Clock, label: "Historique complet" },
] as const

export function CollectivitesProduct() {
  return (
    <section className="section-padding">
      <div className="container-landing">
        <h2 className="mb-4 text-center text-2xl font-bold md:text-3xl">Un outil concret, pensé pour l&apos;usage</h2>
        <p className="text-muted-foreground mx-auto mb-12 max-w-2xl text-center">
          Découvrez l&apos;interface qui vous permet de piloter votre territoire.
        </p>

        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {productFeatures.map((f) => (
            <span
              key={f.label}
              className="text-foreground inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium"
            >
              <f.icon size={16} className="text-primary" />
              {f.label}
            </span>
          ))}
        </div>

        <div className="mx-auto max-w-4xl">
          <DashboardMockupPlaceholder />
        </div>
      </div>
    </section>
  )
}

const benefits = [
  {
    icon: Eye,
    title: "Meilleure visibilité terrain",
    desc: "Comprenez ce qui se passe réellement sur votre commune.",
  },
  {
    icon: Zap,
    title: "Gain de temps",
    desc: "Plus besoin de croiser manuellement les informations.",
  },
  {
    icon: BarChart3,
    title: "Priorisation plus simple",
    desc: "Identifiez les zones et sujets qui nécessitent une action rapide.",
  },
  {
    icon: ClipboardCheck,
    title: "Suivi clair des actions",
    desc: "Chaque signalement a un statut, un historique et un responsable.",
  },
] as const

export function CollectivitesBenefits() {
  return (
    <section className="section-padding section-alt">
      <div className="container-landing">
        <h2 className="mb-4 text-center text-2xl font-bold md:text-3xl">
          Ce que <VivreIciMark /> <strong>change</strong> pour vous
        </h2>
        <p className="text-muted-foreground mx-auto mb-12 max-w-2xl text-center">
          Des bénéfices <strong className="text-foreground">concrets</strong>, mesurables dès les premières semaines.
        </p>
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {benefits.map((b) => (
            <div key={b.title} className="flex items-start gap-4">
              <div className="bg-accent/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <b.icon className="text-primary" size={20} />
              </div>
              <div>
                <h3 className="mb-1 font-semibold">{b.title}</h3>
                <p className="text-muted-foreground text-sm">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const plans = [
  {
    name: "Observation",
    price: "Gratuit",
    desc: "Pour découvrir la solution",
    cta: "Découvrir",
    highlighted: false,
    outline: true,
    href: "#cta-final",
  },
  {
    name: "Gestion locale",
    price: "À partir de 149€/mois",
    desc: "Pour piloter votre territoire",
    cta: "Demander une démo",
    highlighted: true,
    outline: false,
    href: "#cta-final",
  },
  {
    name: "Pilotage",
    price: "Sur mesure",
    desc: "Pour les besoins avancés",
    cta: "Nous contacter",
    highlighted: false,
    outline: true,
    href: "#cta-final",
  },
] as const

const planFeatures = {
  Observation: ["Accès limité", "Vue partielle des signalements", "Carte en lecture seule"],
  "Gestion locale": [
    "Accès complet",
    "Carte interactive + filtres",
    "Gestion des statuts",
    "Historique complet",
    "Support dédié",
  ],
  Pilotage: ["Analytics avancés", "Exports de données", "Heatmap", "Multi-utilisateurs", "Accompagnement dédié"],
} as const

export function CollectivitesPricing() {
  return (
    <section id="pricing" className="section-padding">
      <div className="container-landing">
        <h2 className="mb-4 text-center text-2xl font-bold md:text-3xl">Une offre simple et transparente</h2>
        <p className="text-muted-foreground mx-auto mb-12 max-w-2xl text-center">
          Choisissez l&apos;offre adaptée à la taille et aux besoins de votre collectivité.
        </p>
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
          {plans.map((p) => {
            const features = planFeatures[p.name]
            return (
              <div
                key={p.name}
                className={
                  p.highlighted
                    ? "border-primary flex scale-[1.02] flex-col rounded-xl border p-6 shadow-lg ring-2 ring-primary/20"
                    : "border-border bg-card flex flex-col rounded-xl border p-6"
                }
              >
                {p.highlighted ? (
                  <span className="text-primary mb-2 text-xs font-semibold tracking-wide uppercase">Recommandé</span>
                ) : null}
                <h3 className="mb-1 text-xl font-bold">{p.name}</h3>
                <p className="text-muted-foreground mb-4 text-sm">{p.desc}</p>
                <p className="mb-6 text-2xl font-extrabold">{p.price}</p>
                <ul className="mb-8 flex-1 space-y-3">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check size={16} className="text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={p.href} className={p.outline ? btnOutline : btnDefault}>
                  {p.cta}
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const credibility = [
  { icon: Shield, text: "Pensé pour un usage local réel" },
  { icon: Plug, text: "Simple à mettre en place" },
  { icon: Building2, text: "Adapté aux communes de toutes tailles" },
] as const

export function CollectivitesCredibility() {
  return (
    <section className="section-padding section-alt">
      <div className="container-landing">
        <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:gap-16">
          {credibility.map((p) => (
            <div key={p.text} className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                <p.icon className="text-primary" size={20} />
              </div>
              <span className="text-sm font-medium">{p.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function CollectivitesFinalCta() {
  return (
    <section id="cta-final" className="section-padding gradient-hero">
      <div className="container-landing text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/collectivites/2.svg" alt="VivreIci" className="mx-auto mb-6 h-16 w-auto md:h-20" />
        <h2 className="text-on-hero-title mb-4 text-2xl font-bold md:text-3xl">
          Prêt à mieux <strong className="text-primary">piloter</strong> votre territoire ?
        </h2>
        <p className="text-on-hero-body mx-auto mb-8 max-w-lg">
          Demandez une <strong className="text-secondary">démo personnalisée</strong> ou laissez-nous vos coordonnées pour
          être recontacté.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a href={mailtoDemoCollectivites()} className={btnHero}>
            Demander une démo
          </a>
          <a href={mailtoContactCollectivites()} className={btnHeroOutline}>
            Être contacté
          </a>
        </div>
      </div>
    </section>
  )
}

function footerHref(path: string): string {
  const base = COLLECTIVITES_LINKS.marketingSiteBase
  return base ? `${base}${path}` : "#"
}

export function CollectivitesFooter() {
  return (
    <footer className="border-border bg-background text-foreground border-t px-4 py-12 md:px-8">
      <div className="container-landing">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row">
          <div>
            <a href="#" className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/collectivites/10.svg" alt="VivreIci" className="h-10 w-auto" />
              <span className="text-2xl font-bold">
                <VivreIciMark />
              </span>
            </a>
            <p className="text-muted-foreground mt-3 max-w-xs text-sm">
              La solution locale pour mieux <strong className="text-foreground">comprendre</strong> et{" "}
              <strong className="text-foreground">agir</strong> sur votre territoire.
            </p>
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-6 text-sm">
            <a href={footerHref("/mentions-legales")} className="hover:text-foreground transition-colors">
              Mentions légales
            </a>
            <a href={footerHref("/confidentialite")} className="hover:text-foreground transition-colors">
              Politique de confidentialité
            </a>
            <a href={footerHref("/cgu")} className="hover:text-foreground transition-colors">
              CGU / CGV
            </a>
            <a href={mailtoContactCollectivites()} className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
        <div className="text-muted-foreground border-border mt-8 border-t pt-6 text-center text-xs">
          © {new Date().getFullYear()}{" "}
          <VivreIciMark />. Tous droits réservés.
        </div>
      </div>
    </footer>
  )
}
