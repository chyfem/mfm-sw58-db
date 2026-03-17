// scripts/seed.js — Create super admin (run once after schema)
require('dotenv').config({ path: require('path').join(__dirname,'..', '.env') });
const bcrypt = require('bcryptjs');
const db     = require('../config/database');

(async () => {
  try {
    const username = process.env.ADMIN_USERNAME || 'superadmin';
    const email    = process.env.ADMIN_EMAIL    || 'admin@mfmsw58.org';
    const password = process.env.ADMIN_PASSWORD || 'Admin@2024';

    // Get HQ branch id
    const [branches] = await db.execute('SELECT id FROM branches WHERE is_headquarters = $1 LIMIT 1', [true]);
    if (!branches.length) { console.error('Run schema.sql first'); process.exit(1); }

    const hashed = await bcrypt.hash(password, 12);
    await db.execute(
      `INSERT INTO users (branch_id,full_name,username,email,password,role)
       VALUES ($1,$2,$3,$4,$5,'super_admin')
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
      [branches[0].id, 'Regional Overseer', username, email, hashed]
    );
    console.log('\n✅  Super admin ready!');
    console.log('   Username:', username);
    console.log('   Password:', password);
    console.log('\n⚠️   Change password after first login!\n');
    process.exit(0);
  } catch(e) { console.error('Seed failed:', e.message); process.exit(1); }
})();
