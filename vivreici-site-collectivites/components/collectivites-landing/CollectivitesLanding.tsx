import { CollectivitesFaq } from "./CollectivitesFaq"
import { CollectivitesNavbar } from "./CollectivitesNavbar"
import {
  CollectivitesBenefits,
  CollectivitesCredibility,
  CollectivitesFinalCta,
  CollectivitesFooter,
  CollectivitesHero,
  CollectivitesHowItWorks,
  CollectivitesPricing,
  CollectivitesProblem,
  CollectivitesProduct,
  CollectivitesSolution,
} from "./landing-sections"

export function CollectivitesLanding() {
  return (
    <div className="min-h-screen">
      <CollectivitesNavbar />
      <CollectivitesHero />
      <CollectivitesProblem />
      <CollectivitesSolution />
      <CollectivitesHowItWorks />
      <CollectivitesProduct />
      <CollectivitesBenefits />
      <CollectivitesPricing />
      <CollectivitesCredibility />
      <CollectivitesFaq />
      <CollectivitesFinalCta />
      <CollectivitesFooter />
    </div>
  )
}
