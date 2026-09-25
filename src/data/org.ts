import { l, type L } from "@/i18n/core";
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
/*  All visible text is written as l("English", "Svenska").           */
/* ------------------------------------------------------------------ */

export const COMPANY_NAME = l("Example Co.", "Exempelbolaget AB");
export const COMPANY_TAGLINE = l("run by AI agents", "drivs av AI-agenter");
export const PRESENTED_BY = l("Presented by Hamza, RKJH", "Presenterad av Hamza, RKJH");
export const KNOWLEDGE_CORE_LABEL = l("Knowledge Core", "Kunskapskärnan");

const auto = (en: string, sv: string): ProcessStep => ({ step: l(en, sv), automated: true });
const manual = (en: string, sv: string): ProcessStep => ({ step: l(en, sv), automated: false });

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
    role: l("Head of Sales", "Säljchef"),
    reportsTo: null,
    automationLevel: level.part,
    status: "working",
    tools: ["HubSpot", "Teams", "Excel"],
    process: [
      auto("Pull weekly pipeline snapshot from HubSpot", "Hämtar veckans pipeline från HubSpot"),
      auto("Flag stalled deals older than 14 days", "Flaggar affärer som stått still i 14 dagar"),
      manual("Review forecast with the CEO", "Går igenom prognosen med vd"),
      manual("Reassign accounts between reps", "Fördelar om kunder mellan säljare"),
      auto("Post pipeline summary to Teams", "Postar pipelinesammanfattning i Teams"),
    ],
  },
  {
    id: "scout",
    name: "Scout",
    role: l("Outbound Prospector", "Prospektering"),
    reportsTo: "atlas",
    automationLevel: level.full,
    tools: ["LinkedIn", "HubSpot", "Perplexity"],
    process: [
      auto("Search target accounts matching the ICP", "Söker företag som matchar målkundsprofilen"),
      auto("Enrich contacts with role and company data", "Kompletterar kontakter med roll och bolagsdata"),
      auto("Deduplicate against existing CRM records", "Rensar dubbletter mot befintliga CRM-poster"),
      auto("Create prospect records in HubSpot", "Skapar prospekt i HubSpot"),
    ],
  },
  {
    id: "sift",
    name: "Sift",
    role: l("Lead Qualifier", "Leadkvalificering"),
    reportsTo: "atlas",
    automationLevel: level.full,
    status: "working",
    tools: ["HubSpot", "Outlook"],
    process: [
      auto("Read inbound form submissions", "Läser inkomna formulär"),
      auto("Score lead against qualification rubric", "Poängsätter leadet mot kvalificeringsmallen"),
      auto("Route qualified leads to an account executive", "Skickar kvalificerade leads till en säljare"),
      auto("Send polite decline to unqualified leads", "Skickar ett vänligt nej till okvalificerade leads"),
    ],
  },
  {
    id: "echo",
    name: "Echo",
    role: l("Follow-up SDR", "Uppföljning"),
    reportsTo: "sift",
    automationLevel: level.full,
    tools: ["Outlook", "HubSpot", "Outlook Calendar"],
    process: [
      auto("Detect leads with no reply after 3 days", "Hittar leads som inte svarat på 3 dagar"),
      auto("Draft personalised follow-up from call notes", "Skriver personlig uppföljning utifrån samtalsanteckningar"),
      auto("Send follow-up sequence", "Skickar uppföljningssekvens"),
      auto("Book meeting when prospect replies", "Bokar möte när prospektet svarar"),
    ],
  },
  {
    id: "vega",
    name: "Vega",
    role: l("Account Executive", "Kundansvarig säljare"),
    reportsTo: "atlas",
    automationLevel: level.part,
    status: "working",
    tools: ["HubSpot", "Outlook Calendar", "Outlook", "Scrive"],
    process: [
      auto("Prepare call brief from the knowledge base", "Förbereder samtalsunderlag från kunskapsbasen"),
      manual("Run discovery call", "Håller behovsanalysmöte"),
      auto("Summarise call and update deal stage", "Sammanfattar samtalet och uppdaterar affären"),
      manual("Negotiate terms", "Förhandlar villkor"),
      auto("Send contract for e-signing", "Skickar avtal för e-signering"),
    ],
  },
  {
    id: "quill",
    name: "Quill",
    role: l("Proposal Writer", "Offertskribent"),
    reportsTo: "vega",
    automationLevel: level.part,
    tools: ["Notion", "SharePoint", "Scrive"],
    process: [
      auto("Pull scope and pricing from the deal", "Hämtar omfattning och pris från affären"),
      auto("Assemble proposal from template library", "Sätter ihop offerten från mallbiblioteket"),
      manual("Tailor the executive summary", "Anpassar sammanfattningen"),
      manual("Sign-off on pricing", "Godkännande av prissättning"),
      auto("Export and share proposal link", "Exporterar och delar offertlänken"),
    ],
  },
  {
    id: "keeper",
    name: "Keeper",
    role: l("CRM Hygiene Agent", "CRM-städare"),
    reportsTo: "atlas",
    automationLevel: level.full,
    tools: ["HubSpot", "Excel"],
    process: [
      auto("Scan CRM for missing fields", "Letar efter tomma fält i CRM"),
      auto("Merge duplicate contacts and companies", "Slår ihop dubbletter av kontakter och bolag"),
      auto("Close out deals inactive for 90 days", "Stänger affärer som varit inaktiva i 90 dagar"),
    ],
  },
]);

