/** Map a web link from a notification (e.g. /me/leave) to a screen in the app. */
export function linkToRoute(link: string) {
  if (link.startsWith('/me/leave')) return '/leave';
  if (link.startsWith('/me/pay')) return '/payslips';
  if (link.includes('shift') || link.includes('scheduling')) return '/shifts';
  if (link.includes('/time')) return '/clock';
  if (link.includes('/ai')) return '/ai';
  return '/notifications';
}
