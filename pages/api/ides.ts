import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-client'
import type { IDE } from '@/types/database'

interface IDEListResponse {
  ides: IDE[]
  count: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IDEListResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const { status, search, limit = 50, offset = 0 } = req.query

    let query = supabaseAdmin
      .from('ides')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1)

    // Filter by status if provided
    if (status && typeof status === 'string') {
      query = query.eq('status', status)
    }

    // Search by name if provided
    if (search && typeof search === 'string') {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching IDEs:', error)
      res.status(500).json({ error: 'Failed to fetch IDEs' })
      return
    }

    res.status(200).json({
      ides: data || [],
      count: count || 0
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}