/* ----------------------------- MARKETING ---------------------------- */

const marketing = agents("marketing", [
  {
    id: "nova",
    name: "Nova",
    role: l("Head of Marketing", "Marknadschef"),
    reportsTo: null,
    automationLevel: level.part,
    tools: ["Notion", "Google Analytics", "Teams"],
    process: [
      manual("Set quarterly campaign themes", "Sätter kvartalets kampanjteman"),
      auto("Compile channel performance report", "Sammanställer kanalrapport"),
      manual("Approve content calendar", "Godkänner innehållskalendern"),
      auto("Allocate budget across channels", "Fördelar budget mellan kanaler"),
    ],
  },
  {
    id: "muse",
    name: "Muse",
    role: l("Content Strategist", "Innehållsstrateg"),
    reportsTo: "nova",
    automationLevel: level.part,
    status: "working",
    tools: ["Notion", "Perplexity", "SharePoint"],
    process: [
      auto("Mine sales calls for recurring customer questions", "Hittar återkommande kundfrågor i säljsamtal"),
      auto("Cluster topics by search demand", "Grupperar ämnen efter sökefterfrågan"),
      manual("Pick next month's pillar pieces", "Väljer nästa månads huvudartiklar"),
      auto("Write briefs for the copywriter", "Skriver briefer till copywritern"),
    ],
  },
  {
    id: "inkwell",
    name: "Inkwell",
    role: l("Copywriter", "Copywriter"),
    reportsTo: "muse",
    automationLevel: level.full,
    status: "working",
    tools: ["Notion", "SharePoint", "Canva"],
    process: [
      auto("Read brief and tone-of-voice guide", "Läser brief och tonalitetsguide"),
      auto("Draft long-form article", "Skriver utkast till längre artikel"),
      auto("Generate social cut-downs", "Gör kortversioner för sociala medier"),
      auto("Create header graphics", "Skapar rubrikbilder"),
      auto("Submit draft for review", "Skickar utkastet för granskning"),
    ],
  },
  {
    id: "relay",
    name: "Relay",
    role: l("Distribution Manager", "Distributionsansvarig"),
    reportsTo: "nova",
    automationLevel: level.full,
    tools: ["Webflow", "LinkedIn", "Outlook"],
    process: [
      auto("Publish approved articles to the website", "Publicerar godkända artiklar på webben"),
      auto("Schedule the newsletter", "Schemalägger nyhetsbrevet"),
      auto("Syndicate to partner channels", "Sprider till partnerkanaler"),
    ],
  },
  {
    id: "pulse",
    name: "Pulse",
    role: l("Social Media Agent", "Sociala medier"),
    reportsTo: "relay",
    automationLevel: level.full,
    tools: ["LinkedIn", "Canva", "Teams"],
    process: [
      auto("Queue daily posts from the content bank", "Köar dagliga inlägg från innehållsbanken"),
      auto("Reply to comments within brand guidelines", "Svarar på kommentarer enligt varumärkesriktlinjerna"),
      auto("Escalate sensitive threads to Nova", "Eskalerar känsliga trådar till Nova"),
    ],
  },
  {
    id: "lens",
    name: "Lens",
    role: l("Analytics & SEO", "Analys & SEO"),
    reportsTo: "nova",
    automationLevel: level.part,
    tools: ["Google Analytics", "Excel", "Webflow"],
    process: [
      auto("Pull weekly traffic and conversion data", "Hämtar veckans trafik- och konverteringsdata"),
      auto("Detect ranking drops", "Upptäcker tapp i sökrankning"),
      manual("Decide on-page fixes", "Beslutar om åtgärder på sidorna"),
      auto("Apply meta and schema updates", "Uppdaterar metadata och struktur"),
    ],
  },
]);

