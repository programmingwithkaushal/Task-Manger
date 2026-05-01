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

// @desc    Get tasks (Admin sees all, Member sees own)
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    const { projectId, status, priority, assignedTo } = req.query;
    let filter = {};

    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    if (req.user.role === 'Admin') {
      if (assignedTo) filter.assignedTo = assignedTo;
    } else {
      // Members only see tasks assigned to them
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
      .populate('projectId', 'title');

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Members can only view their own tasks
    if (req.user.role !== 'Admin' && task.assignedTo?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Admin only
exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, projectId, priority, status, dueDate } = req.body;

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

// @desc    Update task (Admin: full edit, Member: status only)
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    let updateData;

    if (req.user.role === 'Admin') {
      // Admin can update everything
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

      /**
       * Status Flow Logic:
       * - Pending -> In Progress (Accepting)
       * - In Progress -> Completed (Finishing)
       * - Reverting back is NOT allowed for members
       */
      const currentStatus = task.status;
      const validTransitions = {
        'Pending': ['In Progress'],
        'In Progress': ['Completed'],
        'Completed': [] // Final state
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
// @access  Admin only
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

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
    /**
     * Dashboard Logic:
     * - Admin sees stats for ALL tasks across all projects
     * - Member sees stats only for tasks assigned to them
     * - Overdue = status !== 'Completed' && dueDate < now
     */
    const now = new Date();
    let filter = {};

    if (req.user.role !== 'Admin') {
      filter.assignedTo = req.user._id;
    }

    const allTasks = await Task.find(filter);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'Completed').length;
    const pendingTasks = allTasks.filter(t => t.status === 'Pending').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'In Progress').length;
    const overdueTasks = allTasks.filter(t => t.status !== 'Completed' && new Date(t.dueDate) < now).length;

    // Tasks assigned to the logged-in user (always filtered by current user)
    const myTasks = await Task.find({ assignedTo: req.user._id })
      .populate('projectId', 'title')
      .sort({ dueDate: 1 })
      .limit(10);

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      myTasks
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
