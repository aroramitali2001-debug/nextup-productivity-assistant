import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function createServer() {
  const app = express();
  app.use((_req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const ai = getAiClient();
    res.json({
      ok: true,
      aiConfigured: Boolean(ai),
      model: MODEL_NAME,
    });
  });

  // 1. Natural Language Quick Capture Parser
  app.post('/api/ai/parse-task', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({ error: 'Gemini API key is not configured.' });
      return;
    }

    const { text, todayKey, weekday } = req.body as {
      text?: string;
      todayKey?: string;
      weekday?: string;
    };

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Task text is required.' });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Current local date is ${todayKey} (${weekday}).
Parse this student task entry into structured fields: "${text.trim()}"
Rules:
- Keep "title" clean and concise (strip date/time phrases like "tomorrow at 5 PM" or "by Sunday").
- Category must be one of: "College", "Career", "Personal", "Other".
- Priority must be one of: "Must Do", "Should Do", "Can Wait".
- Deadline must be YYYY-MM-DD based on ${todayKey}.
- deadlineTime is optional 24-hour "HH:mm" string ONLY if a specific time is mentioned (otherwise empty string).
- estimatedMinutes is a realistic integer between 10 and 240.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              deadline: { type: Type.STRING },
              deadlineTime: { type: Type.STRING },
              priority: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER },
            },
            required: ['title', 'category', 'deadline', 'priority', 'estimatedMinutes'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ source: 'gemini', parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse task with Gemini.';
      res.status(502).json({ error: message });
    }
  });

  // 2. AI Daily Planner & Morning Briefing Analysis
  app.post('/api/ai/daily-plan', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({ error: 'Gemini API key is not configured.' });
      return;
    }

    const {
      todayKey,
      tomorrowKey,
      currentTime,
      briefingType,
      availableHoursToday,
      userName,
      calendarContext,
      tasks,
      applications,
    } = req.body as {
      todayKey?: string;
      tomorrowKey?: string;
      currentTime?: string;
      briefingType?: 'morning' | 'evening';
      availableHoursToday?: number;
      userName?: string;
      calendarContext?: {
        connected?: boolean;
        busyMinutes?: number;
        events?: { summary: string; startIso: string; durationMinutes: number }[];
      };
      tasks?: unknown[];
      applications?: unknown[];
    };

    const effectiveBriefingType = briefingType === 'evening' ? 'evening' : 'morning';

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Today is ${todayKey}${tomorrowKey ? `, tomorrow is ${tomorrowKey}` : ''}, current local time is ${currentTime}.
Briefing mode: ${effectiveBriefingType}.
User first name: ${userName || 'not provided'}.
Student's available focus hours today: ${availableHoursToday ?? 'not specified'}.
Google Calendar connected: ${calendarContext?.connected ? 'yes' : 'no'}.
Calendar commitments today: ${calendarContext?.connected ? `${calendarContext.busyMinutes ?? 0} minutes booked across ${calendarContext.events?.length ?? 0} events: ${JSON.stringify(calendarContext.events ?? [])}` : 'not connected'}.
Tasks JSON: ${JSON.stringify(tasks ?? [])}
Job/Internship Applications JSON: ${JSON.stringify(applications ?? [])}

