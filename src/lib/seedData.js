// Real meetings from Jonah's Abonmarche history — seeded from our conversation archive

export const SEED_MEETINGS = [
  {
    id: 'mtg-001',
    title: 'Return to Work — Day One Planning',
    date: '2026-03-17T10:00:00Z',
    duration_minutes: 52,
    attendees: ['Jeff Knipper (CEO)', 'Brad', 'Justin', 'Anne (HR)', 'Jonah Knipper'],
    type: 'One-on-One',
    status: 'analyzed',
    summary: 'Formal return-to-work meeting establishing Day One framework. Jeff presented an "elevator for a broken leg" model for accommodations, assigned Jonah to AI Task Force with Garrick, set hourly pay structure at $30/hr, and outlined a light ramp plan for Month One with no billable hour pressure.',
    key_decisions: [
      'Pay structure: salary → hourly at $30/hr (temporary)',
      'Workspace: IT office desk assigned, Scott is key contact',
      'Full remote flexibility approved — work from wherever productive',
      'Jonah + Garrick formally assigned to AI Task Force',
      'Weekly 1:1 reinvestment meeting with Jeff established (30-60 min)',
      'ADA accommodations in place — healthcare provider coping list requested',
    ],
    action_items: [
      { text: 'Connect with healthcare provider about coping strategies', owner: 'Jonah', due: '2026-03-20', done: false },
      { text: 'Get office key from Jenna or Scott on Day 1', owner: 'Jonah', due: '2026-03-23', done: true },
      { text: 'Email counselor with heads-up', owner: 'Jonah', due: '2026-03-18', done: true },
      { text: 'Confirm building access form receipt', owner: 'Anne (HR)', due: '2026-03-18', done: true },
      { text: 'Set up weekly reinvestment 1:1 with Jeff', owner: 'Jonah', due: '2026-03-24', done: false },
    ],
    blockers: [],
    sentiment: 'positive',
    tags: ['return-to-work', 'ai-task-force', 'hr', 'accommodations'],
    transcript_preview: 'Jeff: "This is Day One. The past is gone — what matters is what we build from here..." [52 min recorded transcript available]',
    quote: '"I\'m investing in you because I believe you\'re smart, dedicated, and will generate ROI." — Jeff Knipper',
  },
  {
    id: 'mtg-002',
    title: 'Weekly Scrum — Benton Harbor & AI Intro',
    date: '2026-03-23T09:00:00Z',
    duration_minutes: 23,
    attendees: ['Brad', 'Jonah Knipper', 'Whitney', 'George', 'Kelly', 'Garrick'],
    type: 'Weekly Scrum',
    status: 'analyzed',
    summary: 'First post-return scrum. Brad introduced Jonah back to the team and flagged availability for AI work. Benton Harbor as-builts discussed — 3 remaining (Jonah/Whitney/Kelly split). Pumpkin Vine RFI process initiated, bi-weekly cadence planned. Marshall County and Cass County RFI updates.',
    key_decisions: [
      'Jonah has Benton Harbor as-built #1 — share remaining with Whitney',
      'Pumpkin Vine bi-weekly RFI process to be established',
      'Project plan in Teams channel (Admin category) — hours/days to be added by Brad',
      'Kelly to hand off remaining as-builts to Jonah/Whitney',
      'Jonah available for AI assistance — Brad flagged for team',
    ],
    action_items: [
      { text: 'Complete Benton Harbor as-built assignment', owner: 'Jonah', due: '2026-03-28', done: false },
      { text: 'Add hours/days detail to Pumpkin Vine project plan', owner: 'Brad', due: '2026-03-25', done: false },
      { text: 'Hand off remaining as-builts to Jonah/Whitney', owner: 'Kelly', due: '2026-03-25', done: false },
      { text: 'Set up bi-weekly RFI bi-weekly format for Pumpkin Vine', owner: 'George', due: '2026-03-27', done: false },
    ],
    blockers: [
      'Pumpkin Vine project plan missing hours/days detail',
    ],
    sentiment: 'neutral',
    tags: ['benton-harbor', 'pumpkin-vine', 'rfi', 'as-builts', 'scrum'],
    transcript_preview: 'Brad: "Jonah\'s back, we\'re working on some AI stuff... he\'s available for like some, uh, if you guys have any work for him..." [23 min transcript]',
  },
  {
    id: 'mtg-003',
    title: 'Plan Review Agent — Garrick Testing Session',
    date: '2026-01-15T14:00:00Z',
    duration_minutes: 90,
    attendees: ['Jonah Knipper', 'Garrick'],
    type: 'Technical Review',
    status: 'analyzed',
    summary: 'Deep dive testing session on Plan Review Agent with Garrick. Achieved 84% checklist coverage on a 68-item checklist (60% review depth). Claude Vision + PyMuPDF pipeline validated. Revision cloud detection skill identified as next priority. ROI documented at ~$576K annually for the Technology Steering Committee.',
    key_decisions: [
      '84% checklist coverage achieved — exceeds pilot threshold',
      'Revision cloud detection is the #1 next skill to build',
      'PyMuPDF + Claude Vision confirmed as production stack',
      'Ready to present to TSC with business case documentation',
      'Garrick to co-author technical write-up for steering committee',
    ],
    action_items: [
      { text: 'Build revision cloud detection skill', owner: 'Jonah', due: '2026-01-22', done: true },
      { text: 'Write TSC business case document', owner: 'Jonah + Garrick', due: '2026-01-25', done: true },
      { text: 'Run 100-plan validation batch', owner: 'Jonah', due: '2026-01-30', done: false },
    ],
    blockers: [
      'Revision cloud detection not yet implemented — limits edge case handling',
    ],
    sentiment: 'positive',
    tags: ['plan-review-agent', 'garrick', 'ai', 'claude-vision', 'tsc'],
    transcript_preview: 'Garrick: "The 84% number is strong for a pilot. If you can get revision clouds working that takes it to production quality..." [90 min session notes]',
    quote: '"84% checklist coverage on first pilot run — this is production-ready with one more skill." — Garrick',
  },
  {
    id: 'mtg-004',
    title: 'AI Community of Practice — Q1 Session',
    date: '2026-02-12T13:00:00Z',
    duration_minutes: 61,
    attendees: ['Jonah Knipper', 'Garrick', 'Jeff Knipper (AI Demo)', 'Anne', '8 attendees total'],
    type: 'All Hands / COP',
    status: 'analyzed',
    summary: 'AI Community of Practice quarterly session. Jeff opened with a live Claude demo for Anne — showing branded HR policy generation using the skill system. Jonah presented AI portfolio overview: Meeting Hub, Plan Review Agent, MCP ecosystem, O-Drive Indexer. Copilot discussed as parallel Microsoft-aligned tool.',
    key_decisions: [
      'Jeff demoed Claude skill system to HR — strong positive reception',
      'Copilot to be evaluated alongside Claude for Microsoft-heavy workflows',
      'AI Task Force formation confirmed — Jonah + Garrick leading',
      'OneDrive → Teams migration must complete before full AI rollout',
      'Jonah to prepare department-specific AI prompt libraries',
    ],
    action_items: [
      { text: 'Create department AI prompt library (Civil, Arch, Survey, CI)', owner: 'Jonah', due: '2026-02-28', done: false },
      { text: 'Evaluate Copilot for MS365 workflow integration', owner: 'Garrick', due: '2026-03-15', done: false },
      { text: 'Complete OneDrive → Teams migration prep', owner: 'IT', due: '2026-03-30', done: false },
    ],
    blockers: [
      'Staff resistance to moving off shared drives',
      'OneDrive migration blocking full AI rollout',
    ],
    sentiment: 'positive',
    tags: ['ai-cop', 'community-of-practice', 'jeff', 'garrick', 'copilot', 'ai-task-force'],
    transcript_preview: 'Jeff: [demonstrating Claude] "Watch this — I can generate the entire HR accommodation policy in our Abonmarche format in about 30 seconds..." [61 min session]',
  },
  {
    id: 'mtg-005',
    title: 'Meeting Hub Architecture & Strategy Session',
    date: '2026-01-20T09:00:00Z',
    duration_minutes: 75,
    attendees: ['Jonah Knipper', 'Milo (AI)'],
    type: 'Planning',
    status: 'analyzed',
    summary: 'Full architecture and strategy session for Meeting Hub. Built full React meeting intelligence app via Claude Max → OpenCode workflow. Deployed to surge.sh. Planned Supabase backend, Vercel Edge Functions, and unlimited transcript storage. Documented ROI framework and established Git workflow standards.',
    key_decisions: [
      'Meeting Hub frontend: React + Vite → Vercel',
      'Backend: Supabase (PostgreSQL + Edge Functions)',
      'Transcription pipeline: Whisper (local) → Claude extraction → Supabase',
      'Scope: audio, video, transcript ingestion + AI analysis + chat',
      'Git workflow MCP server built for Abonmarche standards enforcement',
    ],
    action_items: [
      { text: 'Complete Supabase backend setup', owner: 'Jonah', due: '2026-01-22', done: true },
      { text: 'Build Whisper pipeline script', owner: 'Jonah', due: '2026-01-25', done: false },
      { text: 'Deploy Meeting Hub to Vercel production', owner: 'Jonah', due: '2026-01-28', done: false },
    ],
    blockers: [],
    sentiment: 'positive',
    tags: ['meeting-hub', 'architecture', 'supabase', 'vercel', 'whisper'],
  },
]

