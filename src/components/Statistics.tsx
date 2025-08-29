import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// Mock data for statistics
const memberAssignmentData = [{
  name: 'John Doe',
  count: 12
}, {
  name: 'Jane Smith',
  count: 8
}, {
  name: 'Mike Johnson',
  count: 15
}, {
  name: 'Sarah Williams',
  count: 10
}, {
  name: 'David Brown',
  count: 7
}];
const songUsageData = [{
  name: 'Amazing Grace',
  count: 5
}, {
  name: 'How Great Is Our God',
  count: 8
}, {
  name: 'Hosanna',
  count: 6
}, {
  name: '10,000 Reasons',
  count: 4
}, {
  name: 'Great Are You Lord',
  count: 7
}];
const setDurationData = [{
  name: 'Week 1',
  duration: 25
}, {
  name: 'Week 2',
  duration: 28
}, {
  name: 'Week 3',
  duration: 22
}, {
  name: 'Week 4',
  duration: 26
}, {
  name: 'Week 5',
  duration: 24
}];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
export const Statistics: React.FC = () => {
  // Calculate average set duration
  const averageDuration = setDurationData.reduce((acc, curr) => acc + curr.duration, 0) / setDurationData.length;
  return <div className="w-full">
      <h2 className="text-xl font-bold mb-4">Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-2">Member Assignments</h3>
          <p className="text-3xl font-bold">
            {memberAssignmentData.reduce((acc, curr) => acc + curr.count, 0)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total assignments
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-2">Song Usage</h3>
          <p className="text-3xl font-bold">
            {songUsageData.reduce((acc, curr) => acc + curr.count, 0)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total songs played
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-2">Average Set Duration</h3>
          <p className="text-3xl font-bold">{averageDuration.toFixed(1)} min</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Average time per service
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">
            Member Assignment Frequency
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberAssignmentData} margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5
            }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Assignments" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Song Usage Frequency</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={songUsageData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="count" nameKey="name" label={({
                name,
                percent
              }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                  {songUsageData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Set Duration by Week</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={setDurationData} margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5
            }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="duration" fill="#00C49F" name="Duration (minutes)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>;
};