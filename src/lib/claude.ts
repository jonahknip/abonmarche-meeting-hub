import type { AnalysisMetadata, AnalysisResult } from './types'

const MOCK_RESPONSES: AnalysisResult[] = [
  {
    summary: 'Agreed on phased inspection with weekly checkpoints; aligned on MACP cadence and dependencies.',
    keyDecisions: [
      'Three-phase CCTV schedule with weekly checkpoints',
      'MACP reports every Friday 4pm ET',
      'Client to deliver as-builts before phase 2',
    ],
    topics: ['schedule', 'MACP', 'dependencies'],
    sentiment: 'productive',
    actionItems: [
      { task: 'Send MACP phase 1 kickoff packet', status: 'todo' },
      { task: 'Request as-builts from client', status: 'in_progress' },
    ],
    followUpDraft:
      'Thanks for meeting. Attached is the agreed inspection cadence and MACP delivery schedule. We will share phase 1 kickoff materials by Wednesday.',
    insights: ['Client is sensitive to schedule risk; emphasize weekly check-ins'],
    riskFlags: ['As-builts dependency before phase 2'],
  },
  {
    summary: 'Resourcing adjusted for weather; backlog triage planned; maintenance scheduled.',
    keyDecisions: ['Move crew Bravo to Site 4', 'Vac truck maintenance Thursday', 'Report backlog triage by Friday'],
    topics: ['resourcing', 'weather', 'reports'],
    sentiment: 'productive',
    actionItems: [
      { task: 'Reassign crew Bravo to Site 4', status: 'todo' },
      { task: 'Clear report review backlog by Friday', status: 'in_progress' },
    ],
    followUpDraft: 'Here is the follow-up: crew moves, maintenance window, and report backlog owners. Please update status by Thursday EOD.',
    insights: ['Report backlog recurring; automation for QC checks could help'],
    riskFlags: ['Weather risk this week'],
  },
  {
    summary: 'Set Q1 targets, prioritized BD pursuits, aligned on training rollout.',
    keyDecisions: ['Focus BD on municipal renewals', 'Launch inspector training module by Feb 15'],
    topics: ['BD pipeline', 'training', 'targets'],
    sentiment: 'neutral',
    actionItems: [
      { task: 'Finalize Q1 BD target list', status: 'todo' },
      { task: 'Publish inspector training module plan', status: 'todo' },
    ],
    followUpDraft: 'Recap: Q1 targets locked, BD focus on municipal renewals, training module by Feb 15. Next check-in in two weeks.',
    insights: ['Training investment linked to report quality improvements'],
    riskFlags: [],
  },
]

type ProgressStep = 'received' | 'analyzing' | 'extracting' | 'complete'

export async function analyzeMeeting(
  transcript: string,
  metadata: AnalysisMetadata,
  {
    mockMode = import.meta.env.VITE_MOCK_MODE !== 'false',
    onProgress,
  }: { mockMode?: boolean; onProgress?: (step: ProgressStep) => void } = {},
): Promise<AnalysisResult> {
  if (mockMode) {
    onProgress?.('received')
    await delay(400)
    onProgress?.('analyzing')
    await delay(800)
    onProgress?.('extracting')
    await delay(800)
    onProgress?.('complete')
    return pickMockResult(metadata, transcript)
  }

  // Real mode stub: replace with actual Claude call
  onProgress?.('received')
  await delay(500)
  throw new Error('Claude integration not yet configured for production. Set VITE_MOCK_MODE=true to demo.')
}

function pickMockResult(metadata: AnalysisMetadata, transcript: string): AnalysisResult {
  const idx = Math.abs((metadata.title.length + transcript.length) % MOCK_RESPONSES.length)
  const base = MOCK_RESPONSES[idx]
  const withOwners = base.actionItems.map((item, idx) => ({
    ...item,
    ownerId: metadata.participants[idx % Math.max(metadata.participants.length, 1)],
  }))
  return { ...base, actionItems: withOwners }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
