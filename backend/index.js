# ── Server ──────────────────────────────────────
PORT=5000
NODE_ENV=production

# ── Database (Render sets DATABASE_URL automatically) ──
# Local dev only — on Render, just set DATABASE_URL
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=mfm_cms

# ── JWT (change this to something long and random!) ──
JWT_SECRET=MFM_SW58_Araromi_Akure_Change_This_To_A_Long_Random_String_2024
JWT_EXPIRES_IN=8h

# ── Initial super admin ──
ADMIN_USERNAME=superadmin
ADMIN_EMAIL=admin@mfmsw58.org
ADMIN_PASSWORD=Admin@2024
