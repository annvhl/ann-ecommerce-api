const pool = require('../config/db');

const ALLOWED_SORT_COLUMNS = ['price', 'sku', 'name', 'created_at', 'stock_quantity'];

// GET /api/products?page=&limit=&sort=&order=&category_id=&is_active=
async function listProducts(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const sort = ALLOWED_SORT_COLUMNS.includes(req.query.sort) ? req.query.sort : 'id';
    const order = (req.query.order || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const filters = [];
    const values = [];
    let idx = 1;

    if (req.query.category_id) {
      if (isNaN(Number(req.query.category_id))) {
        return res.status(400).json({ error: 'category_id must be a number' });
      }
      filters.push(`category_id = $${idx++}`);
      values.push(req.query.category_id);
    }

    if (req.query.is_active !== undefined) {
      filters.push(`is_active = $${idx++}`);
      values.push(req.query.is_active === 'true');
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM products ${whereClause}`, values);
    const total = parseInt(countResult.rows[0].count);

    const dataValues = [...values, limit, offset];
    const dataResult = await pool.query(
      `SELECT * FROM products ${whereClause} ORDER BY ${sort} ${order} LIMIT $${idx++} OFFSET $${idx++}`,
      dataValues
    );

    res.status(200).json({
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit) || 1,
      data: dataResult.rows
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id
async function getProduct(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/products
async function createProduct(req, res, next) {
  try {
    const { category_id, name, description, price, stock_quantity, sku } = req.body;

    if (!category_id || !name || price === undefined || price === null) {
      return res.status(400).json({ error: 'category_id, name, and price are required' });
    }
    if (isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ error: 'price must be a number greater than 0' });
    }
    if (stock_quantity !== undefined && (isNaN(Number(stock_quantity)) || Number(stock_quantity) < 0)) {
      return res.status(400).json({ error: 'stock_quantity must be a number that is 0 or greater' });
    }

    const categoryCheck = await pool.query('SELECT id FROM categories WHERE id = $1', [category_id]);
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'category_id does not reference an existing category' });
    }

    const result = await pool.query(
      `INSERT INTO products (category_id, name, description, price, stock_quantity, sku)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [category_id, name, description || null, price, stock_quantity || 0, sku || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// PUT /api/products/:id  (full update)
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { category_id, name, description, price, stock_quantity, sku, is_active } = req.body;

    const existing = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (price !== undefined && (isNaN(Number(price)) || Number(price) <= 0)) {
      return res.status(400).json({ error: 'price must be a number greater than 0' });
    }
    if (stock_quantity !== undefined && (isNaN(Number(stock_quantity)) || Number(stock_quantity) < 0)) {
      return res.status(400).json({ error: 'stock_quantity must be a number that is 0 or greater' });
    }

    if (category_id) {
      const categoryCheck = await pool.query('SELECT id FROM categories WHERE id = $1', [category_id]);
      if (categoryCheck.rows.length === 0) {
        return res.status(404).json({ error: 'category_id does not reference an existing category' });
      }
    }

    const current = existing.rows[0];
    const result = await pool.query(
      `UPDATE products SET
        category_id = $1, name = $2, description = $3, price = $4,
        stock_quantity = $5, sku = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [
        category_id ?? current.category_id,
        name ?? current.name,
        description ?? current.description,
        price ?? current.price,
        stock_quantity ?? current.stock_quantity,
        sku ?? current.sku,
        is_active ?? current.is_active,
        id
      ]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/products/:id/deactivate
async function deactivateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/products/:id
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json({ message: 'Product deleted', product: result.rows[0] });
  } catch (err) {
    // If the product is referenced in order_items, Postgres raises a
    // foreign key violation (23503), which errorHandler.js turns into
    // a 409 with a clear message instead of a raw crash.
    next(err);
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deactivateProduct,
  deleteProduct
};
