import {
  CareerFocusCategory,
  CareerInsightsPlan,
  CareerResourceItem,
  JobApplication,
  Task,
} from '../types/nextup';

export interface CareerFocusOption {
  category: CareerFocusCategory;
  emoji: string;
  tagline: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}

export const CAREER_FOCUS_OPTIONS: CareerFocusOption[] = [
  {
    category: 'HR & People Operations',
    emoji: '🤝',
    tagline: 'Talent, people analytics, HRBP & L&D',
    accentBg: 'bg-[#F5F1FF]',
    accentBorder: 'border-[#DDD6FE]',
    accentText: 'text-[#5B38EE]',
  },
  {
    category: 'Marketing',
    emoji: '📣',
    tagline: 'Growth, brand, product marketing & CRM',
    accentBg: 'bg-[#FFF7ED]',
    accentBorder: 'border-[#FED7AA]',
    accentText: 'text-[#C2410C]',
  },
  {
    category: 'Consulting',
    emoji: '🧭',
    tagline: 'Strategy, cases & business transformation',
    accentBg: 'bg-[#EFF6FF]',
    accentBorder: 'border-[#BFDBFE]',
    accentText: 'text-[#1D4ED8]',
  },
  {
    category: 'Data Analytics',
    emoji: '📊',
    tagline: 'SQL, BI dashboards, experimentation & Python',
    accentBg: 'bg-[#F0FDFA]',
    accentBorder: 'border-[#99F6E4]',
    accentText: 'text-[#0F766E]',
  },
  {
    category: 'Finance',
    emoji: '💹',
    tagline: 'FP&A, valuation, corporate finance & risk',
    accentBg: 'bg-[#F0FDF4]',
    accentBorder: 'border-[#BBF7D0]',
    accentText: 'text-[#15803D]',
  },
  {
    category: 'Operations',
    emoji: '⚙️',
    tagline: 'Supply chain, process & strategy ops',
    accentBg: 'bg-[#FFFBEB]',
    accentBorder: 'border-[#FDE68A]',
    accentText: 'text-[#B45309]',
  },
  {
    category: 'Product Management',
    emoji: '🚀',
    tagline: 'APM, product discovery, roadmaps & GTM',
    accentBg: 'bg-[#F5F1FF]',
    accentBorder: 'border-[#DDD6FE]',
    accentText: 'text-[#5B38EE]',
  },
  {
    category: 'Other',
    emoji: '✨',
    tagline: 'Custom role or interdisciplinary track',
    accentBg: 'bg-[#F8FAFC]',
    accentBorder: 'border-[#E2E8F0]',
    accentText: 'text-[#475569]',
  },
];

interface CareerBlueprint {
  summaryLead: string;
  recommendedRoles: string[];
  skillsToDevelop: string[];
  searchKeywords: string[];
  interviewPrepTips: string[];
  jobSearchStrategies: string[];
  opportunityPriorities: string[];
  resumeAndAppTips: string[];
  learningResources: CareerResourceItem[];
}

