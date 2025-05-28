import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { fetchJobs, fetchJobById, Job, Category, fetchCategories, getCategories } from '../services/api';
import NetInfo from '@react-native-community/netinfo';
import * as Database from '../services/database';
import { Alert } from 'react-native';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';

interface JobsContextType {
  jobs: Job[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  refreshJobs: () => Promise<void>;
  getJobById: (id: string) => Promise<Job | undefined>;
  isRefreshing: boolean;
  isOffline: boolean;
  checkNetworkAndRefresh: () => Promise<void>;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

interface JobsProviderProps {
  children: ReactNode;
}

export const JobsProvider: React.FC<JobsProviderProps> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobsCache, setJobsCache] = useState<Record<string, Job>>({});
  const [pendingFetches, setPendingFetches] = useState<Record<string, Promise<Job>>>({});
  const [isOffline, setIsOffline] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the database
  useEffect(() => {
    const initialize = async () => {
      try {
        await Database.initDatabase();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing database:', error);
        Alert.alert('Database Error', 'There was a problem initializing the database.');
      }
    };
    
    initialize();
  }, []);

  // Subscribe to network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    // Check initial network state
    NetInfo.fetch().then(state => {
      setIsOffline(!state.isConnected);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Load initial data from local database and then refresh if needed
  const loadInitialData = useCallback(async () => {
    if (!isInitialized) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading initial data from local database...');
      
      // Get static categories directly from the API service
      const staticCategories = getCategories();
      setCategories(staticCategories);
      
      // Load jobs from local database
      const localJobs = await Database.getJobs();
      
      if (localJobs.length > 0) {
        console.log(`Loaded ${localJobs.length} jobs from local database`);
        setJobs(localJobs);
        
        // Create a cache of jobs by ID for quick lookup
        const cache: Record<string, Job> = {};
        localJobs.forEach(job => {
          cache[job.id] = job;
        });
        setJobsCache(cache);
      }
      
      // Check if data is stale and should be refreshed
      const isStale = await Database.isDataStale();
      
      // If we have no local data or data is stale, fetch from API
      if (localJobs.length === 0 || isStale) {
        console.log('Local job data is missing or stale, refreshing from API...');
        // Don't await this call so we can load UI with cached data first
        refreshFromApi();
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading data from local database:', error);
      
      try {
        await refreshFromApi();
      } catch (apiError) {
        setError('Failed to load data. Please try again.');
        setIsLoading(false);
      }
    }
  }, [isInitialized]);

  // Refresh data from API and update local database
  const refreshFromApi = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }
    
    try {
      // Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        setIsOffline(true);
        setError("No internet connection. Using cached data.");
        if (showRefreshIndicator) setIsRefreshing(false);
        setIsLoading(false);
        return;
      }
      
      setIsOffline(false);
      
      // Fetch jobs from API
      const jobsResponse = await fetchJobs();
      const jobsData = jobsResponse.jobs;
      
      // Update the state with new data
      setJobs(jobsData);
      
      // Use the static categories
      const staticCategories = getCategories();
      setCategories(staticCategories);
      
      // Save jobs to local database
      await Database.saveJobs(jobsData);
      
      // Update last sync time
      await Database.updateLastSyncTime();
      
      // Update the cache, preserving detailed job info we already have
      const updatedCache: Record<string, Job> = { ...jobsCache };
      jobsData.forEach(job => {
        const existingJob = jobsCache[job.id];
        if (existingJob && existingJob.description) {
          // Preserve detailed info but update basic fields
          updatedCache[job.id] = {
            ...existingJob,
            title: job.title,
            company: job.company,
            companyLogo: job.companyLogo,
            location: job.location,
            type: job.type,
            salary: job.salary,
            workplace: job.workplace,
            featured: job.featured,
            category: job.category,
          };
        } else {
          updatedCache[job.id] = job;
        }
      });
      
      setJobsCache(updatedCache);
      setError(null);
    } catch (error) {
      console.error('Error refreshing data from API:', error);
      
      // Only set error if we don't have any jobs to display
      if (jobs.length === 0) {
        setError('Failed to load data. Please check your connection and try again.');
      }
    } finally {
      if (showRefreshIndicator) setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  // Load data once database is initialized
  useEffect(() => {
    if (isInitialized) {
      loadInitialData();
    }
  }, [isInitialized, loadInitialData]);

  // Check network and refresh jobs
  const checkNetworkAndRefresh = useCallback(async () => {
    // Check network connectivity
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      setIsOffline(true);
      setError("No internet connection. Please connect to a network and try again.");
      return;
    }
    
    // If we're online, clear offline state and refresh
    setIsOffline(false);
    await refreshJobs();
  }, []);

