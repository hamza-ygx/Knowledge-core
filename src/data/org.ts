import type {
  Agent,
  AgentStatus,
  AutomationLevel,
  Department,
  ProcessStep,
  Task,
  TaskColumn,
  ToolName,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Edit this file to model your own company. See README → "Editing   */
/*  org.ts". Nothing in the UI hard-codes departments or agents.      */
/* ------------------------------------------------------------------ */

export const COMPANY_NAME = "The AI Business";
export const KNOWLEDGE_CORE_LABEL = "Knowledge Core";

const auto = (step: string): ProcessStep => ({ step, automated: true });
const manual = (step: string): ProcessStep => ({ step, automated: false });

type AgentSeed = Omit<Agent, "departmentId" | "status"> & { status?: AgentStatus };

function agents(departmentId: string, list: AgentSeed[]): Agent[] {
  return list.map((a) => ({ status: "idle", ...a, departmentId }));
}

const level = {
  doc: "documented" as AutomationLevel,
  part: "partly_automated" as AutomationLevel,
  full: "fully_automated" as AutomationLevel,
};

/* ------------------------------- SALES ------------------------------ */

const sales = agents("sales", [
  {
    id: "atlas",
    name: "Atlas",
    role: "Head of Sales",
    reportsTo: null,
    automationLevel: level.part,
    status: "working",
    tools: ["HubSpot", "Slack", "Google Sheets"],
    process: [
      auto("Pull weekly pipeline snapshot from HubSpot"),
      auto("Flag stalled deals older than 14 days"),
      manual("Review forecast with founder"),
      manual("Reassign accounts between reps"),
      auto("Post pipeline summary to #sales"),
    ],
  },
  {
    id: "scout",
    name: "Scout",
    role: "Outbound Prospector",
    reportsTo: "atlas",
    automationLevel: level.full,
    tools: ["LinkedIn", "HubSpot", "Perplexity"],
    process: [
      auto("Search target accounts matching the ICP"),
      auto("Enrich contacts with role and company data"),
      auto("Deduplicate against existing CRM records"),
      auto("Create prospect records in HubSpot"),
    ],
  },
  {
    id: "sift",
    name: "Sift",
    role: "Lead Qualifier",
    reportsTo: "atlas",
    automationLevel: level.full,
    status: "working",
    tools: ["HubSpot", "Gmail"],
    process: [
      auto("Read inbound form submissions"),
      auto("Score lead against qualification rubric"),
      auto("Route qualified leads to an account executive"),
      auto("Send polite decline to unqualified leads"),
    ],
  },
  {
    id: "echo",
    name: "Echo",
    role: "Follow-up SDR",
    reportsTo: "sift",
    automationLevel: level.full,
    tools: ["Gmail", "HubSpot", "Google Calendar"],
    process: [
      auto("Detect leads with no reply after 3 days"),
      auto("Draft personalised follow-up from call notes"),
      auto("Send follow-up sequence"),
      auto("Book meeting when prospect replies"),
    ],
  },
  {
    id: "vega",
    name: "Vega",
    role: "Account Executive",
    reportsTo: "atlas",
    automationLevel: level.part,
    status: "working",
    tools: ["HubSpot", "Google Calendar", "Gmail", "DocuSign"],
    process: [
      auto("Prepare discovery call brief from knowledge base"),
      manual("Run discovery call"),
      auto("Summarise call and update deal stage"),
      manual("Negotiate terms"),
      auto("Send contract for signature"),
    ],
  },
  {
    id: "quill",
    name: "Quill",
    role: "Proposal Writer",
    reportsTo: "vega",
    automationLevel: level.part,
    tools: ["Notion", "Google Drive", "DocuSign"],
    process: [
      auto("Pull scope and pricing from deal record"),
      auto("Assemble proposal from template library"),
      manual("Tailor executive summary"),
      manual("Partner sign-off on pricing"),
      auto("Export and share proposal link"),
    ],
  },
  {
    id: "keeper",
    name: "Keeper",
    role: "CRM Hygiene Agent",
    reportsTo: "atlas",
    automationLevel: level.full,
    tools: ["HubSpot", "Google Sheets"],
    process: [
      auto("Scan CRM for missing fields"),
      auto("Merge duplicate contacts and companies"),
      auto("Close out deals inactive for 90 days"),
    ],
  },
]);

/* ----------------------------- MARKETING ---------------------------- */

const marketing = agents("marketing", [
  {
    id: "nova",
    name: "Nova",
    role: "Head of Marketing",
    reportsTo: null,
    automationLevel: level.part,
    tools: ["Notion", "Google Analytics", "Slack"],
    process: [
      manual("Set quarterly campaign themes"),
      auto("Compile channel performance report"),
      manual("Approve content calendar"),
      auto("Allocate budget across channels"),
    ],
  },
  {
    id: "muse",
    name: "Muse",
    role: "Content Strategist",
    reportsTo: "nova",
    automationLevel: level.part,
    status: "working",
    tools: ["Notion", "Perplexity", "Google Drive"],
    process: [
      auto("Mine sales calls for recurring customer questions"),
      auto("Cluster topics by search demand"),
      manual("Pick next month's pillar pieces"),
      auto("Write briefs for the copywriter"),
    ],
  },
  {
    id: "inkwell",
    name: "Inkwell",
    role: "Copywriter",
    reportsTo: "muse",
    automationLevel: level.full,
    status: "working",
    tools: ["Notion", "Google Drive", "Canva"],
    process: [
      auto("Read brief and tone-of-voice guide"),
      auto("Draft long-form article"),
      auto("Generate social cut-downs"),
      auto("Create header graphics"),
      auto("Submit draft for review"),
    ],
  },
  {
    id: "relay",
    name: "Relay",
    role: "Distribution Manager",
    reportsTo: "nova",
    automationLevel: level.full,
    tools: ["Webflow", "LinkedIn", "Gmail"],
    process: [
      auto("Publish approved articles to the website"),
      auto("Schedule newsletter"),
      auto("Syndicate to partner channels"),
    ],
  },
  {
    id: "pulse",
    name: "Pulse",
    role: "Social Media Agent",
    reportsTo: "relay",
    automationLevel: level.full,
    tools: ["LinkedIn", "Canva", "Slack"],
    process: [
      auto("Queue daily posts from the content bank"),
      auto("Reply to comments within brand guidelines"),
      auto("Escalate sensitive threads to Nova"),
    ],
  },
  {
    id: "lens",
    name: "Lens",
    role: "Analytics & SEO",
    reportsTo: "nova",
    automationLevel: level.part,
    tools: ["Google Analytics", "Google Sheets", "Webflow"],
    process: [
      auto("Pull weekly traffic and conversion data"),
      auto("Detect ranking drops"),
      manual("Decide on-page fixes"),
      auto("Apply meta and schema updates"),
    ],
  },
]);

/* ----------------------------- STRATEGY ----------------------------- */

const strategy = agents("strategy", [
  {
    id: "oracle",
    name: "Oracle",
    role: "Chief Strategy Agent",
    reportsTo: null,
    automationLevel: level.doc,
    tools: ["Notion", "Slack"],
    process: [
      manual("Gather inputs from every department lead"),
      manual("Frame the key decisions for the quarter"),
      manual("Run the monthly strategy review"),
      manual("Publish decisions to the knowledge base"),
    ],
  },
  {
    id: "compass",
    name: "Compass",
    role: "Market Researcher",
    reportsTo: "oracle",
    automationLevel: level.part,
    status: "working",
    tools: ["Perplexity", "Notion", "Google Drive"],
    process: [
      auto("Scan industry news and reports"),
      auto("Summarise market shifts"),
      manual("Interview two customers per month"),
      auto("File insights into the knowledge base"),
    ],
  },
  {
    id: "sentinel",
    name: "Sentinel",
    role: "Competitive Intelligence",
    reportsTo: "compass",
    automationLevel: level.full,
    tools: ["Perplexity", "Slack", "Notion"],
    process: [
      auto("Monitor competitor sites and pricing pages"),
      auto("Diff changes week over week"),
      auto("Post alerts to #strategy"),
    ],
  },
  {
    id: "arbiter",
    name: "Arbiter",
    role: "Decision Analyst",
    reportsTo: "oracle",
    automationLevel: level.doc,
    tools: ["Google Sheets", "Notion"],
    process: [
      manual("Collect options for each open decision"),
      manual("Model trade-offs and risks"),
      manual("Write a one-page recommendation"),
    ],
  },
  {
    id: "horizon",
    name: "Horizon",
    role: "Planning & OKRs",
    reportsTo: "oracle",
    automationLevel: level.part,
    tools: ["Notion", "Linear", "Google Sheets"],
    process: [
      manual("Draft quarterly OKRs with leads"),
      auto("Link OKRs to projects in Linear"),
      auto("Track weekly progress"),
      auto("Flag at-risk key results"),
    ],
  },
  {
    id: "prism",
    name: "Prism",
    role: "Pricing Strategist",
    reportsTo: "arbiter",
    automationLevel: level.part,
    tools: ["Stripe", "Google Sheets", "HubSpot"],
    process: [
      auto("Analyse win/loss by price point"),
      auto("Benchmark against competitor pricing"),
      manual("Propose pricing changes"),
      manual("Get sign-off from Oracle"),
    ],
  },
]);

/* ---------------------------- OPERATIONS ---------------------------- */

const operations = agents("operations", [
  {
    id: "forge",
    name: "Forge",
    role: "Head of Operations",
    reportsTo: null,
    automationLevel: level.part,
    tools: ["Linear", "Slack", "Notion"],
    process: [
      auto("Review delivery dashboard"),
      manual("Prioritise client projects"),
      auto("Balance workload across agents"),
      manual("Escalate risks to the founder"),
    ],
  },
  {
    id: "tempo",
    name: "Tempo",
    role: "Project Manager",
    reportsTo: "forge",
    automationLevel: level.part,
    status: "working",
    tools: ["Linear", "Google Calendar", "Slack"],
    process: [
      auto("Break signed scope into milestones"),
      auto("Create tickets and deadlines"),
      manual("Run weekly client check-in"),
      auto("Send status report"),
      manual("Handle change requests"),
    ],
  },
  {
    id: "dispatch",
    name: "Dispatch",
    role: "Resource Scheduler",
    reportsTo: "tempo",
    automationLevel: level.full,
    tools: ["Google Calendar", "Linear"],
    process: [
      auto("Read capacity for each agent"),
      auto("Assign tickets by skill and load"),
      auto("Rebalance when deadlines slip"),
    ],
  },
  {
    id: "harbor",
    name: "Harbor",
    role: "Client Onboarding",
    reportsTo: "forge",
    automationLevel: level.full,
    status: "working",
    tools: ["Gmail", "Google Drive", "Notion", "DocuSign"],
    process: [
      auto("Send welcome pack after contract signature"),
      auto("Collect client documents and access"),
      auto("Create shared workspace"),
      auto("Schedule kickoff call"),
    ],
  },
  {
    id: "checkpoint",
    name: "Checkpoint",
    role: "QA Reviewer",
    reportsTo: "tempo",
    automationLevel: level.part,
    tools: ["Linear", "Notion"],
    process: [
      auto("Run deliverable against checklist"),
      auto("Check facts against the knowledge base"),
      manual("Final quality sign-off"),
    ],
  },
  {
    id: "bridge",
    name: "Bridge",
    role: "Client Success",
    reportsTo: "forge",
    automationLevel: level.part,
    tools: ["HubSpot", "Gmail", "Slack"],
    process: [
      auto("Monitor client health signals"),
      auto("Send monthly value summary"),
      manual("Run quarterly business review"),
      manual("Identify upsell opportunities"),
    ],
  },
]);

/* ------------------------------ FINANCE ----------------------------- */

const finance = agents("finance", [
  {
    id: "sterling",
    name: "Sterling",
    role: "CFO Agent",
    reportsTo: null,
    automationLevel: level.part,
    tools: ["Xero", "Google Sheets", "Slack"],
    process: [
      auto("Produce monthly P&L and cash report"),
      manual("Review with founder"),
      auto("Update 13-week cash forecast"),
      manual("Approve spend above threshold"),
    ],
  },
  {
    id: "tally",
    name: "Tally",
    role: "Bookkeeper",
    reportsTo: "sterling",
    automationLevel: level.full,
    status: "working",
    tools: ["Xero", "Stripe", "Google Drive"],
    process: [
      auto("Import bank feeds"),
      auto("Categorise transactions"),
      auto("Match receipts to expenses"),
      auto("Reconcile accounts"),
      auto("Close the month"),
    ],
  },
  {
    id: "mint",
    name: "Mint",
    role: "Invoicing & AR",
    reportsTo: "tally",
    automationLevel: level.full,
    tools: ["Stripe", "Xero", "Gmail"],
    process: [
      auto("Generate invoices from signed deals"),
      auto("Send invoices and payment links"),
      auto("Chase overdue invoices"),
      auto("Record payments"),
    ],
  },
  {
    id: "frugal",
    name: "Frugal",
    role: "Accounts Payable",
    reportsTo: "tally",
    automationLevel: level.full,
    tools: ["Xero", "Gmail", "Google Drive"],
    process: [
      auto("Capture supplier bills from inbox"),
      auto("Match bills to purchase orders"),
      auto("Schedule payments"),
    ],
  },
  {
    id: "runway",
    name: "Runway",
    role: "FP&A Forecaster",
    reportsTo: "sterling",
    automationLevel: level.part,
    tools: ["Google Sheets", "Xero", "HubSpot"],
    process: [
      auto("Pull pipeline and revenue actuals"),
      auto("Update driver-based model"),
      manual("Adjust scenario assumptions"),
      auto("Publish forecast to the knowledge base"),
    ],
  },
  {
    id: "verity",
    name: "Verity",
    role: "Compliance & Audit",
    reportsTo: "sterling",
    automationLevel: level.doc,
    status: "blocked",
    tools: ["Google Drive", "Notion"],
    process: [
      manual("Maintain compliance calendar"),
      manual("Prepare VAT and tax filings"),
      manual("Collect audit evidence"),
      manual("Review policies annually"),
    ],
  },
]);

/* ------------------------------- ADMIN ------------------------------ */

const admin = agents("admin", [
  {
    id: "warden",
    name: "Warden",
    role: "Head of Admin",
    reportsTo: null,
    automationLevel: level.part,
    tools: ["Notion", "Slack", "1Password"],
    process: [
      auto("Review system health digest"),
      manual("Approve new tool purchases"),
      auto("Audit agent permissions monthly"),
      manual("Update operating handbook"),
    ],
  },
  {
    id: "gatekeeper",
    name: "Gatekeeper",
    role: "Access & Identity",
    reportsTo: "warden",
    automationLevel: level.full,
    tools: ["1Password", "Google Drive", "Slack"],
    process: [
      auto("Provision accounts for new agents"),
      auto("Rotate API credentials"),
      auto("Revoke unused access"),
    ],
  },
  {
    id: "sweep",
    name: "Sweep",
    role: "Data Housekeeping",
    reportsTo: "warden",
    automationLevel: level.full,
    tools: ["Google Drive", "Notion", "Zapier"],
    process: [
      auto("Archive stale files"),
      auto("Enforce folder naming conventions"),
      auto("Remove duplicate documents"),
    ],
  },
  {
    id: "concierge",
    name: "Concierge",
    role: "Inbox & Calendar",
    reportsTo: "warden",
    automationLevel: level.full,
    status: "working",
    tools: ["Gmail", "Google Calendar", "Slack"],
    process: [
      auto("Triage shared inbox"),
      auto("Route messages to the right agent"),
      auto("Schedule meetings and send reminders"),
      auto("Draft replies for routine requests"),
    ],
  },
  {
    id: "archivist",
    name: "Archivist",
    role: "Knowledge Curator",
    reportsTo: "warden",
    automationLevel: level.full,
    status: "working",
    tools: ["Notion", "Google Drive", "Slack"],
    process: [
      auto("Ingest new documents into the knowledge base"),
      auto("Tag and link related entries"),
      auto("Flag outdated pages"),
      auto("Answer agent lookups"),
    ],
  },
  {
    id: "patch",
    name: "Patch",
    role: "IT & Tooling",
    reportsTo: "gatekeeper",
    automationLevel: level.part,
    tools: ["Zapier", "Slack", "Linear"],
    process: [
      auto("Monitor integrations for failures"),
      auto("Retry failed automations"),
      manual("Fix broken integrations"),
      manual("Evaluate new tools"),
    ],
  },
]);

/* ---------------------------- DEPARTMENTS --------------------------- */

// Order here = clockwise order around the map, starting at the top.
export const departments: Department[] = [
  { id: "sales", name: "Sales", subtitle: "conversations & deals", color: "#ff6a1f", agents: sales },
  { id: "marketing", name: "Marketing", subtitle: "content & distribution", color: "#ff3d5e", agents: marketing },
  { id: "strategy", name: "Strategy", subtitle: "decisions & judgment", color: "#ffb020", agents: strategy },
  { id: "operations", name: "Operations", subtitle: "delivery & projects", color: "#ff2d1f", agents: operations },
  { id: "finance", name: "Finance", subtitle: "money in & out", color: "#ffd25e", agents: finance },
  { id: "admin", name: "Admin", subtitle: "systems & housekeeping", color: "#ff8c5a", agents: admin },
];

export const allAgents: Agent[] = departments.flatMap((d) => d.agents);

/* ------------------------------- TASKS ------------------------------ */

const agentDept = new Map(allAgents.map((a) => [a.id, a.departmentId]));
let taskSeq = 0;
const t = (title: string, agentId: string, column: TaskColumn): Task => ({
  id: `t${++taskSeq}`,
  title,
  agentId,
  departmentId: agentDept.get(agentId) ?? "unknown",
  column,
});

export const tasks: Task[] = [
  // Sales
  t("Qualify 14 inbound demo requests", "sift", "in_progress"),
  t("Build prospect list: Nordic SaaS CFOs", "scout", "todo"),
  t("Follow up with Lindqvist AB", "echo", "review"),
  t("Discovery call prep: Nordbank", "vega", "in_progress"),
  t("Proposal: annual audit package", "quill", "todo"),
  t("Merge 212 duplicate contacts", "keeper", "done"),
  t("Q4 pipeline review", "atlas", "backlog"),
  t("Renewal negotiation: Forsberg & Co", "vega", "review"),
  t("Re-engage closed-lost deals", "echo", "backlog"),
  t("Enrich 300 new prospect records", "scout", "done"),
  // Marketing
  t("Draft pillar article: automating month-end", "inkwell", "in_progress"),
  t("October content calendar", "muse", "review"),
  t("Publish case study: Berg Logistics", "relay", "todo"),
  t("Weekly LinkedIn carousel", "pulse", "in_progress"),
  t("Fix ranking drop on /pricing", "lens", "todo"),
  t("Newsletter #42", "relay", "done"),
  t("Campaign theme for Q1", "nova", "backlog"),
  t("Topic research: AI in audit", "muse", "backlog"),
  t("Rewrite homepage hero copy", "inkwell", "review"),
  t("Channel attribution report", "lens", "done"),
  // Strategy
  t("Decide: enter the Danish market?", "arbiter", "in_progress"),
  t("Competitor pricing teardown", "sentinel", "done"),
  t("Q1 OKR draft", "horizon", "todo"),
  t("Market sizing: SME bookkeeping", "compass", "in_progress"),
  t("Test value-based pricing tier", "prism", "backlog"),
  t("Monthly strategy review deck", "oracle", "review"),
  t("Customer interview synthesis", "compass", "todo"),
  t("Partnership options memo", "arbiter", "backlog"),
  t("Weekly competitor digest", "sentinel", "in_progress"),
  // Operations
  t("Kickoff: Nordbank onboarding", "harbor", "in_progress"),
  t("Milestone plan: Berg Logistics", "tempo", "todo"),
  t("Rebalance sprint workload", "dispatch", "done"),
  t("QA: annual report draft", "checkpoint", "review"),
  t("QBR prep: Forsberg & Co", "bridge", "todo"),
  t("Collect access for new client", "harbor", "backlog"),
  t("Delivery risk review", "forge", "in_progress"),
  t("Client status reports (week 39)", "tempo", "review"),
  t("Health-score alert: Lindqvist AB", "bridge", "backlog"),
  t("Capacity plan for November", "dispatch", "backlog"),
  // Finance
  t("Reconcile September bank feeds", "tally", "in_progress"),
  t("Chase 6 overdue invoices", "mint", "in_progress"),
  t("Pay supplier batch #118", "frugal", "review"),
  t("Update 13-week cash forecast", "sterling", "todo"),
  t("Scenario model: two new hires", "runway", "backlog"),
  t("VAT return Q3", "verity", "in_progress"),
  t("Invoice Nordbank setup fee", "mint", "done"),
  t("September P&L", "sterling", "review"),
  t("Receipt matching backlog", "tally", "todo"),
  t("Audit evidence folder", "verity", "backlog"),
  // Admin
  t("Rotate Stripe API keys", "gatekeeper", "done"),
  t("Archive 2023 project folders", "sweep", "in_progress"),
  t("Ingest new client handbook", "archivist", "in_progress"),
  t("Triage shared inbox", "concierge", "in_progress"),
  t("Fix failing Zapier → Xero sync", "patch", "todo"),
  t("Permissions audit", "warden", "backlog"),
  t("Onboard two new agents", "gatekeeper", "todo"),
  t("Flag outdated pricing pages in KB", "archivist", "review"),
  t("Update operating handbook", "warden", "backlog"),
  t("Evaluate e-signature alternatives", "patch", "backlog"),
];

/* --------------------------- SIMULATION TEXT ------------------------ */

// What agents look up when they "read the knowledge base".
export const knowledgeTopics: Record<string, string[]> = {
  sales: ["ideal customer profile", "pricing sheet", "objection handling", "case studies", "past proposals"],
  marketing: ["tone-of-voice guide", "brand assets", "customer quotes", "SEO keyword map", "content archive"],
  strategy: ["quarterly decisions log", "competitor profiles", "market research", "OKR history", "board notes"],
  operations: ["delivery playbooks", "client briefs", "QA checklist", "project templates", "SLA terms"],
  finance: ["chart of accounts", "VAT rules", "supplier contracts", "forecast model", "expense policy"],
  admin: ["access policy", "tool inventory", "operating handbook", "integration docs", "naming conventions"],
};

// Titles the simulator uses when it spawns new tasks.
export const taskTemplates: Record<string, string[]> = {
  sales: ["Qualify new inbound lead", "Follow up after demo", "Draft proposal for {client}", "Update deal stage: {client}"],
  marketing: ["Draft LinkedIn post", "Repurpose webinar into article", "Refresh landing page copy", "Weekly traffic report"],
  strategy: ["Assess competitor launch", "Decision memo: {client} request", "Update market map", "Review pricing experiment"],
  operations: ["Onboard {client}", "QA deliverable for {client}", "Weekly status: {client}", "Resolve change request"],
  finance: ["Invoice {client}", "Reconcile card expenses", "Pay supplier bills", "Refresh cash forecast"],
  admin: ["Provision tool access", "Clean shared drive", "Fix broken automation", "Ingest meeting notes into KB"],
};

export const clientNames = [
  "Nordbank",
  "Berg Logistics",
  "Lindqvist AB",
  "Forsberg & Co",
  "Ekström Bygg",
  "Sjöberg Retail",
  "Holm Invest",
  "Dahl Media",
];
