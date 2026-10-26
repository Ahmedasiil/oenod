// English is the source language. Every other locale has the same keys; anything missing falls back to English.
const en = {
  common: {
    save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", add: "Add", create: "Create", close: "Close", back: "Back", next: "Next", done: "Done",
    search: "Search", filter: "Filter", export: "Export", import: "Import", download: "Download", upload: "Upload", share: "Share", copy: "Copy", copied: "Copied",
    loading: "Loading…", saving: "Saving…", saved: "Saved", retry: "Try again", yes: "Yes", no: "No", all: "All", none: "None", more: "More", seeAll: "See all",
    today: "Today", yesterday: "Yesterday", tomorrow: "Tomorrow", thisWeek: "This week", thisMonth: "This month", date: "Date", time: "Time", status: "Status",
    name: "Name", email: "Email", phone: "Phone", address: "Address", notes: "Notes", total: "Total", amount: "Amount", actions: "Actions",
    approve: "Approve", reject: "Reject", submit: "Submit", send: "Send", open: "Open", view: "View", details: "Details", settings: "Settings",
    required: "Required", optional: "Optional", noResults: "Nothing here yet", language: "Language", signOut: "Sign out", help: "Help",
    verified: "Verified", sponsored: "Sponsored", free: "Free", new: "New", poweredBy: "Powered by OENOD",
  },
  nav: {
    home: "Home", features: "Features", pricing: "Pricing", jobs: "Jobs", academy: "Academy", directory: "Businesses", developers: "Developers",
    status: "Status", download: "Download", signIn: "Sign in", startFree: "Start free", dashboard: "Dashboard", admin: "Super admin", myAccount: "My account",
    notifications: "Notifications", security: "Security",
  },
  modules: {
    overview: "Overview", ai: "AI Business Manager", live: "Live map", people: "People & HR", recruiting: "Recruiting & Jobs", time: "Time & attendance",
    scheduling: "Scheduling", leave: "Leave & benefits", payroll: "Payroll", crm: "CRM", sales: "Quotes & invoices", support: "Help desk", bookings: "Bookings",
    accounting: "Accounting", expenses: "Expenses", pos: "Point of sale", inventory: "Inventory", purchasing: "Purchasing", projects: "Projects",
    fieldservice: "Field service", fleet: "Fleet GPS", assets: "Assets & maintenance", safety: "Quality & safety", compliance: "Documents & compliance",
    marketing: "Marketing", reviews: "Reviews & reputation", loyalty: "Loyalty & rewards", academy: "Academy", chat: "Team chat", reports: "Reports",
    monitors: "Monitors & alerts", integrations: "Integrations", developers: "Developers & API", settings: "Settings", me: "My work",
  },
  auth: {
    signInTitle: "Welcome back", signInSub: "Sign in to your OENOD account", signUpTitle: "Start your free trial", signUpSub: "14 days free. No card needed.",
    email: "Work email", password: "Password", newPassword: "New password", fullName: "Full name", company: "Company name",
    forgot: "Forgot password?", noAccount: "New to OENOD?", haveAccount: "Already have an account?", createAccount: "Create account",
    resetTitle: "Reset your password", resetSent: "If that email has an account, a reset link is on its way.",
    twoFactorTitle: "Two-step sign-in", twoFactorSub: "Enter the 6-digit code from your authenticator app.", useRecovery: "Use a recovery code instead",
    passwordHint: "At least 10 characters. A short sentence works well.", consentMarketing: "Send me tips and product news from OENOD. I can unsubscribe at any time.",
    terms: "By continuing you agree to the Terms and Privacy Policy.", locked: "For your safety, sign-in is paused for a few minutes.",
  },
  security: {
    title: "Security", twoFactor: "Two-step sign-in", twoFactorOn: "On", twoFactorOff: "Off", turnOn: "Turn on", turnOff: "Turn off",
    scanQr: "Scan this QR code with Google Authenticator, Microsoft Authenticator or 1Password, then enter the 6-digit code.",
    recoveryCodes: "Recovery codes", recoveryHelp: "Keep these somewhere safe. Each one works once if you lose your phone.",
    devices: "Signed-in devices", thisDevice: "This device", signOutDevice: "Sign out", signOutOthers: "Sign out all other devices",
    changePassword: "Change password", activity: "Recent activity", score: "Security score", recommendations: "Recommendations",
    require2fa: "Require two-step sign-in for everyone", ipAllowlist: "Allowed networks", sessionLength: "Stay signed in for (days)",
  },
  me: { shifts: "Shifts", clock: "Clock", assistant: "Assistant", upcoming: "Upcoming", swap: "Swap or give away", keepShift: "Keep this shift", swapAsked: "Swap requested", hoursWorked: "Hours worked", scheduled: "Scheduled", onTheClock: "On the clock",
    greetingMorning: "Good morning", greetingAfternoon: "Good afternoon", greetingEvening: "Good evening",
    clockIn: "Clock in", clockOut: "Clock out", startBreak: "Start break", endBreak: "End break", onBreak: "On break", clockedIn: "Clocked in", clockedOut: "Not clocked in",
    outsideZone: "You're outside the work area. Move closer to clock in.", nextShift: "Next shift", noShift: "No shifts coming up",
    mySchedule: "My schedule", myPay: "My pay", payslips: "Payslips", hours: "Hours", timesheet: "Timesheet", leave: "Time off", requestLeave: "Request time off",
    training: "Training", certificates: "Certificates", myTasks: "My tasks", openShifts: "Open shifts", pickUp: "Pick up", announcements: "Announcements",
    documents: "My documents", profile: "My profile", jobs: "Jobs", inventory: "Inventory", marketing: "Marketing",
  },
  welcome: {
    title: "Here's your day", tip: "Tip", quickActions: "Quick actions", aiSuggests: "AI suggests", weather: "Weather", nearYou: "Near you",
    setupTitle: "Let's set up your business", setupSub: "A few steps and OENOD is ready for your team.",
  },
  status: {
    active: "Active", inactive: "Inactive", draft: "Draft", pending: "Pending", approved: "Approved", rejected: "Rejected", paid: "Paid", overdue: "Overdue",
    open: "Open", closed: "Closed", inProgress: "In progress", done: "Done", cancelled: "Cancelled", scheduled: "Scheduled", live: "Live", paused: "Paused",
    onTrack: "On track", atRisk: "At risk", offTrack: "Off track",
  },
  maintenance: {
    title: "We'll be right back", message: "OENOD is getting an upgrade. Everything will be back shortly.", backAround: "Expected back around {time}",
    readOnly: "OENOD is in view-only mode for a short upgrade. You can look around, but changes are paused.",
    updateTitle: "Update required", updateMessage: "A new version of OENOD is ready. Please update to keep going.", updateNow: "Update now",
    moduleMaintenance: "This area is under maintenance. Please check back soon.",
  },
  errors: {
    generic: "Something went wrong. Please try again.", network: "You're offline. We'll retry when you're back online.", notFound: "We couldn't find that page.",
    forbidden: "You don't have access to this area. Ask your manager to give you access.", signInAgain: "Please sign in again.", tooMany: "Too many attempts. Please wait a moment.",
  },
  jobs: {
    title: "Find your next job", search: "Job title, skill or company", location: "City or postcode", remote: "Remote", apply: "Apply now", applied: "Application sent",
    noAccount: "No account needed to apply", saveJob: "Save job", alert: "Email me jobs like this", posted: "Posted {when}", salary: "Pay",
  },
  academy: {
    title: "OENOD Academy", sub: "Practical courses for business owners and teams", enroll: "Start course", continue: "Continue", buy: "Buy course", pass: "Academy Pass",
    passSub: "Every paid course, one price", lessons: "{count} lessons", hours: "{count} hours", certificate: "Certificate included", preview: "Free preview",
    completed: "Completed", verifyCertificate: "Verify a certificate", certificateId: "Certificate ID",
  },
  directory: {
    title: "Discover local businesses", follow: "Follow", following: "Following", contact: "Contact", website: "Website", directions: "Directions",
    hours: "Hours", services: "Services", reviews: "Reviews", about: "About", verifiedBusiness: "Verified business",
  },
  ads: {
    sponsored: "Sponsored", whyThisAd: "Why am I seeing this?", hide: "Hide ad", manager: "Ads manager", newCampaign: "New ad", budget: "Budget", wallet: "Ad wallet",
  },
  email: {
    footer: "You are receiving this because you have an account or agreed to hear from {brand}.", unsubscribe: "Unsubscribe", sentWith: "Sent with OENOD",
  },
  ai: { hello: "How can I help, {name}?", sub: "Ask about your shifts, hours, pay or time off.", approvalNote: "Changes to pay, people or money always wait for a manager.",
    placeholder: "Ask anything about your business…", thinking: "Thinking…", waitingApproval: "Waiting for your approval", done: "Done", blocked: "Not allowed by your rules",
    emergencyStop: "Emergency stop", simulation: "Simulation mode",
  },
};

export default en;
export type Dict = typeof en;
