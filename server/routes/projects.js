const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { authenticate, authorize, checkProjectAccess } = require('../middleware/auth');

const router = express.Router();

// Get all projects for the current user
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ],
      isArchived: false
    };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const projects = await Project.find(query)
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(query);

    res.json({
      projects,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: projects.length,
        totalCount: total
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error fetching projects' });
  }
});

// Get single project by ID
router.get('/:id', authenticate, checkProjectAccess, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar')
      .populate({
        path: 'members.user',
        select: 'username email avatar'
      });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get project statistics
    const taskStats = await Task.aggregate([
      { $match: { project: project._id } },
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

    res.json({
      project,
      stats: {
        todo: stats.todo || 0,
        'in-progress': stats['in-progress'] || 0,
        review: stats.review || 0,
        completed: stats.completed || 0,
        cancelled: stats.cancelled || 0,
        total: Object.values(stats).reduce((sum, count) => sum + count, 0)
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error fetching project' });
  }
});

// Create new project
router.post('/', authenticate, [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 100 })
    .withMessage('Project name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, priority, startDate, endDate, tags, initialMembers, initialTasks } = req.body;

    // Validate dates
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        message: 'Start date must be before end date'
      });
    }

    const project = new Project({
      name,
      description,
      owner: req.user._id,
      priority: priority || 'medium',
      startDate: startDate || new Date(),
      endDate: endDate || null,
      tags: tags || [],
      members: [{
        user: req.user._id,
        role: 'admin',
        joinedAt: new Date()
      }]
    });

    await project.save();

    // Add initial members if provided
    if (initialMembers && initialMembers.length > 0) {
      const User = require('../models/User');
      for (const memberData of initialMembers) {
        const user = await User.findOne({ email: memberData.email, isActive: true });
        if (user && user._id.toString() !== req.user._id.toString()) {
          const isAlreadyMember = project.members.some(m => m.user.toString() === user._id.toString());
          if (!isAlreadyMember) {
            project.members.push({
              user: user._id,
              role: memberData.role || 'member',
              joinedAt: new Date()
            });
          }
        }
      }
      await project.save();
    }

    // Create initial tasks if provided
    if (initialTasks && initialTasks.length > 0) {
      const Task = require('../models/Task');
      for (const taskData of initialTasks) {
        const task = new Task({
          title: taskData.title,
          description: taskData.description,
          project: project._id,
          assignedTo: taskData.assignedTo && taskData.assignedTo.trim() !== '' ? taskData.assignedTo : undefined,
          createdBy: req.user._id,
          priority: taskData.priority || 'medium',
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          estimatedHours: taskData.estimatedHours,
          tags: taskData.tags || []
        });
        await task.save();
      }
    }

    // Populate project data for response
    await project.populate('owner', 'username email avatar');
    await project.populate('members.user', 'username email avatar');

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error creating project' });
  }
});

// Update project
router.put('/:id', authenticate, checkProjectAccess, [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Project name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Project name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('status')
    .optional()
    .isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled'])
    .withMessage('Invalid status value')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, priority, status, startDate, endDate, tags } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (tags !== undefined) updateData.tags = tags;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;

    // Validate dates
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        message: 'Start date must be before end date'
      });
    }

    // Check if user can update (only owner or admin member can update)
    const isOwner = req.project.owner.toString() === req.user._id.toString();
    const isAdmin = req.project.members.some(member => 
      member.user.toString() === req.user._id.toString() && member.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'Only project owners or admins can update projects'
      });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar');

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error updating project' });
  }
});

// Add member to project
router.post('/:id/members', authenticate, checkProjectAccess, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Role must be admin or member')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, role = 'member' } = req.body;

    // Check if user can add members (only owner or admin member)
    const isOwner = req.project.owner.toString() === req.user._id.toString();
    const isAdmin = req.project.members.some(member => 
      member.user.toString() === req.user._id.toString() && member.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'Only project owners or admins can add members'
      });
    }

    // Find user by email
    const User = require('../models/User');
    const userToAdd = await User.findOne({ email, isActive: true });

    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    const isAlreadyMember = req.project.members.some(member => 
      member.user.toString() === userToAdd._id.toString()
    );

    if (isAlreadyMember) {
      return res.status(400).json({ message: 'User is already a project member' });
    }

    // Add member to project
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          members: {
            user: userToAdd._id,
            role,
            joinedAt: new Date()
          }
        }
      },
      { new: true }
    )
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar');

    res.json({
      message: 'Member added successfully',
      project
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error adding member' });
  }
});

// Remove member from project
router.delete('/:id/members/:memberId', authenticate, checkProjectAccess, async (req, res) => {
  try {
    // Check if user can remove members (only owner or admin member)
    const isOwner = req.project.owner.toString() === req.user._id.toString();
    const isAdmin = req.project.members.some(member => 
      member.user.toString() === req.user._id.toString() && member.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'Only project owners or admins can remove members'
      });
    }

    // Check if trying to remove owner
    const memberToRemove = req.project.members.find(member => 
      member.user.toString() === req.params.memberId
    );

    if (!memberToRemove) {
      return res.status(404).json({ message: 'Member not found' });
    }

    if (req.project.owner.toString() === req.params.memberId) {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }

    // Remove member
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        $pull: {
          members: { user: req.params.memberId }
        }
      },
      { new: true }
    )
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar');

    res.json({
      message: 'Member removed successfully',
      project
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error removing member' });
  }
});

// Delete project (only owner)
router.delete('/:id', authenticate, checkProjectAccess, async (req, res) => {
  try {
    // Only project owner can delete
    if (req.project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Only project owners can delete projects'
      });
    }

    // Archive project instead of deleting
    await Project.findByIdAndUpdate(req.params.id, { isArchived: true });

    res.json({ message: 'Project archived successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error deleting project' });
  }
});

module.exports = router;
