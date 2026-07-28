import { autoClockIn, enforceMissedLunchClockOut } from "@/lib/shifts";
import type { Role } from "@prisma/client";

/** Call on authenticated cafe page loads — auto-open shift + enforce lunch clock-out. */
export async function syncShiftPresence(opts: {
  cafeId: number;
  userId: number;
  role: Role;
}) {
  await enforceMissedLunchClockOut(opts.cafeId);
  await autoClockIn(opts);
}
