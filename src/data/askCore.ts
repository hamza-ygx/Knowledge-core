import { l, type L } from "@/i18n/core";

/* ------------------------------------------------------------------ */
/*  Scripted questions for "Ask the Knowledge Core". Everything here  */
/*  is fictional demo data. Edit freely: `steps` run in order, each   */
/*  agent listed lights up and reads the knowledge base.              */
/* ------------------------------------------------------------------ */

export interface AskStep {
  agentId: string;
  text: L;
}

export interface AskScenario {
  id: string;
  question: L;
  steps: AskStep[];
  answer: L;
  sources: L[];
  /** How long the same lookup would take a person, in minutes. */
  manualMinutes: number;
}

export const askScenarios: AskScenario[] = [
  {
    id: "overdue",
    question: l("Which customers have invoices overdue by more than 30 days?", "Vilka kunder har fakturor som är mer än 30 dagar försenade?"),
    steps: [
      { agentId: "mint", text: l("Mint reads accounts receivable", "Mint läser kundreskontran") },
      { agentId: "tally", text: l("Tally checks this week's incoming payments", "Tally kontrollerar veckans inbetalningar") },
      { agentId: "archivist", text: l("Archivist finds the credit policy", "Archivist hittar kreditpolicyn") },
    ],
    answer: l(
      "Three customers are more than 30 days overdue, 184,000 SEK in total: Demo Bygg AB (96,000 SEK, 41 days), Demo Media AB (52,000 SEK, 35 days) and Demo Handel AB (36,000 SEK, 32 days). All three have received a second reminder. Demo Bygg AB has promised payment on Friday. Per the credit policy, the next step is a phone call from the account manager.",
      "Tre kunder är mer än 30 dagar försenade, totalt 184 000 kr: Demo Bygg AB (96 000 kr, 41 dagar), Demo Media AB (52 000 kr, 35 dagar) och Demo Handel AB (36 000 kr, 32 dagar). Alla tre har fått påminnelse 2. Demo Bygg AB har lovat betalning på fredag. Enligt kreditpolicyn är nästa steg ett samtal från kundansvarig.",
    ),
    sources: [l("Accounts receivable (Fortnox)", "Kundreskontra (Fortnox)"), l("Bank transactions, week 39", "Banktransaktioner vecka 39"), l("Credit policy §3", "Kreditpolicy §3")],
    manualMinutes: 25,
  },
  {
    id: "cash",
    question: l("Do we have enough cash for the next 13 weeks?", "Räcker kassan de kommande 13 veckorna?"),
    steps: [
      { agentId: "runway", text: l("Runway runs the 13-week forecast", "Runway kör 13-veckorsprognosen") },
      { agentId: "tally", text: l("Tally supplies today's bank balance", "Tally hämtar dagens banksaldo") },
      { agentId: "atlas", text: l("Atlas adds deals likely to close", "Atlas lägger till affärer som troligen stängs") },
      { agentId: "sterling", text: l("Sterling checks against the cash buffer target", "Sterling jämför mot buffertmålet") },
    ],
    answer: l(
      "Yes. The lowest point is week 47 at 412,000 SEK, above the 300,000 SEK buffer target. The main risk is two large supplier payments in week 46. Runway suggests moving one of them a week, which lifts the low point to 520,000 SEK.",
      "Ja. Lägsta punkten är vecka 47 med 412 000 kr, över buffertmålet på 300 000 kr. Största risken är två stora leverantörsbetalningar vecka 46. Runway föreslår att flytta en av dem en vecka, vilket höjer lägsta punkten till 520 000 kr.",
    ),
    sources: [l("13-week cash forecast", "13-veckors likviditetsprognos"), l("Bank balance (today)", "Banksaldo (idag)"), l("Sales pipeline (HubSpot)", "Säljpipeline (HubSpot)"), l("Finance policy", "Finanspolicy")],
    manualMinutes: 90,
  },
  {
    id: "followups",
    question: l("Which deals should we follow up this week?", "Vilka affärer bör vi följa upp den här veckan?"),
    steps: [
      { agentId: "atlas", text: l("Atlas scans the pipeline for stalled deals", "Atlas letar efter affärer som stått still") },
      { agentId: "echo", text: l("Echo reads the latest email threads", "Echo läser de senaste mejltrådarna") },
      { agentId: "vega", text: l("Vega adds notes from recent meetings", "Vega lägger till anteckningar från möten") },
    ],
    answer: l(
      "Four deals have had no reply for 5+ days: Demo Fastigheter AB (renewal, 240,000 SEK), Demo Logistik AB (new agreement), Demo Hälsa AB and Demostiftelsen. Echo has drafted personal follow-ups for all four and they are waiting for your approval. Demo Fastigheter AB asked about pricing in the last meeting, so Vega recommends calling instead.",
      "Fyra affärer har inte fått svar på 5+ dagar: Demo Fastigheter AB (förnyelse, 240 000 kr), Demo Logistik AB (nytt avtal), Demo Hälsa AB och Demostiftelsen. Echo har skrivit personliga uppföljningar till alla fyra som väntar på ditt godkännande. Demo Fastigheter AB frågade om pris på senaste mötet, så Vega rekommenderar att ringa i stället.",
    ),
    sources: [l("Sales pipeline (HubSpot)", "Säljpipeline (HubSpot)"), l("Email threads (Outlook)", "Mejltrådar (Outlook)"), l("Meeting notes", "Mötesanteckningar")],
    manualMinutes: 40,
  },
  {
    id: "gifts",
    question: l("What is our policy on accepting gifts from suppliers?", "Vad gäller för att ta emot gåvor från leverantörer?"),
    steps: [
      { agentId: "archivist", text: l("Archivist searches the policy library", "Archivist söker i policybiblioteket") },
      { agentId: "verity", text: l("Verity checks the latest compliance update", "Verity kontrollerar senaste uppdateringen") },
      { agentId: "warden", text: l("Warden confirms the approval routine", "Warden bekräftar godkännanderutinen") },
    ],
    answer: l(
      "Gifts worth more than 500 SEK must be approved by your manager and logged in the gift register. Cash or gift cards are never accepted. Invitations to events are allowed if they have a clear business purpose and are approved in advance. The policy was last updated in March 2026.",
      "Gåvor värda mer än 500 kr ska godkännas av närmaste chef och registreras i gåvoregistret. Kontanter och presentkort tas aldrig emot. Inbjudningar till evenemang är tillåtna om de har ett tydligt affärssyfte och godkänts i förväg. Policyn uppdaterades senast i mars 2026.",
    ),
    sources: [l("Code of conduct §4", "Uppförandekod §4"), l("Gift register", "Gåvoregister"), l("Employee handbook", "Personalhandbok")],
    manualMinutes: 15,
  },
  {
    id: "board",
    question: l("Summarise last month for the board.", "Sammanfatta förra månaden för styrelsen."),
    steps: [
      { agentId: "sterling", text: l("Sterling pulls the monthly results", "Sterling hämtar månadens resultat") },
      { agentId: "horizon", text: l("Horizon checks progress on goals", "Horizon följer upp målen") },
      { agentId: "bridge", text: l("Bridge adds customer satisfaction", "Bridge lägger till kundnöjdheten") },
      { agentId: "oracle", text: l("Oracle writes the summary", "Oracle skriver sammanfattningen") },
    ],
    answer: l(
      "Revenue came in 8% above budget and costs were on plan. 3 of 4 quarterly goals are on track; the hiring goal in Operations is behind. Customer satisfaction rose to 4.6 of 5. Main risk: delivery capacity in November. A draft board report is saved in Notion for your review.",
      "Intäkterna blev 8 % över budget och kostnaderna låg enligt plan. 3 av 4 kvartalsmål är i fas; rekryteringsmålet inom Drift ligger efter. Kundnöjdheten steg till 4,6 av 5. Största risk: leveranskapaciteten i november. Ett utkast till styrelserapport ligger i Notion för din granskning.",
    ),
    sources: [l("Income statement, September", "Resultaträkning september"), l("Quarterly goals", "Kvartalsmål"), l("Customer survey", "Kundundersökning"), l("Board report template", "Mall styrelserapport")],
    manualMinutes: 120,
  },
];
