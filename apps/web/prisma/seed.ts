/* OENOD seed: plans, platform switches, growth emails, the OENOD Academy library,
   your super admin, and (optionally) a realistic demo company to explore.

   pnpm db:seed
   Env: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (a strong one is generated if missing),
        SEED_DEMO=false to skip the demo company. Safe to run more than once. */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { DEFAULT_PLANS } from "../src/lib/billing";
import { DEFAULT_AUTOMATIONS } from "../src/lib/growth";
import { SURFACES } from "../src/lib/platform";
import { createWorkspace } from "../src/lib/setup";
import { DEFAULT_STAGES } from "../src/lib/projects";
import { LIBRARY_1 } from "./academy/library-1";
import { LIBRARY_2 } from "./academy/library-2";
import { LIBRARY_3 } from "./academy/library-3";

const day = 864e5;
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
const at = (daysFromToday: number, hour: number, min = 0) => { const d = new Date(); d.setHours(hour, min, 0, 0); return new Date(d.getTime() + daysFromToday * day); };

async function plans() {
  for (const p of DEFAULT_PLANS) await db.plan.upsert({ where: { key: p.key }, create: p, update: { name: p.name, tagline: p.tagline, modules: p.modules, features: p.features, seats: p.seats, aiCredits: p.aiCredits, sortOrder: p.sortOrder } });
  console.log(`✓ ${DEFAULT_PLANS.length} plans`);
}

async function platform() {
  for (const s of SURFACES) await db.platformControl.upsert({ where: { surface: s.key }, create: { surface: s.key }, update: {} });
  for (const a of DEFAULT_AUTOMATIONS) await db.growthAutomation.upsert({ where: { key: a.key }, create: a, update: {} });
  console.log(`✓ ${SURFACES.length} platform switches (all live), ${DEFAULT_AUTOMATIONS.length} growth emails`);
}

async function academy() {
  const all = [...LIBRARY_1, ...LIBRARY_2, ...LIBRARY_3];
  for (const c of all) {
    const { lessons, ...course } = c;
    const data = { ...course, orgId: null, instructorName: "OENOD Academy", durationMin: lessons.reduce((s, l) => s + l.durationMin, 0), isPublic: true, published: true };
    const row = await db.course.upsert({ where: { slug: c.slug }, create: data, update: data });
    await db.lesson.deleteMany({ where: { courseId: row.id } });
    await db.lesson.createMany({ data: lessons.map((l, i) => ({ courseId: row.id, order: i + 1, title: l.title, content: l.content, durationMin: l.durationMin, isPreview: !!l.isPreview || i === 0, quiz: l.quiz ?? undefined })) });
  }
  const free = all.filter((c) => c.priceCents === 0).length;
  console.log(`✓ ${all.length} OENOD Academy courses (${free} free, ${Math.round((free / all.length) * 100)}%)`);
}

async function superAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@oenod.local").toLowerCase();
  const given = process.env.SEED_ADMIN_PASSWORD;
  const password = given || randomBytes(12).toString("base64url");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { isSuperAdmin: true } });
    console.log(`✓ Super admin: ${email} (already existed, password unchanged)`);
    return existing;
  }
  const u = await db.user.create({ data: { email, name: "OENOD Admin", passwordHash: await bcrypt.hash(password, 12), isSuperAdmin: true, emailVerifiedAt: new Date(), passwordChangedAt: new Date() } });
  console.log(`✓ Super admin: ${email}${given ? "" : `  password: ${password}  (shown once, change it after signing in and turn on two-step sign-in)`}`);
  return u;
}

