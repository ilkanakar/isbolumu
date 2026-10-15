import { Fraunces_600SemiBold, Fraunces_700Bold, useFonts } from '@expo-google-fonts/fraunces';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AdBreak from '../components/AdBreak.js';
import { EditorProvider } from '../components/Editor.js';
import Onboarding from '../components/Onboarding.js';
import { FontContext } from '../components/Type.js';
import { initAds, showInterstitial } from '../services/ads.js';
import { HouseProvider, onAdBreak, useHouse } from '../state/Store.js';
import { colors } from '../theme.js';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { ready, state } = useHouse();
  const [adOpen, setAdOpen] = useState(false);
  const [loaded, error] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    initAds();
  }, []);

  useEffect(() => onAdBreak(async () => {
    const shown = await showInterstitial();
    if (!shown) setAdOpen(true);
  }), []);

  useEffect(() => {
    if ((loaded || error) && ready) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error, ready]);

  if ((!loaded && !error) || !ready || !state) return null;

  return (
    <FontContext.Provider value={!error}>
      <StatusBar style="dark" />
      {state.onboardingDone ? (
        <EditorProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} />
        </EditorProvider>
      ) : (
        <Onboarding />
      )}
      <AdBreak visible={adOpen} onClose={() => setAdOpen(false)} />
    </FontContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <HouseProvider>
        <Shell />
      </HouseProvider>
    </SafeAreaProvider>
  );
}
