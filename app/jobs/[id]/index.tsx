import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Share,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '../../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import services and context
import { Job } from '../../../services/api';
import { useJobs } from '../../../contexts/JobsContext';

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Get access to the jobs context
  const { getJobById, isOffline, checkNetworkAndRefresh } = useJobs();
  
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  // Function to fetch job details
  const fetchJobDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the context method to get the job details from cache if available
      const jobData = await getJobById(id as string);
      
      if (!jobData) {
        throw new Error('Job not found');
      }
      
      setJob(jobData);
    } catch (error) {
      console.error('Error fetching job details:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to load job details. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Check out this job: ${job?.title} at ${job?.company}. Apply now at https://jobs-site-delta.vercel.app/jobs/${id}`,
        title: `${job?.title} - ${job?.company}`,
      });
    } catch (error) {
      console.error('Error sharing job:', error);
    }
  };

  const handleSaveJob = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaved(!isSaved);
    // In a real app, we would save to API or local storage here
  };

  const handleApplyJob = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: "/jobs/[id]/apply",
      params: { id: id }
    });
  };

  // Format salary for display
  const formatSalary = (salary: any): string => {
    if (!salary) return "Not specified";
    
    // If salary is already a string, return it directly
    if (typeof salary === 'string') return salary;
    
    // Otherwise, format the salary object
    try {
      const { min, max, currency, period } = salary;
      let formattedSalary = "";
      
      if (min && max) {
        formattedSalary = `${currency || '$'}${min.toLocaleString()} - ${currency || '$'}${max.toLocaleString()}`;
      } else if (min) {
        formattedSalary = `${currency || '$'}${min.toLocaleString()}+`;
      } else if (max) {
        formattedSalary = `Up to ${currency || '$'}${max.toLocaleString()}`;
      } else {
        return "Competitive";
      }
      
      // Add period if available
      if (period) {
        formattedSalary += ` per ${period}`;
      }
      
      return formattedSalary;
    } catch (error) {
      // Fallback for any parsing errors
      return "Competitive";
    }
  };

  // Calculate time since posting
  const getPostedTime = (postedDate: string | Date): string => {
    if (!postedDate) return "Recently";
    
    try {
      const postDate = postedDate instanceof Date ? postedDate : new Date(postedDate);
      
      // Check if date is valid
      if (isNaN(postDate.getTime())) {
        return "Recently";
      }
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - postDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      
      if (diffHours < 1) return "Just now";
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
      return `${Math.floor(diffDays / 365)}y ago`;
    } catch (error) {
      return "Recently";
    }
  };

  // Handle network connectivity error
  if (isOffline && !job) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.errorContainer}>
          <FontAwesome5 name="wifi-slash" size={50} color={colors.icon} />
          <Text style={[styles.errorText, { color: colors.text }]}>No internet connection</Text>
          <Text style={[styles.errorSubtext, { color: colors.icon, marginBottom: 24 }]}>
            Please connect to a network to view job details
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={async () => {
              await checkNetworkAndRefresh();
              fetchJobDetails();
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome5 name="sync-alt" size={16} color={colorScheme === 'dark' ? '#1F2937' : '#FFFFFF'} style={{ marginRight: 8 }} />
              <Text style={[styles.retryButtonText, { color: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF' }]}>Refresh</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Only show error state, handle loading within the main UI
  if (error && !job) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.errorContainer}>
          <FontAwesome5 name="exclamation-circle" size={50} color={colors.icon} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error || 'Job not found'}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={fetchJobDetails}
          >
            <Text style={[styles.retryButtonText, { color: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF' }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show placeholder or skeleton UI during loading, but continue rendering the layout
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
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleSaveJob}
            disabled={!job}
          >
            <FontAwesome5
              name={isSaved ? 'bookmark' : 'bookmark'}
              solid={isSaved}
              size={18}
              color={isSaved ? colors.tint : colors.icon}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
            disabled={!job}
          >
            <FontAwesome5 name="share-alt" size={18} color={colors.icon} />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Only render content when job is available */}
        {job ? (
          <>
            {/* Company logo and info */}
            <View style={styles.companySection}>
              <View style={[
                styles.logoContainer,
                { backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#F3F4F6' }
              ]}>
                {job.companyLogo ? (
                  <Image
                    source={{ uri: job.companyLogo }}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={[styles.logoPlaceholder, { color: colorScheme === 'dark' ? '#F3F4F6' : '#4F46E5' }]}>
                    {job.company && typeof job.company === 'string' ? job.company.charAt(0) : '?'}
                  </Text>
                )}
              </View>
              
              <View style={styles.companyInfo}>
                <Text style={[styles.companyName, { color: colors.text }]}>{job.company || 'Unknown Company'}</Text>
                <Text style={[styles.postedDate, { color: colors.icon }]}>Posted {getPostedTime(job.postedDate)}</Text>
              </View>
            </View>
            
            {/* Job title and featured badge */}
            <View style={styles.titleSection}>
              <Text style={[styles.jobTitle, { color: colors.text }]}>{job.title || 'Untitled Position'}</Text>
              {job.featured && (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredText}>Featured</Text>
                </View>
              )}
            </View>
            
            {/* Job details */}
            <View style={styles.detailsGrid}>
              <View style={[styles.detailItem, { backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#F9FAFB' }]}>
                <FontAwesome5 name="map-marker-alt" size={16} color={colors.icon} />
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.icon }]}>Location</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{job.location || 'Not specified'}</Text>
                </View>
              </View>
              
              <View style={[styles.detailItem, { backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#F9FAFB' }]}>
                <FontAwesome5 name="briefcase" size={16} color={colors.icon} />
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.icon }]}>Job Type</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{job.type || 'Not specified'}</Text>
                </View>
              </View>
              
              <View style={[styles.detailItem, { backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#F9FAFB' }]}>
                <FontAwesome5 name="dollar-sign" size={16} color={colors.icon} />
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.icon }]}>Salary</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatSalary(job.salary)}</Text>
                </View>
              </View>
              
              {job.workplace && (
                <View style={[styles.detailItem, { backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#F9FAFB' }]}>
                  <FontAwesome5 name="building" size={16} color={colors.icon} />
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.icon }]}>Workplace</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{job.workplace}</Text>
                  </View>
                </View>
              )}
            </View>
            
            {/* Job description */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
              <Text style={[styles.descriptionText, { color: colors.text }]}>{job.description || 'No description provided'}</Text>
            </View>
            
            {/* Requirements */}
            {Array.isArray(job.requirements) && job.requirements.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Requirements</Text>
                <View style={styles.listContainer}>
                  {job.requirements.map((requirement, index) => (
                    <View key={`req-${index}`} style={styles.listItem}>
                      <Text style={[styles.bulletPoint, { color: colors.text }]}>•</Text>
                      <Text style={[styles.listText, { color: colors.text }]}>{requirement}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Benefits */}
            {Array.isArray(job.benefits) && job.benefits.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Benefits</Text>
                <View style={styles.listContainer}>
                  {job.benefits.map((benefit, index) => (
                    <View key={`ben-${index}`} style={styles.listItem}>
                      <Text style={[styles.bulletPoint, { color: colors.text }]}>•</Text>
                      <Text style={[styles.listText, { color: colors.text }]}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          // Minimalist loading or empty state
          <View style={{ padding: 20 }}>
            {isLoading ? null : <Text style={{ color: colors.text }}>No job details available</Text>}
          </View>
        )}
        
        {/* Spacing for the footer button */}
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* Apply button */}
      <View style={[
        styles.applyContainer,
        { backgroundColor: colorScheme === 'dark' ? colors.background : '#FFFFFF' }
      ]}>
        <TouchableOpacity
          style={[styles.applyButton, { 
            backgroundColor: job ? colors.tint : colors.icon,
            opacity: job ? 1 : 0.7 
          }]}
          onPress={handleApplyJob}
          disabled={!job}
        >
          <Text style={[styles.applyButtonText, { color: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF' }]}>
            Apply for this Job
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  companySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 16,
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  logoPlaceholder: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  postedDate: {
    fontSize: 14,
  },
  titleSection: {
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  featuredBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featuredText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 8,
  },
  detailContent: {
    marginLeft: 8,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  listContainer: {
    marginTop: 4,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingRight: 16,
  },
  bulletPoint: {
    fontSize: 16,
    marginRight: 8,
    lineHeight: 24,
  },
  listText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  applyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  applyButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 