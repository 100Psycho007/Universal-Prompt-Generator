'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabaseAdmin } from '@/lib/supabase-client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface IDEWithStats {
  id: string
  name: string
  docs_url: string | null
  status: string
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
  ingest_status?: any
  chunk_count?: number
}

interface User {
  id: string
  email: string
  role: string
  created_at: string
  profile: any
}

interface APIUsageStat {
  id: string
  user_id: string | null
  endpoint: string
  method: string
  status_code: number
  response_time_ms: number
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const { isAdmin, isLoading } = useAuth()
  const [ides, setIDEs] = useState<IDEWithStats[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [apiStats, setApiStats] = useState<APIUsageStat[]>([])
  const [adminLogs, setAdminLogs] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ides')
  const [reindexing, setReindexing] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/')
    } else if (!isLoading && isAdmin) {
      fetchData()
    }
  }, [isAdmin, isLoading, router])

  const fetchData = async () => {
    setDataLoading(true)
    try {
      if (!supabaseAdmin) {
        console.error('Supabase admin client not initialized')
        setDataLoading(false)
        return
      }

      // Fetch IDEs with stats
      const { data: idesData } = await supabaseAdmin
        .from('ides')
        .select('*')
        .order('created_at', { ascending: false })

      if (idesData) {
        const idesWithStats = await Promise.all(
          idesData.map(async (ide) => {
            const { count: chunkCount } = await (supabaseAdmin as any)
              .from('doc_chunks')
              .select('*', { count: 'exact', head: true })
              .eq('ide_id', ide.id)

            const { data: ingestStatus } = await (supabaseAdmin as any)
              .from('ingest_status')
              .select('*')
              .eq('ide_id', ide.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            return {
              ...ide,
              chunk_count: chunkCount || 0,
              ingest_status: ingestStatus
            }
          })
        )
        setIDEs(idesWithStats)
      }

      // Fetch users
      const { data: usersData } = await (supabaseAdmin as any)
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersData) {
        setUsers(usersData)
      }

      // Fetch API usage stats
      const { data: statsData } = await (supabaseAdmin as any)
        .from('api_usage_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (statsData) {
        setApiStats(statsData)
      }

      // Fetch admin logs
      const { data: logsData } = await (supabaseAdmin as any)
        .from('admin_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50)

      if (logsData) {
        setAdminLogs(logsData)
      }
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const handleReindexIDE = async (ideId: string) => {
    setReindexing(ideId)
    try {
      if (!supabaseAdmin) {
        console.error('Supabase admin client not initialized')
        return
      }

      // Insert ingest status
      const { error } = await (supabaseAdmin as any)
        .from('ingest_status')
        .insert({
          ide_id: ideId,
          status: 'pending',
          chunks_processed: 0
        })

      if (error) {
        console.error('Error starting reindex:', error)
      } else {
        // Refresh data
        await fetchData()
      }
    } finally {
      setReindexing(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400">Access Denied: Admin only</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-white">
              Admin Panel
            </Link>
            <Link href="/" className="text-gray-300 hover:text-white">
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-8 border-b border-gray-700">
          {['ides', 'users', 'api-stats', 'logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium ${
                activeTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab === 'ides'
                ? 'IDEs'
                : tab === 'users'
                ? 'Users'
                : tab === 'api-stats'
                ? 'API Stats'
                : 'Logs'}
            </button>
          ))}
        </div>

        {dataLoading ? (
          <div className="text-gray-400 text-center py-8">Loading data...</div>
        ) : (
          <>
            {activeTab === 'ides' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">IDEs Management</h2>
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          IDE Name
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          Chunks
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          Last Ingest
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {ides.map((ide) => (
                        <tr key={ide.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 text-sm text-gray-300">{ide.name}</td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                ide.status === 'active'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              {ide.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">{ide.chunk_count}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {ide.ingest_status
                              ? new Date(ide.ingest_status.completed_at || ide.ingest_status.created_at).toLocaleDateString()
                              : 'Never'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => handleReindexIDE(ide.id)}
                              disabled={reindexing === ide.id}
                              className="text-blue-400 hover:text-blue-300 disabled:text-gray-500"
                            >
                              {reindexing === ide.id ? 'Reindexing...' : 'Re-crawl'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Users Management</h2>
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          Created At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 text-sm text-gray-300">{user.email}</td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                user.role === 'admin'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'api-stats' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">API Usage Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Total Requests</div>
                    <div className="text-3xl font-bold text-white">{apiStats.length}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Avg Response Time</div>
                    <div className="text-3xl font-bold text-white">
                      {apiStats.length > 0
                        ? Math.round(
                            apiStats.reduce((acc, s) => acc + (s.response_time_ms || 0), 0) /
                              apiStats.length
                          )
                        : 0}
                      ms
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Unique Endpoints</div>
                    <div className="text-3xl font-bold text-white">
                      {new Set(apiStats.map((s) => s.endpoint)).size}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Success Rate</div>
                    <div className="text-3xl font-bold text-white">
                      {apiStats.length > 0
                        ? Math.round(
                            (apiStats.filter((s) => s.status_code < 400).length / apiStats.length) *
                              100
                          )
                        : 0}
                      %
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          Endpoint
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          Method
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          Response Time
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {apiStats.slice(0, 50).map((stat) => (
                        <tr key={stat.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 text-sm text-gray-300">{stat.endpoint}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{stat.method}</td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                stat.status_code < 400
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {stat.status_code}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {stat.response_time_ms}ms
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {new Date(stat.created_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Admin Logs</h2>
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          Action
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          IDE
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                          Timestamp
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {adminLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 text-sm text-gray-300">{log.action}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {log.ide?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
