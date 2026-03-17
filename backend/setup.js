{
  "name": "mfm-cms-backend",
  "version": "1.0.0",
  "description": "MFM SW58 Araromi Akure Church Management System",
  "main": "server.js",
  "engines": { "node": "18" },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node scripts/seed.js",
    "build": "echo 'No build step required'"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
