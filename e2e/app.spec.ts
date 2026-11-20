import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { dailyQuiz, expect, snowLeopard, test, tiger } from "./fixtures";

async function expectNoSeriousA11yIssues(page: Page) {
  const { violations } = await new AxeBuilder({ page }).exclude(".leaflet-container").analyze();
  const serious = violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(serious.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
}

test("the home page features a species of the day with its yearly trend", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByText("Species of the day")).toBeVisible();
  await expect(page.locator(".trend__chart")).toBeVisible();
  await expect(page.getByRole("link", { name: "Take the daily quiz" })).toBeVisible();
  await expectNoSeriousA11yIssues(page);
});

test("selecting a sighting puts it in the URL, and the link reopens it", async ({ page }) => {
  await page.goto("./#/map");
  await expect(page.getByRole("status").filter({ hasText: "Showing 3 sightings." })).toBeVisible();

  await page.locator(".sighting-marker--CR").click();
  const panel = page.getByRole("complementary", { name: "Selected sighting" });
  await expect(panel.getByRole("heading", { name: "Bornean orangutan" })).toBeVisible();
  await expect(page).toHaveURL(/sighting=1002/);
  const sharedUrl = page.url();

  await page.goto("./#/book");
  await page.goto(sharedUrl);
  await expect(panel.getByRole("heading", { name: "Bornean orangutan" })).toBeVisible();

  await panel.getByRole("button", { name: "Close" }).click();
  await expect(page).not.toHaveURL(/sighting=/);
});

test("the theme button switches themes and remembers the choice", async ({ page, colorScheme }) => {
  await page.goto("./");
  const other = colorScheme === "dark" ? "light" : "dark";
  await page.getByRole("button", { name: `Switch to ${other} theme` }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", other);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", other);
  await expect(page.getByRole("button", { name: `Switch to ${colorScheme} theme` })).toBeVisible();
});

test("searching keeps the filters in the URL", async ({ page }) => {
  await page.goto("./#/map");
  await page.getByLabel("Where").selectOption({ label: "Kenya" });
  await page.getByLabel("Vulnerable").check();
  await page.getByRole("button", { name: "Search sightings" }).click();
  await expect(page).toHaveURL(/status=CR,EN,VU/);
  await expect(page).toHaveURL(/country=KE/);

  await page.reload();
  await expect(page.getByLabel("Where")).toHaveValue("KE");
  await expect(page.getByLabel("Vulnerable")).toBeChecked();
});

test("a focused map shows all-time records", async ({ page }) => {
  await page.goto(`./#/map?species=${tiger.gbifKey}`);
  await expect(page.getByLabel("All GBIF records, all time")).toBeChecked();
});

test("the map pins three organizations and links to the full list", async ({ page }) => {
  await page.goto("./#/map");
  const notes = page.getByRole("complementary", { name: "Conservation organizations" });
  await expect(notes.locator("summary")).toHaveCount(3);
  await notes.getByRole("link", { name: "All organizations →" }).click();
  await expect(page.getByRole("heading", { name: "Conservation organizations" })).toBeVisible();
  await expect(page.locator(".org").first()).toBeVisible();
  await expectNoSeriousA11yIssues(page);
});

test("species pages chart sightings, point to supporters and can be shared", async ({ page }) => {
  await page.goto(`./#/species/${snowLeopard.gbifKey}`);
  await expect(page.getByRole("heading", { name: "Snow leopard" })).toBeVisible();
  const lastYear = new Date().getFullYear();
  await expect(page.locator(".trend__chart")).toHaveAttribute("aria-label", `30 sightings from ${lastYear - 19} to ${lastYear}, peaking at 20 in 2025.`);
  await expect(page.getByRole("link", { name: "Support conservation organizations" })).toHaveAttribute("href", "#/organizations");
  await expect(page.getByRole("button", { name: "Copy share link" })).toBeVisible();
  await expectNoSeriousA11yIssues(page);
});

test("the daily quiz scores names and map pins, and can only be played once a day", async ({ page }) => {
  await page.goto("./#/quiz");
  await expect(page.getByRole("heading", { name: "Who's that mammal? #7" })).toBeVisible();
  for (let question = 1; question <= dailyQuiz.questions.length; question += 1) {
    await expect(page.getByText(`Photo ${question} of ${dailyQuiz.questions.length}`)).toBeVisible();
    await page.locator(".quiz__choice").first().click();
    await expect(page.locator(".quiz__verdict")).toHaveText(/^(Correct!|Not quite\.) It's a /);

    const lockIn = page.getByRole("button", { name: "Lock in guess" });
    await expect(lockIn).toBeDisabled();
    await page.locator(".quiz__map").click();
    await lockIn.click();
    await expect(page.locator(".quiz__distance")).toHaveText(/^[\d,]+ km away$/);
    await expect(page.locator(".quiz__points")).toHaveText(/^Name \+(500|0) · Location \+[\d,]+ · \+[\d,]+ points$/);
    await page.getByRole("button", { name: question === dailyQuiz.questions.length ? "See your score" : "Next mammal" }).click();
  }

  const finalScore = page.locator(".quiz__score");
  await expect(finalScore).toHaveText(/^[\d,]+ \/ 3,000 points$/);
  const nextQuiz = page.getByRole("region", { name: "Time until the next quiz" });
  await expect(nextQuiz.getByRole("heading", { name: "Next quiz in" })).toBeVisible();
  await expect(nextQuiz.locator(".countdown__value")).toHaveText([/^\d{2}$/, /^\d{2}$/, /^\d{2}$/]);
  await expect(page.locator(".quiz__breakdown tbody tr")).toHaveCount(dailyQuiz.questions.length);
  await expectNoSeriousA11yIssues(page);

  const score = await finalScore.textContent();
  await page.reload();
  await expect(finalScore).toHaveText(score!);
});

test("share pages describe the species and send visitors to it", async ({ page, request }) => {
  const response = await request.get(`species/${tiger.gbifKey}/`);
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain('property="og:title"');

  await page.goto(`species/${tiger.gbifKey}/`);
  await expect(page).toHaveURL(new RegExp(`#/species/${tiger.gbifKey}$`));
  await expect(page.getByRole("heading", { name: "Tiger" })).toBeVisible();
});
