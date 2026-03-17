// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/database');

// ── POST /api/auth/login ──────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    // Find user by username or email
    const [rows] = await db.execute(
      `SELECT u.*, b.name AS branch_name, b.code AS branch_code, b.is_headquarters
       FROM users u
       JOIN branches b ON u.branch_id = b.id
       WHERE (u.username = ? OR u.email = ?) AND u.is_active = 1`,
      [username, username]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    await db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, branch_id: user.branch_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id:           user.id,
        full_name:    user.full_name,
        username:     user.username,
        email:        user.email,
        role:         user.role,
        branch_id:    user.branch_id,
        branch_name:  user.branch_name,
        branch_code:  user.branch_code,
        is_headquarters: user.is_headquarters,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────
exports.logout = (req, res) => {
  // JWT is stateless; logout is handled client-side by deleting the token.
  res.json({ success: true, message: 'Logged out successfully' });
};

// ── GET /api/auth/profile ─────────────────────────────────────
exports.profile = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.full_name, u.username, u.email, u.role, u.last_login,
              b.id AS branch_id, b.name AS branch_name, b.code AS branch_code, b.is_headquarters
       FROM users u JOIN branches b ON u.branch_id = b.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /api/auth/change-password ───────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(current_password, rows[0].password);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const hashed = await bcrypt.hash(new_password, 12);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