${
  effectiveBriefingType === 'evening'
    ? 'Write a calm, reflective EVENING BRIEFING headlineSummary: acknowledge tasks completed today, highlight any remaining pending/overdue items, preview upcoming deadlines and follow-ups, and frame topThree as the highest-impact priorities for tomorrow. Address the user by first name ONLY if provided.'
    : 'Write a calm, realistic, actionable MORNING BRIEFING headlineSummary and plan for today: highlight today\'s priorities, upcoming deadlines, important tasks, calendar events, and active application follow-ups. Address the user by first name ONLY if provided.'
}
For every topThree and recommendedOrder entry, write a clear, human explanation of WHY it is prioritised and which tasks can realistically be moved if workload exceeds available time. Reference real task IDs from Tasks JSON.`,
        config: {
          systemInstruction:
            'You are NextUp, a calm, practical student productivity assistant. Be concise, supportive, realistic about time constraints, and never invent task IDs or placeholder names.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headlineSummary: { type: Type.STRING },
              topThree: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                  required: ['taskId', 'reason'],
                },
              },
              recommendedOrder: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING },
                    timingAdvice: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                  required: ['taskId', 'timingAdvice', 'reason'],
                },
              },
              startImmediatelyIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              postponeSuggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING },
                    suggestedDeadline: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                  required: ['taskId', 'suggestedDeadline', 'reason'],
                },
              },
              unrealisticTodayIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              deprioritiseSuggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING },
                    suggestedPriority: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                  required: ['taskId', 'suggestedPriority', 'reason'],
                },
              },
              conflicts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'headlineSummary',
              'topThree',
              'recommendedOrder',
              'startImmediatelyIds',
              'postponeSuggestions',
              'unrealisticTodayIds',
              'deprioritiseSuggestions',
              'conflicts',
            ],
          },
        },
      });

      const plan = JSON.parse((response.text ?? '{}').trim());
      res.json({ source: 'gemini', plan });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate AI daily plan.';
      res.status(502).json({ error: message });
    }
  });

  // 3. Replan My Day & Midday Check-in
  app.post('/api/ai/replan', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({ error: 'Gemini API key is not configured.' });
      return;
    }

    const {
      todayKey,
      currentTime,
      remainingHoursToday,
      completedTodayCount,
      userName,
      tasks,
      contextNote,
    } = req.body as {
      todayKey?: string;
      currentTime?: string;
      remainingHoursToday?: number;
      completedTodayCount?: number;
      userName?: string;
      tasks?: unknown[];
      contextNote?: string;
    };

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Today is ${todayKey}, current local time is ${currentTime}.
User first name: ${userName || 'not provided'}.
Tasks completed today: ${completedTodayCount ?? 0}.
Remaining available hours today: ${remainingHoursToday ?? 3}.
Additional student context: ${contextNote ?? 'None'}.
Incomplete tasks JSON: ${JSON.stringify(tasks ?? [])}

Create a realistic revised plan for the rest of today. If user first name is provided, start summary warmly (e.g. "${userName ? `${userName}, here's what realistically fits into your day.` : "Here's what realistically fits into your day."}"). Pay attention to tasks marked "takingLonger: true", exact deadlineTime, dependencies, interviews/assessments, and overdue work.
Only suggest moving or deprioritising tasks that genuinely cannot fit or have later deadlines. Reference exact task IDs.`,
        config: {
          systemInstruction:
            'You are NextUp helping a student replan mid-day. Be empathetic, realistic, and concise. Never invent task IDs or placeholder names.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              isOverloaded: { type: Type.BOOLEAN },
              overloadExplanation: { type: Type.STRING },
              nextUpTaskId: { type: Type.STRING },
              nextUpReason: { type: Type.STRING },
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    taskId: { type: Type.STRING },
                    type: { type: Type.STRING }, // 'move_date' | 'deprioritise' | 'keep_focus'
                    suggestedDeadline: { type: Type.STRING },
                    suggestedPriority: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                  required: ['id', 'taskId', 'type', 'reason'],
                },
              },
            },
            required: ['summary', 'isOverloaded', 'overloadExplanation', 'suggestions'],
          },
        },
      });

      const replan = JSON.parse((response.text ?? '{}').trim());
      res.json({ source: 'gemini', replan });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to replan day with Gemini.';
      res.status(502).json({ error: message });
    }
  });

  // 4. AI Career Insights & Personalized Role Guidance
  app.post('/api/ai/career-insights', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({ error: 'Gemini API key is not configured.' });
      return;
    }

    const { category, customFocus, userName, applications, careerTasks } = req.body as {
      category?: string;
      customFocus?: string;
      userName?: string;
      applications?: unknown[];
      careerTasks?: unknown[];
    };

    if (!category) {
      res.status(400).json({ error: 'Career focus category is required.' });
      return;
    }

    const targetTrack =
      category === 'Other' && customFocus?.trim() ? `${category} (${customFocus.trim()})` : category;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Target career focus: ${targetTrack}.
User first name: ${userName || 'not provided'}.
Tracked applications JSON: ${JSON.stringify(applications ?? [])}
Open career tasks JSON: ${JSON.stringify(careerTasks ?? [])}

Generate deeply specific, practical career guidance tailored to "${targetTrack}" (never generic boilerplate).
- summary: 1–2 concise personalized sentences (mention user first name ONLY if provided).
- recommendedRoles: 5 specific job titles for ${targetTrack}.
- skillsToDevelop: 5 concrete technical/functional skills or tools valued for ${targetTrack}.
- searchKeywords: 5 effective job-board search keyword phrases for ${targetTrack}.
- interviewPrepTips: 3–4 role-specific interview preparation tips for ${targetTrack}.
- jobSearchStrategies: 3–4 practical job search strategies for ${targetTrack}.
- opportunityPriorities: 2–3 actionable recommendations referencing the user's actual tracked applications/tasks if present, or advising which ${targetTrack} opportunities to prioritize first.
- resumeAndAppTips: 3–4 concrete resume and application tailoring tips for ${targetTrack}.`,
        config: {
          systemInstruction:
            'You are NextUp, a knowledgeable career coach for students and early-career professionals. Provide specific, domain-authentic advice tailored strictly to the chosen career track. Never invent fake companies or placeholder names.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              recommendedRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
              skillsToDevelop: { type: Type.ARRAY, items: { type: Type.STRING } },
              searchKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              interviewPrepTips: { type: Type.ARRAY, items: { type: Type.STRING } },
              jobSearchStrategies: { type: Type.ARRAY, items: { type: Type.STRING } },
              opportunityPriorities: { type: Type.ARRAY, items: { type: Type.STRING } },
              resumeAndAppTips: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'summary',
              'recommendedRoles',
              'skillsToDevelop',
              'searchKeywords',
              'interviewPrepTips',
              'jobSearchStrategies',
              'opportunityPriorities',
              'resumeAndAppTips',
            ],
          },
        },
      });

      const insights = JSON.parse((response.text ?? '{}').trim());
      res.json({ source: 'gemini', insights });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate AI career insights.';
      res.status(502).json({ error: message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NextUp server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
