import { describe, expect, it } from "vitest";
import {
  parseCollectiviteCommunePage,
  slugifyCommuneName,
} from "../scripts/scrape-collectivite";

describe("parseCollectiviteCommunePage", () => {
  it("extrait mailto/tel/site + lignes d'adresse", () => {
    const html = `
      <html>
        <body>
          <main>
            <section>
              <h1>Mairie - Cabestany</h1>
              <div>
                <div>3 place des Droits-de-l'Homme</div>
                <div>66330 Cabestany</div>
                <a href="tel:+33468663600">04 68 66 36 00</a>
                <a href="mailto:sg@cabestany.com">sg@cabestany.com</a>
                <a href="https://www.ville-cabestany.fr">https://www.ville-cabestany.fr</a>
              </div>
            </section>
          </main>
        </body>
      </html>
    `;

    const data = parseCollectiviteCommunePage(
      html,
      "https://collectivite.fr/cabestany",
      "https://collectivite.fr/cabestany",
    );
    expect(data.url).toBe("https://collectivite.fr/cabestany");
    expect(data.requestedUrl).toBe("https://collectivite.fr/cabestany");
    expect(data.emails).toEqual(["sg@cabestany.com"]);
    expect(data.tels).toEqual(["+33468663600"]);
    expect(data.websites).toContain("https://www.ville-cabestany.fr");
    expect(data.addressLines.join(" ")).toMatch(/Droits-de-l'Homme/i);
    expect(data.addressLines.join(" ")).toMatch(/66330 Cabestany/i);
  });
});

describe("slugifyCommuneName", () => {
  it("gère accents, apostrophes, espaces et tirets", () => {
    expect(slugifyCommuneName("Cabestany")).toBe("cabestany");
    expect(slugifyCommuneName("Abbéville-lès-Conflans")).toBe("abbeville-les-conflans");
    expect(slugifyCommuneName("L'Abergement-Clémenciat")).toBe("l-abergement-clemenciat");
    expect(slugifyCommuneName("  Saint   Nazaire ")).toBe("saint-nazaire");
  });
});

