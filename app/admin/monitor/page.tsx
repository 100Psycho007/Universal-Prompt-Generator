'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabaseAdmin } from '@/lib/supabase-client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface APIMetric {
  endpoint: string
  method: string
  avgResponseTime: number
  totalCalls: number
  errorCount: number
  successRate: number
  lastCalled?: string
}

interface AdminLog {
  id: string
  action: string
  metadata: any
  created_at: string
}

interface ErrorTrend {
  timestamp: string
  count: number
  errorCode?: string
}

interface PerformanceMetric {
  name: string
  avgTime: number
  p95Time: number
  p99Time: number
  targetTime?: number
  isMet: boolean
}

export default function MonitorPage() {
  const router = useRouter()
  const { isAdmin, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [metrics, setMetrics] = useState<APIMetric[]>([])
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([])
  const [errorTrends, setErrorTrends] = useState<ErrorTrend[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30 seconds

  const fetchMonitoringData = async () => {
    setLoading(true)
    try {
      if (!supabaseAdmin) {
        console.error('Supabase admin client not initialized')
        setLoading(false)
        return
      }

      // Fetch API usage stats
      const { data: statsData } = await supabaseAdmin
        .from('api_usage_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)

      if (statsData) {
        const aggregated = aggregateAPIMetrics(statsData)
        setMetrics(aggregated)

        // Calculate performance metrics
        const perfMetrics = calculatePerformanceMetrics(statsData)
        setPerformanceMetrics(perfMetrics)

        // Calculate error trends
        const trends = calculateErrorTrends(statsData)
        setErrorTrends(trends)
      }

      // Fetch admin logs
      const { data: logsData } = await supabaseAdmin
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (logsData) {
        setAdminLogs(logsData)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/')
    } else if (!isLoading && isAdmin) {
      fetchMonitoringData()
      const interval = setInterval(fetchMonitoringData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [isAdmin, isLoading, router, refreshInterval])

  const aggregateAPIMetrics = (stats: any[]): APIMetric[] => {
    const grouped = new Map<string, any[]>()

    stats.forEach((stat) => {
      const key = `${stat.method} ${stat.endpoint}`
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(stat)
    })

    return Array.from(grouped.entries()).map(([key, calls]) => {
      const [method, endpoint] = key.split(' ')
      const totalCalls = calls.length
      const errorCount = calls.filter((c) => c.status_code >= 400).length
      const avgResponseTime =
        calls.reduce((sum, c) => sum + (c.response_time_ms || 0), 0) / totalCalls
      const successRate = ((totalCalls - errorCount) / totalCalls) * 100
      const lastCall = calls[0]

      return {
        endpoint,
        method,
        avgResponseTime: Math.round(avgResponseTime),
        totalCalls,
        errorCount,
        successRate: Math.round(successRate),
        lastCalled: lastCall.created_at
      }
    })
  }

  const calculatePerformanceMetrics = (stats: any[]): PerformanceMetric[] => {
    const targets = {
      'POST /api/prompt/generate': 2000,
      'POST /api/chat': 5000,
      'POST /api/embeddings': 3000,
      'GET /api/ide': 500
    }

    const grouped = new Map<string, number[]>()

    stats.forEach((stat) => {
      const key = `${stat.method} ${stat.endpoint}`
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(stat.response_time_ms || 0)
    })

    return Array.from(grouped.entries())
      .map(([name, times]) => {
        times.sort((a, b) => a - b)
        const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        const p95Index = Math.ceil(times.length * 0.95) - 1
        const p99Index = Math.ceil(times.length * 0.99) - 1
        const p95Time = times[Math.max(0, p95Index)] || avgTime
        const p99Time = times[Math.max(0, p99Index)] || avgTime
        const targetTime = (targets as any)[name]
        const isMet = targetTime ? avgTime <= targetTime : true

        return {
          name,
          avgTime,
          p95Time: Math.round(p95Time),
          p99Time: Math.round(p99Time),
          targetTime,
          isMet
        }
      })
      .sort((a, b) => b.avgTime - a.avgTime)
  }

  const calculateErrorTrends = (stats: any[]): ErrorTrend[] => {
    const grouped = new Map<string, number>()
    const now = new Date()

    stats.forEach((stat) => {
      if (stat.status_code >= 400) {
        const timestamp = new Date(stat.created_at)
        const minuteKey = new Date(timestamp.getTime() - (timestamp.getTime() % 60000))
          .toISOString()
          .substring(0, 16)

        const key = `${minuteKey}:${stat.status_code}`
        grouped.set(key, (grouped.get(key) || 0) + 1)
      }
    })

    return Array.from(grouped.entries())
      .map(([key, count]) => {
        const [timestamp, code] = key.split(':')
        return {
          timestamp,
          count,
          errorCode: code
        }
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .slice(-20)
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      healthy: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    }
    return colors[status] || colors.warning
  }

  if (loading && adminLogs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading monitoring data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Monitoring Dashboard</h1>
            <div className="flex items-center gap-4">
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10000}>Refresh: 10s</option>
                <option value={30000}>Refresh: 30s</option>
                <option value={60000}>Refresh: 1m</option>
              </select>
              <button
                onClick={fetchMonitoringData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Refresh Now
              </button>
              <Link href="/admin" className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                Admin
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-8" aria-label="Tabs">
              {['overview', 'performance', 'errors', 'logs'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-medium">Total API Calls</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {metrics.reduce((sum, m) => sum + m.totalCalls, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-medium">Avg Success Rate</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {metrics.length > 0
                    ? Math.round(
                        metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length
                      )
                    : 0}
                  %
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-medium">Total Errors</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {metrics.reduce((sum, m) => sum + m.errorCount, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-medium">Avg Response Time</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {metrics.length > 0
                    ? Math.round(
                        metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length
                      )
                    : 0}
                  ms
                </p>
              </div>
            </div>

            {/* Top Endpoints */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Top Endpoints</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Endpoint
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Calls
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Avg Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Success Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Errors
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metrics.slice(0, 10).map((metric, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {metric.endpoint}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {metric.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {metric.totalCalls.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {metric.avgResponseTime}ms
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-block px-2 py-1 rounded ${getStatusBadge(metric.successRate >= 99 ? 'healthy' : metric.successRate >= 95 ? 'warning' : 'critical')}`}>
                            {metric.successRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {metric.errorCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Performance Metrics</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Endpoint
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Avg
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        P95
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        P99
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Target
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {performanceMetrics.map((metric, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {metric.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {metric.avgTime}ms
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {metric.p95Time}ms
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {metric.p99Time}ms
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {metric.targetTime ? `${metric.targetTime}ms` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${metric.isMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {metric.isMet ? 'Met' : 'Exceeded'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Performance Targets:</strong> Prompt generation &lt;2s, Chat &lt;5s. Monitor response times to ensure optimal user experience.
              </p>
            </div>
          </div>
        )}

        {/* Errors Tab */}
        {activeTab === 'errors' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Error Trends</h2>
              </div>
              <div className="p-6">
                {errorTrends.length > 0 ? (
                  <div className="space-y-4">
                    {errorTrends.map((trend, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-b-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{trend.timestamp}</p>
                          <p className="text-xs text-gray-600">Status {trend.errorCode}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${trend.errorCode?.startsWith('5') ? 'bg-red-600' : 'bg-yellow-600'}`}
                              style={{
                                width: `${Math.min(100, (trend.count / Math.max(...errorTrends.map(t => t.count))) * 100)}%`
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12 text-right">
                            {trend.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">No errors in the past hour</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Admin Logs</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {adminLogs.length > 0 ? (
                  adminLogs.map((log) => (
                    <div key={log.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{log.action}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                          {log.metadata && (
                            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-32">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center">
                    <p className="text-gray-600">No logs available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  )
}
