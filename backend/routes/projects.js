const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject
} = require('../controllers/projectController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/', auth, getProjects);
router.get('/:id', auth, getProject);
router.post('/', auth, admin, createProject);
router.put('/:id', auth, admin, updateProject);
router.delete('/:id', auth, admin, deleteProject);

module.exports = router;