/* ----------------------------- STRATEGY ----------------------------- */

const strategy = agents("strategy", [
  {
    id: "oracle",
    name: "Oracle",
    role: l("Chief Strategy Agent", "Strategichef"),
    reportsTo: null,
    automationLevel: level.doc,
    tools: ["Notion", "Teams"],
    process: [
      manual("Gather input from every department lead", "Samlar in underlag från varje avdelningschef"),
      manual("Frame the key decisions for the quarter", "Formulerar kvartalets viktigaste beslut"),
      manual("Run the monthly strategy review", "Leder den månatliga strategigenomgången"),
      manual("Publish decisions to the knowledge base", "Publicerar besluten i kunskapsbasen"),
    ],
  },
  {
    id: "compass",
    name: "Compass",
    role: l("Market Researcher", "Marknadsanalytiker"),
    reportsTo: "oracle",
    automationLevel: level.part,
    status: "working",
    tools: ["Perplexity", "Notion", "SharePoint"],
    process: [
      auto("Scan industry news and reports", "Bevakar branschnyheter och rapporter"),
      auto("Summarise market shifts", "Sammanfattar förändringar på marknaden"),
      manual("Interview two customers per month", "Intervjuar två kunder per månad"),
      auto("File insights into the knowledge base", "Sparar insikter i kunskapsbasen"),
    ],
  },
  {
    id: "sentinel",
    name: "Sentinel",
    role: l("Competitive Intelligence", "Omvärldsbevakning"),
    reportsTo: "compass",
    automationLevel: level.full,
    tools: ["Perplexity", "Teams", "Notion"],
    process: [
      auto("Monitor competitor sites and pricing pages", "Bevakar konkurrenters webbplatser och priser"),
      auto("Diff changes week over week", "Jämför förändringar vecka för vecka"),
      auto("Post alerts to the strategy channel", "Larmar i strategikanalen"),
    ],
  },
  {
    id: "arbiter",
    name: "Arbiter",
    role: l("Decision Analyst", "Beslutsanalytiker"),
    reportsTo: "oracle",
    automationLevel: level.doc,
    tools: ["Excel", "Notion"],
    process: [
      manual("Collect options for each open decision", "Samlar alternativ för varje öppet beslut"),
      manual("Model trade-offs and risks", "Modellerar avvägningar och risker"),
      manual("Write a one-page recommendation", "Skriver en rekommendation på en sida"),
    ],
  },
  {
    id: "horizon",
    name: "Horizon",
    role: l("Planning & OKRs", "Planering & mål"),
    reportsTo: "oracle",
    automationLevel: level.part,
    tools: ["Notion", "Planner", "Excel"],
    process: [
      manual("Draft quarterly OKRs with leads", "Tar fram kvartalsmål med cheferna"),
      auto("Link goals to projects in Planner", "Kopplar mål till projekt i Planner"),
      auto("Track weekly progress", "Följer upp framstegen varje vecka"),
      auto("Flag goals at risk", "Flaggar mål som riskerar att missas"),
    ],
  },
  {
    id: "prism",
    name: "Prism",
    role: l("Pricing Strategist", "Prisstrateg"),
    reportsTo: "arbiter",
    automationLevel: level.part,
    tools: ["Stripe", "Excel", "HubSpot"],
    process: [
      auto("Analyse win/loss by price point", "Analyserar vunna/förlorade affärer per prisnivå"),
      auto("Benchmark against competitor pricing", "Jämför med konkurrenternas priser"),
      manual("Propose pricing changes", "Föreslår prisändringar"),
      manual("Get sign-off from Oracle", "Får godkännande av Oracle"),
    ],
  },
]);

/* ---------------------------- OPERATIONS ---------------------------- */

