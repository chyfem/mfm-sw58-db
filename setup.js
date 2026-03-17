require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const schema = `
CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY, name VARCHAR(150) NOT NULL, code VARCHAR(20) NOT NULL UNIQUE,
  address TEXT, phone VARCHAR(20), email VARCHAR(100), pastor_name VARCHAR(100),
  is_headquarters BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY, branch_id INT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, description TEXT, leader_name VARCHAR(100), created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, branch_id INT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL, username VARCHAR(60) NOT NULL UNIQUE, email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL, role VARCHAR(30) NOT NULL DEFAULT 'membership_officer'
    CHECK (role IN ('super_admin','branch_admin','accountant','membership_officer')),
  is_active BOOLEAN DEFAULT TRUE, last_login TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY, member_id VARCHAR(20) NOT NULL UNIQUE,
  branch_id INT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  full_name VARCHAR(150) NOT NULL, gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male','Female')),
  date_of_birth DATE, phone VARCHAR(20), email VARCHAR(150), address TEXT, occupation VARCHAR(100),
  marital_status VARCHAR(20) DEFAULT 'Single' CHECK (marital_status IN ('Single','Married','Divorced','Widowed')),
  membership_status VARCHAR(20) DEFAULT 'Active' CHECK (membership_status IN ('Active','Inactive','Transferred','Deceased')),
  date_joined DATE NOT NULL, baptized BOOLEAN DEFAULT FALSE, worker BOOLEAN DEFAULT FALSE,
  photo_url VARCHAR(255), next_of_kin VARCHAR(150), next_of_kin_phone VARCHAR(20),
  created_by INT REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_members_branch ON members(branch_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(membership_status);
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY, branch_id INT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  service_type VARCHAR(30) DEFAULT 'Sunday Service'
    CHECK (service_type IN ('Sunday Service','Midweek','Prayer Meeting','Special Program','Other')),
  date DATE NOT NULL, recorded_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(member_id, date, service_type)
);
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY, branch_id INT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense')), category VARCHAR(60) NOT NULL,
  amount NUMERIC(15,2) NOT NULL, description TEXT, reference VARCHAR(100),
  transaction_date DATE NOT NULL, recorded_by INT REFERENCES users(id) ON DELETE SET NULL,
  approved_by INT REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  month SMALLINT NOT NULL, year SMALLINT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_branch_month ON transactions(branch_id, month, year);
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(transaction_date);
CREATE TABLE IF NOT EXISTS sermons (
  id SERIAL PRIMARY KEY, branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL, preacher VARCHAR(150) NOT NULL, description TEXT,
  bible_text VARCHAR(200), sermon_date DATE, audio_url VARCHAR(255), video_url VARCHAR(255),
  is_published BOOLEAN DEFAULT TRUE, created_by INT REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY, branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL, description TEXT, event_date DATE NOT NULL, end_date DATE,
  time_start TIME, time_end TIME, venue VARCHAR(200), flyer_url VARCHAR(255),
  is_published BOOLEAN DEFAULT TRUE, created_by INT REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS donations (
  id SERIAL PRIMARY KEY, branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
  donor_name VARCHAR(150), donor_email VARCHAR(150), donor_phone VARCHAR(20),
  amount NUMERIC(15,2) NOT NULL,
  purpose VARCHAR(30) DEFAULT 'offering' CHECK (purpose IN ('tithe','offering','building_fund','missions','general')),
  payment_ref VARCHAR(100), payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending','success','failed')),
  donated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY, key_name VARCHAR(100) NOT NULL UNIQUE, key_value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const seed = `
INSERT INTO branches (name,code,address,phone,email,pastor_name,is_headquarters) VALUES
  ('MFM SW58 Araromi HQ','HQ','Araromi, Akure, Ondo State','08012345678','hq@mfmsw58.org','Regional Overseer',TRUE),
  ('MFM SW58 Branch 1 - Alagbaka','B01','Alagbaka, Akure','08023456789','b01@mfmsw58.org','Pastor Adeyemi A.',FALSE),
  ('MFM SW58 Branch 2 - Ijoka','B02','Ijoka Road, Akure','08034567890','b02@mfmsw58.org','Pastor Ogunleye B.',FALSE),
  ('MFM SW58 Branch 3 - FUTA','B03','FUTA, Akure','08045678901','b03@mfmsw58.org','Pastor Adebayo C.',FALSE),
  ('MFM SW58 Branch 4 - Isikan','B04','Isikan, Akure','08056789012','b04@mfmsw58.org','Pastor Okonkwo D.',FALSE),
  ('MFM SW58 Branch 5 - Oba-Ile','B05','Oba-Ile, Akure','08067890123','b05@mfmsw58.org','Pastor Oluwole E.',FALSE),
  ('MFM SW58 Branch 6 - Ijapo','B06','Ijapo Estate, Akure','08078901234','b06@mfmsw58.org','Pastor Adeleke F.',FALSE),
  ('MFM SW58 Branch 7 - Oke-Aro','B07','Oke-Aro, Akure','08089012345','b07@mfmsw58.org','Pastor Alabi G.',FALSE),
  ('MFM SW58 Branch 8 - Shagari','B08','Shagari Village, Akure','08090123456','b08@mfmsw58.org','Pastor Omotayo H.',FALSE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO departments (branch_id,name,description) VALUES
  (1,'Choir','Music and worship'),(1,'Ushering','Protocol and ushering'),
  (1,'Prayer Warriors','Intercession'),(1,'Youth','Youth ministry'),
  (1,'Women''s Wing','Women''s fellowship'),(1,'Men''s Wing','Men''s fellowship'),
  (1,'Sunday School','Children ministry'),(1,'Welfare','Welfare and pastoral care');

INSERT INTO settings (key_name,key_value) VALUES
  ('church_name','MFM SW58 Araromi Akure'),('church_email','info@mfmsw58.org'),
  ('church_phone','08012345678'),('church_address','Araromi, Akure, Ondo State, Nigeria'),
  ('tagline','Bringing Back The Apostolic Signs'),('currency','NGN'),('currency_symbol','₦')
ON CONFLICT (key_name) DO NOTHING;
`;

async function run() {
  try {
    console.log('Creating tables...');
    await pool.query(schema);
    console.log('✅ All tables created!');

    console.log('Seeding data...');
    await pool.query(seed);
    console.log('✅ Branches and departments seeded!');

    // Create super admin
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash('Admin@2024', 12);
    await pool.query(
      `INSERT INTO users (branch_id,full_name,username,email,password,role)
       VALUES (1,'Regional Overseer','superadmin','admin@mfmsw58.org',$1,'super_admin')
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
      [hashed]
    );
    console.log('✅ Super admin created!');
    console.log('\n🎉 Setup complete!');
    console.log('   Username: superadmin');
    console.log('   Password: Admin@2024');
    console.log('   ⚠️  Change password after first login!\n');
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

run();
