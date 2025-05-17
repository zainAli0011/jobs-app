import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = 'https://jobs-site-mu.vercel.app'; // Update this with your actual backend URL

/**
 * Register for push notifications and return the token
 */
export async function registerForPushNotificationsAsync() {
  let token;

  // Check if physical device
  if (Device.isDevice) {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // If no existing permission, ask user for permission
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // If permission not granted, return null
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get push token
    token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    // Register token with backend
    const storedToken = await AsyncStorage.getItem('pushToken');
    
    // Only register if token has changed or not stored before
    if (token.data !== storedToken) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/notifications/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: token.data,
            device: Device.modelName || Platform.OS,
          }),
        });

        const result = await response.json();
        
        if (result.success) {
          // Store token locally to avoid unnecessary registrations
          await AsyncStorage.setItem('pushToken', token.data);
          console.log('Push token successfully registered with backend');
        } else {
          console.error('Failed to register push token with backend:', result.message);
        }
      } catch (error) {
        console.error('Error registering push token with backend:', error);
      }
    }
  } else {
    console.log('Must use physical device for push notifications');
  }

  // Set notification handler for iOS
  if (Platform.OS === 'ios') {
    Notifications.setNotificationCategoryAsync('default', [
      {
        identifier: 'open',
        buttonTitle: 'Open',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);
  }

  return token?.data;
}

/**
 * Handle received notification
 */
export function handleNotification(notification: Notifications.Notification) {
  // You can add custom handling logic here
  console.log('Notification received:', notification);
  return notification;
}

/**
 * Handle notification response (when user taps notification)
 */
export function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data;
  
  // Handle navigation based on notification data
  if (data && typeof data === 'object' && 'jobId' in data) {
    // Here you would typically navigate to the job details
    // This will be used by the app component that sets up notification handling
    return {
      type: 'job',
      id: data.jobId
    };
  }
  
  return null;
}