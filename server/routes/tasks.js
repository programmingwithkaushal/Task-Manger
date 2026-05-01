const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { authenticate, checkProjectAccess } = require('../middleware/auth');

const router = express.Router();

// Get all tasks for a project
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 20, status, assignedTo, priority, search } = req.query;
    const skip = (page - 1) * limit;

    // Check if user has access to the project
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ],
      isArchived: false
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    // Build query
    const query = { project: projectId };

    if (status) {
      query.status = status;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (priority) {
      query.priority = priority;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'username email avatar')
      .populate('createdBy', 'username email avatar')
      .populate('dependencies', 'title status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: tasks.length,
        totalCount: total
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error fetching tasks' });
  }
});

// Get single task by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name owner members')
      .populate('assignedTo', 'username email avatar')
      .populate('createdBy', 'username email avatar')
      .populate('dependencies', 'title status')
      .populate('comments.user', 'username email avatar');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to the project
    const hasAccess = task.project.owner.toString() === req.user._id.toString() ||
      task.project.members.some(member => member.user.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error fetching task' });
  }
});

// Create new task
router.post('/', authenticate, [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 200 })
    .withMessage('Task title cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('project')
    .notEmpty()
    .withMessage('Project ID is required')
    .isMongoId()
    .withMessage('Invalid project ID'),
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid assigned user ID'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Estimated hours must be between 0 and 1000')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      project,
      assignedTo,
      priority = 'medium',
      dueDate,
      estimatedHours,
      tags,
      dependencies
    } = req.body;

    // Check if user has access to the project
    const projectDoc = await Project.findOne({
      _id: project,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ],
      isArchived: false
    });

    if (!projectDoc) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    // Validate assigned user is a project member
    if (assignedTo) {
      const isMember = projectDoc.owner.toString() === assignedTo ||
        projectDoc.members.some(member => member.user.toString() === assignedTo);

      if (!isMember) {
        return res.status(400).json({ message: 'Assigned user is not a project member' });
      }
    }

    // Validate dependencies exist and belong to the same project
    if (dependencies && dependencies.length > 0) {
      const dependencyTasks = await Task.find({
        _id: { $in: dependencies },
        project: project
      });

      if (dependencyTasks.length !== dependencies.length) {
        return res.status(400).json({ message: 'Some dependencies are invalid or belong to different project' });
      }
    }

    const task = new Task({
      title,
      description,
      project,
      assignedTo,
      createdBy: req.user._id,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedHours,
      tags: tags || [],
      dependencies: dependencies || []
    });

    await task.save();

    // Populate task data for response
    await task.populate('assignedTo', 'username email avatar');
    await task.populate('createdBy', 'username email avatar');
    await task.populate('dependencies', 'title status');

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error creating task' });
  }
});

