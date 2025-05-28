import { Alert, Platform } from 'react-native';

// Define the base URL for the API
const API_URL = 'https://jobs-site-mu.vercel.app/api'; // For Android emulator
// If using iOS simulator, use: const API_URL = 'http://localhost:3000/api';

// Define interfaces for Job data
export interface Salary {
  min?: number;
  max?: number;
  currency?: string;
  period?: string;
}

export interface Job {
  id: string;
  _id?: string;
  title: string;
  company: string;
  companyLogo?: string | null;
  location: string;
  type: string;
  salary: Salary | string;
  workplace?: string;
  description?: string;
  requirements?: string[] | string;
  benefits?: string[] | string;
  postedDate: string | Date;
  featured?: boolean;
  category?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  count?: number;
}

// Common job types for reference (not fetched from API)
export const JOB_TYPES = [
  'full-time',
  'part-time',
  'contract',
  'temporary',
  'internship',
];

/**
 * Get the appropriate API URL based on platform
 */
export const getApiUrl = (): string => {
  return Platform.OS === 'ios' ? 'http://localhost:3000/api' : 'https://jobs-site-mu.vercel.app/api';
};

/**
 * Static categories from web admin dashboard
 */
export const getCategories = (): Category[] => {
  return [
    { id: '1', name: 'Software Development', slug: 'software-development', count: 42 },
    { id: '2', name: 'Design', slug: 'design', count: 36 },
    { id: '3', name: 'Marketing', slug: 'marketing', count: 29 },
    { id: '4', name: 'Sales', slug: 'sales', count: 25 },
    { id: '5', name: 'Customer Service', slug: 'customer-service', count: 18 },
    { id: '6', name: 'Finance', slug: 'finance', count: 15 },
    { id: '7', name: 'Healthcare', slug: 'healthcare', count: 12 },
    { id: '8', name: 'Education', slug: 'education', count: 10 },
    { id: '9', name: 'Engineering', slug: 'engineering', count: 8 }
  ];
};

/**
 * Fetch a single job by ID
 */
export const fetchJobById = async (id: string): Promise<Job> => {
  try {
    const apiUrl = getApiUrl();
    console.log(`Fetching job with ID: ${id} from ${apiUrl}/jobs/${id}`);
    
    const response = await fetch(`${apiUrl}/jobs/${id}`);
    
    if (!response.ok) {
      console.warn(`API returned error status: ${response.status}. Using mock data.`);
      return getMockJobById(id);
    }
    
    const data = await response.json();
    console.log('Job data received:', JSON.stringify(data));
    
    // Handle different API response formats
    const jobData = data.job || data;
    
    // If received data seems incomplete, use mock data
    if (!jobData || !jobData.title || !jobData.company) {
      console.warn('API returned incomplete job data. Using mock data.');
      return getMockJobById(id);
    }
    
    // Ensure job has an id property
    return {
      ...jobData,
      id: jobData._id || jobData.id || id,
    };
  } catch (error) {
    console.error('Error fetching job by ID:', error);
    console.log('Falling back to mock data...');
    return getMockJobById(id);
  }
};

/**
 * Get mock job data by ID for development/fallback
 */
const getMockJobById = (id: string): Job => {
  console.log(`Generating mock data for job ID: ${id}`);
  
  return {
    id: id,
    title: 'Senior React Native Developer',
    company: 'Tech Innovations Inc',
    companyLogo: 'https://placehold.co/200x200/4F46E5/FFFFFF?text=TI',
    location: 'San Francisco, CA',
    type: 'Full-time',
    salary: {
      min: 120000,
      max: 150000,
      currency: '$',
      period: 'year'
    },
    workplace: 'Remote',
    description: 'We are seeking an experienced React Native developer to join our mobile development team. The ideal candidate will have a strong background in building cross-platform mobile applications with React Native, a solid understanding of native mobile platforms, and experience with state management solutions.\n\nYou will work closely with designers, product managers, and other engineers to develop new features, improve performance, and ensure the quality of our mobile applications.',
    requirements: [
      'At least 4 years of experience with React Native development',
      'Strong understanding of JavaScript, TypeScript, and React Native best practices',
      'Experience with state management solutions (Redux, Context API, MobX)',
      'Familiarity with native build tools (Xcode, Android Studio)',
      'Knowledge of RESTful APIs and GraphQL',
      'Bachelor\'s degree in Computer Science or related field (or equivalent experience)'
    ],
    benefits: [
      'Competitive salary and equity package',
      'Health, dental, and vision insurance',
      'Flexible work schedule and remote work options',
      'Generous PTO policy',
      '401(k) matching',
      'Professional development budget',
      'Wellness program'
    ],
    postedDate: new Date(Date.now() - 5 * 86400000), // 5 days ago
    featured: true,
    category: 'software-development'
  };
};

/**
 * Fetch all jobs from the API
 */
export const fetchJobs = async (): Promise<{ jobs: Job[]; total: number }> => {
  try {
    console.log('Fetching all jobs from API...');
    const response = await fetch(`${API_URL}/jobs`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Fetched ${data.jobs.length} jobs from API`);
    return data;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    throw error;
  }
};

/**
 * Get categories (static list, not fetched from API)
 */
export const fetchCategories = async (): Promise<Category[]> => {
  // Return the static list of categories
  return getCategories();
}; 