const CAREER_BLUEPRINTS: Record<CareerFocusCategory, CareerBlueprint> = {
  'HR & People Operations': {
    summaryLead:
      'Focus on roles blending people programs with measurable workforce impact across talent acquisition, HR operations, and people analytics.',
    recommendedRoles: [
      'HR Analyst',
      'Talent Acquisition Specialist',
      'People Operations Coordinator',
      'HR Business Partner (HRBP)',
      'Learning & Development Specialist',
    ],
    skillsToDevelop: [
      'People Analytics (Excel, SQL & turnover/retention metrics)',
      'ATS & HRIS workflows (Greenhouse, Lever, Workday)',
      'Structured Behavioral & Competency Interviewing',
      'Onboarding Design & Employee Engagement Programs',
      'Compensation Benchmarking & Labor Compliance Basics',
    ],
    searchKeywords: [
      'People Operations',
      'HR Analyst',
      'Talent Acquisition Coordinator',
      'HR Business Partner',
      'Learning and Development',
    ],
    interviewPrepTips: [
      'Prepare STAR stories demonstrating how you resolved conflict, improved onboarding, or used survey data to fix a team bottleneck.',
      'Practice stakeholder scenario questions: balancing hiring speed with candidate experience and manager calibration.',
      'Be ready to interpret basic HR funnel metrics (time-to-hire, offer acceptance rate, 90-day retention, eNPS).',
    ],
    jobSearchStrategies: [
      'Target fast-growing mid-size tech and consumer companies hiring Junior People Ops or Recruiting Coordinators where generalist skills stand out.',
      'Connect with University Recruiting and Talent Partners on LinkedIn after applying, referencing a specific people program or culture value.',
      'Set weekly alerts for rotational HR Development Programs (HRDP) and campus analyst tracks.',
    ],
    opportunityPriorities: [
      'Prioritize active Interview or Assessment invitations first, especially structured HR case or role-play screens.',
      'Follow up on applications older than 7 days with a concise note linking a relevant people operations or event-coordination project.',
    ],
    resumeAndAppTips: [
      'Quantify people impact: highlight survey response rates, event turnout, onboarding time saved, or volunteer recruiting coordination.',
      'Mirror role-specific keywords such as HRIS, candidate lifecycle, stakeholder alignment, and employee engagement.',
    ],
    learningResources: [
      {
        title: 'AIHR People Analytics & HR Articles',
        source: 'AIHR',
        description: 'Practical guides on HR metrics, talent acquisition, and modern people operations.',
        url: 'https://www.aihr.com/blog/',
      },
      {
        title: 'SHRM HR Knowledge Center',
        source: 'SHRM',
        description: 'Foundational templates and insights on HRBP strategy, onboarding, and L&D.',
        url: 'https://www.shrm.org/topics-tools',
      },
      {
        title: 'Harvard Business Review — Managing People',
        source: 'HBR',
        description: 'Research-backed articles on performance management, retention, and organizational culture.',
        url: 'https://hbr.org/topic/subject/managing-people',
      },
    ],
  },
  Marketing: {
    summaryLead:
      'Build momentum around measurable growth, crisp brand positioning, and hands-on campaign execution backed by funnel conversion metrics.',
    recommendedRoles: [
      'Growth Marketing Analyst',
      'Product Marketing Associate',
      'Brand & Content Strategist',
      'Performance Marketing Specialist',
      'CRM & Lifecycle Marketing Coordinator',
    ],
    skillsToDevelop: [
      'GA4, Cohort Attribution & Funnel Conversion Tracking',
      'Lifecycle Email & CRM Automation (HubSpot, Braze, Klaviyo)',
      'SEO/SEM & Paid Social A/B Creative Testing',
      'Product Positioning, Messaging & Go-To-Market Briefs',
      'Copywriting & Landing Page Conversion Optimization',
    ],
    searchKeywords: [
      'Product Marketing Associate',
      'Growth Marketing Analyst',
      'Brand Marketing Coordinator',
      'Lifecycle Marketing',
      'Digital Marketing Intern',
    ],
    interviewPrepTips: [
      'Walk through a campaign from hypothesis to channel selection, CAC/CTR outcome, and what you iterated next.',
      'Prepare a 2-minute product critique: pick a product you love, identify its target persona, and pitch one GTM improvement.',
      'Review core metrics fluently: CTR, CVR, CAC, LTV, retention cohorts, and email open/click benchmarks.',
    ],
    jobSearchStrategies: [
      'Include a 1-page campaign portfolio or tear-down slide deck with every application to differentiate from text-only resumes.',
      'Prioritize startups and digital-first brands where portfolio projects carry as much weight as years of experience.',
      'Track brand launches and engage thoughtfully with hiring managers in product marketing and growth teams.',
    ],
    opportunityPriorities: [
      'Give highest priority to roles requesting take-home campaign briefs or GTM exercises so you deliver polished analysis.',
      'Follow up promptly on Saved and Applied roles at high-growth consumer or B2B SaaS companies.',
    ],
    resumeAndAppTips: [
      'Lead every bullet with an outcome metric: "% lift in signups", "engagement rate", "organic impressions", or "pipeline influenced".',
      'Showcase both creative storytelling and analytical tools (GA4, SQL/Excel, Figma/Canva, HubSpot).',
    ],
    learningResources: [
      {
        title: 'Think with Google — Marketing Insights',
        source: 'Google',
        description: 'Consumer trends, measurement benchmarks, and digital campaign case studies.',
        url: 'https://www.thinkwithgoogle.com/',
      },
      {
        title: 'HubSpot Academy Free Certifications',
        source: 'HubSpot',
        description: 'Hands-on training in inbound marketing, content strategy, and lifecycle CRM.',
        url: 'https://academy.hubspot.com/',
      },
      {
        title: 'Product Marketing Alliance Resources',
        source: 'PMA',
        description: 'Frameworks for positioning, messaging matrices, and competitive launches.',
        url: 'https://www.productmarketingalliance.com/resources/',
      },
    ],
  },
  Consulting: {
    summaryLead:
      'Combine structured MECE problem solving, commercial intuition, and concise executive communication across case prep and networking.',
    recommendedRoles: [
      'Associate Consultant',
      'Business Analyst',
      'Strategy & Operations Analyst',
      'Management Consulting Intern',
      'Advisory / Transformation Analyst',
    ],
    skillsToDevelop: [
      'MECE Issue Trees & Profitability/Market-Entry Frameworks',
      'Rapid Mental Math, Market Sizing & Breakeven Analysis',
      'Slide Storytelling & Pyramid Principle Synthesis',
      'Financial Statements & Unit Economics Interpretation',
      'Client Interviewing & Ambiguity Structuring',
    ],
    searchKeywords: [
      'Associate Consultant',
      'Business Analyst Consulting',
      'Strategy Analyst',
      'Management Consulting Intern',
      'Corporate Strategy Associate',
    ],
    interviewPrepTips: [
      'Run 2–3 timed interactive mock cases weekly focusing on crisp structuring before diving into math.',
      'Practice 60-second behavioral stories highlighting leadership under ambiguity, persuasion, and measurable team impact.',
      'Always tie math outputs back to a clear recommendation and key risk ("So what for the client?").',
    ],
    jobSearchStrategies: [
      'Map application deadlines early — consulting recruiting cycles move on strict campus and off-cycle windows.',
      'Do short informational coffee chats with alumni consultants to understand boutique vs MBB/Big 4 practice areas.',
      'Look at corporate strategy and internal consulting teams at Fortune 500 firms alongside traditional consultancies.',
    ],
    opportunityPriorities: [
      'Protect prep blocks for any upcoming case interviews or online problem-solving assessments first.',
      'Prioritize firms with early rolling deadlines and complete referral outreach before submitting.',
    ],
    resumeAndAppTips: [
      'Use crisp action-context-result bullets showing analytical rigor, leadership, and quantified business impact.',
      'Keep formatting spotless with zero typos — attention to visual detail is heavily screened in consulting.',
    ],
    learningResources: [
      {
        title: 'McKinsey Insights & Case Prep',
        source: 'McKinsey',
        description: 'Industry reports and official guidance on problem-solving and PEI behavioral interviews.',
        url: 'https://www.mckinsey.com/featured-insights',
      },
      {
        title: 'BCG Perspectives & Case Interview Guide',
        source: 'BCG',
        description: 'Strategy articles and interactive case approach walkthroughs.',
        url: 'https://www.bcg.com/careers/join/interview-process',
      },
      {
        title: 'HBR — Strategy & Execution',
        source: 'Harvard Business Review',
        description: 'Real-world frameworks on competitive advantage, pricing, and operating models.',
        url: 'https://hbr.org/topic/subject/strategy',
      },
    ],
  },
  'Data Analytics': {
    summaryLead:
      'Anchor your search around practical SQL, BI storytelling, and measurable decision impact backed by clean, reproducible portfolio projects.',
    recommendedRoles: [
      'Data Analyst',
      'Business Intelligence (BI) Analyst',
      'Product Data Analyst',
      'Analytics Engineer',
      'Operations Research Analyst',
    ],
    skillsToDevelop: [
      'Advanced SQL (Window functions, CTEs, cohort & retention queries)',
      'Python / Pandas Data Cleaning & Exploratory Analysis',
      'Tableau / Power BI Interactive Dashboard Design',
      'A/B Testing, Hypothesis Design & Statistical Significance',
      'Translating Raw Numbers into Executive Recommendations',
    ],
    searchKeywords: [
      'Data Analyst',
      'Business Intelligence Analyst',
      'Product Analyst',
      'Junior Analytics Engineer',
      'SQL Data Analyst',
    ],
    interviewPrepTips: [
      'Practice live SQL joins, aggregations, and rolling 7-day window problems out loud on a whiteboard or editor.',
      'Prepare product-sense analytics questions: e.g. "Signups dropped 12% yesterday — how do you investigate?"',
      'Explain your past projects concisely: dataset size, cleaning hurdles, metric chosen, and decision unlocked.',
    ],
    jobSearchStrategies: [
      'Link 2–3 well-documented GitHub or Tableau Public case studies showing business questions answered, not just code.',
      'Search across fintech, healthtech, e-commerce, and SaaS companies where product & operations analytics teams hire year-round.',
      'Tailor your keyword mix between "Data Analyst", "Product Analyst", and "BI Analyst" depending on SQL vs visualization emphasis.',
    ],
    opportunityPriorities: [
      'Prioritize SQL/coding take-homes and technical screen prep ahead of cold applications.',
      'Follow up on applications where you included a live dashboard or portfolio link.',
    ],
    resumeAndAppTips: [
      'Group technical skills cleanly (SQL, Python, BI, Statistics) and substantiate every tool inside your project bullets.',
      'Show business outcome ("Reduced reporting prep by 4 hrs/week", "Identified $30k churn segment"), not just model syntax.',
    ],
    learningResources: [
      {
        title: 'Mode SQL Analytics Tutorial',
        source: 'Mode',
        description: 'Hands-on SQL lessons covering aggregations, joins, subqueries, and window functions.',
        url: 'https://mode.com/sql-tutorial/',
      },
      {
        title: 'Kaggle Learn Micro-Courses',
        source: 'Kaggle',
        description: 'Concise practical notebooks for Pandas, data visualization, and SQL.',
        url: 'https://www.kaggle.com/learn',
      },
      {
        title: 'Storytelling with Data Blog',
        source: 'SWD',
        description: 'Best practices for designing clear, executive-ready charts and dashboards.',
        url: 'https://www.storytellingwithdata.com/blog',
      },
    ],
  },
  Finance: {
    summaryLead:
      'Target analyst tracks that reward sharp financial modeling, accounting fluency, and calm, well-reasoned market commentary.',
    recommendedRoles: [
      'Financial Analyst (FP&A)',
      'Corporate Finance Associate',
      'Investment Banking Analyst',
      'Equity Research Analyst',
      'Risk & Treasury Analyst',
    ],
    skillsToDevelop: [
      '3-Statement Financial Modeling & Working Capital Forecasting',
      'DCF Valuation, Trading Comps & Sensitivity Tables',
      'Excel Mastery (INDEX/MATCH, XLOOKUP, PivotTables, Shortcuts)',
      'GAAP Accounting & Variance Analysis (Budget vs Actuals)',
      'Macroeconomic & Earnings Call Synthesis',
    ],
    searchKeywords: [
      'Financial Analyst',
      'FP&A Analyst',
      'Corporate Finance Analyst',
      'Investment Banking Analyst',
      'Risk Analyst',
    ],
    interviewPrepTips: [
      'Drill accounting linkages cold ("Walk me through $10 depreciation across the three financial statements").',
      'Prepare one concise stock or company investment pitch with clear catalysts, valuation multiples, and downside risks.',
      'Practice behavioral answers around accuracy under tight deadlines, ethical judgment, and analytical ownership.',
    ],
    jobSearchStrategies: [
      'Balance marquee banks with corporate FP&A rotational programs (FLDP) at technology, healthcare, and industrial firms.',
      'Reach out to alumni in specific coverage or FP&A groups before superdays or assessment deadlines.',
      'Track quarterly earnings and reference recent company results in cover notes or recruiter outreach.',
    ],
    opportunityPriorities: [
      'Prioritize HireVue/technical assessments and upcoming superday prep on your task calendar first.',
      'Follow up within 5–7 business days on corporate finance roles with active university recruiters.',
    ],
    resumeAndAppTips: [
      'Highlight financial models built, valuation case competitions, portfolio/club funds, and GPA/coursework rigor.',
      'Keep numbers consistent and cleanly formatted — precision in resume layout signals precision in spreadsheets.',
    ],
    learningResources: [
      {
        title: 'Corporate Finance Institute (CFI) Resources',
        source: 'CFI',
        description: 'Guides on 3-statement modeling, DCF, FP&A variance analysis, and Excel shortcuts.',
        url: 'https://corporatefinanceinstitute.com/resources/',
      },
      {
        title: 'Investopedia Financial Analysis Hub',
        source: 'Investopedia',
        description: 'Clear explanations of valuation multiples, capital structure, and corporate finance.',
        url: 'https://www.investopedia.com/financial-term-dictionary-4769738',
      },
      {
        title: 'CFA Institute Career Resources',
        source: 'CFA Institute',
        description: 'Industry articles on investment research, ethics, and financial career paths.',
        url: 'https://www.cfainstitute.org/en/programs/cfa/careers',
      },
    ],
  },
  Operations: {
    summaryLead:
      'Focus on roles connecting data-driven capacity planning, workflow automation, and cross-functional execution at scale.',
    recommendedRoles: [
      'Operations Analyst',
      'Strategy & Operations Associate',
      'Supply Chain & Logistics Coordinator',
      'Process Improvement Analyst',
      'Program Operations Specialist',
    ],
    skillsToDevelop: [
      'Process Mapping & Lean Six Sigma Bottleneck Elimination',
      'Forecasting, Capacity Planning & SLA Metrics in Excel/SQL',
      'Cross-Functional Project Management & Risk Mitigation',
      'Vendor Evaluation, Cost Analysis & Procurement Basics',
      'Operational Dashboards & SOP Documentation',
    ],
    searchKeywords: [
      'Operations Analyst',
      'Strategy and Operations',
      'Supply Chain Analyst',
      'Business Operations Associate',
      'Program Operations',
    ],
    interviewPrepTips: [
      'Prepare concrete examples where you redesigned a messy process, cut turnaround time, or reduced manual errors.',
      'Practice operational troubleshooting questions: diagnosing fulfillment delays, queue backlogs, or inventory stockouts.',
      'Be ready to quantify trade-offs between cost, speed, and quality using simple back-of-the-envelope math.',
    ],
    jobSearchStrategies: [
      'Look at tech "BizOps / Strategy & Operations" roles alongside e-commerce, logistics, and manufacturing rotational programs.',
      'Emphasize cross-team coordination experience from student clubs, campus events, or internships.',
      'Filter job boards with both "Business Operations" and "Operations Analyst" to capture broader listings.',
    ],
    opportunityPriorities: [
      'Focus first on roles with case assessments or analytical Excel/SQL screens.',
      'Follow up on mid-stage applications by sharing a brief note on an operational improvement you spearheaded.',
    ],
    resumeAndAppTips: [
      'Lead with operational KPIs: cycle time reduced, throughput increased, SLA adherence, or cost saved.',
      'Highlight tools like Excel, SQL, Notion/Asana/Jira, Tableau, and SOP creation.',
    ],
    learningResources: [
      {
        title: 'MIT Sloan Management Review — Operations',
        source: 'MIT SMR',
        description: 'Research on supply chain resilience, operational excellence, and process scaling.',
        url: 'https://sloanreview.mit.edu/topic/operations/',
      },
      {
        title: 'ASCM Supply Chain & Operations Insights',
        source: 'ASCM',
        description: 'Foundational frameworks for planning, logistics, and inventory management.',
        url: 'https://www.ascm.org/topics/',
      },
      {
        title: 'Lean Enterprise Institute Articles',
        source: 'LEI',
        description: 'Practical guides on continuous improvement, value-stream mapping, and root-cause analysis.',
        url: 'https://www.lean.org/the-lean-post/',
      },
    ],
  },
  'Product Management': {
    summaryLead:
      'Position yourself around user empathy, crisp product prioritization, and cross-functional shipping backed by measurable outcomes.',
    recommendedRoles: [
      'Associate Product Manager (APM)',
      'Product Analyst',
      'Product Operations Associate',
      'Growth Product Manager',
      'Technical Product Manager',
    ],
    skillsToDevelop: [
      'User Discovery, Problem Framing & Jobs-to-be-Done',
      'PRD Writing, Acceptance Criteria & RICE Prioritization',
      'Product Funnel Metrics, Retention Cohorts & A/B Testing',
      'UX Wireframing & Engineering Trade-Off Collaboration',
      'Go-To-Market Launches & Stakeholder Alignment',
    ],
    searchKeywords: [
      'Associate Product Manager',
      'Product Management Intern',
      'Product Analyst',
      'Product Operations',
      'Junior Product Manager',
    ],
    interviewPrepTips: [
      'Practice structured product design prompts: clarify user segment -> pain points -> creative solutions -> trade-offs -> success metrics.',
      'Prepare root-cause and metric prompts ("How would you measure success for feature X, and what guardrail metric would you watch?").',
      'Have 2 crisp stories showing how you shipped something end-to-end with designers/engineers or resolved conflicting stakeholder priorities.',
    ],
    jobSearchStrategies: [
      'Apply broadly to APM programs, Product Analyst feeders, and Product Operations roles that transition smoothly into core PM.',
      'Include a concise product teardown or capstone prototype link on your resume and LinkedIn profile.',
      'Highlight any domain overlap (fintech, AI tools, productivity, developer tools) in short recruiter outreach notes.',
    ],
    opportunityPriorities: [
      'Prioritize active Interview and Take-Home Assessment rounds (like UI/product prompts) above cold browsing.',
      'Follow up on Applied roles where you have a warm referral or strong portfolio alignment.',
    ],
    resumeAndAppTips: [
      'Show product ownership: problem identified, decision made, feature shipped, and measurable user/business lift.',
      'Balance technical fluency (APIs, SQL, experimentation) with customer discovery and design thinking.',
    ],
    learningResources: [
      {
        title: 'Silicon Valley Product Group (SVPG) Articles',
        source: 'SVPG',
        description: 'Essential essays on product discovery, empowered teams, and outcome-driven roadmaps.',
        url: 'https://www.svpg.com/articles/',
      },
      {
        title: "Lenny's Newsletter — Product & Growth",
        source: "Lenny's",
        description: 'Deep dives on APM recruiting, product metrics, retention, and GTM execution.',
        url: 'https://www.lennysnewsletter.com/',
      },
      {
        title: 'Mind the Product Insights',
        source: 'Mind the Product',
        description: 'Community articles covering prioritization, stakeholder alignment, and interview prep.',
        url: 'https://www.mindtheproduct.com/',
      },
    ],
  },
  Other: {
    summaryLead:
      'Focus your search with clear target titles, tailored project proof, and structured weekly outreach aligned to your chosen track.',
    recommendedRoles: [
      'Software Engineering Intern',
      'UX / Product Designer',
      'Research & Policy Analyst',
      'Customer Success Associate',
      'Rotational Leadership Analyst',
    ],
    skillsToDevelop: [
      'Role-Specific Portfolio / Case Study Proof',
      'Clear Written & Verbal Executive Communication',
      'Data Literacy & Spreadsheet / Analytical Fluency',
      'Structured Behavioral Storytelling (STAR)',
      'Cross-Functional Project Delivery',
    ],
    searchKeywords: [
      'Entry Level Analyst',
      'Graduate Rotational Program',
      'Associate Specialist',
      'Summer Intern',
      'Junior Coordinator',
    ],
    interviewPrepTips: [
      'Build a bank of 5 adaptable STAR stories covering ownership, problem solving, teamwork, conflict, and measurable impact.',
      'Research the company’s core product, customers, and recent news so every "Why us?" answer feels specific.',
      'Prepare 3 thoughtful questions for interviewers about team priorities and 90-day success expectations.',
    ],
    jobSearchStrategies: [
      'Enter your exact target role in "My Career Focus" and refresh AI Insights for hyper-specific role & skill guidance.',
      'Combine targeted job-board searches with 2–3 alumni or recruiter outreach messages per week.',
      'Track every application and follow-up date consistently in NextUp so promising leads never slip.',
    ],
    opportunityPriorities: [
      'Focus first on interviews, assessments, and overdue follow-ups already in your NextUp tracker.',
      'Use tailored keywords when opening external job boards so every search stays tightly focused.',
    ],
    resumeAndAppTips: [
      'Tailor your top 3 resume summary/project bullets to match the exact language of your target job description.',
      'Quantify scope and results wherever possible (users reached, time saved, accuracy improved, team size led).',
    ],
    learningResources: [
      {
        title: 'Harvard Business Review — Career Planning',
        source: 'HBR',
        description: 'Practical guidance on interviews, networking, and early-career growth.',
        url: 'https://hbr.org/topic/subject/career-planning',
      },
      {
        title: 'Coursera Career Academy',
        source: 'Coursera',
        description: 'Role-by-role skill breakdowns and portfolio project pathways.',
        url: 'https://www.coursera.org/career-academy',
      },
    ],
  },
};

