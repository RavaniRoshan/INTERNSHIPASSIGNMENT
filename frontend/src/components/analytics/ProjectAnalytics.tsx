'use client';

import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../../lib/api';
import { ProjectAnalyticsData, FunnelAnalytics } from '../../lib/types';
import AnalyticsChart from './AnalyticsChart';
import MetricCard from './MetricCard';

interface ProjectAnalyticsProps {
  projectId: string;
  projectTitle: string;
}

export const ProjectAnalytics: React.FC<ProjectAnalyticsProps> = ({
  projectId,
  projectTitle,
}) => {
  const [analytics, setAnalytics] = useState<ProjectAnalyticsData[]>([]);
  const [funnel, setFunnel] = useState<FunnelAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const [analyticsData, funnelData] = await Promise.all([
          analyticsAPI.getProjectAnalytics(projectId, timeRange),
          analyticsAPI.getFunnelAnalytics(projectId),
        ]);

        setAnalytics(analyticsData);
        setFunnel(funnelData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [projectId, timeRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Analytics</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  const totalViews = analytics.reduce((sum, day) => sum + day.views, 0);
  const totalUniqueViews = analytics.reduce((sum, day) => sum + day.uniqueViews, 0);
  const avgEngagementRate = analytics.length > 0 
    ? analytics.reduce((sum, day) => sum + day.engagementRate, 0) / analytics.length 
    : 0;
  const avgCTR = analytics.length > 0 
    ? analytics.reduce((sum, day) => sum + day.ctr, 0) / analytics.length 
    : 0;

  // Prepare chart data
  const chartData = analytics.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    views: day.views,
    uniqueViews: day.uniqueViews,
    engagementRate: (day.engagementRate * 100).toFixed(1),
  })).reverse();

  // Prepare referral sources data for pie chart
  const referralData = Object.entries(
    analytics.reduce((acc, day) => {
      Object.entries(day.referralSources).forEach(([source, count]) => {
        acc[source] = (acc[source] || 0) + count;
      });
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600">{projectTitle}</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value) as 7 | 30 | 90)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Views"
          value={totalViews}
          color="blue"
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />
        <MetricCard
          title="Unique Views"
          value={totalUniqueViews}
          color="green"
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Avg. Engagement Rate"
          value={`${(avgEngagementRate * 100).toFixed(1)}%`}
          color="purple"
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Avg. CTR"
          value={`${(avgCTR * 100).toFixed(2)}%`}
          color="yellow"
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views Trend */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <AnalyticsChart
            data={chartData}
            type="area"
            xKey="date"
            yKey="views"
            title="Views Over Time"
            color="#3B82F6"
            height={300}
          />
        </div>

        {/* Engagement Rate Trend */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <AnalyticsChart
            data={chartData}
            type="line"
            xKey="date"
            yKey="engagementRate"
            title="Engagement Rate (%)"
            color="#10B981"
            height={300}
          />
        </div>
      </div>

      {/* Referral Sources and Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral Sources */}
        {referralData.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <AnalyticsChart
              data={referralData}
              type="pie"
              xKey="name"
              yKey="value"
              title="Traffic Sources"
              height={300}
            />
          </div>
        )}

        {/* Funnel Analytics */}
        {funnel && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-blue-900">Views</span>
                <span className="text-blue-600 font-bold">{funnel.views.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-green-900">Engagements</span>
                <span className="text-green-600 font-bold">{funnel.engagements.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="font-medium text-purple-900">Follows</span>
                <span className="text-purple-600 font-bold">{funnel.follows.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="font-medium text-yellow-900">Conversion Rate</span>
                <span className="text-yellow-600 font-bold">{funnel.conversionRate.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            // In a real app, this would trigger a CSV/PDF export
            const csvData = analytics.map(day => ({
              Date: new Date(day.date).toLocaleDateString(),
              Views: day.views,
              'Unique Views': day.uniqueViews,
              'Engagement Rate': (day.engagementRate * 100).toFixed(2) + '%',
              CTR: (day.ctr * 100).toFixed(2) + '%',
            }));
            
            const csvContent = [
              Object.keys(csvData[0]).join(','),
              ...csvData.map(row => Object.values(row).join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectTitle}-analytics.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Export Data
        </button>
      </div>
    </div>
  );
};

export default ProjectAnalytics;