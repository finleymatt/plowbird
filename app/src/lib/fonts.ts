import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';

// True once Inter is loaded (or failed to, then the system font is used). The app waits for it
// on native, where the font files ship inside the app.
export function useAppFonts() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  return loaded || !!error;
}
