// controllers/branchesController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');

// ── GET /api/branches ─────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT b.*,
              COUNT(DISTINCT m.id) AS member_count,
              COUNT(DISTINCT u.id) AS user_count
       FROM branches b
       LEFT JOIN members m ON b.id = m.branch_id AND m.membership_status = 'Active'
       LEFT JOIN users u ON b.id = u.branch_id AND u.is_active = 1
       GROUP BY b.id ORDER BY b.is_headquarters DESC, b.name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/branches/:id ─────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM branches WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Branch not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /api/branches ─────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { name, code, address, phone, email, pastor_name } = req.body;
    const [result] = await db.execute(
      'INSERT INTO branches (name,code,address,phone,email,pastor_name) VALUES (?,?,?,?,?,?)',
      [name, code.toUpperCase(), address || null, phone || null, email || null, pastor_name || null]
    );
    res.status(201).json({ success: true, message: 'Branch created', data: { id: result.insertId } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Branch code already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PUT /api/branches/:id ──────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { name, address, phone, email, pastor_name } = req.body;
    await db.execute(
      'UPDATE branches SET name=?,address=?,phone=?,email=?,pastor_name=? WHERE id=?',
      [name, address || null, phone || null, email || null, pastor_name || null, req.params.id]
    );
    res.json({ success: true, message: 'Branch updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════
// USERS MANAGEMENT (admin only)
// ═══════════════════════════════════════════════════════════════

// ── GET /api/users ────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const branchFilter = req.user.role !== 'super_admin'
      ? `AND u.branch_id = ${req.user.branch_id}` : '';
    const [rows] = await db.execute(
      `SELECT u.id, u.full_name, u.username, u.email, u.role, u.is_active, u.last_login,
              b.name AS branch_name
       FROM users u JOIN branches b ON u.branch_id = b.id
       WHERE 1=1 ${branchFilter} ORDER BY u.full_name`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /api/users ───────────────────────────────────────────
exports.createUser = async (req, res) => {
  try {
    const { branch_id, full_name, username, email, password, role } = req.body;
    const bId = req.user.role === 'super_admin' ? branch_id : req.user.branch_id;

    if (!full_name || !username || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      'INSERT INTO users (branch_id,full_name,username,email,password,role) VALUES (?,?,?,?,?,?)',
      [bId, full_name, username, email, hashed, role]
    );
    res.status(201).json({ success: true, message: 'User created', data: { id: result.insertId } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Username or email already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PUT /api/users/:id ────────────────────────────────────────
exports.updateUser = async (req, res) => {
  try {
    const { full_name, email, role, is_active, branch_id } = req.body;
    const fields = [];
    const values = [];

    if (full_name)              { fields.push('full_name=?');  values.push(full_name); }
    if (email)                  { fields.push('email=?');      values.push(email); }
    if (role)                   { fields.push('role=?');       values.push(role); }
    if (is_active !== undefined){ fields.push('is_active=?');  values.push(is_active ? 1 : 0); }
    if (branch_id && req.user.role === 'super_admin') { fields.push('branch_id=?'); values.push(branch_id); }

    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });

    values.push(req.params.id);
    await db.execute(`UPDATE users SET ${fields.join(',')} WHERE id=?`, values);
    res.json({ success: true, message: 'User updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /api/users/:id ─────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    await db.execute('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC / CHURCH WEBSITE endpoints
// ═══════════════════════════════════════════════════════════════

exports.publicBranches = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id,name,code,address,phone,email,pastor_name,is_headquarters FROM branches ORDER BY is_headquarters DESC, name'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.publicSermons = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT s.id,s.title,s.preacher,s.description,s.bible_text,s.sermon_date,s.audio_url,s.video_url,
              b.name AS branch_name
       FROM sermons s LEFT JOIN branches b ON s.branch_id = b.id
       WHERE s.is_published=1 ORDER BY s.sermon_date DESC LIMIT 20`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.publicEvents = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT e.id,e.title,e.description,e.event_date,e.end_date,e.time_start,e.venue,e.flyer_url,
              b.name AS branch_name
       FROM events e LEFT JOIN branches b ON e.branch_id = b.id
       WHERE e.is_published=1 AND e.event_date >= CURDATE()
       ORDER BY e.event_date ASC LIMIT 20`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.publicDonate = async (req, res) => {
  try {
    const { branch_id, donor_name, donor_email, donor_phone, amount, purpose, payment_ref } = req.body;
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ success: false, message: 'Valid amount required' });
    }
    const [result] = await db.execute(
      'INSERT INTO donations (branch_id,donor_name,donor_email,donor_phone,amount,purpose,payment_ref,payment_status) VALUES (?,?,?,?,?,?,?,?)',
      [branch_id || 1, donor_name || 'Anonymous', donor_email || null, donor_phone || null,
       parseFloat(amount), purpose || 'offering', payment_ref || null, 'success']
    );
    res.status(201).json({ success: true, message: 'Donation recorded. Thank you!', data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Attendance
exports.markAttendance = async (req, res) => {
  try {
    const { member_ids, date, service_type } = req.body;
    if (!Array.isArray(member_ids) || !date) {
      return res.status(400).json({ success: false, message: 'member_ids (array) and date required' });
    }
    const bId = req.user.branch_id;
    const values = member_ids.map(mid => [bId, mid, service_type || 'Sunday Service', date, req.user.id]);
    await db.query(
      'INSERT IGNORE INTO attendance (branch_id,member_id,service_type,date,recorded_by) VALUES ?',
      [values]
    );
    res.json({ success: true, message: `${member_ids.length} attendance record(s) marked` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const { date, service_type } = req.query;
    const branchFilter = req.user.role !== 'super_admin' ? `AND a.branch_id = ${req.user.branch_id}` : '';
    const dateFilter   = date ? `AND a.date = '${date}'` : '';
    const typeFilter   = service_type ? `AND a.service_type = '${service_type}'` : '';

    const [rows] = await db.execute(
      `SELECT a.*, m.full_name, m.member_id, b.name AS branch_name
       FROM attendance a
       JOIN members m ON a.member_id = m.id
       JOIN branches b ON a.branch_id = b.id
       WHERE 1=1 ${branchFilter} ${dateFilter} ${typeFilter}
       ORDER BY a.date DESC LIMIT 500`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Departments
exports.getDepartments = async (req, res) => {
  try {
    const branchFilter = req.user.role !== 'super_admin'
      ? `WHERE branch_id = ${req.user.branch_id}` : '';
    const [rows] = await db.execute(`SELECT * FROM departments ${branchFilter} ORDER BY name`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