const operations = agents("operations", [
  {
    id: "forge",
    name: "Forge",
    role: l("Head of Operations", "Driftchef"),
    reportsTo: null,
    automationLevel: level.part,
    tools: ["Planner", "Teams", "Notion"],
    process: [
      auto("Review delivery dashboard", "Går igenom leveransöversikten"),
      manual("Prioritise customer projects", "Prioriterar kundprojekt"),
      auto("Balance workload across agents", "Fördelar arbetsbelastningen mellan agenter"),
      manual("Escalate risks to the CEO", "Eskalerar risker till vd"),
    ],
  },
  {
    id: "tempo",
    name: "Tempo",
    role: l("Project Manager", "Projektledare"),
    reportsTo: "forge",
    automationLevel: level.part,
    status: "working",
    tools: ["Planner", "Outlook Calendar", "Teams"],
    process: [
      auto("Break signed scope into milestones", "Delar upp avtalad omfattning i delmål"),
      auto("Create tickets and deadlines", "Skapar uppgifter och deadlines"),
      manual("Run weekly customer check-in", "Håller veckoavstämning med kunden"),
      auto("Send status report", "Skickar statusrapport"),
      manual("Handle change requests", "Hanterar ändringsönskemål"),
    ],
  },
  {
    id: "dispatch",
    name: "Dispatch",
    role: l("Resource Scheduler", "Resursplanerare"),
    reportsTo: "tempo",
    automationLevel: level.full,
    tools: ["Outlook Calendar", "Planner"],
    process: [
      auto("Read capacity for each agent", "Läser av kapaciteten för varje agent"),
      auto("Assign tasks by skill and load", "Tilldelar uppgifter efter kompetens och belastning"),
      auto("Rebalance when deadlines slip", "Planerar om när deadlines glider"),
    ],
  },
  {
    id: "harbor",
    name: "Harbor",
    role: l("Customer Onboarding", "Kundintroduktion"),
    reportsTo: "forge",
    automationLevel: level.full,
    status: "working",
    tools: ["Outlook", "SharePoint", "Notion", "Scrive"],
    process: [
      auto("Send welcome pack after contract signature", "Skickar välkomstpaket när avtalet är signerat"),
      auto("Collect customer documents and access", "Samlar in kundens dokument och behörigheter"),
      auto("Create shared workspace", "Skapar gemensam arbetsyta"),
      auto("Schedule kickoff meeting", "Bokar uppstartsmöte"),
    ],
  },
  {
    id: "checkpoint",
    name: "Checkpoint",
    role: l("QA Reviewer", "Kvalitetsgranskare"),
    reportsTo: "tempo",
    automationLevel: level.part,
    tools: ["Planner", "Notion"],
    process: [
      auto("Run deliverable against checklist", "Kontrollerar leveransen mot checklistan"),
      auto("Check facts against the knowledge base", "Faktagranskar mot kunskapsbasen"),
      manual("Final quality sign-off", "Slutligt kvalitetsgodkännande"),
    ],
  },
  {
    id: "bridge",
    name: "Bridge",
    role: l("Customer Success", "Kundansvarig"),
    reportsTo: "forge",
    automationLevel: level.part,
    tools: ["HubSpot", "Outlook", "Teams"],
    process: [
      auto("Monitor customer health signals", "Bevakar signaler om kundnöjdhet"),
      auto("Send monthly value summary", "Skickar månatlig nyttosammanfattning"),
      manual("Run quarterly business review", "Håller kvartalsuppföljning med kunden"),
      manual("Identify upsell opportunities", "Hittar möjligheter till merförsäljning"),
    ],
  },
]);

/* ------------------------------ FINANCE ----------------------------- */

