import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { fetchJobs, fetchJobById, Job, Category, fetchCategories } from '../services/api';
import NetInfo from '@react-native-community/netinfo';

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

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        setIsOffline(true);
        setError("No internet connection. Please connect to a network and try again.");
        setIsLoading(false);
        return;
      }
      
      setIsOffline(false);
      
      // Fetch all data in parallel
      const [jobsData, categoriesData] = await Promise.all([
        fetchJobs(),
        fetchCategories(),
      ]);
      
      setJobs(jobsData.jobs);
      setCategories(categoriesData);
      
      // Create a cache of jobs by ID for quick lookup
      const cache: Record<string, Job> = {};
      jobsData.jobs.forEach(job => {
        cache[job.id] = job;
      });
      setJobsCache(cache);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Load data on initial mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Function to refresh job data
  const refreshJobs = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        setIsOffline(true);
        setError("No internet connection. Please connect to a network and try again.");
        setIsRefreshing(false);
        return;
      }
      
      setIsOffline(false);
      
      // Fetch all data in parallel
      const [jobsData, categoriesData] = await Promise.all([
        fetchJobs(),
        fetchCategories(),
      ]);
      
      setJobs(jobsData.jobs);
      setCategories(categoriesData);
      
      // Update the cache, preserving detailed job info we already have
      const updatedCache: Record<string, Job> = { ...jobsCache };
      jobsData.jobs.forEach(job => {
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
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  }, [jobsCache]);

  // Function to get a job by ID, using cache if available
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
    
    // If not in cache or doesn't have full details, fetch from API
    try {
      console.log(`Fetching job details for ID: ${id} from API`);
      
      // Create a promise for this fetch and store it
      const fetchPromise = fetchJobById(id).then(jobData => {
        // Update the cache with the detailed job data
        setJobsCache(prev => ({
          ...prev,
          [id]: jobData
        }));
        
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

  return (
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
  );
};

// Custom hook to use the jobs context
export const useJobs = (): JobsContextType => {
  const context = useContext(JobsContext);
  
  if (context === undefined) {
    throw new Error('useJobs must be used within a JobsProvider');
  }
  
  return context;
}; 