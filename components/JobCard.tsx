import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { Job } from '../services/api';
import { FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

// Format salary function
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
      formattedSalary += ` ${period}`;
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

interface JobCardProps {
  job: Job;
  onPress?: () => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onPress }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Get first letter of company name with safety check
  const getCompanyInitial = () => {
    if (!job.company) return '?';
    if (typeof job.company === 'string') {
      return job.company.charAt(0).toUpperCase();
    }
    return '?';
  };
  
  const handleViewDetails = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      // Navigate to job details - use the correct path for Expo Router
      router.push({
        pathname: "/jobs/[id]",
        params: { id: job.id }
      });
    }
  };

  const handleApplyNow = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Navigate to job application - use the correct path for Expo Router
    router.push({
      pathname: "/jobs/[id]/apply",
      params: { id: job.id }
    });
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.background, borderColor: colorScheme === 'dark' ? '#2D3038' : '#E5E7EB' }
      ]}
      onPress={handleViewDetails}
      activeOpacity={0.7}
    >
      {job.featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          {job.companyLogo ? (
            <Image
              source={{ uri: job.companyLogo }}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={[
              styles.initialContainer, 
              { backgroundColor: colorScheme === 'dark' ? '#4F46E5' : '#E1E7FE' }
            ]}>
              <Text style={[
                styles.initialText, 
                { color: colorScheme === 'dark' ? '#FFFFFF' : '#4F46E5' }
              ]}>
                {getCompanyInitial()}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerContent}>
          <Text style={[styles.company, { color: colors.icon }]} numberOfLines={1}>
            {job.company}
          </Text>
          {!job.featured && (
            <Text style={[styles.postedDate, { color: colors.icon }]}>
              {getPostedTime(job.postedDate)}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text, flex: 1 }]} numberOfLines={2}>
          {job.title}
        </Text>
        
        {job.featured ? (
          <Text style={[styles.postedDate, { color: colors.icon, marginLeft: 8, textAlign: 'right' }]}>
            {getPostedTime(job.postedDate)}
          </Text>
        ) : null}
      </View>
      
      <View style={styles.detailsContainer}>
        <View style={styles.detail}>
          <FontAwesome5 name="map-marker-alt" size={12} color={colors.icon} style={styles.icon} />
          <Text style={[styles.detailText, { color: colors.icon }]} numberOfLines={1}>
            {job.location}
          </Text>
        </View>
        
        <View style={styles.detail}>
          <FontAwesome5 name="briefcase" size={12} color={colors.icon} style={styles.icon} />
          <Text style={[styles.detailText, { color: colors.icon }]} numberOfLines={1}>
            {job.type}
          </Text>
        </View>
        
        <View style={styles.detail}>
          <FontAwesome5 name="dollar-sign" size={12} color={colors.icon} style={styles.icon} />
          <Text style={[styles.detailText, { color: colors.icon }]} numberOfLines={1}>
            {formatSalary(job.salary)}
          </Text>
        </View>

        {job.workplace && (
          <View style={styles.detail}>
            <FontAwesome5 name="building" size={12} color={colors.icon} style={styles.icon} />
            <Text style={[styles.detailText, { color: colors.icon }]} numberOfLines={1}>
              {job.workplace}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.viewButton, { borderColor: colors.tint }]} 
          onPress={handleViewDetails}
        >
          <Text style={[styles.buttonText, { color: colors.tint }]}>View Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.applyButton, { backgroundColor: colors.tint }]} 
          onPress={handleApplyNow}
        >
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 10,
  },
  featuredText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logo: {
    width: 40,
    height: 40,
  },
  initialContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  company: {
    fontSize: 14,
    fontWeight: '500',
  },
  postedDate: {
    fontSize: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    marginBottom: 8,
  },
  icon: {
    marginRight: 6,
  },
  detailText: {
    fontSize: 13,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
    marginHorizontal: 4,
  },
  viewButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  applyButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontWeight: '500',
    fontSize: 14,
  },
  applyButtonText: {
    color: '#1F2937',
    fontWeight: '500',
    fontSize: 14,
  },
}); 