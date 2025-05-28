import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

interface RatingPromptProps {
  isVisible: boolean;
  onClose: () => void;
  onRateNow: () => void;
}

export default function RatingPrompt({ isVisible, onClose, onRateNow }: RatingPromptProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleRateNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRateNow();
    
    // Get the package name dynamically from app.json via Constants
    const androidPackageName = Constants.expoConfig?.android?.package || 'com.yourcompany.jobsapp';
    const appleAppId = Constants.expoConfig?.ios?.bundleIdentifier || '123456789';
    
    try {
      if (Platform.OS === 'android') {
        // Try to open the Play Store app first
        Linking.openURL(`market://details?id=${androidPackageName}&showAllReviews=true`)
          .catch(err => {
            // If Play Store app is not installed, open in browser
            Linking.openURL(`https://play.google.com/store/apps/details?id=${androidPackageName}&showAllReviews=true`);
          });
      } else if (Platform.OS === 'ios') {
        // For iOS, we need an App Store ID
        Linking.openURL(`itms-apps://itunes.apple.com/app/id${appleAppId}?action=write-review`);
      }
    } catch (error) {
      console.error('Error opening store page:', error);
    }
  };
  
  const handleRemindLater = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.container, 
          { backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF' }
        ]}>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <FontAwesome5 
                key={star} 
                name="star" 
                size={28} 
                color="#FFD700" 
                solid
                style={styles.star} 
              />
            ))}
          </View>
          
          <Text style={[styles.title, { color: colors.text }]}>
            Enjoying JobFinder?
          </Text>
          
          <Text style={[styles.message, { color: colors.icon }]}>
            Your feedback helps us improve. If you like our app, please consider rating it!
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.laterButton,
                { borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB' }
              ]}
              onPress={handleRemindLater}
            >
              <Text style={[styles.laterButtonText, { color: colors.text }]}>
                Remind Me Later
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.rateButton, { backgroundColor: '#4F46E5' }]}
              onPress={handleRateNow}
            >
              <Text style={styles.rateButtonText}>
                Rate Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  star: {
    marginHorizontal: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 6,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButton: {
    borderWidth: 1,
  },
  rateButton: {
    backgroundColor: '#4F46E5',
  },
  laterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  rateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 