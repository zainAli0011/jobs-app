import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { Platform, StatusBar } from 'react-native';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '../constants/Colors';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { JobsProvider } from '../contexts/JobsContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const [fontsLoaded, fontError] = useFonts({
    'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colorScheme === 'dark' ? themeColors.background : '#4F46E5'}
      />
      <JobsProvider>
        <Slot />
      </JobsProvider>
    </SafeAreaProvider>
  );
}