// Update task
router.put('/:id', authenticate, [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Task title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Task title cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('status')
    .optional()
    .isIn(['todo', 'in-progress', 'review', 'completed', 'cancelled'])
    .withMessage('Invalid status value'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Estimated hours must be between 0 and 1000'),
  body('actualHours')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Actual hours must be between 0 and 1000')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const task = await Task.findById(req.params.id).populate('project', 'owner members');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to the project
    const hasAccess = task.project.owner.toString() === req.user._id.toString() ||
      task.project.members.some(member => member.user.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      title,
      description,
      status,
      priority,
      dueDate,
      estimatedHours,
      actualHours,
      tags,
      assignedTo
    } = req.body;

    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      // Check if status is locked
      if (task.statusLocked) {
        return res.status(400).json({ message: 'Task status is locked and cannot be changed' });
      }
      
      // Prevent reversion to previous statuses
      const statusOrder = ['todo', 'in-progress', 'review', 'completed', 'cancelled'];
      const currentIndex = statusOrder.indexOf(task.status);
      const newIndex = statusOrder.indexOf(status);
      
      if (newIndex < currentIndex && status !== 'cancelled') {
        return res.status(400).json({ message: 'Cannot revert task status to a previous state' });
      }
      
      // Add to status history
      updateData.$push = updateData.$push || {};
      updateData.$push.statusHistory = {
        status: status,
        updatedBy: req.user._id,
        updatedAt: new Date()
      };
      updateData.status = status;
    }
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
    if (actualHours !== undefined) updateData.actualHours = actualHours;
    if (tags !== undefined) updateData.tags = tags;

    // Validate assigned user
    if (assignedTo !== undefined) {
      if (assignedTo) {
        const isMember = task.project.owner.toString() === assignedTo ||
          task.project.members.some(member => member.user.toString() === assignedTo);

        if (!isMember) {
          return res.status(400).json({ message: 'Assigned user is not a project member' });
        }
      }
      updateData.assignedTo = assignedTo;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'username email avatar')
      .populate('createdBy', 'username email avatar')
      .populate('dependencies', 'title status');

    res.json({
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error updating task' });
  }
});

// Add comment to task
router.post('/:id/comments', authenticate, [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { content } = req.body;

    const task = await Task.findById(req.params.id).populate('project', 'owner members');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to the project
    const hasAccess = task.project.owner.toString() === req.user._id.toString() ||
      task.project.members.some(member => member.user.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: {
            user: req.user._id,
            content,
            createdAt: new Date()
          }
        }
      },
      { new: true }
    )
      .populate('assignedTo', 'username email avatar')
      .populate('createdBy', 'username email avatar')
      .populate('comments.user', 'username email avatar');

    res.json({
      message: 'Comment added successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error adding comment' });
  }
});

// Delete task
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project', 'owner members');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user can delete (task creator, project owner, or project admin)
    const isTaskCreator = task.createdBy.toString() === req.user._id.toString();
    const isProjectOwner = task.project.owner.toString() === req.user._id.toString();
    const isProjectAdmin = task.project.members.some(member => 
      member.user.toString() === req.user._id.toString() && member.role === 'admin'
    );

    if (!isTaskCreator && !isProjectOwner && !isProjectAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error deleting task' });
  }
});

// Get user's tasks across all projects
router.get('/my-tasks', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { assignedTo: req.user._id };

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(query)
      .populate('project', 'name status')
      .populate('createdBy', 'username email avatar')
      .sort({ dueDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    // Get overdue tasks count
    const overdueCount = await Task.countDocuments({
      assignedTo: req.user._id,
      dueDate: { $lt: new Date() },
      status: { $ne: 'completed' }
    });

    res.json({
      tasks,
      overdueCount,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: tasks.length,
        totalCount: total
      }
    });
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ message: 'Server error fetching tasks' });
  }
});

// Get dashboard statistics
router.get('/dashboard/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's projects
    const userProjects = await Project.find({
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ],
      isArchived: false
    }).select('_id');

    const projectIds = userProjects.map(p => p._id);

    // Task statistics
    const taskStats = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = taskStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    // Overdue tasks
    const overdueTasks = await Task.countDocuments({
      project: { $in: projectIds },
      dueDate: { $lt: new Date() },
      status: { $ne: 'completed' }
    });

    // Tasks assigned to current user
    const myTasksStats = await Task.aggregate([
      { $match: { assignedTo: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const myStats = myTasksStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    // Recent tasks
    const recentTasks = await Task.find({
      project: { $in: projectIds }
    })
      .populate('project', 'name')
      .populate('assignedTo', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      overallStats: {
        todo: stats.todo || 0,
        'in-progress': stats['in-progress'] || 0,
        review: stats.review || 0,
        completed: stats.completed || 0,
        cancelled: stats.cancelled || 0,
        total: Object.values(stats).reduce((sum, count) => sum + count, 0),
        overdue: overdueTasks
      },
      myStats: {
        todo: myStats.todo || 0,
        'in-progress': myStats['in-progress'] || 0,
        review: myStats.review || 0,
        completed: myStats.completed || 0,
        cancelled: myStats.cancelled || 0,
        total: Object.values(myStats).reduce((sum, count) => sum + count, 0)
      },
      recentTasks
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard stats' });
  }
});

module.exports = router;
