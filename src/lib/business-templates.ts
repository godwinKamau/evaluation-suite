import type { EvalItem, TemplateKey, ToolCallSpec } from "@/types";

const SUPPORT_BASE = `You are an AI customer support agent for [Company Name]. Your primary goal is to resolve user issues quickly, accurately, and politely while maintaining the company's tone and policies.

You must:
- Prioritize solving the user's problem in as few steps as possible
- Use available knowledge base and prior conversation context
- Ask clarifying questions only when necessary
- Provide step-by-step guidance when appropriate
- Escalate to a human agent if the issue is high-risk, ambiguous, or unresolved

You must NOT:
- Hallucinate policies, pricing, or account details
- Provide guarantees or commitments not explicitly supported
- Answer outside the scope of company services

Tone:
- Professional, concise, empathetic
- Avoid overly verbose explanations unless the user requests detail

If you do not know the answer, say so clearly and suggest next steps.`;

const MARKETING_BASE = `You are an AI content generation assistant specializing in high-quality, engaging, and conversion-focused writing.

Your goal is to produce content that aligns with the target audience, brand voice, and intended outcome (e.g., clicks, engagement, conversions).

You must:
- Adapt tone and style based on the specified audience and channel
- Optimize for clarity, readability, and persuasion
- Follow SEO or keyword instructions when provided
- Produce original, non-generic content

You must NOT:
- Generate misleading, plagiarized, or factually incorrect content
- Use filler language or unnecessary repetition

When instructions are vague:
- Infer reasonable defaults based on best marketing practices
- Optionally provide 1–2 variations if helpful

Tone:
- Dynamic and audience-aware (e.g., professional, casual, playful, authoritative)`;

const SALES_BASE = `You are an AI sales copilot designed to help sales representatives close deals more effectively.

Your goal is to improve win rates, shorten sales cycles, and enhance customer interactions.

You must:
- Analyze customer signals (messages, transcripts, notes) to identify intent, objections, and opportunities
- Suggest next best actions (e.g., follow-ups, positioning, questions)
- Generate high-quality sales communications (emails, proposals, summaries)
- Highlight risks, deal blockers, and missing information

You must NOT:
- Make unsupported claims about products or competitors
- Provide inaccurate pricing or contractual commitments

Behavior:
- Be proactive and insight-driven, not just reactive
- Prioritize actions that move the deal forward

Tone:
- Professional, strategic, and concise
- Focused on clarity and persuasion without being pushy`;

const LEGAL_BASE = `You are an AI assistant specialized in analyzing regulated documents (e.g., legal, financial, or healthcare texts).

Your goal is to extract, summarize, and analyze information accurately while minimizing risk.

You must:
- Base all outputs strictly on the provided documents
- Identify key clauses, obligations, risks, and inconsistencies
- Use precise and unambiguous language
- Highlight uncertainty or ambiguity explicitly

You must NOT:
- Provide legal/medical/financial advice unless explicitly permitted
- Make assumptions beyond the text
- Omit important risks or qualifications

Behavior:
- When summarizing, preserve critical details and nuances
- When unsure, state limitations clearly

Tone:
- Formal, precise, and cautious`;

const TOOL_CALLING_BASE = `You are a tool-calling assistant.

Rules:
- Use only the provided tools.
- If a tool is needed, emit only tool calls and no prose.
- If no tool is needed, do not call any tool.
- Never invent tool names or argument keys.
- For multi-step requests, call tools in the order needed to satisfy the request.`;

const TOOL_CALLING_CATALOG: ToolCallSpec[] = [
  {
    type: "function",
    function: {
      name: "search_orders",
      description: "Look up order status and fulfillment details by order ID.",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "The order identifier, e.g. ORD-123.",
          },
        },
        required: ["order_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Fetch current weather for a city.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name." },
          unit: {
            type: "string",
            enum: ["celsius", "fahrenheit"],
            description: "Optional unit override.",
          },
        },
        required: ["city"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a calendar event entry.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Event title." },
          date: {
            type: "string",
            description: "ISO date (YYYY-MM-DD).",
          },
          duration_minutes: {
            type: "number",
            description: "Event duration in minutes.",
          },
          location: {
            type: "string",
            description: "Optional location label.",
          },
        },
        required: ["title", "date", "duration_minutes"],
        additionalProperties: false,
      },
    },
  },
];

export const BUSINESS_TEMPLATES: Record<
  TemplateKey,
  { label: string; basePrompt: string; samples: EvalItem[] }
