// The single catalogue of OENOD modules. The website, pricing, dashboard
// navigation, permissions and AI all read from here, so every module the
// platform offers is visible everywhere.

export type ModuleGroup = "Workspace" | "People" | "Customers" | "Money" | "Operations" | "Grow" | "Platform";

export interface ModuleDef {
  key: string;
  name: string;
  group: ModuleGroup;
  icon: string; // lucide icon name
  href: string;
  tagline: string;
  features: string[];
  worker?: string; // AI worker responsible
}

export const MODULES: ModuleDef[] = [
  { key: "overview", name: "Overview", group: "Workspace", icon: "LayoutDashboard", href: "/app", tagline: "What needs your attention today, with live numbers and recommended next steps.", features: ["Role-based home screens", "Live KPIs", "Exceptions and approvals", "Daily AI briefing"] },
  { key: "ai", name: "AI Business Manager", group: "Workspace", icon: "Sparkles", href: "/app/ai", worker: "COORDINATOR", tagline: "Ask once. It plans the work, completes authorized actions and brings you only the decisions that need you.", features: ["12 specialist AI workers", "Assist, Approve then execute, or Automatic within rules", "Control centre with full history", "Emergency stop and simulation mode", "Text and voice from every screen"] },
  { key: "live", name: "Live map", group: "Workspace", icon: "MapPinned", href: "/app/live", tagline: "See your team on site, vehicles on the road and jobs in progress on one live map.", features: ["Who is clocked in and where", "Vehicles in real time", "Jobs and locations", "Privacy controls: only while on shift"] },
  { key: "people", name: "People & HR", group: "People", icon: "Users", href: "/app/people", worker: "HR", tagline: "Profiles, org chart, documents, certifications, onboarding and offboarding in one place.", features: ["Employee profiles and org chart", "Onboarding and offboarding checklists", "Certifications with expiry alerts", "Goals and performance reviews", "Employee self-service"] },
  { key: "recruiting", name: "Recruiting & Jobs", group: "People", icon: "Briefcase", href: "/app/recruiting", worker: "HR", tagline: "Post to the OENOD Jobs marketplace, track applicants and hire with AI match scores.", features: ["Free public job board", "Applicant pipeline", "AI match score and summary", "Interview scheduling", "Offer to onboarding in one click"] },
  { key: "time", name: "Time & attendance", group: "People", icon: "Clock", href: "/app/time", worker: "SCHEDULING", tagline: "Clock in from phone, browser, desktop or a shared kiosk, with geofence checks.", features: ["Mobile, web and kiosk clock-in", "Geofence site verification", "Breaks and overtime", "Corrections with reasons", "Approved hours flow to payroll"] },
  { key: "scheduling", name: "Scheduling", group: "People", icon: "CalendarDays", href: "/app/scheduling", worker: "SCHEDULING", tagline: "Build the week in minutes. AI fills gaps by skills, availability and labour budget.", features: ["Drag-free week planner", "Open shifts and swaps", "Availability and time-off conflicts", "Labour cost vs budget", "AI auto-schedule"] },
  { key: "leave", name: "Leave & benefits", group: "People", icon: "Palmtree", href: "/app/leave", worker: "HR", tagline: "Vacation, sick and personal leave with balances, accruals and approvals.", features: ["Leave requests and approvals", "Balances and accruals", "Team calendar", "Benefits tracking"] },
  { key: "payroll", name: "Payroll", group: "People", icon: "Banknote", href: "/payroll", worker: "PAYROLL", tagline: "Hourly and salary payroll with previews, exception checks and approval before release.", features: ["Pay runs from approved hours", "Overtime, bonuses, tips", "Deductions and employer costs", "Payslips for every employee", "Approval required to release"] },
  { key: "crm", name: "CRM", group: "Customers", icon: "Contact", href: "/app/crm", worker: "SALES", tagline: "Every lead and customer with full history, pipeline, follow-ups and health scores.", features: ["Leads and customers", "Sales pipeline", "Activities and reminders", "Consent tracking", "Customer portal"] },
  { key: "sales", name: "Quotes & invoices", group: "Customers", icon: "FileText", href: "/app/sales", worker: "FINANCE", tagline: "Quote, invoice and get paid online. Overdue invoices follow up automatically.", features: ["Quotes with online acceptance", "Invoices with payment links", "Recurring billing", "Automatic reminders", "Aging reports"] },
  { key: "support", name: "Help desk", group: "Customers", icon: "LifeBuoy", href: "/app/support", worker: "SERVICE", tagline: "Tickets with priorities, response targets and an AI assistant that resolves routine requests.", features: ["Customer and internal tickets", "Response targets", "AI suggested replies", "Satisfaction scores"] },
  { key: "bookings", name: "Bookings", group: "Customers", icon: "CalendarCheck", href: "/app/bookings", worker: "SERVICE", tagline: "Appointments with staff and resource availability, deposits and reminders.", features: ["Online booking", "Staff and resources", "Deposits", "Reminders and waitlists"] },
  { key: "accounting", name: "Accounting", group: "Money", icon: "Landmark", href: "/app/accounting", worker: "FINANCE", tagline: "Double-entry ledger that fills itself from sales, payroll, bills and expenses.", features: ["Chart of accounts", "Automatic journal entries", "Profit and loss, balance sheet", "Bank reconciliation", "Bills and payables"] },
  { key: "expenses", name: "Expenses", group: "Money", icon: "Receipt", href: "/app/expenses", worker: "FINANCE", tagline: "Snap a receipt, submit, approve and reimburse.", features: ["Receipt capture", "Approval chain", "Mileage", "Spending policies"] },
  { key: "pos", name: "Point of sale", group: "Money", icon: "ShoppingCart", href: "/app/pos", worker: "INVENTORY", tagline: "Fast touch POS for counters, cafés and stores, connected to stock, loyalty and accounting.", features: ["Touch register", "Discounts, tips and refunds", "Cash drawer sessions", "Loyalty and gift cards", "Works on tablet and desktop"] },
  { key: "inventory", name: "Inventory", group: "Operations", icon: "Boxes", href: "/app/inventory", worker: "INVENTORY", tagline: "Stock across locations with reorder points, counts and waste tracking.", features: ["Multi-location stock", "Barcodes and SKUs", "Reorder suggestions", "Counts and adjustments", "Waste and shrinkage"] },
  { key: "purchasing", name: "Purchasing", group: "Operations", icon: "Truck", href: "/app/purchasing", worker: "INVENTORY", tagline: "Suppliers, purchase orders, approvals and receiving that updates stock.", features: ["Supplier catalogue", "Purchase orders", "Spending caps", "Receiving updates stock"] },
  { key: "projects", name: "Projects", group: "Operations", icon: "KanbanSquare", href: "/app/projects", worker: "OPERATIONS", tagline: "Tasks, milestones, budgets and job costing for every project.", features: ["Task boards", "Budgets and job costing", "Milestones", "Client links"] },
  { key: "fieldservice", name: "Field service", group: "Operations", icon: "Wrench", href: "/app/field-service", worker: "OPERATIONS", tagline: "Dispatch work orders with checklists, photos and customer signatures.", features: ["Dispatch board", "Checklists and photos", "Signatures", "Recurring visits"] },
  { key: "fleet", name: "Fleet GPS", group: "Operations", icon: "Navigation", href: "/app/fleet", worker: "OPERATIONS", tagline: "Track every vehicle live. Get alerts for speeding, long stops, idling and geofences.", features: ["Live vehicle map", "Trips and history", "Speeding and long-stop alerts", "Geofences", "Driver app or any GPS tracker"] },
  { key: "assets", name: "Assets & maintenance", group: "Operations", icon: "HardDrive", href: "/app/assets", worker: "OPERATIONS", tagline: "Equipment, IT and vehicles with warranties and service schedules.", features: ["Asset register", "Assignments", "Maintenance schedules", "Warranty tracking"] },
  { key: "safety", name: "Quality & safety", group: "Operations", icon: "ShieldAlert", href: "/app/safety", worker: "COMPLIANCE", tagline: "Incidents, inspections and corrective actions with owners and evidence.", features: ["Incident reports", "Corrective actions", "Inspections", "Evidence"] },
  { key: "compliance", name: "Documents & compliance", group: "Operations", icon: "FolderLock", href: "/app/documents", worker: "COMPLIANCE", tagline: "Contracts, policies, permits and certificates with renewal reminders.", features: ["Document vault", "Expiry reminders", "Compliance calendar", "Policy acknowledgments"] },
  { key: "marketing", name: "Marketing", group: "Grow", icon: "Megaphone", href: "/app/marketing", worker: "MARKETING", tagline: "Email and SMS campaigns, segments and social posts. Only to people who said yes.", features: ["Email and SMS campaigns", "Audience segments", "Social scheduling", "Consent and unsubscribe built in", "Revenue attribution"] },
  { key: "reviews", name: "Reviews & reputation", group: "Grow", icon: "Star", href: "/app/reviews", worker: "MARKETING", tagline: "Google Business Profile reviews in one inbox with AI-drafted replies.", features: ["Google Business Profile", "AI reply drafts", "Rating alerts", "Review requests"] },
  { key: "loyalty", name: "Loyalty & rewards", group: "Grow", icon: "Gift", href: "/app/loyalty", worker: "MARKETING", tagline: "Points, coupons and gift cards that bring customers back.", features: ["Points", "Coupons", "Gift cards", "Birthday offers"] },
  { key: "academy", name: "Academy", group: "Grow", icon: "GraduationCap", href: "/app/academy", worker: "HR", tagline: "Train your team with courses and certificates, or publish to the OENOD Academy marketplace.", features: ["Course builder", "Assign training", "Quizzes and certificates", "Publish to the marketplace"] },
  { key: "chat", name: "Team chat", group: "Workspace", icon: "MessagesSquare", href: "/app/chat", tagline: "Channels and announcements for the whole team.", features: ["Channels", "Announcements with acknowledgment", "Mobile notifications"] },
  { key: "reports", name: "Reports", group: "Workspace", icon: "BarChart3", href: "/app/reports", worker: "REPORTING", tagline: "Sales, labour, margin and cash in clear, dated reports the AI can explain.", features: ["Profit and loss", "Labour vs sales", "Location performance", "Cash forecast"] },
  { key: "monitors", name: "Monitors & alerts", group: "Platform", icon: "BellRing", href: "/app/monitors", tagline: "Watch everything: stock, cash, shifts, invoices, reviews, websites and integrations. Get alerted instantly.", features: ["30+ ready monitors", "In-app, email, SMS, push and webhook alerts", "Uptime checks", "Alert history"] },
  { key: "integrations", name: "Integrations", group: "Platform", icon: "Plug", href: "/app/integrations", tagline: "Connect Google Business, Meta, QuickBooks, Shopify, Stripe, Slack and more in one click.", features: ["40+ connectors", "One-click sign in", "Sync status and errors", "Zapier-style webhooks"] },
  { key: "developers", name: "Developers & API", group: "Platform", icon: "Code2", href: "/app/developers", tagline: "A full REST API, API keys and signed webhooks to connect any system to OENOD.", features: ["REST API for every module", "Scoped API keys", "Signed webhooks", "Interactive docs"] },
  { key: "settings", name: "Settings", group: "Platform", icon: "Settings", href: "/app/settings", tagline: "Company, locations, team, roles, modules, billing and AI autonomy.", features: ["Team and roles", "Locations and departments", "Modules", "Billing", "AI autonomy"] },
];