export function getCuratedCareerInsights(
  category: CareerFocusCategory,
  customFocus: string | undefined,
  applications: JobApplication[],
  tasks: Task[],
  userName?: string
): CareerInsightsPlan {
  const blueprint = CAREER_BLUEPRINTS[category] ?? CAREER_BLUEPRINTS['Product Management'];
  const effectiveLabel =
    category === 'Other' && customFocus?.trim() ? customFocus.trim() : category;

  const activeApps = applications.filter((a) => a.status !== 'Rejected' && a.status !== 'Offer');
  const interviewOrOA = activeApps.filter(
    (a) => a.status === 'Interview' || a.status === 'Assessment'
  );
  const careerTasksOpen = tasks.filter((t) => !t.completed && t.category === 'Career').length;

  const dynamicPriorities = [...blueprint.opportunityPriorities];
  if (interviewOrOA.length > 0) {
    const first = interviewOrOA[0];
    dynamicPriorities.unshift(
      `Top active opportunity right now: ${first.company} (${first.role} — ${first.status}). Dedicate focused prep before new cold applications.`
    );
  } else if (activeApps.length > 0) {
    const first = activeApps[0];
    dynamicPriorities.unshift(
      `Review your active pipeline (${activeApps.length} open, including ${first.company}) and schedule follow-ups for roles aligned with ${effectiveLabel}.`
    );
  }

  const customKeywords =
    category === 'Other' && customFocus?.trim()
      ? [
          customFocus.trim(),
          `${customFocus.trim()} Intern`,
          `Junior ${customFocus.trim()}`,
          `Associate ${customFocus.trim()}`,
        ]
      : blueprint.searchKeywords;

  const customRoles =
    category === 'Other' && customFocus?.trim()
      ? [
          customFocus.trim(),
          `Junior ${customFocus.trim()}`,
          `Associate ${customFocus.trim()}`,
          `${customFocus.trim()} Analyst`,
          `${customFocus.trim()} Specialist`,
        ]
      : blueprint.recommendedRoles;

  const personalLead = userName ? `${userName}, ` : '';
  const summary =
    category === 'Other' && customFocus?.trim()
      ? `${personalLead}tailored guidance for "${customFocus.trim()}" — align your portfolio, keywords, and ${careerTasksOpen} open career task(s) around high-fit roles.`
      : `${personalLead}${blueprint.summaryLead}`;

  return {
    category,
    customFocus: customFocus?.trim() || undefined,
    source: 'curated',
    generatedAt: new Date().toISOString(),
    summary,
    recommendedRoles: customRoles,
    skillsToDevelop: blueprint.skillsToDevelop,
    searchKeywords: customKeywords,
    interviewPrepTips: blueprint.interviewPrepTips,
    jobSearchStrategies: blueprint.jobSearchStrategies,
    opportunityPriorities: dynamicPriorities.slice(0, 3),
    resumeAndAppTips: blueprint.resumeAndAppTips,
    learningResources: blueprint.learningResources,
  };
}

