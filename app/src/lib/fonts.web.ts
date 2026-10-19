// On the web Inter comes from Google Fonts (linked in public/index.html, font-display: swap),
// so the page never waits on font files: text draws in the system font and swaps to Inter.
export function useAppFonts() {
  return true;
}
