import React, { useState, useEffect } from 'react';
import { DashboardStats } from '../types';
import { tasksAPI } from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await tasksAPI.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

  const StatCard: React.FC<{ title: string; value: number; color: string }> = ({ title, value, color }) => (
    <div className={`${color} rounded-lg p-6 text-white`}>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's an overview of your projects and tasks.</p>
      </div>

      {/* Overall Statistics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Overall Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Tasks" value={stats.overallStats.total} color="bg-blue-500" />
          <StatCard title="To Do" value={stats.overallStats.todo} color="bg-gray-500" />
          <StatCard title="In Progress" value={stats.overallStats['in-progress']} color="bg-yellow-500" />
          <StatCard title="Completed" value={stats.overallStats.completed} color="bg-green-500" />
        </div>
      </div>

      {/* Overdue Tasks Alert */}
      {stats.overallStats.overdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {stats.overallStats.overdue} Overdue Task{stats.overallStats.overdue > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Some tasks are past their due date. Please review and update them.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* My Tasks Statistics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">My Tasks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Assigned to Me" value={stats.myStats.total} color="bg-indigo-500" />
          <StatCard title="In Progress" value={stats.myStats['in-progress']} color="bg-yellow-500" />
          <StatCard title="Completed" value={stats.myStats.completed} color="bg-green-500" />
        </div>
      </div>

      {/* Recent Tasks */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Tasks</h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {stats.recentTasks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No recent tasks found.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {stats.recentTasks.map((task) => (
                <div key={task._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Project: {typeof task.project === 'object' ? task.project.name : 'Unknown Project'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                        task.status === 'review' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status.replace('-', ' ')}
                      </span>
                      {task.assignedTo && typeof task.assignedTo === 'object' && (
                        <div className="flex items-center">
                          <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {task.assignedTo.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