const finance = agents("finance", [
  {
    id: "sterling",
    name: "Sterling",
    role: l("CFO Agent", "Ekonomichef"),
    reportsTo: null,
    automationLevel: level.part,
    tools: ["Fortnox", "Excel", "Teams"],
    process: [
      auto("Produce monthly P&L and cash report", "Tar fram månadens resultat- och kassarapport"),
      manual("Review with the CEO", "Går igenom med vd"),
      auto("Update 13-week cash forecast", "Uppdaterar 13-veckors likviditetsprognos"),
      manual("Approve spend above threshold", "Attesterar utgifter över beloppsgränsen"),
    ],
  },
  {
    id: "tally",
    name: "Tally",
    role: l("Bookkeeper", "Bokförare"),
    reportsTo: "sterling",
    automationLevel: level.full,
    status: "working",
    tools: ["Fortnox", "Stripe", "SharePoint"],
    process: [
      auto("Import bank transactions", "Importerar banktransaktioner"),
      auto("Categorise transactions", "Konterar transaktioner"),
      auto("Match receipts to expenses", "Matchar kvitton mot utgifter"),
      auto("Reconcile accounts", "Stämmer av konton"),
      auto("Close the month", "Stänger månaden"),
    ],
  },
  {
    id: "mint",
    name: "Mint",
    role: l("Invoicing & Receivables", "Fakturering & kundreskontra"),
    reportsTo: "tally",
    automationLevel: level.full,
    tools: ["Fortnox", "Stripe", "Outlook"],
    process: [
      auto("Generate invoices from signed deals", "Skapar fakturor från signerade affärer"),
      auto("Send invoices and payment links", "Skickar fakturor och betallänkar"),
      auto("Chase overdue invoices", "Påminner om förfallna fakturor"),
      auto("Record payments", "Bokför inbetalningar"),
    ],
  },
  {
    id: "frugal",
    name: "Frugal",
    role: l("Accounts Payable", "Leverantörsreskontra"),
    reportsTo: "tally",
    automationLevel: level.full,
    tools: ["Fortnox", "Outlook", "SharePoint"],
    process: [
      auto("Capture supplier invoices from the inbox", "Fångar leverantörsfakturor från inkorgen"),
      auto("Match invoices to purchase orders", "Matchar fakturor mot beställningar"),
      auto("Schedule payments", "Schemalägger betalningar"),
    ],
  },
  {
    id: "runway",
    name: "Runway",
    role: l("Forecasting & Planning", "Prognos & planering"),
    reportsTo: "sterling",
    automationLevel: level.part,
    tools: ["Excel", "Fortnox", "HubSpot"],
    process: [
      auto("Pull pipeline and revenue actuals", "Hämtar pipeline och utfall"),
      auto("Update the driver-based model", "Uppdaterar prognosmodellen"),
      manual("Adjust scenario assumptions", "Justerar antaganden i scenarierna"),
      auto("Publish forecast to the knowledge base", "Publicerar prognosen i kunskapsbasen"),
    ],
  },
  {
    id: "verity",
    name: "Verity",
    role: l("Compliance & Audit", "Regelefterlevnad & revision"),
    reportsTo: "sterling",
    automationLevel: level.doc,
    status: "blocked",
    tools: ["SharePoint", "Notion"],
    process: [
      manual("Maintain the compliance calendar", "Håller efterlevnadskalendern uppdaterad"),
      manual("Prepare VAT and tax filings", "Förbereder moms- och skattedeklarationer"),
      manual("Collect audit evidence", "Samlar underlag till revisionen"),
      manual("Review policies annually", "Ser över policyer årligen"),
    ],
  },
]);

/* ------------------------------- ADMIN ------------------------------ */

const admin = agents("admin", [
  {
    id: "warden",
    name: "Warden",
    role: l("Head of Admin", "Administrativ chef"),
    reportsTo: null,
    automationLevel: level.part,
    tools: ["Notion", "Teams", "1Password"],
    process: [
      auto("Review system health digest", "Går igenom systemhälsan"),
      manual("Approve new tool purchases", "Godkänner nya verktygsinköp"),
      auto("Audit agent permissions monthly", "Granskar agenternas behörigheter varje månad"),
      manual("Update the operating handbook", "Uppdaterar verksamhetshandboken"),
    ],
  },
  {
    id: "gatekeeper",
    name: "Gatekeeper",
    role: l("Access & Identity", "Behörigheter & identitet"),
    reportsTo: "warden",
    automationLevel: level.full,
    tools: ["1Password", "SharePoint", "Teams"],
    process: [
      auto("Provision accounts for new agents", "Skapar konton åt nya agenter"),
      auto("Rotate API credentials", "Byter API-nycklar regelbundet"),
      auto("Revoke unused access", "Tar bort oanvända behörigheter"),
    ],
  },
  {
    id: "sweep",
    name: "Sweep",
    role: l("Data Housekeeping", "Datastädning"),
    reportsTo: "warden",
    automationLevel: level.full,
    tools: ["SharePoint", "Notion", "Power Automate"],
    process: [
      auto("Archive stale files", "Arkiverar gamla filer"),
      auto("Enforce folder naming conventions", "Upprätthåller namnstandard för mappar"),
      auto("Remove duplicate documents", "Tar bort dubbletter av dokument"),
    ],
  },
  {
    id: "concierge",
    name: "Concierge",
    role: l("Inbox & Calendar", "Inkorg & kalender"),
    reportsTo: "warden",
    automationLevel: level.full,
    status: "working",
    tools: ["Outlook", "Outlook Calendar", "Teams"],
    process: [
      auto("Triage the shared inbox", "Sorterar den gemensamma inkorgen"),
      auto("Route messages to the right agent", "Skickar vidare meddelanden till rätt agent"),
      auto("Schedule meetings and send reminders", "Bokar möten och skickar påminnelser"),
      auto("Draft replies for routine requests", "Skriver svarsutkast på rutinärenden"),
    ],
  },
  {
    id: "archivist",
    name: "Archivist",
    role: l("Knowledge Curator", "Kunskapsförvaltare"),
    reportsTo: "warden",
    automationLevel: level.full,
    status: "working",
    tools: ["Notion", "SharePoint", "Teams"],
    process: [
      auto("Ingest new documents into the knowledge base", "Läser in nya dokument i kunskapsbasen"),
      auto("Tag and link related entries", "Taggar och länkar ihop relaterat innehåll"),
      auto("Flag outdated pages", "Flaggar inaktuella sidor"),
      auto("Answer agent lookups", "Besvarar agenternas uppslag"),
    ],
  },
  {
    id: "patch",
    name: "Patch",
    role: l("IT & Tooling", "IT & verktyg"),
    reportsTo: "gatekeeper",
    automationLevel: level.part,
    tools: ["Power Automate", "Teams", "Planner"],
    process: [
      auto("Monitor integrations for failures", "Bevakar integrationer efter fel"),
      auto("Retry failed automations", "Kör om misslyckade automationer"),
      manual("Fix broken integrations", "Lagar trasiga integrationer"),
      manual("Evaluate new tools", "Utvärderar nya verktyg"),
    ],
  },
]);

