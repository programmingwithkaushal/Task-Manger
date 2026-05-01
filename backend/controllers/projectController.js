const Project = require('../models/Project');
const Task = require('../models/Task');

// @desc    Get all projects (Admin sees all, Member sees assigned only)
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
  try {
    let projects;
    if (req.user.role === 'Admin') {
      projects = await Project.find()
        .populate('createdBy', 'name email')
        .populate('members', 'name email role')
        .sort({ createdAt: -1 });
    } else {
      projects = await Project.find({ members: req.user._id })
        .populate('createdBy', 'name email')
        .populate('members', 'name email role')
        .sort({ createdAt: -1 });
    }
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email role');

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Members can only view projects they belong to
    if (req.user.role !== 'Admin' && !project.members.some(m => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Admin only
exports.createProject = async (req, res) => {
  try {
    const { title, description, deadline, members } = req.body;

    const project = await Project.create({
      title,
      description,
      deadline,
      createdBy: req.user._id,
      members: members || []
    });

    const populated = await Project.findById(project._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email role');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Admin only
exports.updateProject = async (req, res) => {
  try {
    const { title, description, deadline, members } = req.body;

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { title, description, deadline, members },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('members', 'name email role');

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete project (also deletes associated tasks)
// @route   DELETE /api/projects/:id
// @access  Admin only
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Cascade delete all tasks belonging to this project
    await Task.deleteMany({ projectId: req.params.id });

    res.json({ message: 'Project and associated tasks deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
