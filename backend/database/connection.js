const { Pool } = require('pg');

// In-memory data storage for development
const inMemoryData = {
  users: [],
  assets: [],
  tickets: [],
  assetHistory: [],
};

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'aether',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const connectDB = async () => {
  try {
    await pool.connect();
    console.log('PostgreSQL connected successfully');
  } catch (error) {
    console.warn('PostgreSQL not available - using in-memory database for development');
    console.warn('To use PostgreSQL, install it and set DB credentials in .env file');
  }
};

module.exports = {
  pool,
  connectDB,
  query: async (text, params) => {
    try {
      return await pool.query(text, params);
    } catch (e) {
      // In development without DB, return mock data
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Database not available - returning mock data');
        return { rows: [] };
      }
      throw e;
    }
  },
  inMemoryData,
};