/* ---------------------------- DEPARTMENTS --------------------------- */

// Order here = clockwise order around the map, starting at the top-left.
export const departments: Department[] = [
  { id: "sales", name: l("Sales", "Försäljning"), subtitle: l("conversations & deals", "samtal & affärer"), color: "#ff6a1f", agents: sales },
  { id: "marketing", name: l("Marketing", "Marknad"), subtitle: l("content & distribution", "innehåll & spridning"), color: "#ff3d5e", agents: marketing },
  { id: "strategy", name: l("Strategy", "Strategi"), subtitle: l("decisions & judgment", "beslut & omdöme"), color: "#ffb020", agents: strategy },
  { id: "operations", name: l("Operations", "Drift"), subtitle: l("delivery & projects", "leverans & projekt"), color: "#ff2d1f", agents: operations },
  { id: "finance", name: l("Finance", "Ekonomi"), subtitle: l("money in & out", "pengar in & ut"), color: "#ffd25e", agents: finance },
  { id: "admin", name: l("Admin", "Admin"), subtitle: l("systems & housekeeping", "system & ordning"), color: "#ff8c5a", agents: admin },
];

export const allAgents: Agent[] = departments.flatMap((d) => d.agents);

/* ------------------------------- TASKS ------------------------------ */

// Every customer name is a placeholder so no real company appears on screen.
export const clientNames = [
  "Demo Bygg AB",
  "Demo Logistik AB",
  "Demo Handel AB",
  "Demo Fastigheter AB",
  "Demo Bank AB",
  "Demo Media AB",
  "Demo Hälsa AB",
  "Demostiftelsen",
];

const agentDept = new Map(allAgents.map((a) => [a.id, a.departmentId]));
let taskSeq = 0;
const t = (en: string, sv: string, agentId: string, column: TaskColumn): Task => ({
  id: `t${++taskSeq}`,
  title: l(en, sv),
  agentId,
  departmentId: agentDept.get(agentId) ?? "unknown",
  column,
});

