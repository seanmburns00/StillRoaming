import { el } from "./dom";

export type Theme = "light" | "dark";

const STORAGE_KEY = "still-roaming-theme";
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

const ICON_ATTRIBUTES = `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
const SUN_ICON = `<svg ${ICON_ATTRIBUTES}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
const MOON_ICON = `<svg ${ICON_ATTRIBUTES}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;

export function restoreTheme() {
  const saved = readSavedTheme();
  if (saved) document.documentElement.dataset.theme = saved;
}

function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return systemDark.matches ? "dark" : "light";
}

function oppositeTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

export function themeToggle(): HTMLButtonElement {
  const button = el("button", { type: "button", className: "theme-toggle" });

  function render() {
    const next = oppositeTheme(currentTheme());
    button.innerHTML = next === "dark" ? MOON_ICON : SUN_ICON;
    button.ariaLabel = `Switch to ${next} theme`;
    button.title = `Switch to ${next} theme`;
  }

  button.addEventListener("click", () => {
    const next = oppositeTheme(currentTheme());
    document.documentElement.dataset.theme = next;
    saveTheme(next);
    render();
  });
  systemDark.addEventListener("change", render);
  render();
  return button;
}

function readSavedTheme(): Theme | undefined {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : undefined;
  } catch {
    return undefined;
  }
}

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // The choice still applies for this visit.
  }
}
