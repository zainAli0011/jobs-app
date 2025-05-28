import { registerForPushNotificationsAsync, handleNotification } from '../services/notification';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppOpenAd, AdEventType, BannerAd, BannerAdSize, TestIds, AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
// Import services and context
import { Job } from '../services/api';
import { useJobs } from '../contexts/JobsContext';
import { incrementAppOpenCount, shouldShowRatingPrompt, markAppAsRated, markRatingPostponed } from '../services/appRating';
import adHelpers from '../services/adHelpers';

// Import components
import { JobCard } from '../components/JobCard';
import { FilterSheet, FilterOptions } from '../components/FilterSheet';
import RatingPrompt from '../components/RatingPrompt';

// Use test ads in development, real ads in production
const appOpenAdUnitId = adHelpers.getAdUnitId(
  TestIds.APP_OPEN,
  'ca-app-pub-9773068853653447/2226325586'
);

const bannerAdUnitId = adHelpers.getAdUnitId(
  TestIds.BANNER,
  'ca-app-pub-9773068853653447/2004924181'
);

// Log the ad unit IDs being used
adHelpers.logAdEvent('Ad Units Configured', { 
  appOpenAdUnitId, 
  bannerAdUnitId,
  environment: __DEV__ ? 'development' : 'production'
});

// Track if app open ad has been shown
let hasAppOpenAdBeenShown = false;

// Create the app open ad instance
const appOpenAd = AppOpenAd.createForAdRequest(appOpenAdUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

// Banner ad component - enhanced with best practices
const BannerAdComponent = () => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [adRetries, setAdRetries] = useState(0);
  const bannerRef = useRef(null);
  const MAX_RETRIES = 3;
  
  // Check for common ad issues
  useEffect(() => {
    const issues = adHelpers.checkCommonAdIssues('Banner', bannerAdUnitId);
    if (issues.length > 0) {
      console.warn('Banner Ad Issues:', issues);
    }
    
    // Check consent on component mount (required in some regions)
    const checkConsent = async () => {
      try {
        const consentInfo = await AdsConsent.requestInfoUpdate();
        if (consentInfo.status === AdsConsentStatus.REQUIRED) {
          adHelpers.logAdEvent('Consent Required', consentInfo);
        }
      } catch (error) {
        console.warn('Banner Ad: Consent check error', error);
      }
    };
    
    if (!__DEV__) {
      checkConsent();
    }
    
    // Clean up when component unmounts
    return () => {
      setAdError(null);
      setAdRetries(0);
    };
  }, []);
  
  // Handle ad load failures and retries
  const handleAdFailure = (error: any) => {
    adHelpers.logAdEvent('Ad Load Failed', { error: error.message, retry: adRetries + 1 });
    setAdError(error.message || 'Failed to load ad');
    setAdLoaded(false);
    
    // Only retry in production and limit retries
    if (!__DEV__ && adRetries < MAX_RETRIES) {
      const retryDelay = Math.min(2000 * Math.pow(2, adRetries), 32000); // Exponential backoff
      adHelpers.logAdEvent('Scheduling Retry', { 
        retry: adRetries + 1, 
        maxRetries: MAX_RETRIES, 
        delayMs: retryDelay 
      });
      
      setTimeout(() => {
        if (bannerRef.current) {
          setAdRetries(prev => prev + 1);
          setAdError(null); // Clear error to trigger reload
        }
      }, retryDelay);
    } else if (!__DEV__ && adRetries >= MAX_RETRIES) {
      adHelpers.logAdEvent('Max Retries Reached', { maxRetries: MAX_RETRIES });
    }
  };
  
  return (
    <View style={styles.bannerAdContainer}>
      {adError && __DEV__ && (
        <Text style={{color: 'red', fontSize: 10, textAlign: 'center', marginBottom: 5}}>
          Ad Error: {adError}
        </Text>
      )}
      
      <BannerAd
        ref={bannerRef}
        unitId={bannerAdUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          adHelpers.logAdEvent('Ad Loaded Successfully');
          adHelpers.reportAdImpression('Banner', bannerAdUnitId);
          setAdLoaded(true);
          setAdError(null);
          setAdRetries(0); // Reset retry counter on success
        }}
        onAdFailedToLoad={(error) => handleAdFailure(error)}
        onAdOpened={() => {
          adHelpers.logAdEvent('Ad Opened');
        }}
        onAdClosed={() => {
          adHelpers.logAdEvent('Ad Closed');
        }}
        onPaid={(value) => {
          // Log impression-level revenue data
          adHelpers.logAdEvent('Ad Paid', value);
        }}
      />
      
      {!adLoaded && !__DEV__ && (
        <View style={{height: 50, width: '100%'}} />
      )}
    </View>
  );
};