export const tasks: Task[] = [
  // Sales
  t("Qualify 14 inbound demo requests", "Kvalificera 14 inkomna demoförfrågningar", "sift", "in_progress"),
  t("Build prospect list: regional property owners", "Ta fram prospektlista: regionala fastighetsägare", "scout", "todo"),
  t("Follow up with Demo Handel AB", "Följ upp Demo Handel AB", "echo", "review"),
  t("Discovery call prep: Demo Bank AB", "Förbered behovsanalys: Demo Bank AB", "vega", "in_progress"),
  t("Proposal: annual service agreement", "Offert: årligt serviceavtal", "quill", "todo"),
  t("Merge 212 duplicate contacts", "Slå ihop 212 dubblettkontakter", "keeper", "done"),
  t("Q4 pipeline review", "Genomgång av pipeline Q4", "atlas", "backlog"),
  t("Renewal negotiation: Demo Fastigheter AB", "Förnyelseförhandling: Demo Fastigheter AB", "vega", "review"),
  t("Re-engage closed-lost deals", "Återuppta förlorade affärer", "echo", "backlog"),
  t("Enrich 300 new prospect records", "Komplettera 300 nya prospekt", "scout", "done"),
  // Marketing
  t("Draft article: automating month-end", "Utkast: automatisera månadsbokslutet", "inkwell", "in_progress"),
  t("October content calendar", "Innehållskalender oktober", "muse", "review"),
  t("Publish case study: Demo Logistik AB", "Publicera kundcase: Demo Logistik AB", "relay", "todo"),
  t("Weekly LinkedIn carousel", "Veckans LinkedIn-karusell", "pulse", "in_progress"),
  t("Fix ranking drop on the pricing page", "Åtgärda rankingtapp på prissidan", "lens", "todo"),
  t("Newsletter #42", "Nyhetsbrev #42", "relay", "done"),
  t("Campaign theme for Q1", "Kampanjtema för Q1", "nova", "backlog"),
  t("Topic research: AI in finance", "Ämnesresearch: AI inom ekonomi", "muse", "backlog"),
  t("Rewrite homepage hero copy", "Skriv om startsidans huvudtext", "inkwell", "review"),
  t("Channel attribution report", "Rapport kanalattribution", "lens", "done"),
  // Strategy
  t("Decide: open a Gothenburg office?", "Beslut: öppna kontor i Göteborg?", "arbiter", "in_progress"),
  t("Competitor pricing teardown", "Genomlysning av konkurrenternas priser", "sentinel", "done"),
  t("Q1 goals draft", "Utkast till mål för Q1", "horizon", "todo"),
  t("Market sizing: small-business services", "Marknadsstorlek: tjänster för småföretag", "compass", "in_progress"),
  t("Test value-based pricing tier", "Testa värdebaserad prisnivå", "prism", "backlog"),
  t("Monthly strategy review deck", "Månadens strategipresentation", "oracle", "review"),
  t("Customer interview synthesis", "Sammanställning av kundintervjuer", "compass", "todo"),
  t("Partnership options memo", "PM om partnerskapsalternativ", "arbiter", "backlog"),
  t("Weekly competitor digest", "Veckans omvärldsbrev", "sentinel", "in_progress"),
  // Operations
  t("Kickoff: Demo Bank AB onboarding", "Uppstart: introduktion av Demo Bank AB", "harbor", "in_progress"),
  t("Milestone plan: Demo Logistik AB", "Delmålsplan: Demo Logistik AB", "tempo", "todo"),
  t("Rebalance sprint workload", "Fördela om arbetsbelastningen", "dispatch", "done"),
  t("QA: annual report draft", "Granskning: utkast till årsrapport", "checkpoint", "review"),
  t("Quarterly review prep: Demo Fastigheter AB", "Förbered kvartalsmöte: Demo Fastigheter AB", "bridge", "todo"),
  t("Collect access for new customer", "Samla in behörigheter för ny kund", "harbor", "backlog"),
  t("Delivery risk review", "Genomgång av leveransrisker", "forge", "in_progress"),
  t("Customer status reports (week 39)", "Kundstatusrapporter (vecka 39)", "tempo", "review"),
  t("Health-score alert: Demo Handel AB", "Varning kundhälsa: Demo Handel AB", "bridge", "backlog"),
  t("Capacity plan for November", "Kapacitetsplan för november", "dispatch", "backlog"),
  // Finance
  t("Reconcile September bank transactions", "Stäm av septembers banktransaktioner", "tally", "in_progress"),
  t("Chase 6 overdue invoices", "Påminn om 6 förfallna fakturor", "mint", "in_progress"),
  t("Pay supplier batch #118", "Betala leverantörsbatch #118", "frugal", "review"),
  t("Update 13-week cash forecast", "Uppdatera 13-veckors likviditetsprognos", "sterling", "todo"),
  t("Scenario model: two new hires", "Scenariomodell: två nyanställningar", "runway", "backlog"),
  t("VAT return Q3", "Momsdeklaration Q3", "verity", "in_progress"),
  t("Invoice Demo Bank AB setup fee", "Fakturera uppstartsavgift Demo Bank AB", "mint", "done"),
  t("September P&L", "Resultaträkning september", "sterling", "review"),
  t("Receipt matching backlog", "Eftersläpande kvittomatchning", "tally", "todo"),
  t("Audit evidence folder", "Mapp med revisionsunderlag", "verity", "backlog"),
  // Admin
  t("Rotate payment API keys", "Byt API-nycklar för betalningar", "gatekeeper", "done"),
  t("Archive 2023 project folders", "Arkivera projektmappar från 2023", "sweep", "in_progress"),
  t("Ingest new customer handbook", "Läs in ny kundhandbok", "archivist", "in_progress"),
  t("Triage shared inbox", "Sortera gemensam inkorg", "concierge", "in_progress"),
  t("Fix failing accounting sync", "Laga trasig synk till bokföringen", "patch", "todo"),
  t("Permissions audit", "Behörighetsgranskning", "warden", "backlog"),
  t("Onboard two new agents", "Introducera två nya agenter", "gatekeeper", "todo"),
  t("Flag outdated pricing pages in KB", "Flagga inaktuella prissidor i kunskapsbasen", "archivist", "review"),
  t("Update operating handbook", "Uppdatera verksamhetshandboken", "warden", "backlog"),
  t("Evaluate e-signature alternatives", "Utvärdera alternativ för e-signering", "patch", "backlog"),
];

