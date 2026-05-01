import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { projectsAPI, usersAPI } from '../services/api';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [initialTasks, setInitialTasks] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    tags: ''
  });

  useEffect(() => {
    fetchProjects();
  }, [search, statusFilter]);

  useEffect(() => {
    if (showCreateForm) {
      fetchAvailableUsers();
    }
  }, [showCreateForm]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      
      const response = await projectsAPI.getProjects(params);
      setProjects(response.projects);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await usersAPI.getAllActiveUsers();
      setAvailableUsers(response.users);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      const projectData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        initialMembers: selectedMembers,
        initialTasks: initialTasks
      };
      
      await projectsAPI.createProject(projectData);
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        priority: 'medium',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        tags: ''
      });
      setSelectedMembers([]);
      setInitialTasks([]);
      fetchProjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create project');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
        >
          Create Project
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Status</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="web, design, frontend"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Member Assignment Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Assign Members</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`member-${user.id}`}
                          checked={selectedMembers.some(m => m.email === user.email)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers([...selectedMembers, { email: user.email, role: 'member' }]);
                            } else {
                              setSelectedMembers(selectedMembers.filter(m => m.email !== user.email));
                            }
                          }}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`member-${user.id}`} className="text-sm text-gray-700">{user.username} ({user.email})</label>
                      </div>
                      <select
                        value={selectedMembers.find(m => m.email === user.email)?.role || 'member'}
                        onChange={(e) => {
                          setSelectedMembers(selectedMembers.map(m => 
                            m.email === user.email ? { ...m, role: e.target.value } : m
                          ));
                        }}
                        disabled={!selectedMembers.some(m => m.email === user.email)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Creation Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Add Initial Tasks</h3>
                {initialTasks.map((task, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded mb-2">
                    <div className="flex justify-between mb-2">
                      <input
                        type="text"
                        placeholder="Task title"
                        value={task.title}
                        onChange={(e) => {
                          const updatedTasks = [...initialTasks];
                          updatedTasks[index] = { ...task, title: e.target.value };
                          setInitialTasks(updatedTasks);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setInitialTasks(initialTasks.filter((_, i) => i !== index));
                        }}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      placeholder="Task description"
                      value={task.description}
                      onChange={(e) => {
                        const updatedTasks = [...initialTasks];
                        updatedTasks[index] = { ...task, description: e.target.value };
                        setInitialTasks(updatedTasks);
                      }}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                    />
                    <div className="flex space-x-2">
                      <select
                        value={task.assignedTo}
                        onChange={(e) => {
                          const updatedTasks = [...initialTasks];
                          updatedTasks[index] = { ...task, assignedTo: e.target.value };
                          setInitialTasks(updatedTasks);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Assign to...</option>
                        {[...selectedMembers, { email: 'You', role: 'member' }].map((member, idx) => (
                          <option key={idx} value={member.email}>{member.email}</option>
                        ))}
                      </select>
                      <select
                        value={task.priority || 'medium'}
                        onChange={(e) => {
                          const updatedTasks = [...initialTasks];
                          updatedTasks[index] = { ...task, priority: e.target.value };
                          setInitialTasks(updatedTasks);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setInitialTasks([...initialTasks, { title: '', description: '', assignedTo: '', priority: 'medium' }])}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-700"
                >
                  + Add Task
                </button>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No projects found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                
                {project.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                    {project.priority}
                  </span>
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="flex -space-x-2">
                      {project.members.slice(0, 3).map((member, index) => (
                        <div key={index} className="h-6 w-6 rounded-full bg-primary-500 border-2 border-white flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {typeof member.user === 'object' ? member.user.username.charAt(0).toUpperCase() : '?'}
                          </span>
                        </div>
                      ))}
                      {project.members.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center">
                          <span className="text-gray-600 text-xs font-medium">+{project.members.length - 3}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {project.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="text-sm text-gray-500">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
