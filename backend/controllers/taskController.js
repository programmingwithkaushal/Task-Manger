const Task = require('../models/Task');

/**
 * Task Assignment Logic:
 * - Admin can assign any task to any user via the assignedTo field
 * - Members can only view tasks assigned to them
 * - When a task is created/updated, assignedTo accepts a User ObjectId
 * 
 * Overdue Task Logic:
 * - A task is overdue if: status !== 'Completed' AND dueDate < current date
 * - The Task model has a virtual 'isOverdue' field computed automatically
 * - Dashboard queries filter by this condition for the overdue count
 */

// @desc    Get tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    const { projectId, status, priority, assignedTo } = req.query;
    let filter = {};

    if (projectId) {
      filter.projectId = projectId;
      // If filtering by project, ensure user has access to that project
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ message: 'Project not found.' });
      
      const isOwner = project.createdBy.toString() === req.user._id.toString();
      const isMember = project.members.some(m => m.toString() === req.user._id.toString());
      
      if (!isOwner && !isMember) {
        return res.status(403).json({ message: 'Access denied to this project.' });
      }
      
      // If member, only show their tasks unless they are the owner
      if (!isOwner) {
        filter.assignedTo = req.user._id;
      } else if (assignedTo) {
        filter.assignedTo = assignedTo;
      }
    } else {
      // No project filter: Members only see tasks assigned to them
      filter.assignedTo = req.user._id;
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('projectId', 'title')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('projectId', 'title createdBy');

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const isProjectOwner = task.projectId.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo?._id.toString() === req.user._id.toString();

    if (!isProjectOwner && !isAssigned) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, projectId, priority, status, dueDate } = req.body;

    // Check project ownership
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Only the project creator can add tasks.' });
    }

    const task = await Task.create({
      title,
      description,
      assignedTo: assignedTo || null,
      projectId,
      priority: priority || 'Medium',
      status: status || 'Pending',
      dueDate
    });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('projectId', 'title');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('projectId');

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const isProjectOwner = task.projectId.createdBy.toString() === req.user._id.toString();
    let updateData;

    if (isProjectOwner) {
      // Owner can update everything
      const { title, description, assignedTo, projectId, priority, status, dueDate } = req.body;
      updateData = { title, description, assignedTo, projectId, priority, status, dueDate };
    } else {
      // Member can only update status of tasks assigned to them
      if (task.assignedTo?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied. This task is not assigned to you.' });
      }

      const newStatus = req.body.status;
      if (!newStatus) {
        return res.status(400).json({ message: 'Status is required.' });
      }

      const currentStatus = task.status;
      const validTransitions = {
        'Pending': ['In Progress'],
        'In Progress': ['Completed'],
        'Completed': []
      };

      if (!validTransitions[currentStatus].includes(newStatus)) {
        return res.status(400).json({ 
          message: `Cannot change status from ${currentStatus} to ${newStatus}. Status updates are one-way only.` 
        });
      }

      updateData = { status: newStatus };
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    })
      .populate('assignedTo', 'name email')
      .populate('projectId', 'title');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('projectId');
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    // Only project owner can delete
    if (task.projectId.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Only the project creator can delete tasks.' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/tasks/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    
    // Find all projects where user is owner
    const ownedProjects = await Project.find({ createdBy: req.user._id });
    const ownedProjectIds = ownedProjects.map(p => p._id);

    // Dashboard Logic:
    // - Show aggregate stats for ALL tasks in projects OWNED by user
    // - PLUS tasks assigned to user in other projects
    const allTasks = await Task.find({
      $or: [
        { projectId: { $in: ownedProjectIds } },
        { assignedTo: req.user._id }
      ]
    });

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'Completed').length;
    const pendingTasks = allTasks.filter(t => t.status === 'Pending').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'In Progress').length;
    const overdueTasks = allTasks.filter(t => t.status !== 'Completed' && new Date(t.dueDate) < now).length;

    // My Tasks section (assigned to me)
    const myTasks = await Task.find({ assignedTo: req.user._id })
      .populate('projectId', 'title')
      .sort({ dueDate: 1 })
      .limit(10);

    // Total system members count
    const User = require('../models/User');
    const totalSystemMembers = await User.countDocuments();

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      myTasks,
      totalSystemMembers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