export const MODULE_KEYS = MODULES.map((m) => m.key);
export const moduleByKey = (k: string) => MODULES.find((m) => m.key === k);

export const AI_WORKERS = [
  { key: "COORDINATOR", name: "Business coordinator", does: "Monitors priorities, coordinates workflows, assigns tasks and follows deadlines." },
  { key: "HR", name: "HR assistant", does: "Prepares onboarding, answers policy questions, tracks documents and training." },
  { key: "SCHEDULING", name: "Scheduling assistant", does: "Prepares schedules, finds gaps, suggests replacements and watches labour budgets." },
  { key: "PAYROLL", name: "Payroll assistant", does: "Checks timesheets, flags discrepancies, prepares inputs and requests approval." },
  { key: "FINANCE", name: "Finance assistant", does: "Categorizes transactions, prepares invoices and follows up collections." },
  { key: "SALES", name: "Sales assistant", does: "Captures leads, schedules follow-ups, prepares proposals and tracks renewals." },
  { key: "MARKETING", name: "Marketing assistant", does: "Drafts campaigns, picks eligible audiences, schedules content and reports results." },
  { key: "INVENTORY", name: "Inventory assistant", does: "Forecasts shortages, prepares replenishment and watches waste and expiry." },
  { key: "SERVICE", name: "Customer-service assistant", does: "Answers routine questions, tracks orders, arranges bookings." },
  { key: "OPERATIONS", name: "Operations assistant", does: "Creates work orders, monitors completion, tracks the fleet and follows delays." },
  { key: "COMPLIANCE", name: "Compliance assistant", does: "Tracks obligations, renewals, training and inspection deadlines." },
  { key: "REPORTING", name: "Reporting assistant", does: "Explains changes and prepares daily and weekly summaries." },
];

export const INDUSTRIES = [
  { key: "restaurant", name: "Restaurants & cafés", modules: ["pos", "inventory", "scheduling", "time", "payroll", "loyalty", "reviews"] },
  { key: "retail", name: "Retail", modules: ["pos", "inventory", "purchasing", "loyalty", "marketing"] },
  { key: "security", name: "Security companies", modules: ["scheduling", "time", "fleet", "safety", "fieldservice", "compliance"] },
  { key: "trades", name: "Construction & trades", modules: ["projects", "fieldservice", "fleet", "sales", "time", "assets"] },
  { key: "logistics", name: "Trucking & logistics", modules: ["fleet", "scheduling", "time", "payroll", "assets", "compliance"] },
  { key: "services", name: "Professional services", modules: ["crm", "sales", "projects", "time", "support"] },
  { key: "salon", name: "Salons, clinics & studios", modules: ["bookings", "pos", "loyalty", "reviews", "marketing"] },
  { key: "cleaning", name: "Cleaning & facilities", modules: ["fieldservice", "scheduling", "time", "fleet", "sales"] },
  { key: "franchise", name: "Franchises", modules: ["reports", "academy", "purchasing", "compliance", "pos"] },
  { key: "general", name: "Any business", modules: MODULE_KEYS },
];
