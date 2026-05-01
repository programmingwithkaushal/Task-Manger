const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getDashboardStats
} = require('../controllers/taskController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Dashboard stats — must come before /:id route
router.get('/dashboard/stats', auth, getDashboardStats);

router.get('/', auth, getTasks);
router.get('/:id', auth, getTask);
router.post('/', auth, createTask);
router.put('/:id', auth, updateTask);       // Member can update status
router.delete('/:id', auth, deleteTask);

module.exports = router;
