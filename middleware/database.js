const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'driver_points_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        address VARCHAR(42) PRIMARY KEY,
        total_points INT NOT NULL DEFAULT 0,
        violation_count INT NOT NULL DEFAULT 0,
        is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS violations (
        violation_id INT PRIMARY KEY,
        driver_address VARCHAR(42) NOT NULL,
        points INT NOT NULL,
        violation_type VARCHAR(255) NOT NULL,
        timestamp BIGINT NOT NULL,
        is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
        block_number BIGINT,
        transaction_hash VARCHAR(66),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_address) REFERENCES drivers(address) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sync_status (
        id INT PRIMARY KEY AUTO_INCREMENT,
        last_block_number BIGINT NOT NULL DEFAULT 0,
        last_sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      INSERT IGNORE INTO sync_status (id, last_block_number) VALUES (1, 0)
    `);

    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

async function upsertDriver(driverAddress, totalPoints, violationCount, isSuspended) {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      `INSERT INTO drivers (address, total_points, violation_count, is_suspended)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       total_points = VALUES(total_points),
       violation_count = VALUES(violation_count),
       is_suspended = VALUES(is_suspended),
       updated_at = CURRENT_TIMESTAMP`,
      [driverAddress, totalPoints, violationCount, isSuspended]
    );
  } finally {
    connection.release();
  }
}

async function upsertViolation(violationData) {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      `INSERT INTO violations (
        violation_id, driver_address, points, violation_type,
        timestamp, is_revoked, block_number, transaction_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      points = VALUES(points),
      violation_type = VALUES(violation_type),
      is_revoked = VALUES(is_revoked),
      block_number = VALUES(block_number),
      transaction_hash = VALUES(transaction_hash),
      updated_at = CURRENT_TIMESTAMP`,
      [
        violationData.violationId,
        violationData.driverAddress,
        violationData.points,
        violationData.violationType,
        violationData.timestamp,
        violationData.isRevoked,
        violationData.blockNumber,
        violationData.transactionHash
      ]
    );
  } finally {
    connection.release();
  }
}

async function updateLastSyncedBlock(blockNumber) {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      'UPDATE sync_status SET last_block_number = ? WHERE id = 1',
      [blockNumber]
    );
  } finally {
    connection.release();
  }
}

async function getLastSyncedBlock() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT last_block_number FROM sync_status WHERE id = 1'
    );
    return rows[0]?.last_block_number || 0;
  } finally {
    connection.release();
  }
}

async function getDriverFromDB(driverAddress) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT * FROM drivers WHERE address = ?',
      [driverAddress]
    );
    return rows[0] || null;
  } finally {
    connection.release();
  }
}

async function getViolationsFromDB(driverAddress) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT * FROM violations WHERE driver_address = ? ORDER BY violation_id DESC',
      [driverAddress]
    );
    return rows;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  initializeDatabase,
  upsertDriver,
  upsertViolation,
  updateLastSyncedBlock,
  getLastSyncedBlock,
  getDriverFromDB,
  getViolationsFromDB
};