> = {
  support: {
    label: "Customer Support & CX Agent",
    basePrompt: SUPPORT_BASE,
    samples: [
      {
        input:
          "I was charged twice for my subscription this month. I need a refund for the duplicate charge and confirmation my card won't be charged again.",
        expected_output:
          "Acknowledge the billing concern; ask for order/subscription ID and last four digits of the payment method if not already known; outline steps to verify duplicate charge in billing system; explain refund timeline and how confirmation will be sent; offer escalation path if unresolved.",
      },
      {
        input:
          "The mobile app crashes every time I try to export a PDF report. I'm on iOS 17. What should I do?",
        expected_output:
          "Express empathy; suggest basic troubleshooting (update app, restart device, clear cache if applicable); ask for app version and exact error; provide workaround if known; offer link to status page or ticket creation; escalate if bug confirmed.",
      },
      {
        input:
          "I can't log in—says invalid password but I'm sure it's correct. I also didn't get the reset email.",
        expected_output:
          "Guide through password reset and spam/junk checks; verify correct email and account; suggest account lockout wait if applicable; offer MFA/device troubleshooting; never guess account details; escalate if needed.",
      },
      {
        input:
          "I want a full refund for my annual plan—I only used it for two weeks and the product doesn't do what your sales page promised.",
        expected_output:
          "Acknowledge request; reference need to check plan terms and refund policy without inventing specifics; ask for purchase details; explain review process and timeline; remain neutral; escalate if policy edge case or dispute.",
      },
      {
        input:
          "This is urgent—my team's production site is down and support chat said 24h response. I need a manager now.",
        expected_output:
          "Take severity seriously; apologize for delay; gather account/tenant identifiers and impact; set expectations for escalation; provide incident or callback path; avoid guarantees on resolution time not supported by policy.",
      },
    ],
  },
  marketing: {
    label: "Content Generation & Marketing Engine",
    basePrompt: MARKETING_BASE,
    samples: [
      {
        input:
          "Write a 300-word blog post outline for B2B SaaS finance teams on 'cutting month-end close time in half.' Audience: CFOs and controllers. CTA: book a demo.",
        expected_output:
          "Outline with headline options, intro hook, 3–4 H2 sections (problem, framework, proof, implementation), bullet takeaways, and closing CTA aligned to CFO audience; tone professional; no fabricated statistics.",
      },
      {
        input:
          "5 LinkedIn captions for launching our AI scheduling feature. Brand voice: upbeat, concise, not cheesy. Include 2 hashtags each.",
        expected_output:
          "Five distinct short captions with clear value prop, audience hook, and two relevant hashtags each; varied angles; no false claims.",
      },
      {
        input:
          "Generate 10 email subject lines for a webinar on data privacy for healthcare IT. Max 50 characters each, A/B test pairs.",
        expected_output:
          "Ten subject lines under length limit, split into plausible A/B pairs, privacy/compliance angle, no sensationalism or misleading urgency.",
      },
      {
        input:
          "Write Google Search ad copy: headline 30 chars, 3 descriptions 90 chars, for project management software targeting remote teams. Keywords: async, visibility, deadlines.",
        expected_output:
          "Headline and three description variants respecting character limits, incorporating keywords naturally, clear benefit and CTA, compliant tone.",
      },
      {
        input:
          "Product description (150 words) for a stainless steel water bottle: insulated 24h, leak-proof lid, 32oz, matte black. Audience: outdoor enthusiasts.",
        expected_output:
          "Compelling 150-word description with features and use cases, sensory but accurate language, no invented certifications or reviews.",
      },
    ],
  },
  sales: {
    label: "Sales & Revenue Intelligence Copilot",
    basePrompt: SALES_BASE,
    samples: [
      {
        input:
          "Draft a follow-up email after a discovery call. Prospect cares about SOC 2 and onboarding time. Next step: security review next Tuesday. Keep under 180 words.",
        expected_output:
          "Concise follow-up with recap of pain points, SOC 2 and onboarding addressed, clear next step for Tuesday security review, single CTA, no invented pricing or promises.",
      },
      {
        input:
          "Summarize this call in 5 bullets for CRM notes. [Paste: prospect mentioned budget freeze Q1, likes integrations, competitor X cheaper, wants ROI sheet, follow-up in 3 weeks.]",
        expected_output:
          "Five crisp bullets capturing budget timing, positive signals, objection (competitor price), requested asset, and follow-up timing; neutral professional tone.",
      },
      {
        input:
          "From this transcript excerpt, list likely objections and suggested responses. [Paste: 'We're happy with our current vendor' / 'Need buy-in from IT' / 'Pricing seems high vs last year.']",
        expected_output:
          "Objections identified with non-pushy response ideas, questions to qualify, and risks; no fabricated product facts.",
      },
      {
        input:
          "Outline a one-page proposal structure for expanding seats from 50 to 120. Include sections for goals, scope, timeline, success metrics—no pricing numbers.",
        expected_output:
          "Clear proposal outline with sections and bullet prompts under each; placeholders for pricing rather than invented figures; strategic tone.",
      },
      {
        input:
          "Cold outreach email to a VP Ops at a mid-size retailer: reference operational efficiency, 90 words max, one ask (15-min call).",
        expected_output:
          "Short personalized-sounding cold email with relevant hook, single CTA, no false company-specific facts, professional tone.",
      },
    ],
  },
  legal: {
    label: "Legal / Compliance / Regulated Document Analyst",
    basePrompt: LEGAL_BASE,
    samples: [
      {
        input:
          'Summarize the indemnification clause below in plain language and flag who bears defense costs.\n\n"Party A shall indemnify, defend, and hold harmless Party B from third-party claims arising from Party A\'s services. Party A shall pay reasonable defense costs unless the claim results from Party B\'s gross negligence."',
        expected_output:
          "Structured summary tied only to provided text; identifies Party A as indemnitor for third-party claims from A's services; defense costs generally by A except carve-out for B's gross negligence; notes any ambiguity; disclaimer not legal advice.",
      },
      {
        input:
          'Review this liability cap section and list potential risks for our company as the vendor (Party V). Quote only from the text.\n\n"Except for fraud or willful misconduct, each party\'s aggregate liability shall not exceed the fees paid in the twelve (12) months preceding the claim. Neither party is liable for indirect or consequential damages."',
        expected_output:
          "Risk bullets: cap tied to 12-month fees excludes certain claims; consequential damages excluded; vendor should verify carve-outs; all grounded in quoted concepts; no legal advice.",
      },
      {
        input:
          'Extract all obligations of the Customer from this MSA excerpt as a numbered list with clause references.\n\n"3.1 Customer shall provide timely access to systems. 3.2 Customer shall designate an administrator. 3.3 Customer is responsible for the accuracy of data it uploads."',
        expected_output:
          "Numbered list: (1) timely access 3.1, (2) designate admin 3.2, (3) data accuracy 3.3; no extra obligations invented.",
      },
      {
        input:
          'Flag ambiguous or undefined terms in this paragraph. Suggest clarification questions only.\n\n"Vendor shall use commercially reasonable efforts to restore service within a reasonable time after an incident."',
        expected_output:
          "Flags 'commercially reasonable efforts' and 'reasonable time' as needing definition; suggests neutral clarification questions; does not invent SLA metrics.",
      },
      {
        input:
          "Compare these two sections: do termination and data return obligations conflict? Explain briefly.\n\n5.2 Termination: Either party may terminate for material breach after 30 days' cure notice.\n\n8.1 Upon any termination, Vendor shall return or delete Customer Data within 90 days unless law requires retention.",
        expected_output:
          "Notes termination right vs post-termination data handling; 90-day return window; flags whether breach termination affects 8.1 timing; cautious conclusion; suggests legal review if unclear.",
      },
    ],
  },
  tool_calling: {
    label: "Tool-Calling Agent (LangSmith-style)",
    basePrompt: TOOL_CALLING_BASE,
    samples: [
      {
        kind: "tool_call",
        input: "What's the weather in Paris right now?",
        tools: TOOL_CALLING_CATALOG,
        expected_tool_calls: [
          { name: "get_weather", arguments: { city: "Paris" } },
        ],
        expected_output: "[tool_call] get_weather",
      },
      {
        kind: "tool_call",
        input:
          "Create a calendar event named Sync on 2025-09-01 for 30 minutes.",
        tools: TOOL_CALLING_CATALOG,
        expected_tool_calls: [
          {
            name: "create_calendar_event",
            arguments: {
              title: "Sync",
              date: "2025-09-01",
              duration_minutes: 30,
            },
          },
        ],
        expected_output: "[tool_call] create_calendar_event",
      },
      {
        kind: "tool_call",
        input: "What is 2 + 2?",
        tools: TOOL_CALLING_CATALOG,
        expected_tool_calls: [],
        expected_output: "(no tool)",
      },
      {
        kind: "tool_call",
        input:
          "What's the weather in Tokyo in Celsius?",
        tools: TOOL_CALLING_CATALOG,
        expected_tool_calls: [
          {
            name: "get_weather",
            arguments: { city: "Tokyo", unit: "celsius" },
          },
        ],
        expected_output: "[tool_call] get_weather",
      },
      {
        kind: "tool_call",
        input:
          "First look up order ORD-123, then check weather in London.",
        tools: TOOL_CALLING_CATALOG,
        expected_tool_calls: [
          { name: "search_orders", arguments: { order_id: "ORD-123" } },
          { name: "get_weather", arguments: { city: "London" } },
        ],
        expected_output: "[tool_call] search_orders, get_weather",
      },
    ],
  },
};
