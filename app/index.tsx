import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import services
import { fetchJobs, fetchCategories, Job, Category } from '../services/api';

// Import components
import { JobCard } from '../components/JobCard';
import { FilterSheet, FilterOptions } from '../components/FilterSheet';

const JobsScreen = () => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // State variables
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Load data from API
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel
      const [jobsData, categoriesData] = await Promise.all([
        fetchJobs(),
        fetchCategories(),
      ]);
      
      setJobs(jobsData.jobs);
      setFilteredJobs(jobsData.jobs);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

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
      const categoryQuery = filters.category.toLowerCase();
      result = result.filter(job => 
        job.title.toLowerCase().includes(categoryQuery) || 
        job.description?.toLowerCase().includes(categoryQuery)
      );
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

  // Render list of jobs
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.messageText, { color: colors.text }]}>
            Loading jobs...
          </Text>
        </View>
      );
    }
    
    if (error && filteredJobs.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <FontAwesome5 name="exclamation-circle" size={40} color={colors.icon} />
          <Text style={[styles.messageText, { color: colors.text }]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton]}
            onPress={loadData}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
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
          renderItem={({ item }) => (
            <JobCard job={item} onPress={() => handleJobPress(item)} />
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
    paddingTop: 0,
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
}); 