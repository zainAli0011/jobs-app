import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/**
 * Utility functions for AdMob ads
 */

/**
 * Check if the device is an emulator
 * @returns {boolean} True if the device is an emulator
 */
export const isEmulator = () => {
  if (Platform.OS === 'android') {
    return Platform.constants.Brand === 'google' && Platform.constants.Model.includes('sdk');
  }
  
  if (Platform.OS === 'ios') {
    // iOS simulator detection is not completely reliable
    // but we can make an educated guess
    return Platform.constants.systemName === 'iOS' && 
      (Platform.constants.model?.includes('Simulator') || 
       !Platform.constants.model);
  }
  
  return false;
};

/**
 * Check if a string is a test ad unit ID
 * @param {string} adUnitId - The ad unit ID to check
 * @returns {boolean} True if the ad unit ID is a test ID
 */
export const isTestAdUnitId = (adUnitId) => {
  const testIds = Object.values(TestIds);
  return testIds.includes(adUnitId);
};

/**
 * Log banner ad events for debugging
 * @param {string} event - The event name
 * @param {any} data - The event data
 */
export const logAdEvent = (event, data = null) => {
  const timestamp = new Date().toISOString();
  const message = `[AD_EVENT][${timestamp}] ${event}`;
  
  if (data) {
    console.log(message, data);
  } else {
    console.log(message);
  }
};

/**
 * Check common issues with ads not showing
 * @param {string} adType - The type of ad (banner, interstitial, etc.)
 * @param {string} adUnitId - The ad unit ID
 * @returns {Array} Array of potential issues found
 */
export const checkCommonAdIssues = (adType, adUnitId) => {
  const issues = [];
  
  // Check if using test ad unit in production
  if (!__DEV__ && isTestAdUnitId(adUnitId)) {
    issues.push('Using test ad unit ID in production');
  }
  
  // Check if using production ad unit in development
  if (__DEV__ && !isTestAdUnitId(adUnitId)) {
    issues.push('Using production ad unit ID in development');
  }
  
  // Check for emulator issues
  if (isEmulator() && !__DEV__) {
    issues.push('Testing production ads on emulator - use a real device');
  }
  
  // Log environment info
  logAdEvent(`Ad Check: ${adType}`, {
    environment: __DEV__ ? 'development' : 'production',
    platform: Platform.OS,
    version: Platform.Version,
    adUnitId,
    issues: issues.length > 0 ? issues : 'No issues detected'
  });
  
  return issues;
};

/**
 * Get appropriate ad unit ID based on environment
 * @param {string} devId - Test ad unit ID for development
 * @param {string} prodId - Production ad unit ID
 * @returns {string} The appropriate ad unit ID
 */
export const getAdUnitId = (devId, prodId) => {
  return __DEV__ ? devId : prodId;
};

/**
 * Report ad impression for analytics (stub function)
 * Implement this with your analytics provider
 */
export const reportAdImpression = (adType, adUnitId) => {
  logAdEvent('Ad Impression', { adType, adUnitId });
  // Implement your analytics tracking here
};

export default {
  isEmulator,
  isTestAdUnitId,
  logAdEvent,
  checkCommonAdIssues,
  getAdUnitId,
  reportAdImpression
}; 