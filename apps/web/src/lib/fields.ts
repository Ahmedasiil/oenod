// Field specs drive validation (server), tables and forms (client) and API docs.
// Safe to import from client components.

export type FieldType = "text" | "textarea" | "email" | "phone" | "url" | "number" | "money" | "percent" | "date" | "datetime" | "select" | "boolean" | "tags" | "ref" | "items" | "color";

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  ref?: string; // resource key for type "ref"
  list?: boolean; // show as a table column
  readOnly?: boolean;
  help?: string;
  default?: unknown;
}

export interface ResourceSpec {
  key: string; // URL segment: /api/v1/{key}
  model: string; // Prisma delegate name
  module: string;
  label: string;
  singular: string;
  title: string; // field used as row title
  subtitle?: string;
  search: string[];
  statusField?: string;
  fields: Field[];
  readOnly?: boolean;
  event?: string; // webhook prefix
  order?: Record<string, "asc" | "desc">;
}

const STATUS = (...o: string[]) => ({ name: "status", label: "Status", type: "select" as const, options: o, list: true, default: o[0] });

export const RESOURCES: ResourceSpec[] = [
  {
    key: "employees", model: "employee", module: "people", label: "Employees", singular: "Employee", title: "firstName", subtitle: "jobTitle", search: ["firstName", "lastName", "email", "jobTitle"], statusField: "status", event: "employee",
    fields: [
      { name: "firstName", label: "First name", type: "text", required: true, list: true },
      { name: "lastName", label: "Last name", type: "text", required: true, list: true },
      { name: "email", label: "Email", type: "email", list: true },
      { name: "phone", label: "Phone", type: "phone" },
      { name: "jobTitle", label: "Job title", type: "text", list: true },
      { name: "departmentId", label: "Department", type: "ref", ref: "departments" },
      { name: "locationId", label: "Location", type: "ref", ref: "locations", list: true },
      { name: "employmentType", label: "Employment type", type: "select", options: ["FULL_TIME", "PART_TIME", "CONTRACTOR", "SEASONAL"], default: "FULL_TIME" },
      STATUS("ACTIVE", "ONBOARDING", "LEAVE", "TERMINATED"),
      { name: "startDate", label: "Start date", type: "date" },
      { name: "payType", label: "Pay type", type: "select", options: ["HOURLY", "SALARY"], default: "HOURLY" },
      { name: "payRate", label: "Pay rate (hourly or yearly)", type: "money" },
      { name: "payFrequency", label: "Pay frequency", type: "select", options: ["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY"], default: "BIWEEKLY" },
      { name: "region", label: "Province / state", type: "text", help: "Used for payroll rules" },
      { name: "skills", label: "Skills", type: "tags" },
      { name: "kioskPin", label: "Kiosk PIN", type: "text", help: "4–6 digits for shared kiosk clock-in" },
      { name: "shareLiveLocation", label: "Share live location while clocked in", type: "boolean" },
    ],
  },
  { key: "departments", model: "department", module: "people", label: "Departments", singular: "Department", title: "name", search: ["name"], fields: [{ name: "name", label: "Name", type: "text", required: true, list: true }, { name: "costCode", label: "Cost code", type: "text", list: true }] },
  {
    key: "locations", model: "location", module: "settings", label: "Locations", singular: "Location", title: "name", subtitle: "address", search: ["name", "address"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, list: true },
      { name: "address", label: "Address", type: "text", list: true },
      { name: "phone", label: "Phone", type: "phone" },
      { name: "lat", label: "Latitude", type: "number" },
      { name: "lng", label: "Longitude", type: "number" },
      { name: "radiusM", label: "Clock-in radius (m)", type: "number", default: 150, list: true },
      { name: "active", label: "Active", type: "boolean", default: true },
    ],
  },
  {
    key: "leave", model: "leaveRequest", module: "leave", label: "Leave requests", singular: "Leave request", title: "type", search: ["reason"], statusField: "status", event: "leave",
    fields: [
      { name: "employeeId", label: "Employee", type: "ref", ref: "employees", required: true, list: true },
      { name: "type", label: "Type", type: "select", options: ["VACATION", "SICK", "PERSONAL", "UNPAID", "PARENTAL"], list: true, default: "VACATION" },
      { name: "startDate", label: "From", type: "date", required: true, list: true },
      { name: "endDate", label: "To", type: "date", required: true, list: true },
      { name: "hours", label: "Hours", type: "number" },
      { name: "reason", label: "Reason", type: "textarea" },
      STATUS("PENDING", "APPROVED", "REJECTED", "CANCELLED"),
    ],
  },
  {
    key: "jobs", model: "jobPosting", module: "recruiting", label: "Job postings", singular: "Job posting", title: "title", subtitle: "city", search: ["title", "city", "category"], statusField: "status", event: "job",
    fields: [
      { name: "title", label: "Job title", type: "text", required: true, list: true },
      { name: "category", label: "Category", type: "select", options: ["General", "Hospitality", "Retail", "Trades", "Security", "Driving & logistics", "Office & admin", "Sales", "Marketing", "Technology", "Healthcare", "Cleaning", "Management"], list: true, default: "General" },
      { name: "city", label: "City", type: "text", list: true },
      { name: "workplace", label: "Workplace", type: "select", options: ["ONSITE", "HYBRID", "REMOTE"], default: "ONSITE" },
      { name: "employmentType", label: "Employment type", type: "select", options: ["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY", "INTERNSHIP"], default: "FULL_TIME" },
      { name: "salaryMin", label: "Salary from", type: "number" },
      { name: "salaryMax", label: "Salary to", type: "number" },
      { name: "salaryPeriod", label: "Salary per", type: "select", options: ["YEAR", "HOUR", "MONTH"], default: "YEAR" },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "requirements", label: "Requirements", type: "textarea" },
      { name: "benefits", label: "Benefits", type: "textarea" },
      { name: "skills", label: "Skills", type: "tags" },
      STATUS("OPEN", "DRAFT", "CLOSED"),
      { name: "isPublic", label: "Show on OENOD Jobs marketplace", type: "boolean", default: true },
      { name: "views", label: "Views", type: "number", readOnly: true, list: true },
    ],
  },
  {
    key: "applications", model: "jobApplication", module: "recruiting", label: "Applicants", singular: "Applicant", title: "name", subtitle: "email", search: ["name", "email", "city"], statusField: "stage", event: "application",
    fields: [
      { name: "jobId", label: "Job", type: "ref", ref: "jobs", required: true, list: true },
      { name: "name", label: "Name", type: "text", required: true, list: true },
      { name: "email", label: "Email", type: "email", required: true, list: true },
      { name: "phone", label: "Phone", type: "phone" },
      { name: "stage", label: "Stage", type: "select", options: ["APPLIED", "SCREEN", "INTERVIEW", "OFFER", "HIRED", "REJECTED"], list: true, default: "APPLIED" },
      { name: "aiMatch", label: "AI match %", type: "number", readOnly: true, list: true },
      { name: "rating", label: "Rating (1–5)", type: "number" },
      { name: "interviewAt", label: "Interview", type: "datetime" },
      { name: "coverLetter", label: "Cover letter", type: "textarea", readOnly: true },
      { name: "aiSummary", label: "AI summary", type: "textarea", readOnly: true },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "shifts", model: "shift", module: "scheduling", label: "Shifts", singular: "Shift", title: "role", search: ["role", "notes"], statusField: "status", event: "shift", order: { start: "asc" },
    fields: [
      { name: "employeeId", label: "Employee", type: "ref", ref: "employees", list: true },
      { name: "locationId", label: "Location", type: "ref", ref: "locations", list: true },
      { name: "role", label: "Role", type: "text", list: true },
      { name: "start", label: "Start", type: "datetime", required: true, list: true },
      { name: "end", label: "End", type: "datetime", required: true, list: true },
      { name: "breakMinutes", label: "Break (min)", type: "number", default: 0 },
      STATUS("DRAFT", "PUBLISHED", "OPEN", "SWAP_REQUESTED"),
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "timeentries", model: "timeEntry", module: "time", label: "Timesheets", singular: "Time entry", title: "source", search: ["notes"], statusField: "status", event: "timeentry", order: { clockIn: "desc" },
    fields: [
      { name: "employeeId", label: "Employee", type: "ref", ref: "employees", required: true, list: true },
      { name: "clockIn", label: "Clock in", type: "datetime", required: true, list: true },
      { name: "clockOut", label: "Clock out", type: "datetime", list: true },
      { name: "breakMinutes", label: "Break (min)", type: "number", default: 0 },
      { name: "source", label: "Source", type: "select", options: ["WEB", "MOBILE", "KIOSK", "DESKTOP"], list: true, default: "WEB" },
      { name: "onSite", label: "On site", type: "boolean", readOnly: true, list: true },
      STATUS("OPEN", "SUBMITTED", "APPROVED", "REJECTED"),
      { name: "editReason", label: "Reason for correction", type: "text" },
    ],
  },
  {
    key: "contacts", model: "contact", module: "crm", label: "Contacts", singular: "Contact", title: "firstName", subtitle: "company", search: ["firstName", "lastName", "email", "company", "phone"], statusField: "type", event: "contact",
    fields: [
      { name: "firstName", label: "First name", type: "text", required: true, list: true },
      { name: "lastName", label: "Last name", type: "text", list: true },
      { name: "company", label: "Company", type: "text", list: true },
      { name: "email", label: "Email", type: "email", list: true },
      { name: "phone", label: "Phone", type: "phone" },
      { name: "type", label: "Type", type: "select", options: ["LEAD", "CUSTOMER", "PARTNER"], list: true, default: "LEAD" },
      { name: "source", label: "Source", type: "text" },
      { name: "tags", label: "Tags", type: "tags" },
      { name: "score", label: "Score", type: "number", list: true },
      { name: "loyaltyPoints", label: "Loyalty points", type: "number" },
      { name: "birthday", label: "Birthday", type: "date" },
      { name: "address", label: "Address", type: "text" },
      { name: "emailConsent", label: "Agreed to marketing email", type: "boolean" },
      { name: "smsConsent", label: "Agreed to marketing SMS", type: "boolean" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "deals", model: "deal", module: "crm", label: "Deals", singular: "Deal", title: "title", search: ["title"], statusField: "stage", event: "deal",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, list: true },
      { name: "contactId", label: "Contact", type: "ref", ref: "contacts", list: true },
      { name: "value", label: "Value", type: "money", list: true },
      { name: "stage", label: "Stage", type: "select", options: ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"], list: true, default: "NEW" },
      { name: "probability", label: "Probability %", type: "percent", default: 10 },
      { name: "expectedClose", label: "Expected close", type: "date", list: true },
    ],
  },
  {
    key: "activities", model: "activity", module: "crm", label: "Activities", singular: "Activity", title: "subject", search: ["subject", "body"],
    fields: [
      { name: "type", label: "Type", type: "select", options: ["NOTE", "CALL", "EMAIL", "MEETING", "TASK", "SMS"], list: true, default: "NOTE" },
      { name: "subject", label: "Subject", type: "text", required: true, list: true },
      { name: "contactId", label: "Contact", type: "ref", ref: "contacts", list: true },
      { name: "dueAt", label: "Due", type: "datetime", list: true },
      { name: "doneAt", label: "Done", type: "datetime" },
      { name: "body", label: "Details", type: "textarea" },
    ],
  },
  {
    key: "quotes", model: "quote", module: "sales", label: "Quotes", singular: "Quote", title: "number", search: ["number"], statusField: "status", event: "quote",
    fields: [
      { name: "number", label: "Number", type: "text", readOnly: true, list: true },
      { name: "contactId", label: "Customer", type: "ref", ref: "contacts", list: true },
      { name: "items", label: "Line items", type: "items", required: true },
      { name: "total", label: "Total", type: "money", readOnly: true, list: true },
      { name: "validUntil", label: "Valid until", type: "date", list: true },
      STATUS("DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"),
    ],
  },
  {
    key: "invoices", model: "invoice", module: "sales", label: "Invoices", singular: "Invoice", title: "number", search: ["number", "notes"], statusField: "status", event: "invoice",
    fields: [
      { name: "number", label: "Number", type: "text", readOnly: true, list: true },
      { name: "contactId", label: "Customer", type: "ref", ref: "contacts", list: true },
      { name: "issueDate", label: "Issued", type: "date" },
      { name: "dueDate", label: "Due", type: "date", required: true, list: true },
      { name: "items", label: "Line items", type: "items", required: true },
      { name: "total", label: "Total", type: "money", readOnly: true, list: true },
      { name: "amountPaid", label: "Paid", type: "money", readOnly: true, list: true },
      STATUS("DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "VOID", "DISPUTED"),
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  { key: "payments", model: "payment", module: "sales", label: "Payments", singular: "Payment", title: "reference", search: ["reference"], event: "payment", order: { receivedAt: "desc" }, fields: [{ name: "invoiceId", label: "Invoice", type: "ref", ref: "invoices", list: true }, { name: "amount", label: "Amount", type: "money", required: true, list: true }, { name: "method", label: "Method", type: "select", options: ["CARD", "CASH", "BANK_TRANSFER", "CHEQUE", "E_TRANSFER", "OTHER"], list: true, default: "CARD" }, { name: "reference", label: "Reference", type: "text", list: true }, { name: "receivedAt", label: "Received", type: "date", list: true }] },
  {
    key: "expenses", model: "expense", module: "expenses", label: "Expenses", singular: "Expense", title: "vendor", search: ["vendor", "category", "notes"], statusField: "status",
    fields: [
      { name: "vendor", label: "Vendor", type: "text", required: true, list: true },
      { name: "projectId", label: "Project", type: "ref", ref: "projects" },
      { name: "category", label: "Category", type: "select", options: ["General", "Meals", "Travel", "Fuel", "Mileage", "Supplies", "Software", "Equipment", "Rent", "Utilities", "Marketing", "Insurance"], list: true, default: "General" },
      { name: "amount", label: "Amount", type: "money", required: true, list: true },
      { name: "tax", label: "Tax", type: "money" },
      { name: "date", label: "Date", type: "date", list: true },
      { name: "employeeId", label: "Employee", type: "ref", ref: "employees" },
      { name: "receiptUrl", label: "Receipt link", type: "url" },
      STATUS("SUBMITTED", "APPROVED", "REIMBURSED", "REJECTED"),
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  { key: "bills", model: "bill", module: "accounting", label: "Bills", singular: "Bill", title: "number", search: ["number", "notes"], statusField: "status", fields: [{ name: "supplierId", label: "Supplier", type: "ref", ref: "suppliers", list: true }, { name: "number", label: "Bill number", type: "text", required: true, list: true }, { name: "dueDate", label: "Due", type: "date", required: true, list: true }, { name: "amount", label: "Amount", type: "money", required: true, list: true }, STATUS("AWAITING_APPROVAL", "APPROVED", "PAID", "VOID"), { name: "notes", label: "Notes", type: "textarea" }] },
  { key: "accounts", model: "account", module: "accounting", label: "Chart of accounts", singular: "Account", title: "name", search: ["name", "code"], order: { code: "asc" }, fields: [{ name: "code", label: "Code", type: "text", required: true, list: true }, { name: "name", label: "Name", type: "text", required: true, list: true }, { name: "type", label: "Type", type: "select", options: ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"], list: true, required: true }] },
  { key: "banktxns", model: "bankTransaction", module: "accounting", label: "Bank transactions", singular: "Bank transaction", title: "description", search: ["description"], statusField: "status", order: { date: "desc" }, fields: [{ name: "date", label: "Date", type: "date", required: true, list: true }, { name: "description", label: "Description", type: "text", required: true, list: true }, { name: "amount", label: "Amount", type: "money", required: true, list: true }, STATUS("UNMATCHED", "MATCHED", "IGNORED")] },
  { key: "taxrates", model: "taxRate", module: "settings", label: "Tax rates", singular: "Tax rate", title: "name", order: { name: "asc" }, search: ["name"], fields: [{ name: "name", label: "Name", type: "text", required: true, list: true }, { name: "rate", label: "Rate (0.13 = 13%)", type: "number", required: true, list: true }] },
  { key: "payrules", model: "payrollRule", module: "payroll", label: "Deductions & contributions", singular: "Payroll rule", title: "name", order: { name: "asc" }, search: ["name"], fields: [{ name: "name", label: "Name", type: "text", required: true, list: true }, { name: "kind", label: "Kind", type: "select", options: ["PERCENT", "FIXED"], list: true, default: "PERCENT" }, { name: "rate", label: "Employee rate (0.0595 = 5.95%) or fixed amount", type: "number", required: true, list: true }, { name: "employerRate", label: "Employer rate", type: "number", list: true }, { name: "annualCap", label: "Annual max deduction", type: "money" }, { name: "region", label: "Region (blank = all)", type: "text", list: true }, { name: "active", label: "Active", type: "boolean", default: true }] },
  { key: "segments", model: "segment", module: "marketing", label: "Segments", singular: "Segment", title: "name", search: ["name"], fields: [{ name: "name", label: "Name", type: "text", required: true, list: true }, { name: "filter", label: "Filter (JSON: type, tags, minScore)", type: "textarea", help: 'Example: {"type":"CUSTOMER","tags":["vip"]}' }] },
  {
    key: "campaigns", model: "campaign", module: "marketing", label: "Campaigns", singular: "Campaign", title: "name", search: ["name", "subject"], statusField: "status",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, list: true },
      { name: "channel", label: "Channel", type: "select", options: ["EMAIL", "SMS", "WHATSAPP"], list: true, default: "EMAIL" },
      { name: "segmentId", label: "Audience segment", type: "ref", ref: "segments", list: true },
      { name: "subject", label: "Subject", type: "text" },
      { name: "content", label: "Message (use {{first_name}})", type: "textarea", required: true },
      { name: "scheduledAt", label: "Send at", type: "datetime" },
      STATUS("DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED"),
      { name: "sent", label: "Sent", type: "number", readOnly: true, list: true },
    ],
  },
  { key: "socialposts", model: "socialPost", module: "marketing", label: "Social posts", singular: "Social post", title: "content", search: ["content"], statusField: "status", fields: [{ name: "content", label: "Post", type: "textarea", required: true, list: true }, { name: "platforms", label: "Platforms", type: "tags", help: "GOOGLE_BUSINESS, FACEBOOK, INSTAGRAM, LINKEDIN, TIKTOK", list: true }, { name: "mediaUrls", label: "Image / video links", type: "tags" }, { name: "scheduledAt", label: "Publish at", type: "datetime", list: true }, STATUS("DRAFT", "SCHEDULED", "PUBLISHED", "FAILED")] },
  { key: "reviews", model: "review", module: "reviews", label: "Reviews", singular: "Review", title: "author", search: ["author", "text"], order: { postedAt: "desc" }, event: "review", fields: [{ name: "source", label: "Source", type: "select", options: ["GOOGLE", "FACEBOOK", "YELP", "TRIPADVISOR", "OENOD"], list: true, default: "GOOGLE" }, { name: "author", label: "Author", type: "text", required: true, list: true }, { name: "rating", label: "Rating", type: "number", required: true, list: true }, { name: "text", label: "Review", type: "textarea", list: true }, { name: "reply", label: "Reply", type: "textarea" }, { name: "postedAt", label: "Posted", type: "date", list: true }] },
  { key: "coupons", model: "coupon", module: "loyalty", label: "Coupons", singular: "Coupon", title: "code", order: { code: "asc" }, search: ["code"], fields: [{ name: "code", label: "Code", type: "text", required: true, list: true }, { name: "kind", label: "Kind", type: "select", options: ["PERCENT", "FIXED"], list: true, default: "PERCENT" }, { name: "value", label: "Value", type: "number", required: true, list: true }, { name: "maxUses", label: "Max uses", type: "number" }, { name: "uses", label: "Used", type: "number", readOnly: true, list: true }, { name: "expiresAt", label: "Expires", type: "date", list: true }, { name: "active", label: "Active", type: "boolean", default: true }] },
  { key: "giftcards", model: "giftCard", module: "loyalty", label: "Gift cards", singular: "Gift card", title: "code", search: ["code", "issuedTo"], fields: [{ name: "code", label: "Code", type: "text", required: true, list: true }, { name: "balance", label: "Balance", type: "money", required: true, list: true }, { name: "issuedTo", label: "Issued to", type: "text", list: true }] },
  {
    key: "products", model: "product", module: "inventory", label: "Products", singular: "Product", title: "name", subtitle: "sku", search: ["name", "sku", "barcode", "category"], event: "product",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, list: true },
      { name: "sku", label: "SKU", type: "text", list: true },
      { name: "barcode", label: "Barcode", type: "text" },
      { name: "category", label: "Category", type: "text", list: true, default: "General" },
      { name: "type", label: "Type", type: "select", options: ["PRODUCT", "SERVICE", "INGREDIENT"], default: "PRODUCT" },
      { name: "price", label: "Price", type: "money", required: true, list: true },
      { name: "cost", label: "Cost", type: "money" },
      { name: "taxable", label: "Taxable", type: "boolean", default: true },
      { name: "trackStock", label: "Track stock", type: "boolean", default: true },
      { name: "reorderPoint", label: "Reorder point", type: "number" },
      { name: "reorderQty", label: "Reorder quantity", type: "number" },
      { name: "supplierId", label: "Supplier", type: "ref", ref: "suppliers" },
      { name: "color", label: "Tile colour", type: "color" },
      { name: "active", label: "Active", type: "boolean", default: true },
    ],
  },
  { key: "suppliers", model: "supplier", module: "purchasing", label: "Suppliers", singular: "Supplier", title: "name", search: ["name", "email"], fields: [{ name: "name", label: "Name", type: "text", required: true, list: true }, { name: "email", label: "Email", type: "email", list: true }, { name: "phone", label: "Phone", type: "phone", list: true }, { name: "leadTimeDays", label: "Lead time (days)", type: "number", default: 3, list: true }, { name: "approved", label: "Approved supplier", type: "boolean", default: true }] },
  { key: "purchaseorders", model: "purchaseOrder", module: "purchasing", label: "Purchase orders", singular: "Purchase order", title: "number", search: ["number"], statusField: "status", event: "purchaseorder", fields: [{ name: "number", label: "Number", type: "text", readOnly: true, list: true }, { name: "supplierId", label: "Supplier", type: "ref", ref: "suppliers", list: true }, { name: "locationId", label: "Deliver to", type: "ref", ref: "locations" }, { name: "items", label: "Items", type: "items", required: true }, { name: "total", label: "Total", type: "money", readOnly: true, list: true }, { name: "expectedAt", label: "Expected", type: "date", list: true }, STATUS("DRAFT", "AWAITING_APPROVAL", "ORDERED", "RECEIVED", "CANCELLED")] },
  { key: "orders", model: "order", module: "pos", label: "Sales orders", singular: "Order", title: "number", search: ["number"], statusField: "status", readOnly: true, event: "order", fields: [{ name: "number", label: "Number", type: "text", list: true }, { name: "channel", label: "Channel", type: "select", options: ["POS", "ONLINE", "PHONE", "DELIVERY"], list: true }, { name: "total", label: "Total", type: "money", list: true }, { name: "paymentMethod", label: "Paid by", type: "text", list: true }, STATUS("PAID", "OPEN", "REFUNDED", "VOID"), { name: "createdAt", label: "Date", type: "datetime", list: true }] },
  { key: "projects", model: "project", module: "projects", label: "Projects", singular: "Project", title: "name", subtitle: "code", search: ["name", "description", "code"], statusField: "status", event: "project", fields: [{ name: "code", label: "Code", type: "text", readOnly: true, list: true }, { name: "name", label: "Name", type: "text", required: true, list: true }, { name: "contactId", label: "Client", type: "ref", ref: "contacts", list: true }, { name: "managerId", label: "Project lead", type: "ref", ref: "employees", list: true }, STATUS("ACTIVE", "PLANNED", "ON_HOLD", "DONE", "CANCELLED"), { name: "priority", label: "Priority", type: "select", options: ["LOW", "NORMAL", "HIGH", "URGENT"], default: "NORMAL" }, { name: "health", label: "Health", type: "select", options: ["ON_TRACK", "AT_RISK", "OFF_TRACK"], readOnly: true, list: true }, { name: "progress", label: "Progress", type: "percent", readOnly: true, list: true }, { name: "billingType", label: "Billing", type: "select", options: ["FIXED", "HOURLY", "MILESTONES", "NON_BILLABLE"], default: "FIXED" }, { name: "hourlyRate", label: "Hourly rate", type: "money" }, { name: "budget", label: "Budget", type: "money", list: true }, { name: "spent", label: "Spent", type: "money", readOnly: true }, { name: "estimateHours", label: "Estimated hours", type: "number" }, { name: "startDate", label: "Start", type: "date" }, { name: "dueDate", label: "Due", type: "date", list: true }, { name: "visibility", label: "Who can see it", type: "select", options: ["TEAM", "ORG", "PRIVATE"], default: "TEAM" }, { name: "color", label: "Colour", type: "color", default: "#2342E0" }, { name: "tags", label: "Tags", type: "tags" }, { name: "clientPortal", label: "Share with client", type: "boolean" }, { name: "isTemplate", label: "Use as template", type: "boolean" }, { name: "description", label: "Description", type: "textarea" }] },
  { key: "tasks", model: "task", module: "projects", label: "Tasks", singular: "Task", title: "title", search: ["title", "description"], statusField: "status", event: "task", order: { order: "asc" }, fields: [{ name: "title", label: "Title", type: "text", required: true, list: true }, { name: "projectId", label: "Project", type: "ref", ref: "projects", list: true }, { name: "assigneeId", label: "Assignee", type: "ref", ref: "employees", list: true }, { name: "priority", label: "Priority", type: "select", options: ["LOW", "NORMAL", "HIGH", "URGENT"], default: "NORMAL", list: true }, { name: "startDate", label: "Start", type: "date" }, { name: "dueDate", label: "Due", type: "date", list: true }, { name: "estimateHours", label: "Estimate (h)", type: "number" }, { name: "loggedHours", label: "Logged (h)", type: "number", readOnly: true }, { name: "tags", label: "Tags", type: "tags" }, STATUS("TODO", "DOING", "REVIEW", "BLOCKED", "DONE"), { name: "description", label: "Description", type: "textarea" }] },
  { key: "workorders", model: "workOrder", module: "fieldservice", label: "Work orders", singular: "Work order", title: "title", subtitle: "address", search: ["title", "address", "number"], statusField: "status", event: "workorder", fields: [{ name: "number", label: "Number", type: "text", readOnly: true, list: true }, { name: "title", label: "Title", type: "text", required: true, list: true }, { name: "contactId", label: "Customer", type: "ref", ref: "contacts" }, { name: "address", label: "Address", type: "text", list: true }, { name: "lat", label: "Latitude", type: "number" }, { name: "lng", label: "Longitude", type: "number" }, { name: "scheduledAt", label: "Scheduled", type: "datetime", list: true }, { name: "assigneeId", label: "Technician", type: "ref", ref: "employees", list: true }, { name: "recurrence", label: "Repeats", type: "select", options: ["", "WEEKLY", "BIWEEKLY", "MONTHLY"] }, STATUS("NEW", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED")] },
  { key: "bookings", model: "booking", module: "bookings", label: "Bookings", singular: "Booking", title: "service", search: ["service", "notes"], statusField: "status", event: "booking", order: { start: "asc" }, fields: [{ name: "service", label: "Service", type: "text", required: true, list: true }, { name: "contactId", label: "Customer", type: "ref", ref: "contacts", list: true }, { name: "staffId", label: "Staff", type: "ref", ref: "employees", list: true }, { name: "resource", label: "Room / resource", type: "text" }, { name: "start", label: "Start", type: "datetime", required: true, list: true }, { name: "end", label: "End", type: "datetime", required: true }, { name: "deposit", label: "Deposit", type: "money" }, STATUS("CONFIRMED", "PENDING", "CANCELLED", "NO_SHOW", "DONE"), { name: "notes", label: "Notes", type: "textarea" }] },
  { key: "assets", model: "asset", module: "assets", label: "Assets", singular: "Asset", title: "name", subtitle: "serial", search: ["name", "serial"], statusField: "status", fields: [{ name: "name", label: "Name", type: "text", required: true, list: true }, { name: "kind", label: "Kind", type: "select", options: ["EQUIPMENT", "VEHICLE", "IT", "SOFTWARE"], list: true, default: "EQUIPMENT" }, { name: "serial", label: "Serial / licence", type: "text", list: true }, { name: "assignedTo", label: "Assigned to", type: "text", list: true }, { name: "cost", label: "Cost", type: "money" }, { name: "purchaseDate", label: "Purchased", type: "date" }, { name: "warrantyUntil", label: "Warranty until", type: "date", list: true }, { name: "nextServiceAt", label: "Next service", type: "date", list: true }, STATUS("ACTIVE", "REPAIR", "RETIRED")] },
  { key: "incidents", model: "incident", module: "safety", label: "Incidents", singular: "Incident", title: "title", search: ["title", "description"], statusField: "status", fields: [{ name: "title", label: "Title", type: "text", required: true, list: true }, { name: "severity", label: "Severity", type: "select", options: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], list: true, default: "LOW" }, { name: "location", label: "Where", type: "text", list: true }, { name: "reportedBy", label: "Reported by", type: "text" }, { name: "description", label: "What happened", type: "textarea" }, { name: "correctiveAction", label: "Corrective action", type: "textarea" }, STATUS("OPEN", "INVESTIGATING", "RESOLVED")] },
  { key: "tickets", model: "ticket", module: "support", label: "Tickets", singular: "Ticket", title: "subject", search: ["subject"], statusField: "status", event: "ticket", fields: [{ name: "subject", label: "Subject", type: "text", required: true, list: true }, { name: "contactId", label: "Customer", type: "ref", ref: "contacts", list: true }, { name: "kind", label: "Kind", type: "select", options: ["CUSTOMER", "INTERNAL", "HR"], default: "CUSTOMER", list: true }, { name: "priority", label: "Priority", type: "select", options: ["LOW", "NORMAL", "HIGH", "URGENT"], default: "NORMAL", list: true }, { name: "channel", label: "Channel", type: "select", options: ["WEB", "EMAIL", "PHONE", "CHAT", "SMS"], default: "WEB" }, { name: "slaDueAt", label: "Respond by", type: "datetime", list: true }, STATUS("OPEN", "PENDING", "RESOLVED", "CLOSED")] },
  { key: "documents", model: "document", module: "compliance", label: "Documents", singular: "Document", title: "name", search: ["name"], fields: [{ name: "name", label: "Name", type: "text", required: true, list: true }, { name: "kind", label: "Kind", type: "select", options: ["CONTRACT", "POLICY", "RECEIPT", "CERTIFICATE", "PERMIT", "INSURANCE", "OTHER"], list: true, default: "OTHER" }, { name: "url", label: "File link", type: "url" }, { name: "expiresAt", label: "Expires", type: "date", list: true }, { name: "version", label: "Version", type: "number", default: 1, list: true }] },
  { key: "compliance", model: "complianceItem", module: "compliance", label: "Compliance calendar", singular: "Obligation", title: "title", search: ["title", "category"], statusField: "status", order: { dueDate: "asc" }, fields: [{ name: "title", label: "Obligation", type: "text", required: true, list: true }, { name: "category", label: "Category", type: "select", options: ["General", "Tax", "Payroll", "Safety", "Licence", "Insurance", "Training", "Inspection"], list: true, default: "General" }, { name: "dueDate", label: "Due", type: "date", required: true, list: true }, { name: "owner", label: "Owner", type: "text", list: true }, { name: "recurrence", label: "Repeats", type: "select", options: ["", "MONTHLY", "QUARTERLY", "YEARLY"] }, STATUS("OPEN", "DONE", "OVERDUE"), { name: "evidence", label: "Evidence / notes", type: "textarea" }] },
  {
    key: "vehicles", model: "vehicle", module: "fleet", label: "Vehicles", singular: "Vehicle", title: "name", subtitle: "plate", search: ["name", "plate", "vin", "deviceId"], statusField: "status",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, list: true },
      { name: "plate", label: "Plate", type: "text", list: true },
      { name: "kind", label: "Type", type: "select", options: ["TRUCK", "VAN", "CAR", "BUS", "TRAILER", "EQUIPMENT"], list: true, default: "TRUCK" },
      { name: "make", label: "Make", type: "text" },
      { name: "model", label: "Model", type: "text" },
      { name: "year", label: "Year", type: "number" },
      { name: "vin", label: "VIN", type: "text" },
      { name: "driverId", label: "Driver", type: "ref", ref: "employees", list: true },
      { name: "deviceId", label: "Tracker / device ID", type: "text", help: "IMEI or ID of the GPS tracker. Leave blank to generate one for the OENOD Driver app." },
      { name: "speedLimitKmh", label: "Speed alert above (km/h)", type: "number", default: 100 },
      { name: "stopAlertMin", label: "Alert if stopped longer than (min)", type: "number", default: 30 },
      { name: "idleAlertMin", label: "Alert if idling longer than (min)", type: "number", default: 15 },
      { name: "odometerKm", label: "Odometer (km)", type: "number" },
      { name: "nextServiceKm", label: "Next service at (km)", type: "number" },
      { name: "status", label: "Status", type: "select", options: ["OFFLINE", "MOVING", "IDLE", "STOPPED"], readOnly: true, list: true },
      { name: "lastSpeedKmh", label: "Speed", type: "number", readOnly: true, list: true },
      { name: "lastSeenAt", label: "Last seen", type: "datetime", readOnly: true, list: true },
    ],
  },
  { key: "geofences", model: "geofence", module: "fleet", label: "Geofences", singular: "Geofence", title: "name", search: ["name"], fields: [{ name: "name", label: "Name", type: "text", required: true, list: true }, { name: "lat", label: "Latitude", type: "number", required: true, list: true }, { name: "lng", label: "Longitude", type: "number", required: true, list: true }, { name: "radiusM", label: "Radius (m)", type: "number", default: 300, list: true }, { name: "alertOnEnter", label: "Alert on enter", type: "boolean", default: true }, { name: "alertOnExit", label: "Alert on exit", type: "boolean", default: true }] },
  { key: "fleetevents", model: "fleetEvent", module: "fleet", label: "Fleet events", singular: "Fleet event", title: "message", search: ["message", "kind"], readOnly: true, order: { at: "desc" }, fields: [{ name: "vehicleId", label: "Vehicle", type: "ref", ref: "vehicles", list: true }, { name: "kind", label: "Event", type: "text", list: true }, { name: "message", label: "Details", type: "text", list: true }, { name: "at", label: "When", type: "datetime", list: true }] },
  {
    key: "monitors", model: "monitor", module: "monitors", label: "Monitors", singular: "Monitor", title: "name", search: ["name", "kind"], statusField: "lastStatus",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, list: true },
      { name: "kind", label: "What to watch", type: "select", required: true, list: true, options: ["LOW_STOCK", "OVERDUE_INVOICES", "UNCOVERED_SHIFTS", "LATE_WORK_ORDERS", "EXPIRING_CERTS", "EXPIRING_DOCUMENTS", "UPTIME", "SALES_DROP", "REVIEW_RATING", "INTEGRATION_HEALTH", "OPEN_TICKETS", "OVERTIME", "FLEET_SPEEDING", "VEHICLES_OFFLINE", "PENDING_APPROVALS", "CASH_DUE"] },
      { name: "threshold", label: "Threshold", type: "number", help: "e.g. count, %, rating or days depending on the monitor" },
      { name: "config", label: "Settings (JSON)", type: "textarea", help: 'Uptime: {"url":"https://yoursite.com"}' },
      { name: "severity", label: "Severity", type: "select", options: ["INFO", "WARN", "CRIT"], list: true, default: "WARN" },
      { name: "channels", label: "Notify via", type: "tags", help: "IN_APP, EMAIL, SMS, PUSH, WEBHOOK", default: ["IN_APP"] },
      { name: "recipients", label: "Recipients (emails or phone numbers)", type: "tags" },
      { name: "intervalMin", label: "Check every (min)", type: "number", default: 15 },
      { name: "enabled", label: "Enabled", type: "boolean", default: true, list: true },
      { name: "lastStatus", label: "Status", type: "text", readOnly: true, list: true },
      { name: "lastCheckedAt", label: "Last check", type: "datetime", readOnly: true, list: true },
    ],
  },
  { key: "alerts", model: "alert", module: "monitors", label: "Alerts", singular: "Alert", title: "title", search: ["title", "message"], statusField: "status", event: "alert", fields: [{ name: "title", label: "Alert", type: "text", list: true, readOnly: true }, { name: "message", label: "Details", type: "text", list: true, readOnly: true }, { name: "severity", label: "Severity", type: "text", list: true, readOnly: true }, STATUS("OPEN", "ACKNOWLEDGED", "RESOLVED"), { name: "createdAt", label: "When", type: "datetime", list: true, readOnly: true }] },
  {
    key: "automations", model: "automationRule", module: "ai", label: "Automations", singular: "Automation", title: "name", search: ["name"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, list: true },
      { name: "trigger", label: "When", type: "select", required: true, list: true, options: ["INVOICE_OVERDUE", "STOCK_LOW", "SHIFT_MISSED", "OFFER_ACCEPTED", "QUOTE_ACCEPTED", "CONTRACT_EXPIRING", "EMPLOYEE_LEAVING", "NEW_REVIEW", "NEW_LEAD", "VEHICLE_SPEEDING", "CERT_EXPIRING"] },
      { name: "action", label: "Then", type: "select", required: true, list: true, options: ["SEND_INVOICE_REMINDERS", "CREATE_PURCHASE_ORDER", "PREPARE_PAYROLL", "DRAFT_CAMPAIGN", "REPLY_TO_REVIEW", "CREATE_RECORD", "UPDATE_RECORD", "NOTIFY_MANAGER"] },
      { name: "autonomy", label: "Autonomy", type: "select", options: ["ASSIST", "APPROVE", "AUTO"], list: true, default: "APPROVE", help: "Assist = draft only, Approve = asks you first, Auto = runs inside the limits" },
      { name: "spendLimit", label: "Spending limit", type: "money" },
      { name: "enabled", label: "Enabled", type: "boolean", default: true, list: true },
      { name: "runCount", label: "Runs", type: "number", readOnly: true, list: true },
    ],
  },
  { key: "webhooks", model: "webhook", module: "developers", label: "Webhooks", singular: "Webhook", title: "url", search: ["url"], fields: [{ name: "url", label: "Endpoint URL", type: "url", required: true, list: true }, { name: "events", label: "Events (* = all)", type: "tags", default: ["*"], list: true }, { name: "active", label: "Active", type: "boolean", default: true, list: true }, { name: "lastStatus", label: "Last response", type: "number", readOnly: true, list: true }] },
  { key: "announcements", model: "announcement", module: "chat", label: "Announcements", singular: "Announcement", title: "title", search: ["title", "body"], fields: [{ name: "title", label: "Title", type: "text", required: true, list: true }, { name: "body", label: "Message", type: "textarea", required: true }, { name: "requireAck", label: "Require acknowledgment", type: "boolean", list: true }, { name: "createdAt", label: "Posted", type: "datetime", readOnly: true, list: true }] },
];

export const resourceByKey = (k: string) => RESOURCES.find((r) => r.key === k);
