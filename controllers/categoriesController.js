const pool = require('../config/db');

// GET /api/categories
async function listCategories(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/categories/:id
async function getCategory(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/categories
async function createCategory(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const result = await pool.query(
      `INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *`,
      [name, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// PUT /api/categories/:id
async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const existing = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'name cannot be empty' });
    }

    const current = existing.rows[0];
    const result = await pool.query(
      `UPDATE categories SET name = $1, description = $2, is_active = $3 WHERE id = $4 RETURNING *`,
      [name ?? current.name, description ?? current.description, is_active ?? current.is_active, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/categories/:id
async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(200).json({ message: 'Category deleted', category: result.rows[0] });
  } catch (err) {
    // Deleting a category still linked to products raises a foreign key
    // violation (23503) -> errorHandler.js returns 409 Conflict.
    next(err);
  }
}

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
};
