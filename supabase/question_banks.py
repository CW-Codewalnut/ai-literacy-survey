"""Source of the default question banks. Run `python3 supabase/question_banks.py` to regenerate
02_seed_questions.sql. After the first setup, admins edit questions in the app (Admin → Questions)."""
import json, pathlib

SKILL_LANES = ["Never heard of it", "Know a little", "Can implement it", "Confident / Expert"]
LEADER_LANES = ["New to me", "Understand it", "Apply it in decisions", "Lead & champion it"]
# Validated categorical palette (dark and light surfaces); non-scored sections use a neutral.
PALETTE = ["#1c9bc4", "#c98316", "#d4559a", "#3f9f57", "#8a6ff0", "#e25a4a"]
NEUTRAL = "#5a5f8c"

WARMUP = ("frequency", "Warm-up: how you use AI", "Warm-up",
          "Two quick ones first. These lanes are about how often, not how well.", [
    ("Chat assistants at work", "ChatGPT, Claude, Gemini or Copilot Chat for writing, research, analysis or design questions."),
    ("AI coding tools", "Copilot, Cursor, Claude Code or similar inside your IDE or terminal.")])
TOOLS_INTRO = "Last round. Lanes now mean how much you have actually used each tool."

BANKS = [
  {"id": "data-engineering", "name": "Data Engineering", "lanes": SKILL_LANES,
   "description": "AI literacy for engineers who build data pipelines and platforms.",
   "sections": [
    WARMUP,
    ("skill", "AI Basics for Data Engineers", "AI basics", None, [
      ("Tokens, context & cost per row", "How models read text in tokens, the limits that sets, and what it costs to run an LLM over millions of rows."),
      ("Hallucinations in pipelines", "Why model output can be wrong or change between runs, and what that means for repeatable data jobs."),
      ("Picking a model for a data task", "Trading off cost, speed and accuracy, including when a slower 'reasoning' model is worth it."),
      ("Structured output from models", "Getting JSON or a fixed schema back from a model so it loads cleanly into tables.")]),
    ("skill", "AI-Assisted Engineering", "AI-assisted eng.", None, [
      ("Writing SQL & PySpark with AI", "Using an AI assistant to write, explain and optimise queries and Spark transformations."),
      ("AI for notebooks & pipelines", "Generating Databricks notebooks, Data Factory or AWS Glue pipelines, tests and documentation with AI."),
      ("Debugging jobs with AI", "Using AI to find why a pipeline failed or a query is slow, from logs, query plans and errors."),
      ("Migrating legacy ETL with AI", "Converting Informatica, SSIS or stored procedures to Databricks with AI help."),
      ("Reviewing AI-written code", "Checking AI-generated pipeline code for correctness, performance and security before it ships.")]),
    ("skill", "Using AI on Business Data", "AI on business data", None, [
      ("AI functions in Databricks SQL", "Calling a model straight from SQL over a table."),
      ("Running AI over large tables", "Batch calls to Azure OpenAI or Amazon Bedrock: rate limits, retries and cost control."),
      ("Extracting data from documents", "Turning documents such as bills of lading, customs declarations, invoices and emails into table rows."),
      ("Classifying free text", "Mapping product or cargo descriptions to codes, and notes or tickets to categories."),
      ("Matching names across systems", "Linking customer, supplier, location or asset names that are spelled differently in each system."),
      ("Validating AI output", "Checking AI output for format, accuracy and gaps before it lands in production tables.")]),
    ("skill", "AI-Ready Data Platform", "AI-ready platform", None, [
      ("Vector search", "Finding similar records or text by meaning, for example with Databricks Vector Search."),
      ("Document pipelines for AI assistants (RAG)", "Ingesting, chunking and refreshing documents so an assistant answers from current company data."),
      ("Metadata for AI", "Clear table and column descriptions (for example in Unity Catalog) that help AI give correct answers."),
      ("Chat with your data", "Asking plain-English questions over the data, for example with Databricks Genie or text-to-SQL.")]),
    ("skill", "Agents & Automation", "Agents", None, [
      ("Tool calling against data APIs", "Letting a model call your functions, queries and APIs with typed inputs."),
      ("MCP servers for data tools", "Connecting AI assistants to Databricks, GitHub, Jira and other tools through the Model Context Protocol."),
      ("AI steps in orchestration", "Adding AI tasks or monitoring agents to Data Factory, Step Functions, Airflow or Databricks Workflows."),
      ("Agent frameworks", "Building multi-step agents with LangGraph or similar frameworks.")]),
    ("skill", "Running AI in Production", "AI in production", None, [
      ("Testing AI steps for accuracy", "Measuring an AI step against known-good examples before and after every change."),
      ("Tracing & cost tracking", "Logging every model call with its speed, token use and cost."),
      ("Masking personal data", "Keeping customer and employee data out of prompts, logs and third-party models."),
      ("Prompt injection in source data", "How text inside documents or emails can hijack an AI step, and how to guard against it."),
      ("AI governance on the platform", "Controlling who can use which models on which data, with audit trails.")]),
    ("tools", "Tool Check", "Tools", TOOLS_INTRO, [
      ("GitHub Copilot", "AI pair programmer inside VS Code, JetBrains and other IDEs."),
      ("Cursor or Claude Code", "AI-first editor or terminal agent that edits code across a project."),
      ("Amazon Q Developer", "AWS's AI coding assistant."),
      ("Databricks Assistant & Genie", "Databricks' built-in AI for notebooks, SQL and plain-English data questions."),
      ("Azure OpenAI", "Calling GPT and other models through an Azure account."),
      ("Amazon Bedrock", "Calling Claude, Llama and other models through AWS."),
      ("LangChain or LangGraph", "Python frameworks for building AI apps and agents.")])]},

  {"id": "software-engineering", "name": "Software Engineering", "lanes": SKILL_LANES,
   "description": "AI literacy for engineers who build applications and services.",
   "sections": [
    WARMUP,
    ("skill", "AI Basics for Software Engineers", "AI basics", None, [
      ("Tokens, context windows & cost", "How models read text in tokens, how much they can see at once, and what each call costs."),
      ("Hallucinations & non-repeatable output", "Why a model can be confidently wrong or answer differently each time, and how to design around it."),
      ("Picking a model", "Trading off quality, speed and cost, including when a slower 'reasoning' model is worth it."),
      ("Structured output", "Getting JSON that matches a schema back from a model so your code can rely on it.")]),
    ("skill", "AI-Assisted Development", "AI-assisted dev", None, [
      ("Code completion & generation", "Using AI in the IDE to write functions, components and boilerplate."),
      ("Agentic coding", "Letting an agent make multi-file changes, run tests and open pull requests (Claude Code, Copilot agent, Cursor)."),
      ("Writing tests with AI", "Generating unit and integration tests, and edge cases you would have missed."),
      ("Debugging with AI", "Using AI to explain stack traces, logs and failing tests and suggest fixes."),
      ("Refactoring & modernising code with AI", "Upgrading frameworks, migrating languages or cleaning up legacy code with AI help."),
      ("Reviewing AI-written code", "Checking AI-generated code for correctness, security and maintainability before merging.")]),
    ("skill", "Building AI Features", "Building AI features", None, [
      ("Calling LLM APIs", "Using model SDKs with streaming, retries, timeouts and rate limits."),
      ("Prompt design & versioning", "Writing system prompts and examples, and managing prompt changes like code."),
      ("Grounding answers in company data (RAG)", "Retrieving the right documents or records so the model answers from real data."),
      ("Tool / function calling", "Letting a model call your functions and APIs with typed inputs."),
      ("Agents & multi-step workflows", "Building features where the model plans and takes several steps, with checks between them."),
      ("MCP integrations", "Connecting AI assistants to your services and tools through the Model Context Protocol.")]),
    ("skill", "Quality, Security & Operations", "Quality & security", None, [
      ("Testing AI features", "Measuring AI output against known-good examples before and after every change."),
      ("Tracing & cost tracking", "Logging each model call with latency, token use and cost."),
      ("Prompt injection & AI security", "How untrusted input can hijack a model, and how to defend against it."),
      ("Keeping data out of prompts", "Preventing personal data, secrets and credentials from reaching prompts, logs or vendors."),
      ("Guardrails & fallbacks", "Handling refusals, timeouts and bad output gracefully, with human review where needed.")]),
    ("skill", "Team Practices", "Team practices", None, [
      ("Owning AI-generated code", "Clear expectations that whoever merges AI-written code understands and owns it."),
      ("Licensing & IP of AI output", "What your company allows for AI-generated code and content, and why."),
      ("Measuring AI's impact on delivery", "Tracking whether AI tools actually improve speed and quality for the team.")]),
    ("tools", "Tool Check", "Tools", TOOLS_INTRO, [
      ("GitHub Copilot", "AI pair programmer inside VS Code, JetBrains and other IDEs."),
      ("Cursor", "AI-first code editor."),
      ("Claude Code", "Terminal and IDE agent that edits code across a project."),
      ("Amazon Q Developer", "AWS's AI coding assistant."),
      ("OpenAI or Anthropic APIs", "Calling models directly from your own code."),
      ("Azure OpenAI or Amazon Bedrock", "Calling models through your company's cloud account."),
      ("LangChain or LangGraph", "Frameworks for building AI apps and agents.")])]},

  {"id": "architecture", "name": "Architecture", "lanes": SKILL_LANES,
   "description": "AI literacy for solution, data and enterprise architects.",
   "sections": [
    WARMUP,
    ("skill", "AI Foundations for Architects", "Foundations", None, [
      ("What LLMs can and can't do", "Realistic capabilities, failure modes and where AI should not be used."),
      ("Hosting options", "Cloud model APIs versus self-hosted or open-weight models, and when each fits."),
      ("Cost & capacity planning", "Estimating token volumes, throughput, rate limits and monthly spend."),
      ("Latency & performance trade-offs", "Model size, streaming, caching and batching choices and their effect on user experience.")]),
    ("skill", "AI Solution Patterns", "Solution patterns", None, [
      ("Retrieval-augmented generation (RAG)", "Designing retrieval, ranking and grounding so answers come from trusted data."),
      ("Agent architectures", "Tools, planning, memory and multi-agent hand-offs, and where they break."),
      ("Fine-tuning vs prompting vs RAG", "Choosing the right approach for a problem, and when to combine them."),
      ("Integrating AI into existing systems", "Adding AI to APIs, event streams and batch jobs without destabilising them."),
      ("Model Context Protocol (MCP)", "The open standard for connecting AI assistants to tools and data, and how to govern it.")]),
    ("skill", "Data Architecture for AI", "Data for AI", None, [
      ("Vector stores & search", "Where embeddings live, how they are refreshed, and when a separate vector database is worth it."),
      ("Pipelines for unstructured data", "Getting documents, emails and files into a form AI can use."),
      ("Metadata, catalogs & semantic layers", "Descriptions and definitions that let AI understand and query data correctly."),
      ("Data access control for AI", "Making sure AI features only see data the user is allowed to see.")]),
    ("skill", "Platform & Operations", "Platform & ops", None, [
      ("Model gateway & routing", "A single entry point that routes requests across models and providers, with quotas and fallbacks."),
      ("Evaluation pipelines", "Automated quality checks on AI output before and after every change."),
      ("Observability & cost governance", "Tracing, budgets and alerts for AI usage across teams."),
      ("Caching & optimisation", "Prompt caching, response caching and smaller models to cut cost and latency.")]),
    ("skill", "Security, Risk & Governance", "Security & risk", None, [
      ("Threat modelling for AI", "Prompt injection, data exfiltration and abuse paths in AI-enabled systems."),
      ("Identity & permissions for agents", "What an agent may do on whose behalf, and how that is enforced and audited."),
      ("Privacy & data residency", "Where data goes when it is sent to a model, and what contracts and regions allow."),
      ("Responsible AI & regulation", "Bias, transparency and obligations such as the EU AI Act."),
      ("Vendor lock-in & portability", "Designing so models and providers can be swapped as the market changes.")]),
    ("tools", "Tool Check", "Tools", TOOLS_INTRO, [
      ("Azure OpenAI", "Microsoft's hosted model service."),
      ("Amazon Bedrock", "AWS's hosted model service."),
      ("Google Vertex AI", "Google Cloud's AI platform."),
      ("Databricks AI features", "Model serving, vector search and AI functions in Databricks."),
      ("LangChain or LangGraph", "Frameworks for building AI apps and agents."),
      ("A vector database", "pgvector, Pinecone, Azure AI Search, OpenSearch or similar."),
      ("GitHub Copilot, Cursor or Claude Code", "AI coding assistants.")])]},

  {"id": "leadership", "name": "Leadership", "lanes": LEADER_LANES,
   "description": "AI literacy for managers and leaders who set direction and budgets.",
   "sections": [
    ("frequency", "Warm-up: how you use AI", "Warm-up",
     "Two quick ones first. These lanes are about how often, not how well.", [
      ("Chat assistants at work", "ChatGPT, Claude, Gemini or Copilot for writing, research and analysis."),
      ("AI for email, documents & meetings", "Drafting emails, summarising documents or taking meeting notes with AI.")]),
    ("skill", "AI Fundamentals for Leaders", "Fundamentals", None, [
      ("What AI can and can't do", "Realistic strengths and limits of today's AI, without the hype."),
      ("Reliability & hallucinations", "Why AI can be confidently wrong, and what that means for decisions and customers."),
      ("What drives AI cost", "Usage-based pricing, licences and the hidden costs of running AI at scale."),
      ("Build, buy or partner", "When to use off-the-shelf AI products, build your own, or work with a partner.")]),
    ("skill", "Strategy & Value", "Strategy & value", None, [
      ("Spotting high-value use cases", "Finding where AI can save time, cut cost or create revenue in your area."),
      ("Business case & ROI", "Estimating benefits, costs and risks of an AI initiative."),
      ("Prioritising an AI roadmap", "Sequencing AI work against other priorities and capacity."),
      ("Measuring AI impact", "Choosing metrics that show whether AI is actually helping.")]),
    ("skill", "Data & Platform Readiness", "Data readiness", None, [
      ("Data quality as a prerequisite", "Why AI results depend on clean, well-described data."),
      ("Data ownership & governance", "Who owns which data, and who decides how AI may use it."),
      ("Platform & vendor choices", "High-level differences between cloud AI services and vendors.")]),
    ("skill", "People & Change", "People & change", None, [
      ("Upskilling teams", "Planning training so teams can use AI safely and well."),
      ("Changing roles & workflows", "How AI shifts responsibilities, and redesigning work around it."),
      ("Driving adoption", "Encouraging real use, sharing wins and handling resistance."),
      ("AI usage guidelines", "Setting clear rules for which AI tools may be used, and how.")]),
    ("skill", "Risk, Ethics & Governance", "Risk & governance", None, [
      ("Regulation & compliance", "Obligations such as the EU AI Act and sector rules."),
      ("Confidential data & AI tools", "Preventing sensitive company or customer data from leaking through AI tools."),
      ("Responsible AI", "Fairness, transparency and accountability for AI-driven outcomes."),
      ("Vendor & IP risk", "Contract terms, data use by vendors, and ownership of AI-generated work."),
      ("AI security risks", "New attack paths such as prompt injection and data exfiltration, at a business level.")]),
    ("tools", "Tool Check", "Tools", TOOLS_INTRO, [
      ("Microsoft 365 Copilot", "AI inside Outlook, Word, Excel, PowerPoint and Teams."),
      ("ChatGPT", "OpenAI's AI assistant."),
      ("Claude", "Anthropic's AI assistant."),
      ("Gemini", "Google's AI assistant."),
      ("AI meeting notes", "Automatic meeting summaries in Teams, Zoom or similar.")])]},
]

