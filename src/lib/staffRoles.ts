// Canonical staffing role names, shared between the Location "base staffing
// needs" admin screen and the Event Details staffing table so role counts
// line up in fixed columns instead of free text that has to match exactly.
export const STAFF_ROLES = [
  "Bartender",
  "Server Buffet",
  "Server In-Seat",
  "Server Food",
  "Runner",
] as const;

// Abbreviated column headers for the Event Details staffing table, where
// horizontal space is tight — the full names above are still what's stored
// and shown on the Location "base staffing needs" admin screen.
export const STAFF_ROLE_SHORT_LABEL: Record<(typeof STAFF_ROLES)[number], string> = {
  Bartender: "Bar",
  "Server Buffet": "Buffet",
  "Server In-Seat": "In-Seat",
  "Server Food": "Food",
  Runner: "Runner",
};