export async function generateAICareerInsights(
  category: CareerFocusCategory,
  customFocus: string | undefined,
  applications: JobApplication[],
  tasks: Task[],
  userName?: string
): Promise<CareerInsightsPlan> {
  const fallback = getCuratedCareerInsights(category, customFocus, applications, tasks, userName);

  try {
    const res = await fetch('/api/ai/career-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        customFocus: customFocus?.trim() || undefined,
        userName: userName || undefined,
        applications: applications.slice(0, 15).map((a) => ({
          company: a.company,
          role: a.role,
          status: a.status,
          followUpDate: a.followUpDate,
          nextAction: a.nextAction,
        })),
        careerTasks: tasks
          .filter((t) => !t.completed && t.category === 'Career')
          .slice(0, 10)
          .map((t) => ({
            title: t.title,
            deadline: t.deadline,
            priority: t.priority,
          })),
      }),
    });

    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      insights?: Partial<CareerInsightsPlan>;
    };
    const ai = data.insights;
    if (!ai || !ai.summary) return fallback;

    return {
      category,
      customFocus: customFocus?.trim() || undefined,
      source: 'gemini',
      generatedAt: new Date().toISOString(),
      summary: ai.summary,
      recommendedRoles:
        ai.recommendedRoles && ai.recommendedRoles.length > 0
          ? ai.recommendedRoles.slice(0, 5)
          : fallback.recommendedRoles,
      skillsToDevelop:
        ai.skillsToDevelop && ai.skillsToDevelop.length > 0
          ? ai.skillsToDevelop.slice(0, 5)
          : fallback.skillsToDevelop,
      searchKeywords:
        ai.searchKeywords && ai.searchKeywords.length > 0
          ? ai.searchKeywords.slice(0, 5)
          : fallback.searchKeywords,
      interviewPrepTips:
        ai.interviewPrepTips && ai.interviewPrepTips.length > 0
          ? ai.interviewPrepTips.slice(0, 4)
          : fallback.interviewPrepTips,
      jobSearchStrategies:
        ai.jobSearchStrategies && ai.jobSearchStrategies.length > 0
          ? ai.jobSearchStrategies.slice(0, 4)
          : fallback.jobSearchStrategies,
      opportunityPriorities:
        ai.opportunityPriorities && ai.opportunityPriorities.length > 0
          ? ai.opportunityPriorities.slice(0, 3)
          : fallback.opportunityPriorities,
      resumeAndAppTips:
        ai.resumeAndAppTips && ai.resumeAndAppTips.length > 0
          ? ai.resumeAndAppTips.slice(0, 4)
          : fallback.resumeAndAppTips,
      // Always provide verified clickable resource links
      learningResources: fallback.learningResources,
    };
  } catch {
    return fallback;
  }
}

