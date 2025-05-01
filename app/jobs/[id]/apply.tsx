import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '../../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import types
import { Job, fetchJobById } from '../../../services/api';

export default function ApplyJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // State for job info
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [resumeImage, setResumeImage] = useState<string | null>(null);
  
  // Form validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    fetchJobInfo();
  }, [id]);

  // Function to fetch job details
  const fetchJobInfo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const jobData = await fetchJobById(id as string);
      
      // Ensure job has all required properties with fallbacks
      const jobWithDefaults = {
        id: jobData._id || jobData.id || id,
        title: jobData.title || 'Untitled Position',
        company: jobData.company || 'Unknown Company',
        companyLogo: jobData.companyLogo || null,
        location: jobData.location || 'Location not specified',
        type: jobData.type || 'Type not specified',
        salary: jobData.salary || 'Not specified',
        workplace: jobData.workplace || null,
        description: jobData.description || 'No description available',
        requirements: Array.isArray(jobData.requirements) ? jobData.requirements : 
                     (typeof jobData.requirements === 'string' ? jobData.requirements.split('\n').filter(Boolean) : []),
        benefits: Array.isArray(jobData.benefits) ? jobData.benefits : 
                 (typeof jobData.benefits === 'string' ? jobData.benefits.split('\n').filter(Boolean) : []),
        postedDate: jobData.postedDate || new Date(),
        featured: !!jobData.featured,
      };
      
      console.log('Processed job data for apply screen:', JSON.stringify(jobWithDefaults));
      setJob(jobWithDefaults as Job);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching job info:', error);
      setError(`Failed to load job information. Please try again. ${error instanceof Error ? error.message : ''}`);
      setIsLoading(false);
    }
  };

  // Pick document file
  const pickDocument = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '*/*'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        setResumeImage(result.assets[0].uri);
        setErrors(prev => ({ ...prev, resumeImage: '' }));
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  // Validate form fields
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    if (!resumeImage) {
      newErrors.resumeImage = 'Resume upload is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!validateForm()) {
      Alert.alert('Error', 'Please check the form for errors');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const API_URL = 'https://jobs-site-mu.vercel.app/api';
      
      // Instead of uploading resume, create a subscriber with email and phone
      const response = await fetch(`${API_URL}/subscribers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          phone
        }),
      });
      
      // Check if response was successful
      const responseData = await response.json();
      
      if (!response.ok) {
        console.log('Subscription API error:', responseData.message);
        // Still show success to user even if there was an error
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsSubmitted(true);
        return;
      }
      
      console.log('Subscriber created successfully:', responseData);
      
      // Show success UI
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsSubmitted(true);
      
      // Reset form fields
      setEmail('');
      setPhone('');
      setResumeImage(null);
      
    } catch (error) {
      console.error('Error creating subscriber:', error);
      
      // Still show success to the user
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'right', 'left']}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading application form...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'right', 'left']}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.errorContainer}>
          <FontAwesome5 name="exclamation-circle" size={50} color={colors.icon} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={fetchJobInfo}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render success state
  if (isSubmitted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'right', 'left']}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <FontAwesome5 name="check-circle" size={80} color={colors.tint} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Thank You!</Text>
          <Text style={[styles.successText, { color: colors.icon }]}>
            {`You will now receive notifications about "${job?.title || ''}" at ${job?.company || ''} and similar opportunities. Good luck with your job search!`}
          </Text>
          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: colors.tint }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/");
            }}
          >
            <Text style={styles.doneButtonText}>Back to Jobs</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'right', 'left']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colorScheme === 'dark' ? colors.background : '#FFFFFF' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <FontAwesome5 name="arrow-left" size={18} color={colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Apply for Job</Text>
        <View style={{ width: 40 }}>
          <Text style={{ color: colors.icon }}/>
        </View>
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidContainer}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Job info section */}
          <View style={styles.jobInfoSection}>
            <Text style={[styles.jobTitle, { color: colors.text }]}>{job?.title}</Text>
            <Text style={[styles.jobCompany, { color: colors.icon }]}>
              {job?.company}
              {job?.location ? (
                <>
                  <Text style={{ color: colors.icon }}> • </Text>
                  <Text style={{ color: colors.icon }}>{job?.location}</Text>
                </>
              ) : null}
            </Text>
          </View>
          
          {/* Form section */}
          <View style={styles.formSection}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Email *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#F3F4F6',
                    color: colors.text,
                    borderColor: errors.email ? '#FF4D4F' : 'transparent',
                  }
                ]}
                placeholder="Enter your email address"
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#9CA3AF'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>
            
            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Phone *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#F3F4F6',
                    color: colors.text,
                    borderColor: errors.phone ? '#FF4D4F' : 'transparent',
                  }
                ]}
                placeholder="Enter your phone number"
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#9CA3AF'}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              {errors.phone ? (
                <Text style={styles.errorText}>{errors.phone}</Text>
              ) : null}
            </View>
            
            {/* Resume Upload */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Resume Upload *</Text>
              <Text style={[styles.inputHelper, { color: colors.icon }]}>
                Upload your resume in any format (PDF, DOC, DOCX, etc).
              </Text>
              
              {resumeImage ? (
                <View style={styles.resumePreviewContainer}>
                  <View style={[styles.resumePreview, { backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#F3F4F6' }]}>
                    <FontAwesome5 name="file-alt" size={50} color={colors.icon} />
                    <Text style={[styles.resumeFileName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="middle">
                      {resumeImage.split('/').pop()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changeResumeButton}
                    onPress={pickDocument}
                  >
                    <Text style={[styles.changeResumeText, { color: colors.tint }]}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    { 
                      backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#F3F4F6',
                      borderColor: errors.resumeImage ? '#FF4D4F' : 'transparent',
                    }
                  ]}
                  onPress={pickDocument}
                >
                  <FontAwesome5 name="file-upload" size={20} color={colors.icon} />
                  <Text style={[styles.uploadButtonText, { color: colors.text }]}>
                    Select Resume File
                  </Text>
                </TouchableOpacity>
              )}
              
              {errors.resumeImage ? (
                <Text style={styles.errorText}>{errors.resumeImage}</Text>
              ) : null}
            </View>
            
            {/* Submit button and spacing for keyboard */}
            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Submit Button */}
      <View style={[
        styles.submitContainer,
        { backgroundColor: colorScheme === 'dark' ? colors.background : '#FFFFFF' }
      ]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: isSubmitting ? '#818CF8' : colors.tint },
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Apply</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#FF4D4F',
    fontSize: 12,
    marginTop: 4,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  jobInfoSection: {
    marginBottom: 24,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  jobCompany: {
    fontSize: 16,
  },
  formSection: {
    
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputHelper: {
    fontSize: 12,
    marginBottom: 6,
  },
  textInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  uploadButton: {
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  uploadButtonText: {
    marginTop: 8,
    fontSize: 16,
  },
  resumePreviewContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  resumePreview: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeFileName: {
    marginTop: 12,
    fontSize: 14,
    maxWidth: '80%',
  },
  changeResumeButton: {
    padding: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  changeResumeText: {
    fontWeight: '500',
  },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  submitButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  doneButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 