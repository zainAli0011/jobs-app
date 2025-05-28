import * as SQLite from 'expo-sqlite';
import { Job } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Database version key - increment when schema changes
const DB_VERSION_KEY = 'jobs_db_version';
const CURRENT_DB_VERSION = '1';

// Last sync timestamp key
const LAST_SYNC_KEY = 'jobs_last_sync';

// Time window before considering data stale (in milliseconds)
// Default: 1 hour
const STALE_DATA_THRESHOLD = 60 * 60 * 1000;

// Database name
const DB_NAME = 'jobfinder.db';

// Open the database with WAL mode for better performance
const openDatabase = async () => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  return db;
};

/**
 * Initialize the database
 */
export const initDatabase = async (): Promise<void> => {
  try {
    const db = await openDatabase();
    
    // Create jobs table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT NOT NULL,
        salary TEXT,
        posted_date TEXT,
        featured INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      )
    `);
    
    console.log('Jobs table created or already exists');
    await checkDatabaseVersion();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

/**
 * Check if the database needs to be updated
 */
const checkDatabaseVersion = async (): Promise<void> => {
  try {
    const storedVersion = await AsyncStorage.getItem(DB_VERSION_KEY);
    
    if (storedVersion !== CURRENT_DB_VERSION) {
      console.log(`Database version mismatch: ${storedVersion} vs ${CURRENT_DB_VERSION}. Updating database...`);
      await updateDatabaseSchema(storedVersion, CURRENT_DB_VERSION);
      await AsyncStorage.setItem(DB_VERSION_KEY, CURRENT_DB_VERSION);
    } else {
      console.log(`Database version ${CURRENT_DB_VERSION} is current.`);
    }
  } catch (error) {
    console.error('Error checking database version:', error);
    throw error;
  }
};

/**
 * Update the database schema
 */
const updateDatabaseSchema = async (oldVersion: string | null, newVersion: string): Promise<void> => {
  if (!oldVersion) {
    console.log('Initializing new database with version', newVersion);
  }
};

/**
 * Save or update jobs in the database
 */
export const saveJobs = async (jobs: Job[]): Promise<void> => {
  if (jobs.length === 0) return;

  try {
    const db = await openDatabase();
    
    // Use a transaction for better performance
    await db.execAsync('BEGIN TRANSACTION;');
    
    try {
      for (const job of jobs) {
        await db.runAsync(
          `INSERT OR REPLACE INTO jobs 
            (id, title, company, location, type, category, description, requirements, salary, posted_date, featured, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            job.id,
            job.title,
            job.company,
            job.location,
            job.type,
            job.category,
            job.description || '',
            job.requirements || '',
            typeof job.salary === 'string' ? job.salary : JSON.stringify(job.salary),
            job.postedDate,
            job.featured ? 1 : 0,
            new Date().toISOString(),
            new Date().toISOString()
          ]
        );
      }
      
      await db.execAsync('COMMIT;');
      console.log(`Saved ${jobs.length} jobs to local database`);
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  } catch (error) {
    console.error('Error saving jobs:', error);
    throw error;
  }
};

/**
 * Get all jobs from the database
 */
export const getJobs = async (): Promise<Job[]> => {
  try {
    const db = await openDatabase();
    
    const result = await db.getAllAsync<{
      id: string;
      title: string;
      company: string;
      location: string;
      type: string;
      category: string;
      description: string;
      requirements: string;
      salary: string;
      posted_date: string;
      featured: number;
    }>(
      'SELECT * FROM jobs ORDER BY featured DESC, posted_date DESC'
    );
    
    const jobs: Job[] = result.map(row => ({
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location,
      type: row.type,
      category: row.category,
      description: row.description,
      requirements: row.requirements,
      salary: tryParseJSON(row.salary) || row.salary,
      postedDate: row.posted_date,
      featured: row.featured === 1,
    }));
    
    console.log(`Retrieved ${jobs.length} jobs from local database`);
    return jobs;
  } catch (error) {
    console.error('Error getting jobs:', error);
    throw error;
  }
};

/**
 * Get a specific job by ID from the database
 */
export const getJobById = async (id: string): Promise<Job | null> => {
  try {
    const db = await openDatabase();
    
    const result = await db.getFirstAsync<{
      id: string;
      title: string;
      company: string;
      location: string;
      type: string;
      category: string;
      description: string;
      requirements: string;
      salary: string;
      posted_date: string;
      featured: number;
    }>(
      'SELECT * FROM jobs WHERE id = ?',
      [id]
    );
    
    if (!result) return null;
    
    return {
      id: result.id,
      title: result.title,
      company: result.company,
      location: result.location,
      type: result.type,
      category: result.category,
      description: result.description,
      requirements: result.requirements,
      salary: tryParseJSON(result.salary) || result.salary,
      postedDate: result.posted_date,
      featured: result.featured === 1,
    };
  } catch (error) {
    console.error('Error getting job by id:', error);
    throw error;
  }
};

/**
 * Helper function to try to parse JSON
 */
function tryParseJSON(jsonString: string) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return null;
  }
}

/**
 * Get the last sync timestamp
 */
export const getLastSyncTime = async (): Promise<number | null> => {
  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return lastSync ? parseInt(lastSync, 10) : null;
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
};

/**
 * Set the last sync timestamp to now
 */
export const updateLastSyncTime = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error updating last sync time:', error);
  }
};

/**
 * Check if data is stale and needs to be refreshed
 */
export const isDataStale = async (): Promise<boolean> => {
  try {
    const lastSync = await getLastSyncTime();
    
    if (!lastSync) {
      return true;
    }
    
    const timeSinceLastSync = Date.now() - lastSync;
    return timeSinceLastSync > STALE_DATA_THRESHOLD;
  } catch (error) {
    console.error('Error checking if data is stale:', error);
    return true;
  }
};

/**
 * Delete all data from the database
 */
export const clearDatabase = async (): Promise<void> => {
  try {
    const db = await openDatabase();
    await db.execAsync('DELETE FROM jobs');
    console.log('Database cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
}; 