async function demo() {
  const email = "owner@demo.oenod.local";
  if (await db.user.findUnique({ where: { email } })) return console.log("✓ Demo company already exists");
  const password = process.env.SEED_DEMO_PASSWORD || randomBytes(9).toString("base64url");
  const owner = await db.user.create({ data: { email, name: "Sara Haddad", passwordHash: await bcrypt.hash(password, 12), emailVerifiedAt: new Date() } });
  const org = await createWorkspace(owner, { company: "Maple & Co. Café", industry: "restaurant", country: "CA", region: "ON", phone: "+1 416 555 0142", planKey: "GROWTH" });
  const orgId = org.id;
  await db.organization.update({ where: { id: orgId }, data: {
    tagline: "Neighbourhood café and bakery since 2016", about: "Fresh pastries baked every morning, specialty coffee and catering for offices across downtown Toronto.",
    website: "https://example.com", email: "hello@example.com", lat: 43.6487, lng: -79.3817, foundedYear: 2016, teamSize: "11-50",
    address: { line1: "120 King St W", city: "Toronto", region: "ON", postal: "M5H 1J9", country: "CA" },
    hours: { mon: "7:00-18:00", tue: "7:00-18:00", wed: "7:00-18:00", thu: "7:00-19:00", fri: "7:00-19:00", sat: "8:00-17:00", sun: "9:00-15:00" },
  } });
  const main = await db.location.findFirstOrThrow({ where: { orgId } });
  await db.location.update({ where: { id: main.id }, data: { name: "King St (Downtown)", address: "120 King St W, Toronto", lat: 43.6487, lng: -79.3817, radiusM: 120 } });
  const second = await db.location.create({ data: { orgId, name: "Queen West", address: "780 Queen St W, Toronto", lat: 43.6455, lng: -79.4111, radiusM: 120 } });

  const people = [
    ["Daniel", "Okafor", "Store Manager", "SALARY", 62000, "MANAGER"], ["Mei", "Chen", "Head Barista", "HOURLY", 21.5], ["Lucas", "Martin", "Barista", "HOURLY", 18.25],
    ["Aisha", "Rahman", "Barista", "HOURLY", 18.25], ["Gurpreet", "Sandhu", "Baker", "HOURLY", 23], ["Sofia", "Rossi", "Pastry Chef", "HOURLY", 25],
    ["Noah", "Tremblay", "Delivery Driver", "HOURLY", 19.5], ["Maria", "Santos", "Cashier", "HOURLY", 17.6], ["Omar", "Farouk", "Catering Lead", "HOURLY", 22],
  ] as const;
  const emps = [];
  for (const [i, p] of people.entries()) {
    emps.push(await db.employee.create({ data: { orgId, firstName: p[0], lastName: p[1], jobTitle: p[2], payType: p[3], payRate: p[4], email: `${p[0].toLowerCase()}@demo.oenod.local`, phone: `+1 416 555 01${10 + i}`, locationId: i % 3 === 2 ? second.id : main.id, region: "ON", startDate: new Date(Date.now() - (60 + i * 90) * day), createdAt: new Date(Date.now() - (60 + i * 90) * day), kioskPin: String(1000 + i * 111), employmentType: i > 6 ? "PART_TIME" : "FULL_TIME" } }));
  }
  for (const e of emps) await db.leaveBalance.createMany({ data: [{ employeeId: e.id, type: "VACATION", hours: 80 }, { employeeId: e.id, type: "SICK", hours: 24 }] });
  // Lucas gets a sign-in so the employee mobile app can be tried with the demo company.
  const lucas = emps[2];
  const lucasUser = await db.user.create({ data: { email: "lucas@demo.oenod.local", name: "Lucas Martin", passwordHash: await bcrypt.hash(password, 12), emailVerifiedAt: new Date() } });
  const lucasMember = await db.membership.create({ data: { userId: lucasUser.id, orgId, role: "EMPLOYEE", title: "Barista" } });
  await db.employee.update({ where: { id: lucas.id }, data: { membershipId: lucasMember.id } });

  // This week's schedule, last two weeks of time entries
  const roles = ["Barista", "Cashier", "Baker", "Barista"];
  for (let d = -14; d <= 6; d++) for (const [i, e] of emps.slice(1).entries()) {
    if ((i + d + 14) % 7 >= 5) continue;
    const startH = e.jobTitle?.includes("Baker") || e.jobTitle?.includes("Pastry") ? 5 : 7 + (i % 3) * 2;
    const shift = await db.shift.create({ data: { orgId, employeeId: e.id, locationId: e.locationId, role: e.jobTitle ?? pick(roles), start: at(d, startH), end: at(d, startH + 8), breakMinutes: 30, status: "PUBLISHED" } });
    if (d < 0) await db.timeEntry.create({ data: { orgId, employeeId: e.id, shiftId: shift.id, clockIn: at(d, startH, Math.floor(rand() * 8)), clockOut: at(d, startH + 8, Math.floor(rand() * 12)), breakMinutes: 30, source: pick(["MOBILE", "KIOSK", "MOBILE"]), onSite: true, status: d < -7 ? "APPROVED" : "SUBMITTED" } });
  }
  await db.shift.createMany({ data: [1, 3].map((d) => ({ orgId, locationId: second.id, role: "Barista", start: at(d, 11), end: at(d, 17), status: "OPEN", notes: "Extra cover for the lunch rush" })) });
  await db.timeEntry.create({ data: { orgId, employeeId: emps[1].id, clockIn: at(0, 7, 2), source: "MOBILE", onSite: true, inLat: 43.6488, inLng: -79.3815 } });
  await db.leaveRequest.create({ data: { orgId, employeeId: emps[3].id, type: "VACATION", startDate: at(10, 0), endDate: at(12, 0), hours: 24, reason: "Family wedding in Ottawa" } });

  // Catalog and stock
  const supplier = await db.supplier.create({ data: { orgId, name: "Lakeshore Coffee Roasters", email: "orders@example.com", leadTimeDays: 2 } });
  const flour = await db.supplier.create({ data: { orgId, name: "Ontario Mills", email: "sales@example.com", leadTimeDays: 3 } });
  const catalog: [string, string, number, number, number, string?][] = [
    ["Latte", "Coffee", 5.25, 1.1, 0], ["Cappuccino", "Coffee", 4.95, 1.0, 0], ["Americano", "Coffee", 3.75, 0.6, 0], ["Cold brew", "Coffee", 5.5, 0.9, 0],
    ["Butter croissant", "Bakery", 3.95, 0.9, 24], ["Almond croissant", "Bakery", 4.75, 1.3, 18], ["Sourdough loaf", "Bakery", 8.5, 2.1, 10], ["Cinnamon bun", "Bakery", 4.25, 0.8, 20],
    ["Turkey avocado sandwich", "Kitchen", 11.5, 4.2, 12], ["Espresso beans 1kg", "Supplies", 0, 28, 6, "beans"], ["Organic flour 20kg", "Supplies", 0, 31, 3, "flour"], ["Office catering platter", "Catering", 145, 52, 0],
  ];
  const products = [];
  for (const [name, category, price, cost, reorder, sup] of catalog) {
    const supply = category === "Supplies";
    const p = await db.product.create({ data: { orgId, name, category, price, cost, type: supply ? "INGREDIENT" : category === "Catering" ? "SERVICE" : "PRODUCT", trackStock: reorder > 0, reorderPoint: reorder, reorderQty: reorder * 2, supplierId: sup === "beans" ? supplier.id : sup === "flour" ? flour.id : null, taxable: category !== "Bakery" } });
    if (reorder > 0) await db.stockLevel.create({ data: { productId: p.id, locationId: main.id, quantity: name.includes("flour") ? 2 : reorder + Math.floor(rand() * reorder * 2) } });
    products.push(p);
  }

  // 30 days of sales
  const sellable = products.filter((p) => Number(p.price) > 0 && p.category !== "Catering");
  let n = 1000;
  for (let d = -30; d <= 0; d++) {
    const count = 25 + Math.floor(rand() * 20) + (new Date(Date.now() + d * day).getDay() % 6 === 0 ? 15 : 0);
    for (let k = 0; k < count; k++) {
      const items = Array.from({ length: 1 + Math.floor(rand() * 3) }, () => ({ p: pick(sellable), q: 1 + Math.floor(rand() * 2) }));
      const subtotal = Math.round(items.reduce((s, i) => s + Number(i.p.price) * i.q, 0) * 100) / 100;
      const tax = Math.round(items.reduce((s, i) => s + (i.p.taxable ? Number(i.p.price) * i.q * 0.13 : 0), 0) * 100) / 100;
      const tip = rand() < 0.4 ? Math.round(subtotal * 0.12 * 100) / 100 : 0;
      await db.order.create({ data: { orgId, locationId: rand() < 0.65 ? main.id : second.id, employeeId: pick(emps.slice(1, 4)).id, number: `S-${n++}`, subtotal, tax, tip, total: subtotal + tax + tip, paymentMethod: pick(["CARD", "CARD", "TAP", "CASH"]), createdAt: at(d, 7 + Math.floor(rand() * 10), Math.floor(rand() * 60)), items: { create: items.map((i) => ({ productId: i.p.id, name: i.p.name, quantity: i.q, price: i.p.price })) } } });
    }
  }

  // Customers, pipeline, invoices
  const companies = ["Northbridge Law", "Harbourfront Dental", "Pixelworks Studio", "Union Station Offices", "Maple Leaf Realty", "Bay Street Capital"];
  const contacts = [];
  for (const [i, c] of companies.entries()) {
    contacts.push(await db.contact.create({ data: { orgId, type: i < 4 ? "CUSTOMER" : "LEAD", firstName: pick(["Emma", "Liam", "Olivia", "Ethan", "Zara", "Ravi"]), lastName: pick(["Brown", "Singh", "Nguyen", "Wilson", "Lee", "Patel"]), company: c, email: `office${i}@example.com`, phone: `+1 647 555 02${10 + i}`, source: pick(["Website", "Referral", "Google"]), score: 40 + i * 9, emailConsent: true, consentAt: new Date(), consentSource: "Catering order form" } }));
  }
  const stages = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"];
  for (const [i, c] of contacts.entries()) await db.deal.create({ data: { orgId, contactId: c.id, title: `${c.company}: weekly office catering`, value: 1200 + i * 650, stage: stages[i % 5], probability: [10, 30, 55, 75, 100][i % 5], expectedClose: at(7 + i * 5, 12) } });
  for (const [i, c] of contacts.slice(0, 4).entries()) {
    const qty = 2 + i, sub = qty * 145, tax = Math.round(sub * 0.13 * 100) / 100;
    const overdue = i < 2;
    await db.invoice.create({ data: { orgId, contactId: c.id, number: `INV-${1001 + i}`, status: i === 3 ? "PAID" : overdue ? "OVERDUE" : "SENT", issueDate: at(overdue ? -35 : -5, 9), dueDate: at(overdue ? -12 + i * 4 : 9, 9), items: [{ name: "Office catering platter", qty, price: 145 }], subtotal: sub, tax, total: sub + tax, amountPaid: i === 3 ? sub + tax : 0, currency: "CAD" } });
  }

  // Reviews
  const reviewTexts: [number, string][] = [[5, "Best almond croissant in the city and the staff remember my order."], [5, "Catering for our board meeting was perfect and on time."], [4, "Great coffee, a bit busy at lunch."], [3, "Latte was lovely but I waited 15 minutes."], [5, "Cozy spot, friendly team, amazing sourdough."]];
  for (const [i, [rating, text]] of reviewTexts.entries()) await db.review.create({ data: { orgId, author: pick(["Jordan P.", "Amira K.", "Chris L.", "Fatima S.", "Ben W."]), rating, text, postedAt: at(-i * 3 - 1, 14) } });

  // Fleet: delivery van and catering truck on the live map
  await db.vehicle.createMany({ data: [
    { orgId, name: "Delivery Van 1", plate: "CFTR 214", make: "Ford", model: "Transit Connect", year: 2023, kind: "VAN", driverId: emps[6].id, deviceId: "demo-van-1", status: "MOVING", lastLat: 43.6532, lastLng: -79.3832, lastSpeedKmh: 42, lastHeading: 90, lastSeenAt: new Date(), speedLimitKmh: 60, odometerKm: 18240, nextServiceKm: 20000 },
    { orgId, name: "Catering Truck", plate: "BXRK 980", make: "Mercedes", model: "Sprinter", year: 2022, kind: "TRUCK", driverId: emps[8].id, deviceId: "demo-truck-1", status: "STOPPED", lastLat: 43.6455, lastLng: -79.4111, lastSpeedKmh: 0, lastSeenAt: new Date(Date.now() - 12 * 60e3), stoppedSince: new Date(Date.now() - 12 * 60e3), speedLimitKmh: 60, odometerKm: 40110, nextServiceKm: 40500 },
  ] });

  // A project with a board
  const project = await db.project.create({ data: { orgId, code: "PRJ-01001", name: "Open the Liberty Village location", description: "Lease, fit-out, hiring and launch of our third café.", managerId: emps[0].id, status: "ACTIVE", priority: "HIGH", budget: 180000, spent: 64200, startDate: at(-40, 9), dueDate: at(75, 9), color: "#000F55", tags: ["expansion"], createdById: owner.id } });
  await db.projectStage.createMany({ data: DEFAULT_STAGES.map((s, i) => ({ projectId: project.id, name: s.name, color: s.color, isDone: s.isDone, order: i })) });
  const cols = await db.projectStage.findMany({ where: { projectId: project.id }, orderBy: { order: "asc" } });
  await db.projectMember.createMany({ data: [{ projectId: project.id, employeeId: emps[0].id, role: "LEAD" }, { projectId: project.id, employeeId: emps[5].id }, { projectId: project.id, employeeId: emps[8].id }] });
  const tasks: [string, number, number, number][] = [["Sign the lease", 3, -30, 0], ["Hire contractor for fit-out", 3, -20, 0], ["Order espresso machine", 1, 5, 0], ["Health inspection booking", 0, 20, 5], ["Post 6 job openings", 1, 2, 8], ["Menu and pricing for new location", 2, 10, 5], ["Signage approval from city", 0, -3, 0], ["Launch day marketing plan", 0, 50, 8]];
  for (const [i, [title, col, due, who]] of tasks.entries()) {
    const status = ["TODO", "DOING", "REVIEW", "DONE"][col];
    await db.task.create({ data: { orgId, projectId: project.id, stageId: cols[col].id, number: i + 1, title, status: title.startsWith("Signage") ? "BLOCKED" : status, priority: i % 3 === 0 ? "HIGH" : "NORMAL", assigneeId: emps[who].id, dueDate: at(due, 17), order: i, completedAt: col === 3 ? at(due, 17) : null } });
  }
  await db.milestone.createMany({ data: [{ projectId: project.id, name: "Fit-out complete", dueDate: at(45, 9) }, { projectId: project.id, name: "Grand opening", dueDate: at(75, 9) }] });

  // Public jobs (no account needed to apply)
  const jobs: [string, string, number, number, string][] = [["Barista (Full-time)", "Hospitality", 18, 21, "HOUR"], ["Pastry Chef", "Culinary", 52000, 60000, "YEAR"], ["Café Supervisor, Liberty Village", "Hospitality", 48000, 54000, "YEAR"]];
  for (const [title, category, min, max, period] of jobs) await db.jobPosting.create({ data: { orgId, title, slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomBytes(2).toString("hex")}`, category, city: "Toronto", salaryMin: min, salaryMax: max, salaryPeriod: period, description: `Join Maple & Co. Café, a busy neighbourhood café and bakery in downtown Toronto. We're hiring a ${title.split(" (")[0].toLowerCase()} who loves people and great food.\n\nWhat you'll do:\n- Deliver warm, fast service\n- Keep quality and food-safety standards high\n- Work as part of a supportive team`, requirements: "Food Handler certificate (or willing to get one)\nWeekend availability", benefits: "Staff meals and coffee\nTips shared fairly\nPaid training through OENOD Academy", featured: title.includes("Supervisor") } });

  console.log(`✓ Demo company "Maple & Co. Café": sign in as ${email} (employee app: lucas@demo.oenod.local)  password: ${password}`);
}

async function main() {
  await plans();
  await platform();
  await academy();
  await superAdmin();
  if (process.env.SEED_DEMO !== "false") await demo();
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
