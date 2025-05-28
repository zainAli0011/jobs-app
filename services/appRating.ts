import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const APP_OPENS_KEY = 'app_opens_count';
const RATED_KEY = 'app_rated';
const DECLINED_KEY = 'rating_declined';
const LAST_PROMPT_DATE_KEY = 'rating_last_prompt_date';

// Number of opens before showing the rating prompt
const OPENS_THRESHOLD = 5;
// Minimum days between prompts if the user chooses "Remind Me Later"
const DAYS_BETWEEN_PROMPTS = 14;

/**
 * Increment the app open count
 * @returns Promise resolving to the current open count
 */
export const incrementAppOpenCount = async (): Promise<number> => {
  try {
    // Check if user has already rated the app
    const hasRated = await AsyncStorage.getItem(RATED_KEY);
    if (hasRated === 'true') {
      return 0; // No need to increment if user already rated
    }

    const currentCount = await AsyncStorage.getItem(APP_OPENS_KEY);
    const newCount = currentCount ? parseInt(currentCount, 10) + 1 : 1;
    
    await AsyncStorage.setItem(APP_OPENS_KEY, newCount.toString());
    return newCount;
  } catch (error) {
    console.error('Error incrementing app open count:', error);
    return 0;
  }
};

/**
 * Check if the app rating prompt should be shown
 * @returns Promise resolving to a boolean indicating if prompt should show
 */
export const shouldShowRatingPrompt = async (): Promise<boolean> => {
  try {
    // Don't show if user has already rated
    const hasRated = await AsyncStorage.getItem(RATED_KEY);
    if (hasRated === 'true') {
      return false;
    }

    // Check if we've reached the threshold of app opens
    const currentCount = await AsyncStorage.getItem(APP_OPENS_KEY);
    const openCount = currentCount ? parseInt(currentCount, 10) : 0;
    
    // If we haven't reached the threshold, don't show
    if (openCount < OPENS_THRESHOLD) {
      return false;
    }

    // Check if user previously chose "Remind Me Later"
    const lastPromptDate = await AsyncStorage.getItem(LAST_PROMPT_DATE_KEY);
    if (lastPromptDate) {
      const daysSinceLastPrompt = (Date.now() - parseInt(lastPromptDate, 10)) / (1000 * 60 * 60 * 24);
      // If not enough days have passed since last prompt, don't show
      if (daysSinceLastPrompt < DAYS_BETWEEN_PROMPTS) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking if rating prompt should show:', error);
    return false;
  }
};

/**
 * Mark that the user has rated the app
 */
export const markAppAsRated = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(RATED_KEY, 'true');
  } catch (error) {
    console.error('Error marking app as rated:', error);
  }
};

/**
 * Mark that the user has postponed rating (clicked "Remind Me Later")
 */
export const markRatingPostponed = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_PROMPT_DATE_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error marking rating postponed:', error);
  }
};

/**
 * Reset all rating-related data (for testing)
 */
export const resetRatingData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      APP_OPENS_KEY,
      RATED_KEY,
      DECLINED_KEY,
      LAST_PROMPT_DATE_KEY
    ]);
  } catch (error) {
    console.error('Error resetting rating data:', error);
  }
};

/**
 * Force the rating prompt to appear next time by setting the open count to threshold
 * This is useful for testing
 */
export const forceRatingPrompt = async (): Promise<void> => {
  try {
    // Set the app open count to the threshold value
    await AsyncStorage.setItem(APP_OPENS_KEY, OPENS_THRESHOLD.toString());
    
    // Clear any "remind me later" time
    await AsyncStorage.removeItem(LAST_PROMPT_DATE_KEY);
    
    // Clear rated status (if needed for testing)
    await AsyncStorage.removeItem(RATED_KEY);
    
    console.log(`Rating prompt will appear on next app open (count set to ${OPENS_THRESHOLD})`);
  } catch (error) {
    console.error('Error forcing rating prompt:', error);
  }
}; 