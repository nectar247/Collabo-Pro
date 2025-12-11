"use client";

import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { Users, Tag, DollarSign, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import ExpiredDealsCleanup from './ExpiredDealsCleanup';

// Lazy load heavy chart components
const LineChart = lazy(() => import('./charts/LineChart'));
const BarChart = lazy(() => import('./charts/BarChart'));

interface AnalyticsData {
  totalUsers: number;
  activeDeals: number;
  monthlyRevenue: number;
  avgSessionDuration: number;
  userGrowth: number;
  dealGrowth: number;
  revenueGrowth: number;
  sessionGrowth: number;
}

export default function AnalyticsOverview() {
  const [timeRange, setTimeRange] = useState('7d');
  const [lastFetch, setLastFetch] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalUsers: 0,
    activeDeals: 0,
    monthlyRevenue: 0,
    avgSessionDuration: 0,
    userGrowth: 0,
    dealGrowth: 0,
    revenueGrowth: 0,
    sessionGrowth: 0
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
      try {
        setLoading(true); // Force loading state on each fetch

        console.log('🔄 Fetching analytics data...', new Date().toISOString());

        // Fetch total users
        const usersQuery = query(collection(db, 'profiles'));
        const usersSnapshot = await getDocs(usersQuery);
        const totalUsers = usersSnapshot.size;

        console.log('👥 Total users:', totalUsers);

        // Fetch active deals with getCountFromServer for accurate count
        const dealsQuery = query(
          collection(db, 'deals_fresh'),
          where('status', '==', 'active')
        );

        console.log('🔍 Querying active deals...');
        const dealsCount = await getCountFromServer(dealsQuery);
        const activeDeals = dealsCount.data().count;

        console.log('✅ Active deals count:', activeDeals);

        // Calculate monthly revenue (from completed transactions)
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('createdAt', '>=', monthStart),
          orderBy('createdAt', 'desc')
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const monthlyRevenue = transactionsSnapshot.docs.reduce(
          (sum, doc) => sum + doc.data().amount,
          0
        );

        // Calculate average session duration
        const sessionsQuery = query(
          collection(db, 'sessions'),
          orderBy('duration', 'desc'),
          limit(100)
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const avgSessionDuration = sessionsSnapshot.docs.reduce(
          (sum, doc) => sum + doc.data().duration,
          0
        ) / (sessionsSnapshot.size || 1);

        // Calculate growth percentages (comparing to previous period)
        const userGrowth = 12; // Example: 12% growth
        const dealGrowth = 5;  // Example: 5% growth
        const revenueGrowth = 18; // Example: 18% growth
        const sessionGrowth = 7;  // Example: 7% growth

        setAnalyticsData({
          totalUsers,
          activeDeals,
          monthlyRevenue,
          avgSessionDuration,
          userGrowth,
          dealGrowth,
          revenueGrowth,
          sessionGrowth
        });
        setLastFetch(new Date().toLocaleTimeString());
        setLoading(false);

        console.log('✅ Analytics updated successfully');
      } catch (error) {
        console.error('❌ Error fetching analytics:', error);
        setLoading(false);
      }
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchAnalytics();
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchAnalytics();

    // Auto-refresh every 30 seconds to keep data fresh
    const refreshInterval = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [timeRange, fetchAnalytics]);

  const stats = [
    {
      label: "Total Users",
      value: analyticsData.totalUsers.toLocaleString(),
      icon: Users,
      change: `${analyticsData.userGrowth > 0 ? '+' : ''}${analyticsData.userGrowth}%`,
      trend: analyticsData.userGrowth >= 0 ? 'up' : 'down',
      color: "from-secondary/20 to-tertiary/20"
    },
    {
      label: "Active Deals",
      value: analyticsData.activeDeals.toLocaleString(),
      icon: Tag,
      change: `${analyticsData.dealGrowth > 0 ? '+' : ''}${analyticsData.dealGrowth}%`,
      trend: analyticsData.dealGrowth >= 0 ? 'up' : 'down',
      color: "from-blue-500/20 to-blue-600/20"
    },
    {
      label: "Monthly Revenue",
      value: `$${analyticsData.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      change: `${analyticsData.revenueGrowth > 0 ? '+' : ''}${analyticsData.revenueGrowth}%`,
      trend: analyticsData.revenueGrowth >= 0 ? 'up' : 'down',
      color: "from-purple-500/20 to-purple-600/20"
    },
    {
      label: "Avg. Session",
      value: `${Math.floor(analyticsData.avgSessionDuration / 60)}m ${Math.floor(analyticsData.avgSessionDuration % 60)}s`,
      icon: Clock,
      change: `${analyticsData.sessionGrowth > 0 ? '+' : ''}${analyticsData.sessionGrowth}%`,
      trend: analyticsData.sessionGrowth >= 0 ? 'up' : 'down',
      color: "from-orange-500/20 to-orange-600/20"
    }
  ];

  const lineChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'User Activity',
        data: [65, 59, 80, 81, 56, 55, 70],
        fill: true,
        borderColor: '#FF8F00',
        backgroundColor: '#ff8f003d',
        tension: 0.4,
      },
    ],
  };

  const barChartData = {
    labels: ['Electronics', 'Fashion', 'Food', 'Travel', 'Beauty', 'Sports'],
    datasets: [
      {
        label: 'Deal Redemptions',
        data: [300, 250, 200, 175, 150, 125],
        backgroundColor: '#FF8F00',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tertiary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Time Range Selector and Refresh */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-tertiary text-white rounded-lg hover:bg-tertiary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <ExpiredDealsCleanup onCleanupComplete={handleManualRefresh} />
          {lastFetch && (
            <span className="text-sm text-gray-600">
              Last updated: {lastFetch}
            </span>
          )}
        </div>
        <div className="flex space-x-2">
        {['24h', '7d', '30d', '90d'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              timeRange === range
                ? 'bg-tertiary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {range}
          </button>
        ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600">{stat.label}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <TrendingUp
                className={`h-4 w-4 ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-500'
                }`}
              />
              <span
                className={`text-sm ml-1 ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {stat.change} from last {timeRange}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity</h3>
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
            <LineChart data={lineChartData} options={chartOptions} />
          </Suspense>
        </motion.div>

        {/* Deal Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Performance by Category</h3>
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
            <BarChart data={barChartData} options={chartOptions} />
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}