export const WEEK_ONE_PLAN = {
  week: '2026-03-24',
  theme: 'Stable Foundation + First AI Win',
  goals: [
    'Complete Benton Harbor as-built — close the ticket cleanly',
    'Establish daily routine: standup → focused work → EOD update',
    'Connect with Brad on CLP training material',
    'First AI Task Force onboarding touch-base with Garrick',
    'Get Meeting Hub running locally with past meetings loaded',
  ],
  daily: [
    {
      day: 'Monday, Mar 24',
      tasks: [
        { text: 'Day 1 — Check in with Brad, get workstation set up', priority: 'high', done: false },
        { text: 'Connect with Scott/Jenna for office access', priority: 'high', done: false },
        { text: 'Review Pumpkin Vine project plan in Teams', priority: 'medium', done: false },
        { text: 'Meeting with Jeff (1:1 reinvestment)', priority: 'high', done: false },
      ]
    },
    {
      day: 'Tuesday, Mar 25',
      tasks: [
        { text: 'Benton Harbor as-built — active work session', priority: 'high', done: false },
        { text: 'Review CLP training material from Brad', priority: 'medium', done: false },
        { text: 'Set up healthcare provider appointment', priority: 'high', done: false },
      ]
    },
    {
      day: 'Wednesday, Mar 26',
      tasks: [
        { text: 'Continue Benton Harbor as-built', priority: 'high', done: false },
        { text: 'Healthcare provider appointment (if scheduled)', priority: 'high', done: false },
        { text: 'Garrick sync — AI Task Force first touch', priority: 'medium', done: false },
      ]
    },
    {
      day: 'Thursday, Mar 27',
      tasks: [
        { text: 'Benton Harbor as-built — target completion', priority: 'high', done: false },
        { text: 'Pumpkin Vine RFI bi-weekly format review', priority: 'medium', done: false },
      ]
    },
    {
      day: 'Friday, Mar 28',
      tasks: [
        { text: 'Close Benton Harbor ticket if done', priority: 'high', done: false },
        { text: 'Week 1 self-review — write EOW summary', priority: 'medium', done: false },
        { text: 'Confirm Week 2 priorities with Brad', priority: 'medium', done: false },
      ]
    },
  ]
}
