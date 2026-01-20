import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value)
  })

  try {
    const supabase = getSupabaseClient()

    const id = req.query.id as string | undefined
    const search = req.query.search as string | undefined
    const limit = parseInt((req.query.limit as string) || '50', 10)
    const offset = parseInt((req.query.offset as string) || '0', 10)

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit parameter (must be 1-100)',
      })
    }

    if (isNaN(offset) || offset < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid offset parameter (must be >= 0)',
      })
    }

    if (id) {
      console.log('Getting single meeting:', id)

      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .single()

      if (meetingError || !meeting) {
        console.error('Meeting not found:', id)
        return res.status(404).json({ success: false, error: 'Meeting not found' })
      }

      const [actionItemsResult, decisionsResult, risksResult, followUpsResult] = await Promise.all([
        supabase.from('action_items').select('*').eq('meeting_id', id).order('created_at', { ascending: true }),
        supabase.from('decisions').select('*').eq('meeting_id', id).order('created_at', { ascending: true }),
        supabase.from('risks').select('*').eq('meeting_id', id).order('created_at', { ascending: true }),
        supabase.from('follow_ups').select('*').eq('meeting_id', id).order('created_at', { ascending: true }),
      ])

      return res.status(200).json({
        success: true,
        meeting: {
          ...meeting,
          actionItems: actionItemsResult.data || [],
          decisions: decisionsResult.data || [],
          risks: risksResult.data || [],
          followUps: followUpsResult.data || [],
        },
      })
    }

    if (search) {
      console.log('Searching meetings:', search)

      const { data: meetings, error } = await supabase
        .from('meetings')
        .select('*')
        .or(`title.ilike.%${search}%,summary.ilike.%${search}%,transcript.ilike.%${search}%`)
        .order('date', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Search error:', error)
        return res.status(500).json({ success: false, error: `Search failed: ${error.message}` })
      }

      return res.status(200).json({ success: true, meetings: meetings || [] })
    }

    console.log('Listing meetings:', { limit, offset })

    const { count, error: countError } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Count error:', countError)
    }

    const { data: meetings, error } = await supabase
      .from('meetings')
      .select('*')
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('List error:', error)
      return res.status(500).json({ success: false, error: `Failed to list meetings: ${error.message}` })
    }

    return res.status(200).json({
      success: true,
      meetings: meetings || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + (meetings?.length || 0) < (count || 0),
      },
    })
  } catch (error) {
    console.error('Meetings error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch meetings'
    return res.status(500).json({ success: false, error: message })
  }
}
