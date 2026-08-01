const express = require('express');
const router = express.Router();
const controller = require('../controllers/productsController');

router.get('/', controller.listProducts);
router.get('/:id', controller.getProduct);
router.post('/', controller.createProduct);
router.put('/:id', controller.updateProduct);
router.patch('/:id/deactivate', controller.deactivateProduct);
router.delete('/:id', controller.deleteProduct);

module.exports = router;