def q(s):
    return "'" + s.replace("'", "''") + "'" if s is not None else "null"

out = ["-- Default question banks for the four survey categories. Generated by question_banks.py.",
       "-- Run once after 01_schema.sql. A category that already has sections is left untouched,",
       "-- so this never overwrites edits made in the app.", ""]
for ci, b in enumerate(BANKS):
    out.append(f"insert into public.categories (id, name, description, sort, skill_lanes) values "
               f"({q(b['id'])}, {q(b['name'])}, {q(b['description'])}, {ci}, {q(json.dumps(b['lanes']))}::jsonb) "
               f"on conflict (id) do nothing;")
    out.append("do $$\ndeclare s uuid;\nbegin")
    out.append(f"  if exists (select 1 from public.sections where category_id = {q(b['id'])}) then return; end if;")
    color_i = 0
    for si, (kind, name, short, intro, items) in enumerate(b["sections"]):
        color = NEUTRAL if kind != "skill" else PALETTE[color_i % len(PALETTE)]
        if kind == "skill": color_i += 1
        out.append(f"  insert into public.sections (category_id, sort, name, short, color, kind, intro) values "
                   f"({q(b['id'])}, {si}, {q(name)}, {q(short)}, {q(color)}, {q(kind)}, {q(intro)}) returning id into s;")
        vals = ", ".join(f"(s, {qi}, {q(t)}, {q(d)})" for qi, (t, d) in enumerate(items))
        out.append(f"  insert into public.questions (section_id, sort, title, description) values {vals};")
    out.append("end $$;\n")

here = pathlib.Path(__file__).parent
(here / "02_seed_questions.sql").write_text("\n".join(out))
for b in BANKS:
    n = sum(len(s[4]) for s in b["sections"]); print(b["name"], n, "questions")