  // Function to refresh job data - exposed to UI
  const refreshJobs = useCallback(async () => {
    await refreshFromApi(true);
  }, []);

  // Function to get a job by ID, using cache and local storage if available
  const getJobById = useCallback(async (id: string): Promise<Job | undefined> => {
    // Check if we have the full job details in cache
    if (jobsCache[id] && jobsCache[id].description) {
      console.log(`Using cached job data for ID: ${id}`);
      return jobsCache[id];
    }
    
    // Check if we're already fetching this job
    if (pendingFetches[id]) {
      console.log(`Using pending fetch for job ID: ${id}`);
      return pendingFetches[id];
    }
    
    // Try to get job from local database
    try {
      const localJob = await Database.getJobById(id);
      if (localJob && localJob.description) {
        console.log(`Retrieved job ${id} from local database`);
        
        // Update the memory cache
        setJobsCache(prev => ({
          ...prev,
          [id]: localJob
        }));
        
        return localJob;
      }
    } catch (dbError) {
      console.error(`Error retrieving job ${id} from local database:`, dbError);
    }
    
    // Check network connectivity
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      setIsOffline(true);
      // Return basic job info from cache if available
      if (jobsCache[id]) {
        return jobsCache[id];
      }
      throw new Error("No internet connection. Please connect to a network and try again.");
    }
    
    setIsOffline(false);
    
    // If not in cache or database, fetch from API
    try {
      console.log(`Fetching job details for ID: ${id} from API`);
      
      // Create a promise for this fetch and store it
      const fetchPromise = fetchJobById(id).then(jobData => {
        // Update the cache with the detailed job data
        setJobsCache(prev => ({
          ...prev,
          [id]: jobData
        }));
        
        // Save to database
        Database.saveJobs([jobData]).catch(err => {
          console.error(`Error saving fetched job ${id} to database:`, err);
        });
        
        // Remove this promise from pending fetches
        setPendingFetches(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        
        return jobData;
      });
      
      // Store the promise
      setPendingFetches(prev => ({
        ...prev,
        [id]: fetchPromise
      }));
      
      return await fetchPromise;
    } catch (error) {
      console.error(`Error fetching job by ID ${id}:`, error);
      
      // Remove from pending fetches on error
      setPendingFetches(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      
      // Still return cached job if available, even if it's not complete
      return jobsCache[id];
    }
  }, [jobsCache, pendingFetches]);

  const refreshData = async (force = false) => {
    if (pendingFetches.current) return;
    pendingFetches.current = true;

    try {
      if (force || await isDataStale()) {
        console.log('Local job data is missing or stale, refreshing from API...');
        const { jobs } = await fetchJobs();
        setJobs(jobs);
        await saveJobs(jobs);
        await updateLastSyncTime();
      }
    } catch (error) {
      console.error('Error refreshing data from API:', error);
      Alert.alert('Error', 'Failed to refresh jobs. Please try again later.');
    } finally {
      pendingFetches.current = false;
    }
  };

  return (
    <SQLiteProvider databaseName="jobfinder.db">
      <JobsContext.Provider 
        value={{ 
          jobs, 
          categories, 
          isLoading, 
          error, 
          refreshJobs, 
          getJobById,
          isRefreshing,
          isOffline,
          checkNetworkAndRefresh
        }}
      >
        {children}
      </JobsContext.Provider>
    </SQLiteProvider>
  );
};

export const useJobs = (): JobsContextType => {
  const context = useContext(JobsContext);
  if (context === undefined) {
    throw new Error('useJobs must be used within a JobsProvider');
  }
  return context;
}; 