// Make sure splash screen doesn't auto hide
SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const JobsScreen = () => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Use the jobs context
  const { jobs, categories, isLoading, error, refreshJobs, isRefreshing, isOffline } = useJobs();
  
  // Local state variables
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Rating prompt state
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  
  // Notification state
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  
  // Reference to track if this is the first load
  const isFirstLoad = useRef(true);

  // Loads App Open Ad only once at startup with improved reliability
  useEffect(() => {
    let isMounted = true;

    const loadAd = async () => {
      // If ad has already been shown, don't show it again
      if (hasAppOpenAdBeenShown) {
        return;
      }

      try {
        // Check for common ad issues
        const issues = adHelpers.checkCommonAdIssues('AppOpen', appOpenAdUnitId);
        if (issues.length > 0) {
          adHelpers.logAdEvent('AppOpen Issues', issues);
        }

        // Remove any existing listeners
        appOpenAd.removeAllListeners();

        // Add event listeners
        appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
          adHelpers.logAdEvent('AppOpen Ad Loaded');
          if (isMounted && !hasAppOpenAdBeenShown) {
            // Set a short timeout to ensure the splash screen is fully loaded
            // before showing the app open ad
            setTimeout(() => {
              if (isMounted && !hasAppOpenAdBeenShown) {
                // Make sure app content is not visible when showing the ad
                adHelpers.logAdEvent('AppOpen Ad Showing');
                appOpenAd.show();
                // Mark that ad has been shown
                hasAppOpenAdBeenShown = true;
              }
            }, 100);
          }
        });

        appOpenAd.addAdEventListener(AdEventType.ERROR, (error) => {
          adHelpers.logAdEvent('AppOpen Ad Error', error);
          // Mark as shown even on error to prevent retries
          hasAppOpenAdBeenShown = true;
        });

        appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
          adHelpers.logAdEvent('AppOpen Ad Closed');
        });

        // Load the ad
        adHelpers.logAdEvent('AppOpen Ad Loading');
        await appOpenAd.load();
      } catch (error) {
        adHelpers.logAdEvent('AppOpen Ad Load Exception', { error: error.message });
        // Mark as shown even on error to prevent retries
        hasAppOpenAdBeenShown = true;
      }
    };

    loadAd();

    // Cleanup
    return () => {
      isMounted = false;
      appOpenAd.removeAllListeners();
    };
  }, []);

  // Track app opens and check if we should show rating prompt
  useEffect(() => {
    const trackAppOpen = async () => {
      // Increment the app open count
      await incrementAppOpenCount();
      
      // Check if we should show the rating prompt
      const shouldShow = await shouldShowRatingPrompt();
      if (shouldShow) {
        setShowRatingPrompt(true);
      }
    };
    
    trackAppOpen();
  }, []);

  // Set up notifications when component mounts
  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync()
      .then(token => {
        if (token) {
          setExpoPushToken(token);
        }
      })
      .catch(error => {
        console.log('Error getting push token:', error);
      });

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      handleNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      
      // Extract notification data
      const data = response.notification.request.content.data;
      
      // Check if this is a job notification with the required data
      if (data && typeof data === 'object') {
        // Handle new job notifications
        if (data.type === 'new_job' && data.jobId) {
          console.log(`User tapped on new job notification for job ID: ${data.jobId}`);
          
          // If the notification specifies to go to the apply screen
          if (data.screen === 'jobApply') {
            // Navigate directly to the job application screen
            router.push({
              pathname: "/jobs/[id]/apply",
              params: { 
                id: data.jobId,
                companyName: data.companyName || '',
                jobTitle: data.jobTitle || '',
                location: data.location || ''
              }
            });
          } else {
            // Default to job details screen if no specific screen is specified
            router.push({
              pathname: "/jobs/[id]",
              params: { id: data.jobId }
            });
          }
        }
      }
    });

    // Clean up listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Handle rating prompt actions
  const handleRateNow = () => {
    markAppAsRated();
    setShowRatingPrompt(false);
  };
  
  const handleRemindLater = () => {
    markRatingPostponed();
    setShowRatingPrompt(false);
  };

  // Load data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad.current) {
        // We don't need to do anything on first load, as data is loaded by JobsContext
      } else {
        // On subsequent focuses, we can refresh if needed
        // You can decide whether to refresh here or not
      }
    }, [])
  );

  // When splash screen should be hidden
  useEffect(() => {
    const hideSplash = async () => {
      if (!isLoading && isFirstLoad.current) {
        await SplashScreen.hideAsync();
        isFirstLoad.current = false;
      }
    };
    
    hideSplash();
  }, [isLoading]);

  // Filter jobs based on search query and filters
  useEffect(() => {
    if (jobs.length === 0) return;
    
    let result = [...jobs];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(job => 
        job.title.toLowerCase().includes(query) || 
        job.company.toString().toLowerCase().includes(query) ||
        job.location.toLowerCase().includes(query)
      );
    }
    
    // Apply filters
    if (filters.category && typeof filters.category === 'string') {
      result = result.filter(job => job.category === filters.category);
    }
    
    if (filters.location) {
      result = result.filter(job => job.location === filters.location);
    }
    
    if (filters.type) {
      result = result.filter(job => job.type === filters.type);
    }
    
    if (filters.featured) {
      result = result.filter(job => job.featured);
    }
    
    setFilteredJobs(result);
  }, [jobs, searchQuery, filters]);

  // Handle job card press
  const handleJobPress = (job: Job) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/jobs/[id]",
      params: { id: job.id }
    });
  };

  // Handle apply filters
  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  // Handle refresh
  const handleRefresh = async () => {
    await refreshJobs();
  };

  // Check network and refresh
  const checkNetworkAndRefresh = async () => {
    if (!isOffline) {
      await handleRefresh();
    }
  };

  // Render header
  const renderHeader = () => {
    return (
      <View 
        style={[
          styles.header, 
          { 
            backgroundColor: colorScheme === 'dark' ? colors.background : '#4F46E5',
          }
        ]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>JobFinder</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsFilterSheetVisible(true);
              }}
            >
              <FontAwesome5 name="filter" size={18} color={colorScheme === 'dark' ? colors.text : "#fff"} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.searchContainer}>
          <View style={[
            styles.searchInputContainer,
            { backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#FFFFFF' }
          ]}>
            <FontAwesome5 name="search" size={16} color={colorScheme === 'dark' ? '#9BA1A6' : '#9CA3AF'} style={styles.searchIcon} />
            <TextInput
              style={[
                styles.searchInput,
                { color: colorScheme === 'dark' ? colors.text : '#333333' }
              ]}
              placeholder="Search jobs..."
              placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#9CA3AF'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSearchQuery('');
                }}
              >
                <FontAwesome5 name="times-circle" size={16} color={colorScheme === 'dark' ? '#9BA1A6' : '#9CA3AF'} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render active filters
  const renderActiveFilters = () => {
    const hasActiveFilters = filters.category || filters.location || filters.type || filters.featured;
    
    if (!hasActiveFilters) return null;
    
    return (
      <View style={styles.activeFiltersContainer}>
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeFiltersContent}
        >
          {filters.category && (
            <TouchableOpacity 
              style={[
                styles.filterChip,
                { backgroundColor: colorScheme === 'dark' ? '#3E4049' : '#EEF2FF' }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilters(prev => ({ ...prev, category: undefined }));
              }}
            >
              <Text style={[
                styles.filterChipText,
                { color: colorScheme === 'dark' ? '#F3F4F6' : '#4F46E5' }
              ]}>
                {categories.find(c => c.slug === filters.category)?.name || 'Category'}
              </Text>
              <FontAwesome5 name="times" size={10} color={colorScheme === 'dark' ? '#F3F4F6' : '#4F46E5'} />
            </TouchableOpacity>
          )}
          
          {filters.location && (
            <TouchableOpacity 
              style={[
                styles.filterChip,
                { backgroundColor: colorScheme === 'dark' ? '#3E4049' : '#EEF2FF' }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilters(prev => ({ ...prev, location: undefined }));
              }}
            >
              <Text style={[
                styles.filterChipText,
                { color: colorScheme === 'dark' ? '#F3F4F6' : '#4F46E5' }
              ]}>
                {filters.location}
              </Text>
              <FontAwesome5 name="times" size={10} color={colorScheme === 'dark' ? '#F3F4F6' : '#4F46E5'} />
            </TouchableOpacity>
          )}
          
          {filters.type && (
            <TouchableOpacity 
              style={[
                styles.filterChip,
                { backgroundColor: colorScheme === 'dark' ? '#3E4049' : '#EEF2FF' }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilters(prev => ({ ...prev, type: undefined }));
              }}
            >
              <Text style={[
                styles.filterChipText,
                { color: colorScheme === 'dark' ? '#F3F4F6' : '#4F46E5' }
              ]}>
                {filters.type}
              </Text>
              <FontAwesome5 name="times" size={10} color={colorScheme === 'dark' ? '#F3F4F6' : '#4F46E5'} />
            </TouchableOpacity>
          )}
          
          {filters.featured && (
            <TouchableOpacity 
              style={[
                styles.filterChip,
                { backgroundColor: colorScheme === 'dark' ? '#3E4049' : '#EEF2FF' }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilters(prev => ({ ...prev, featured: undefined }));
              }}
            >
              <Text style={[
                styles.filterChipText,
                { color: colorScheme === 'dark' ? '#F3F4F6' : '#4F46E5' }
              ]}>
                Featured
              </Text>
              <FontAwesome5 name="times" size={10} color={colorScheme === 'dark' ? '#F3F4F6' : '#4F46E5'} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[
              styles.clearAllButton,
              { borderColor: colorScheme === 'dark' ? '#3E4049' : '#E5E7EB' }
            ]}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setFilters({});
            }}
          >
            <Text style={[styles.clearAllText, { color: colorScheme === 'dark' ? '#F3F4F6' : '#1F2937' }]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  // Render list of jobs with banner ads
  const renderContent = () => {
    // For initial load, don't show the loading indicator as the splash screen is visible
    if (isLoading && jobs.length === 0) {
      return null; // Return nothing during initial load as splash screen is visible
    }
    
    // Show network error message when offline
    if (isOffline) {
      return (
        <View style={styles.centeredContainer}>
          <FontAwesome5 name="wifi-slash" size={50} color={colors.icon} />
          <Text style={[styles.messageText, { color: colors.text }]}>
            No internet connection
          </Text>
          <Text style={[styles.messageSubtext, { color: colors.icon }]}>
            Please connect to a network to view jobs
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { marginTop: 24 }]}
            onPress={checkNetworkAndRefresh}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome5 name="sync-alt" size={16} color="#1F2937" style={{ marginRight: 8 }} />
              <Text style={styles.retryButtonText}>Refresh</Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Show error message if there's an error and no jobs to display
    if (error && filteredJobs.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <FontAwesome5 name="exclamation-circle" size={40} color={colors.icon} />
          <Text style={[styles.messageText, { color: colors.text }]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton]}
            onPress={refreshJobs}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // No jobs matching filters
    if (filteredJobs.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <FontAwesome5 name="search" size={40} color={colors.icon} />
          <Text style={[styles.messageText, { color: colors.text }]}>
            No jobs found matching your criteria
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setSearchQuery('');
              setFilters({});
            }}
          >
            <Text style={styles.retryButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.container}>
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id || `job-${Math.random()}`}
          renderItem={({ item, index }) => (
            <>
              <JobCard job={item} onPress={() => handleJobPress(item)} />
              {/* Show banner ad after every 3 jobs */}
              {(index + 1) % 3 === 0 && (
                <View style={styles.bannerAdContainer}>
                  <BannerAdComponent />
                </View>
              )}
            </>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
          ListHeaderComponent={
            <>
              {renderHeader()}
              <View style={{ height: 20 }} />
              {renderActiveFilters()}
            </>
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      </View>
    );
  };

  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: colors.background }]} 
      edges={['top', 'right', 'left']}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'light'} />
      
      {renderContent()}
      
      <FilterSheet
        isVisible={isFilterSheetVisible}
        onClose={() => setIsFilterSheetVisible(false)}
        onApplyFilters={handleApplyFilters}
        categories={categories}
        currentFilters={filters}
      />
      
      {/* Rating prompt */}
      <RatingPrompt 
        isVisible={showRatingPrompt}
        onClose={handleRemindLater}
        onRateNow={handleRateNow}
      />
    </SafeAreaView>
  );
};

// Export the component
export default JobsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
  },
  searchContainer: {
    marginTop: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 6,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  messageSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  retryButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 80,
  },
  activeFiltersContainer: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  activeFiltersContent: {
    paddingVertical: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    marginRight: 6,
  },
  clearAllButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearAllText: {
    fontSize: 12,
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    marginVertical: 8,
    paddingHorizontal: 12,
  },
  tokenText: {
    fontSize: 12,
    marginRight: 8,
    flex: 1,
  },
  bannerAdContainer: {
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 16,
  },
}); 