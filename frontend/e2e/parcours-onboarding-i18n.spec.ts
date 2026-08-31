import { test, expect, seConnecter } from "./fixtures/backend";

/**
 * Le guide de démarrage parle la langue de l'utilisateur.
 *
 * Pourquoi ce test existe. Les libellés du guide étaient écrits en français EN
 * DUR dans `OnboardingWizard.tsx` — les seuls de l'application à l'être. Le
 * dictionnaire n'étant jamais sollicité, la parité fr/ar vérifiée à la
 * compilation (`lib/i18n/parity.ts`) ne pouvait rien voir : un client
 * arabophone lisait du français sur le PREMIER écran suivant son inscription,
 * dans une mise en page déjà passée en RTL.
 *
 * Ce test aurait échoué avant la correction. C'est le seul genre d'assertion
 * qui le prouve : vérifier le texte français seul passait dans les deux cas,
 * puisque c'est le même texte.
 */

test.describe("Guide de démarrage — i18n", () => {
  test("le guide bascule en arabe avec l'interface", async ({ page }) => {
    await seConnecter(page, "client");
    await page.goto("/dashboard");

    const guide = page.getByTestId("guide-demarrage");
    // Le guide peut avoir été masqué par un passage précédent : le masquage
    // vit dans localStorage, sous une clé portant l'identifiant du client.
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((c) => c.startsWith("transporti_onboarding_"))
        .forEach((c) => localStorage.removeItem(c));
    });
    await page.reload();

    await expect(guide).toBeVisible({ timeout: 15_000 });
    const texteFrancais = (await guide.innerText()).trim();
    expect(texteFrancais).toContain("Bienvenue sur Transporti");

    await page.getByRole("button", { name: "Switch language" }).click();

    // Le document passe en RTL, et le guide doit avoir changé de langue avec
    // lui. Sans la correction, la mise en page basculait et le texte restait
    // français.
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(guide).not.toContainText("Bienvenue sur Transporti");
    // Et il ne doit pas non plus rendre un nom de clé : une clé manquante
    // s'afficherait telle quelle.
    await expect(guide).not.toContainText("onboarding.");
  });
});
