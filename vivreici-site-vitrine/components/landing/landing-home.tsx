import {
  AlertTriangle,
  Bell,
  Camera,
  CheckCircle,
  Clock,
  Construction,
  Lightbulb,
  MapPin,
  PawPrint,
  Smartphone,
  Trash2,
  Users,
  Eye,
  CloudRain,
  HandHelping,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

import { BrandedName } from "@/components/branded-name";
import QrCodeCard from "@/components/QrCodeCard";
import { LEGAL_NAV } from "@/lib/legal-nav";
import { SITE_LINKS } from "@/lib/site-links";

import { LandingNavbar } from "./landing-navbar";

const SHELL = "mx-auto w-full max-w-[1200px] px-4 lg:px-8";

const PROBLEMS = [
  {
    icon: Trash2,
    label: "Dépôts sauvages",
    description: "Déchets abandonnés dans la rue ou la nature",
  },
  {
    icon: Lightbulb,
    label: "Éclairage en panne",
    description: "Lampadaires cassés ou zones mal éclairées",
  },
  {
    icon: Construction,
    label: "Voirie dégradée",
    description: "Nids-de-poule, trottoirs abîmés, signalisation",
  },
  {
    icon: AlertTriangle,
    label: "Propreté",
    description: "Espaces publics sales, tags, mobilier dégradé",
  },
] as const;

const APP_FEATURES = [
  {
    icon: CloudRain,
    title: "Alertes",
    subtitle: "Météo & pollen",
    description:
      "Recevez les vigilances météo du jour et du lendemain, et les alertes pollen en cours près de chez vous. Restez informé sans chercher.",
    tags: ["Vigilance J et J+1", "Alertes pollen", "Notifications"],
    color: "bg-accent/10 text-accent",
    borderColor: "hover:border-accent/40",
  },
  {
    icon: PawPrint,
    title: "Animaux",
    subtitle: "Perdus, trouvés & alertes",
    description:
      "Signalez ou retrouvez un animal perdu dans votre quartier. Consultez les alertes sanitaires : chenilles processionnaires, tiques, puces, épillets…",
    tags: ["Animaux perdus / trouvés", "Chenilles", "Tiques & puces"],
    color: "bg-primary/10 text-primary",
    borderColor: "hover:border-primary/40",
  },
  {
    icon: HandHelping,
    title: "Entraide",
    subtitle: "Services entre voisins",
    description:
      "Proposez ou demandez un coup de main : bricolage, courses, garde d'animaux… L'entraide de proximité, sans prise de tête.",
    tags: ["Échange de services", "Communauté", "Proximité"],
    color: "bg-accent/10 text-accent",
    borderColor: "hover:border-accent/40",
  },
] as const;

const STEPS = [
  {
    number: "1",
    icon: MapPin,
    title: "Je signale",
    description: "Vous repérez un problème ? Décrivez-le en quelques mots.",
  },
  {
    number: "2",
    icon: Camera,
    title: "J'ajoute une photo",
    description:
      "Prenez une photo et partagez la localisation. C'est plus clair pour tout le monde.",
  },
  {
    number: "3",
    icon: Bell,
    title: "Je suis l'évolution",
    description:
      "Recevez des nouvelles. Voyez si d'autres ont signalé le même problème.",
  },
] as const;

const BENEFITS = [
  {
    icon: MapPin,
    title: "Agir près de chez soi",
    description: "Chaque signalement compte. Vous agissez là où vous vivez.",
  },
  {
    icon: Eye,
    title: "Rendre les problèmes visibles",
    description: "Ce qui est signalé ne peut plus être ignoré.",
  },
  {
    icon: Bell,
    title: "Rester informé",
    description:
      "Alertes météo, pollen, animaux perdus : tout au même endroit.",
  },
  {
    icon: Users,
    title: "S'entraider entre voisins",
    description: "Proposez ou demandez un service. La solidarité de proximité.",
  },
  {
    icon: Clock,
    title: "Gagner du temps",
    description: "Plus besoin de chercher le bon numéro ou le bon formulaire.",
  },
  {
    icon: CheckCircle,
    title: "Simple et accessible",
    description: "Une app pensée pour tout le monde, sans jargon technique.",
  },
] as const;

function Hero() {
  return (
    <section className="overflow-hidden pt-24 pb-12 sm:pt-32 sm:pb-20">
      <div className={SHELL}>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-6 text-center sm:space-y-8 lg:text-left">
            <div className="text-foreground inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-sm font-medium">
              <Smartphone className="h-4 w-4" />
              Application web gratuite
            </div>
            <h1 className="font-heading text-4xl leading-tight font-extrabold text-balance sm:text-5xl lg:text-6xl">
              Votre quartier a besoin de{" "}
              <span className="text-accent">vous</span>.
            </h1>
            <p className="text-muted-foreground mx-auto max-w-lg text-base leading-relaxed sm:text-lg lg:mx-0">
              Signalez les problèmes, recevez les alertes météo et pollen,
              retrouvez un animal perdu ou proposez un coup de main entre
              voisins. Tout ça dans une seule app.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-start">
              <a
                href="#installer"
                className="bg-primary text-primary-foreground hover:bg-primary-hover inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-bold shadow-lg shadow-primary/25 transition-colors sm:w-auto"
              >
                Installer l&apos;app
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="#comment"
                className="border-border text-foreground inline-flex w-full items-center justify-center gap-2 rounded-full border-2 px-6 py-4 text-base font-semibold transition-colors hover:border-foreground/20 sm:w-auto"
              >
                Voir comment ça marche
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 sm:gap-6 sm:pt-4 lg:justify-start">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <CheckCircle className="text-primary h-4 w-4" />
                Gratuit
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <CheckCircle className="text-primary h-4 w-4" />
                Sans téléchargement
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <CheckCircle className="text-primary h-4 w-4" />
                Tous les téléphones
              </div>
            </div>
          </div>
          <div className="relative flex justify-center">
            <div className="bg-primary/20 absolute -inset-8 rounded-full blur-3xl sm:-inset-12" />
            <div className="border-border bg-card relative rounded-3xl border p-6 shadow-2xl shadow-foreground/5 sm:p-8">
              <div className="space-y-4 text-center">
                <p className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                  Scannez pour installer
                </p>
                <div className="inline-block">
                  <QrCodeCard
                    url={SITE_LINKS.citizenAppUrl}
                    innerClassName="inline-block w-fit"
                    className="shadow-none"
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Ouvrez l&apos;appareil photo de votre téléphone
                </p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element -- asset statique /public/brand */}
              <img
                src="/brand/phone-mockup.png"
                alt="Application VivreIci sur mobile"
                className="animate-float absolute -right-12 -bottom-8 hidden w-52 max-w-none drop-shadow-2xl sm:block sm:w-56 lg:-right-16 lg:-bottom-10 lg:w-72"
                width={288}
                height={560}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhySection() {
  return (
    <section id="pourquoi" className="bg-card py-16 sm:py-24">
      <div className={SHELL}>
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-16">
          <h2 className="font-heading mb-4 text-3xl font-extrabold sm:text-4xl">
            Les problèmes du quotidien,{" "}
            <span className="text-accent">on les voit tous</span>.
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            <BrandedName /> vous permet de les signaler en quelques secondes —
            et de suivre ce qui se passe ensuite.
          </p>
        </div>
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {PROBLEMS.map((problem) => (
            <div
              key={problem.label}
              className="border-border bg-background group flex h-full flex-col space-y-4 rounded-2xl border p-6 text-center transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 sm:p-8"
            >
              <div className="bg-primary/10 group-hover:bg-primary/20 inline-flex h-14 w-14 shrink-0 items-center justify-center self-center rounded-2xl transition-colors">
                <problem.icon className="text-primary h-7 w-7" />
              </div>
              <h3 className="font-heading text-lg font-bold">
                {problem.label}
              </h3>
              <p className="text-muted-foreground grow text-sm leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-16 sm:py-24">
      <div className={SHELL}>
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-16">
          <h2 className="font-heading mb-4 text-3xl font-extrabold sm:text-4xl">
            Bien plus qu&apos;un outil de{" "}
            <span className="text-accent">signalement</span>.
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            <BrandedName /> réunit tout ce dont votre quartier a besoin dans une
            seule application.
          </p>
        </div>
        <div className="grid grid-cols-1 items-stretch gap-6 sm:gap-8 lg:grid-cols-3">
          {APP_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className={`border-border bg-card flex h-full flex-col space-y-6 rounded-3xl border p-8 transition-all duration-300 hover:shadow-xl sm:p-10 ${feature.borderColor}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${feature.color} transition-colors`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 text-left">
                  <h3 className="font-heading text-xl font-bold">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.subtitle}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground grow leading-relaxed">
                {feature.description}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                {feature.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-muted text-muted-foreground rounded-full px-3 py-1.5 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="comment" className="py-16 sm:py-24">
      <div className={SHELL}>
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-16">
          <h2 className="font-heading mb-4 text-3xl font-extrabold sm:text-4xl">
            Simple comme <span className="text-accent">bonjour</span>.
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Pas besoin de créer un compte compliqué. Signalez en 30 secondes.
          </p>
        </div>
        <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className="relative flex h-full min-h-0 flex-col"
            >
              {i < STEPS.length - 1 ? (
                <div className="from-primary/35 absolute top-16 left-[60%] z-0 hidden h-0.5 w-[80%] bg-gradient-to-r to-transparent sm:block" />
              ) : null}
              <div className="border-border bg-card relative z-10 flex h-full min-h-0 flex-col space-y-6 rounded-3xl border p-8 text-center sm:p-10">
                <div className="bg-primary text-primary-foreground font-heading inline-flex h-14 w-14 shrink-0 items-center justify-center self-center rounded-full text-xl font-extrabold shadow-lg shadow-primary/25 sm:h-16 sm:w-16 sm:text-2xl">
                  {step.number}
                </div>
                <h3 className="font-heading text-lg font-bold sm:text-xl">
                  {step.title}
                </h3>
                <p className="text-muted-foreground grow leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <section className="bg-card py-16 sm:py-24">
      <div className={SHELL}>
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-16">
          <h2 className="font-heading mb-4 text-3xl font-extrabold sm:text-4xl">
            Ce que ça <span className="text-accent">change</span> au quotidien.
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            <BrandedName />, c&apos;est un geste simple pour améliorer la vie
            locale.
          </p>
        </div>
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="hover:bg-background flex h-full min-h-0 gap-4 rounded-2xl p-5 transition-colors sm:p-6"
            >
              <div className="bg-primary/10 flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-xl sm:h-12 sm:w-12">
                <benefit.icon className="text-primary h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <h3 className="font-heading mb-1 text-base font-bold">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground grow text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InstallSection() {
  return (
    <section id="installer" className="py-16 sm:py-24">
      <div className={SHELL}>
        <div className="border-border bg-card relative overflow-hidden rounded-3xl border p-8 text-center sm:p-12 lg:p-16">
          <div className="bg-primary/10 absolute top-0 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:h-96 sm:w-96" />
          <div className="relative mx-auto max-w-2xl space-y-6 sm:space-y-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-icon.svg"
              alt="VivreIci"
              className="mx-auto h-20 w-auto sm:h-24 md:h-28"
            />
            <h2 className="font-heading text-3xl font-extrabold sm:text-4xl">
              Installez <BrandedName /> maintenant.
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Scannez le QR code ci-dessous avec votre téléphone, ou ouvrez le
              lien depuis votre mobile.
            </p>
            <div className="inline-block">
              <QrCodeCard
                url={SITE_LINKS.citizenAppUrl}
                className="border-primary/25 border-2 shadow-xl shadow-primary/10"
                innerClassName="inline-block w-fit"
              />
            </div>
            <div>
              <a
                href={SITE_LINKS.citizenAppUrl}
                className="bg-primary text-primary-foreground hover:bg-primary-hover inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-bold shadow-lg shadow-primary/25 transition-colors sm:px-10 sm:py-4 sm:text-lg"
              >
                Ouvrir <BrandedName className="inline" variant="onPrimary" />{" "}
                sur mobile
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
            <div className="mx-auto grid max-w-lg grid-cols-1 items-stretch gap-4 pt-4 sm:grid-cols-2 sm:gap-8">
              <div className="bg-background flex h-full flex-col space-y-2 rounded-2xl p-5 text-left sm:p-6">
                <div className="flex items-center gap-2">
                  <Smartphone className="text-muted-foreground h-5 w-5" />
                  <span className="font-heading text-sm font-bold">iPhone</span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Ouvrir dans Safari →{" "}
                  <span className="text-foreground font-semibold">
                    Partager
                  </span>{" "}
                  →{" "}
                  <span className="text-foreground font-semibold">
                    Sur l&apos;écran d&apos;accueil
                  </span>
                </p>
              </div>
              <div className="bg-background flex h-full flex-col space-y-2 rounded-2xl p-5 text-left sm:p-6">
                <div className="flex items-center gap-2">
                  <Smartphone className="text-muted-foreground h-5 w-5" />
                  <span className="font-heading text-sm font-bold">
                    Android
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Ouvrir dans Chrome →{" "}
                  <span className="text-foreground font-semibold">
                    Installer l&apos;application
                  </span>
                </p>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              <BrandedName /> est une application web (PWA). Aucun
              téléchargement depuis l&apos;App Store ou Google Play n&apos;est
              nécessaire.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-border bg-card border-t py-10 sm:py-12">
      <div className={SHELL}>
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-start">
          <div className="text-center sm:text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-wide.svg"
              alt="VivreIci"
              className="mx-auto h-11 w-auto sm:mx-0 sm:h-12 md:h-14"
            />
            <p className="text-muted-foreground mt-2 text-sm">
              Agir pour son quartier, simplement.
            </p>
          </div>
          <div className="text-muted-foreground flex max-w-xl flex-col items-center gap-3 text-sm sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-2">
            <a
              href={SITE_LINKS.contactHref}
              className="transition-colors hover:text-foreground"
            >
              Contact
            </a>
            {LEGAL_NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ))}
            <a
              href={SITE_LINKS.collectivitesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Collectivités
            </a>
          </div>
        </div>
        <div className="border-border text-muted-foreground mt-6 border-t pt-6 text-center text-xs sm:mt-8 sm:pt-8">
          © {new Date().getFullYear()} <BrandedName />. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}

export function LandingHome() {
  return (
    <div className="bg-background min-h-screen">
      <LandingNavbar />
      <Hero />
      <WhySection />
      <FeaturesSection />
      <HowItWorks />
      <Benefits />
      <InstallSection />
      <Footer />
    </div>
  );
}
