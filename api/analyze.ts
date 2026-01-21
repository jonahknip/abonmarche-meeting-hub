import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const SYSTEM_PROMPT = `You are analyzing meeting transcripts for Abonmarche, an engineering firm specializing in infrastructure inspection and municipal projects.

Extract from the meeting transcript:
- Action items: {task, owner (person's name or null), deadline (date string or null), priority (high|medium|low), confidence (0-1)}
- Decisions: {decision, context (brief explanation), confidence (0-1)}
- Risks: {risk, severity (high|medium|low), mitigation (suggested action or null), confidence (0-1)}
- Follow-ups: {purpose, attendees (array of names), suggestedDate (date string or null), confidence (0-1)}
- Topics: string[] (main discussion points, 3-7 items)
- Projects: string[] (pipeline names, client names, project references)
- Summary: 2-3 sentence executive overview

Return ONLY valid JSON matching this exact schema:
{
  "summary": "string",
  "actionItems": [...],
  "decisions": [...],
  "risks": [...],
  "followUps": [...],
  "topics": [...],
  "projects": [...]
}

Be thorough but concise. Extract actual names mentioned in the transcript for owners and attendees.`

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

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable')
  }
  return new Anthropic({ 
    apiKey,
    timeout: 50000,
  })
}

function parseJsonResponse(content: string) {
  let jsonStr = content.trim()

  if (jsonStr.includes('```json')) {
    jsonStr = jsonStr.split('```json')[1].split('```')[0]
  } else if (jsonStr.includes('```')) {
    jsonStr = jsonStr.split('```')[1].split('```')[0]
  }

  const parsed = JSON.parse(jsonStr.trim())

  return {
    summary: parsed.summary || '',
    actionItems: (parsed.actionItems || []).map((item: Record<string, unknown>) => ({
      task: item.task || '',
      owner: item.owner || null,
      deadline: item.deadline || null,
      priority: item.priority || 'medium',
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.8,
    })),
    decisions: (parsed.decisions || []).map((d: Record<string, unknown>) => ({
      decision: d.decision || '',
      context: d.context || '',
      confidence: typeof d.confidence === 'number' ? d.confidence : 0.8,
    })),
    risks: (parsed.risks || []).map((r: Record<string, unknown>) => ({
      risk: r.risk || '',
      severity: r.severity || 'medium',
      mitigation: r.mitigation || null,
      confidence: typeof r.confidence === 'number' ? r.confidence : 0.8,
    })),
    followUps: (parsed.followUps || []).map((f: Record<string, unknown>) => ({
      purpose: f.purpose || '',
      attendees: Array.isArray(f.attendees) ? f.attendees : [],
      suggestedDate: f.suggestedDate || null,
      confidence: typeof f.confidence === 'number' ? f.confidence : 0.8,
    })),
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value)
  })

  try {
    const { meetingId } = req.body || {}

    if (!meetingId) {
      return res.status(400).json({ success: false, error: 'meetingId is required' })
    }

    console.log('Starting analysis for meeting:', meetingId)

    const supabase = getSupabaseClient()

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single()

    if (meetingError || !meeting) {
      console.error('Meeting not found:', meetingId)
      return res.status(404).json({ success: false, error: 'Meeting not found' })
    }

    console.log('Calling Claude for analysis...')

    const anthropic = getAnthropicClient()

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this meeting transcript:\n\n${meeting.transcript}`,
        },
      ],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response')
    }

    const analysis = parseJsonResponse(textContent.text)

    console.log('Analysis complete, storing results...')

    await supabase
      .from('meetings')
      .update({
        summary: analysis.summary,
        topics: analysis.topics,
        projects: analysis.projects,
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId)

    if (analysis.actionItems.length > 0) {
      await supabase.from('action_items').insert(
        analysis.actionItems.map((item: Record<string, unknown>) => ({
          meeting_id: meetingId,
          task: item.task,
          assignee: item.owner || null,
          due_date: item.deadline || null,
          status: 'todo',
          priority: item.priority || 'medium',
          confidence: item.confidence || null,
        }))
      )
    }

    if (analysis.decisions.length > 0) {
      await supabase.from('decisions').insert(
        analysis.decisions.map((d: Record<string, unknown>) => ({
          meeting_id: meetingId,
          decision: d.decision,
          context: d.context,
          confidence: d.confidence || null,
        }))
      )
    }

    if (analysis.risks.length > 0) {
      await supabase.from('risks').insert(
        analysis.risks.map((r: Record<string, unknown>) => ({
          meeting_id: meetingId,
          risk: r.risk,
          severity: r.severity,
          mitigation: r.mitigation || null,
          confidence: r.confidence || null,
        }))
      )
    }

    if (analysis.followUps.length > 0) {
      await supabase.from('follow_ups').insert(
        analysis.followUps.map((f: Record<string, unknown>) => ({
          meeting_id: meetingId,
          purpose: f.purpose,
          attendees: f.attendees,
          suggested_date: f.suggestedDate || null,
          confidence: f.confidence || null,
        }))
      )
    }

    console.log('Analysis results stored successfully')

    return res.status(200).json({
      success: true,
      meetingId,
      analysis: {
        summary: analysis.summary,
        actionItemsCount: analysis.actionItems.length,
        decisionsCount: analysis.decisions.length,
        risksCount: analysis.risks.length,
        followUpsCount: analysis.followUps.length,
        topics: analysis.topics,
        projects: analysis.projects,
      },
    })
  } catch (error) {
    console.error('Analysis error:', error)
    let message = 'Analysis failed'
    if (error instanceof Error) {
      message = error.message
      // Log more details for Anthropic errors
      if ('status' in error) {
        console.error('API Status:', (error as { status?: number }).status)
      }
      if ('error' in error) {
        console.error('API Error:', JSON.stringify((error as { error?: unknown }).error))
      }
    }
    return res.status(500).json({ success: false, error: message })
  }
}
