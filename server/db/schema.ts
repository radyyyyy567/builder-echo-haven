import pool from './connection';

export async function createTables() {
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(30) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        password VARCHAR(255) NOT NULL,
        status BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create groups table
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(30) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(30) NOT NULL,
        description LONGTEXT,
        time_start DATETIME NOT NULL,
        time_end DATETIME NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create surveys table
    await client.query(`
      CREATE TABLE IF NOT EXISTS surveys (
        uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(30) NOT NULL,
        form JSONB NOT NULL,
        set_point LONGTEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create relation_group_user table (Many-to-Many)
    await client.query(`
      CREATE TABLE IF NOT EXISTS relation_group_user (
        uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(uuid) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, user_id)
      );
    `);

    // Create relation_group_event table (Many-to-Many)
    await client.query(`
      CREATE TABLE IF NOT EXISTS relation_group_event (
        uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(uuid) ON DELETE CASCADE,
        event_id UUID NOT NULL REFERENCES events(uuid) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, event_id)
      );
    `);

    // Create relation_group_eventsurvey table (Many-to-Many)
    await client.query(`
      CREATE TABLE IF NOT EXISTS relation_group_eventsurvey (
        uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(uuid) ON DELETE CASCADE,
        event_survey_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create relation_event_survey table (Many-to-Many)
    await client.query(`
      CREATE TABLE IF NOT EXISTS relation_event_survey (
        uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(uuid) ON DELETE CASCADE,
        survey_id UUID NOT NULL REFERENCES surveys(uuid) ON DELETE CASCADE,
        file_final VARCHAR(225),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, survey_id)
      );
    `);

    // Create indexes for better performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_relation_group_user_group ON relation_group_user(group_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_relation_group_user_user ON relation_group_user(user_id);');

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Database tables created successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to create tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    // Check if users already exist
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) > 0) {
      console.log('ℹ️ Database already has data, skipping seed');
      return;
    }

    await client.query('BEGIN');

    // Insert sample users
    const users = [
      ['john.doe', 'john.doe@example.com', 'admin', '$2b$10$example.hash'],
      ['jane.smith', 'jane.smith@example.com', 'user', '$2b$10$example.hash'],
      ['mike.johnson', 'mike.johnson@example.com', 'moderator', '$2b$10$example.hash'],
      ['sarah.wilson', 'sarah.wilson@example.com', 'user', '$2b$10$example.hash'],
      ['david.brown', 'david.brown@example.com', 'user', '$2b$10$example.hash'],
    ];

    for (const [username, email, role, password] of users) {
      await client.query(
        'INSERT INTO users (username, email, role, password) VALUES ($1, $2, $3, $4)',
        [username, email, role, password]
      );
    }

    // Insert sample groups
    const groups = [
      ['Engineering', 'Software development team'],
      ['Marketing', 'Marketing and growth team'],
      ['Support', 'Customer support team'],
      ['QA', 'Quality assurance team'],
      ['Design', 'UI/UX design team'],
      ['DevOps', 'DevOps and infrastructure team'],
      ['Management', 'Management and leadership'],
    ];

    for (const [name, description] of groups) {
      await client.query(
        'INSERT INTO groups (name, description) VALUES ($1, $2)',
        [name, description]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to seed database:', error);
    throw error;
  } finally {
    client.release();
  }
}
