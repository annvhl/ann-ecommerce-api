const pool = require('../config/db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/users?page=&limit=
async function listUsers(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count);

    // password_hash is intentionally excluded from every response
    const result = await pool.query(
      `SELECT id, full_name, email, phone, role, is_active, created_at
       FROM users ORDER BY id LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.status(200).json({
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit) || 1,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id
async function getUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, full_name, email, phone, role, is_active, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/users
async function createUser(req, res, next) {
  try {
    const { full_name, email, phone, role } = req.body;

    if (!full_name || !full_name.trim() || !email) {
      return res.status(400).json({ error: 'full_name and email are required' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (role && !['customer', 'admin'].includes(role)) {
      return res.status(400).json({ error: "role must be 'customer' or 'admin'" });
    }

    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, phone, role, is_active, created_at`,
      [full_name, email, phone || null, role || 'customer']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id/status
async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be true or false' });
    }

    const result = await pool.query(
      `UPDATE users SET is_active = $1 WHERE id = $2
       RETURNING id, full_name, email, phone, role, is_active, created_at`,
      [is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUserStatus
};