export interface JobPlatformCardInfo {
  id: 'linkedin' | 'indeed' | 'naukri' | 'glassdoor';
  name: string;
  description: string;
  searchUrl: string;
  queryLabel: string;
  accentBg: string;
  accentBorder: string;
  buttonBg: string;
}

export function getDefaultSearchQueryForFocus(
  category: CareerFocusCategory,
  customFocus?: string
): string {
  if (category === 'Other' && customFocus?.trim()) {
    return customFocus.trim();
  }
  const map: Record<CareerFocusCategory, string> = {
    'HR & People Operations': 'HR Analyst People Operations',
    Marketing: 'Marketing Associate Growth',
    Consulting: 'Associate Consultant Business Analyst',
    'Data Analytics': 'Data Analyst Business Intelligence',
    Finance: 'Financial Analyst Corporate Finance',
    Operations: 'Operations Analyst Supply Chain',
    'Product Management': 'Associate Product Manager',
    Other: 'Entry Level Analyst Intern',
  };
  return map[category];
}

export function buildJobPlatformLinks(
  category: CareerFocusCategory,
  customFocus?: string,
  overrideQuery?: string
): JobPlatformCardInfo[] {
  const query = (overrideQuery?.trim() || getDefaultSearchQueryForFocus(category, customFocus)).trim();
  const encoded = encodeURIComponent(query);
  const naukriSlug = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'jobs';

  return [
    {
      id: 'linkedin',
      name: 'LinkedIn Jobs',
      description: 'Discover roles, company hiring teams, and alumni referrals.',
      searchUrl: `https://www.linkedin.com/jobs/search/?keywords=${encoded}`,
      queryLabel: query,
      accentBg: 'bg-[#EFF6FF]',
      accentBorder: 'border-[#BFDBFE]',
      buttonBg: 'bg-[#0A66C2] hover:bg-[#004182]',
    },
    {
      id: 'indeed',
      name: 'Indeed',
      description: 'Browse verified employer listings, internships, and entry-level roles.',
      searchUrl: `https://www.indeed.com/jobs?q=${encoded}`,
      queryLabel: query,
      accentBg: 'bg-[#EEF2FF]',
      accentBorder: 'border-[#C7D2FE]',
      buttonBg: 'bg-[#2557A7] hover:bg-[#1D4687]',
    },
    {
      id: 'naukri',
      name: 'Naukri',
      description: 'Explore campus, graduate, and analyst openings across India.',
      searchUrl: `https://www.naukri.com/${naukriSlug}-jobs`,
      queryLabel: query,
      accentBg: 'bg-[#F0FDFA]',
      accentBorder: 'border-[#99F6E4]',
      buttonBg: 'bg-[#0F766E] hover:bg-[#115E59]',
    },
    {
      id: 'glassdoor',
      name: 'Glassdoor',
      description: 'Compare open jobs alongside real salary bands and interview reviews.',
      searchUrl: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encoded}`,
      queryLabel: query,
      accentBg: 'bg-[#F0FDF4]',
      accentBorder: 'border-[#BBF7D0]',
      buttonBg: 'bg-[#0CAA41] hover:bg-[#088A34]',
    },
  ];
}
