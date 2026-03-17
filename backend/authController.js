// controllers/membersController.js
const db = require('../config/database');

// helper: generate unique member ID
const generateMemberId = async (branchCode) => {
  const [rows] = await db.execute(
    "SELECT COUNT(*) AS cnt FROM members WHERE member_id LIKE ?",
    [`${branchCode}%`]
  );
  const seq = String(rows[0].cnt + 1).padStart(4, '0');
  return `${branchCode}${seq}`;
};

// ── GET /api/members ──────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { branch_id, status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    // Branch scope
    if (req.user.role !== 'super_admin') {
      where += ' AND m.branch_id = ?';
      params.push(req.user.branch_id);
    } else if (branch_id) {
      where += ' AND m.branch_id = ?';
      params.push(branch_id);
    }

    if (status) { where += ' AND m.membership_status = ?'; params.push(status); }

    if (search) {
      where += ' AND (m.full_name LIKE ? OR m.member_id LIKE ? OR m.phone LIKE ? OR m.email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const [members] = await db.execute(
      `SELECT m.*, b.name AS branch_name, d.name AS department_name
       FROM members m
       LEFT JOIN branches b ON m.branch_id = b.id
       LEFT JOIN departments d ON m.department_id = d.id
       ${where}
       ORDER BY m.full_name ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM members m ${where}`,
      params
    );

    res.json({
      success: true,
      data: members,
      pagination: {
        total: countRows[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countRows[0].total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/members/:id ──────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT m.*, b.name AS branch_name, d.name AS department_name
       FROM members m
       LEFT JOIN branches b ON m.branch_id = b.id
       LEFT JOIN departments d ON m.department_id = d.id
       WHERE m.id = ?`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: 'Member not found' });

    // Branch scope check
    if (req.user.role !== 'super_admin' && rows[0].branch_id !== req.user.branch_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /api/members ─────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const {
      branch_id, department_id, full_name, gender, date_of_birth,
      phone, email, address, occupation, marital_status, date_joined,
      baptized, worker, next_of_kin, next_of_kin_phone
    } = req.body;

    const bId = req.user.role === 'super_admin' ? branch_id : req.user.branch_id;

    // Get branch code for member_id generation
    const [branchRows] = await db.execute('SELECT code FROM branches WHERE id = ?', [bId]);
    if (!branchRows.length) return res.status(400).json({ success: false, message: 'Invalid branch' });

    const memberId = await generateMemberId(branchRows[0].code);

    const [result] = await db.execute(
      `INSERT INTO members
         (member_id, branch_id, department_id, full_name, gender, date_of_birth,
          phone, email, address, occupation, marital_status, date_joined,
          baptized, worker, next_of_kin, next_of_kin_phone, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [memberId, bId, department_id || null, full_name, gender, date_of_birth || null,
       phone || null, email || null, address || null, occupation || null,
       marital_status || 'Single', date_joined, baptized ? 1 : 0, worker ? 1 : 0,
       next_of_kin || null, next_of_kin_phone || null, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Member registered successfully',
      data: { id: result.insertId, member_id: memberId }
    });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Member already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PUT /api/members/:id ──────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.execute('SELECT branch_id FROM members WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Member not found' });
    if (req.user.role !== 'super_admin' && existing[0].branch_id !== req.user.branch_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      department_id, full_name, gender, date_of_birth, phone, email,
      address, occupation, marital_status, membership_status, date_joined,
      baptized, worker, next_of_kin, next_of_kin_phone
    } = req.body;

    await db.execute(
      `UPDATE members SET
         department_id=?, full_name=?, gender=?, date_of_birth=?, phone=?, email=?,
         address=?, occupation=?, marital_status=?, membership_status=?, date_joined=?,
         baptized=?, worker=?, next_of_kin=?, next_of_kin_phone=?
       WHERE id=?`,
      [department_id || null, full_name, gender, date_of_birth || null, phone || null,
       email || null, address || null, occupation || null, marital_status, membership_status,
       date_joined, baptized ? 1 : 0, worker ? 1 : 0, next_of_kin || null,
       next_of_kin_phone || null, id]
    );

    res.json({ success: true, message: 'Member updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /api/members/:id ───────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const [existing] = await db.execute('SELECT branch_id FROM members WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Member not found' });
    if (req.user.role !== 'super_admin' && existing[0].branch_id !== req.user.branch_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await db.execute('DELETE FROM members WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/members/stats ────────────────────────────────────
exports.stats = async (req, res) => {
  try {
    const branchFilter = req.user.role !== 'super_admin' ? `AND m.branch_id = ${req.user.branch_id}` : '';

    const [totals] = await db.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(membership_status = 'Active')   AS active,
         SUM(membership_status = 'Inactive') AS inactive,
         SUM(gender = 'Male')   AS male,
         SUM(gender = 'Female') AS female,
         SUM(baptized = 1)      AS baptized,
         SUM(worker = 1)        AS workers
       FROM members m WHERE 1=1 ${branchFilter}`
    );

    const [byBranch] = await db.execute(
      `SELECT b.name AS branch_name, b.code,
              COUNT(m.id) AS total,
              SUM(m.membership_status = 'Active') AS active
       FROM branches b
       LEFT JOIN members m ON b.id = m.branch_id
       GROUP BY b.id ORDER BY total DESC`
    );

    res.json({ success: true, data: { summary: totals[0], by_branch: byBranch } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