/* --------------------------- SIMULATION TEXT ------------------------ */

// What agents look up when they "read the knowledge base".
export const knowledgeTopics: Record<string, L[]> = {
  sales: [l("ideal customer profile", "målkundsprofil"), l("price list", "prislista"), l("objection handling", "invändningshantering"), l("customer cases", "kundcase"), l("past proposals", "tidigare offerter")],
  marketing: [l("tone-of-voice guide", "tonalitetsguide"), l("brand assets", "varumärkesmaterial"), l("customer quotes", "kundcitat"), l("keyword map", "sökordskarta"), l("content archive", "innehållsarkiv")],
  strategy: [l("decision log", "beslutslogg"), l("competitor profiles", "konkurrentprofiler"), l("market research", "marknadsanalys"), l("goal history", "målhistorik"), l("board notes", "styrelseanteckningar")],
  operations: [l("delivery playbooks", "leveransmanualer"), l("customer briefs", "kunduppdrag"), l("QA checklist", "kvalitetschecklista"), l("project templates", "projektmallar"), l("SLA terms", "servicenivåavtal")],
  finance: [l("chart of accounts", "kontoplan"), l("VAT rules", "momsregler"), l("supplier contracts", "leverantörsavtal"), l("forecast model", "prognosmodell"), l("expense policy", "utläggspolicy")],
  admin: [l("access policy", "behörighetspolicy"), l("tool inventory", "verktygsförteckning"), l("operating handbook", "verksamhetshandbok"), l("integration docs", "integrationsdokumentation"), l("naming conventions", "namnstandard")],
};

// Titles the simulator uses when it spawns new tasks. {client} → a random clientNames entry.
export const taskTemplates: Record<string, L[]> = {
  sales: [l("Qualify new inbound lead", "Kvalificera nytt inkommande lead"), l("Follow up after demo", "Följ upp efter demo"), l("Draft proposal for {client}", "Skriv offert till {client}"), l("Update deal stage: {client}", "Uppdatera affär: {client}")],
  marketing: [l("Draft LinkedIn post", "Skriv LinkedIn-inlägg"), l("Repurpose webinar into article", "Gör artikel av webbinariet"), l("Refresh landing page copy", "Uppdatera landningssidans text"), l("Weekly traffic report", "Veckans trafikrapport")],
  strategy: [l("Assess competitor launch", "Analysera konkurrents lansering"), l("Decision memo: {client} request", "Beslutsunderlag: förfrågan från {client}"), l("Update market map", "Uppdatera marknadskartan"), l("Review pricing experiment", "Utvärdera pristest")],
  operations: [l("Onboard {client}", "Introducera {client}"), l("QA deliverable for {client}", "Granska leverans till {client}"), l("Weekly status: {client}", "Veckostatus: {client}"), l("Resolve change request", "Hantera ändringsönskemål")],
  finance: [l("Invoice {client}", "Fakturera {client}"), l("Reconcile card expenses", "Stäm av kortutlägg"), l("Pay supplier invoices", "Betala leverantörsfakturor"), l("Refresh cash forecast", "Uppdatera likviditetsprognos")],
  admin: [l("Provision tool access", "Ge behörighet till verktyg"), l("Clean shared drive", "Städa gemensam lagring"), l("Fix broken automation", "Laga trasig automation"), l("Ingest meeting notes into KB", "Läs in mötesanteckningar i kunskapsbasen")],
};

export const blockReasons: L[] = [
  l("Waiting on approval from lead", "Väntar på godkännande från chef"),
  l("Missing access to customer folder", "Saknar behörighet till kundmappen"),
  l("Integration returned an error", "Integrationen gav ett fel"),
  l("Needs human input on scope", "Behöver mänsklig input om omfattning"),
];
