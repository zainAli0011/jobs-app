import { Slot } from 'expo-router';
import { StatusBar } from 'react-native';
import { useFonts } from 'expo-font';
import { useColorScheme, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '../constants/Colors';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { JobsProvider } from '../contexts/JobsContext';
import mobileAds, { MaxAdContentRating, TestIds } from 'react-native-google-mobile-ads';
import { useEffect } from 'react';

// Enhanced AdMob initialization with better error handling and logging
const initializeAdMob = async () => {
  try {
    // Wait for initialization to complete
    const adapterStatuses = await mobileAds().initialize();
    
    // Log adapter statuses for debugging
    const adapterStatusesJson = JSON.stringify(adapterStatuses, null, 2);
    console.log(`AdMob initialization complete with adapter statuses: ${adapterStatusesJson}`);
    
    // Configure ads with production-ready settings
    await mobileAds().setRequestConfiguration({
      // Set max ad content rating
      maxAdContentRating: MaxAdContentRating.PG,
      
      // Only include test device IDs in development
      testDeviceIdentifiers: __DEV__ 
        ? [TestIds.DEVICE, 'EMULATOR'] 
        : [],
        
      // If you want to target under-age users, set to true
      tagForChildDirectedTreatment: false,
      
      // If you want to tag for GDPR compliance, set to true
      tagForUnderAgeOfConsent: false,
    });
    
    console.log('AdMob initialized and configured successfully');
    return true;
  } catch (error) {
    console.error('Error initializing AdMob:', error);
    
    // Try to recover with a basic initialization
    try {
      await mobileAds().initialize();
      console.log('AdMob basic initialization successful after error');
      return true;
    } catch (fallbackError) {
      console.error('Fatal error initializing AdMob:', fallbackError);
      return false;
    }
  }
};

// Initialize AdMob immediately
initializeAdMob();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const [fontsLoaded, fontError] = useFonts({
    'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Ensure AdMob is properly initialized
  useEffect(() => {
    // Re-initialize AdMob if needed and log any issues
    initializeAdMob().then(success => {
      if (success) {
        console.log('AdMob re-initialized successfully');
      } else {
        console.warn('AdMob re-initialization failed');
      }
    });
  }, []);

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
