const express = require('express');
const router = express.Router();
const { signup, login } = require('../controller/authController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);

 

module.exports = router;
