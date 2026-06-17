const { Pool } = require('pg');

let dbConnected = false;

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
    const client = await pool.connect();
    client.release();
    dbConnected = true;
    console.log('PostgreSQL connected successfully');
  } catch (error) {
    dbConnected = false;
    console.warn('PostgreSQL not available - using in-memory database for development');
    console.warn('To use PostgreSQL, install it and set DB credentials in .env file');
  }
};

const isDbConnected = () => dbConnected;

module.exports = {
  pool,
  connectDB,
  isDbConnected,
  query: async (text, params) => {
    try {
      return await pool.query(text, params);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Database query failed - returning mock data', e.message);
        return { rows: [] };
      }
      throw e;
    }
  },
};