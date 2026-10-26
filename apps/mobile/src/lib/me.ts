// Shapes returned by GET /api/me.
export type Shift = { id: string; start: string; end: string; role: string | null; status: string; notes: string | null; breakMinutes: number; location: { name: string } | null };
export type Payslip = { id: string; payDate: string; periodStart: string; periodEnd: string; gross: number; net: number; deductions: Record<string, number> | null; regularHours: number; overtimeHours: number };
export type Leave = { id: string; type: string; startDate: string; endDate: string; status: string; reason: string | null; hours: string | number };
export type Me = {
  employee: { id: string; name: string; jobTitle: string | null; location?: string; shareLiveLocation: boolean; leaveBalances: { type: string; hours: string | number }[] } | null;
  shifts: Shift[];
  openShifts: Shift[];
  leave: Leave[];
  trainings: { id: string; status: string; dueDate: string | null; course: { title: string } }[];
  tasks: { id: string; title: string; dueDate: string | null; priority: string; status: string }[];
  announcements: { id: string; title: string; body: string; requireAck: boolean; acked: boolean; createdAt: string }[];
  payslips: Payslip[];
};
export type ClockState = { open: { id: string; clockIn: string; breakMinutes: number } | null; onBreak: boolean; hoursThisWeek: number };
