"use client";

import Link from "next/link";
import { useState } from "react";
import { LocationLabel } from "@/components/LocationLabel";

export interface EventLocationStatus {
  id: string;
  name: string;
  yellow_dog_code: string | null;
  status: "not_started" | "opening_only" | "complete";
}

export interface EventRow {
  id: string;
  name: string;
  event_date: string;
  status: string;
  tot_tickets: number | null;
  standsOpened: number;
  pctCompletion: number;
  locations: EventLocationStatus[];
}

const STATUS_LABEL: Record<EventLocationStatus["status"], string> = {
  not_started: "Not started",
  opening_only: "Opening submitted — closing pending",
  complete: "Closing submitted",
};

const STATUS_COLOR: Record<EventLocationStatus["status"], string> = {
  not_started: "text-gray-400",
  opening_only: "text-amber-600",
  complete: "text-green-600",
};

export function EventsAccordion({ title, rows, isManager }: { title: string; rows: EventRow[]; isManager?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(rows[0]?.id ?? null);

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">{title}</h1>
      {!rows.length ? (
        <p className="text-sm text-gray-500">No upcoming or open events found.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const isOpen = openId === r.id;
            return (
              <div key={r.id} className="overflow-hidden rounded-md border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : r.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left"
                >
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-gray-500">
                      {r.event_date} · <span className="uppercase">{r.status}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span>{r.standsOpened} stand{r.standsOpened === 1 ? "" : "s"} opened</span>
                    <span>{r.standsOpened ? `${r.pctCompletion}% complete` : "—"}</span>
                    <span>{r.tot_tickets ?? "—"} attendance</span>
                    <span className="text-gray-400">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100">
                    {isManager && r.locations.length > 0 && (
                      <div className="flex justify-end px-4 pt-3">
                        <Link
                          href={`/api/count-sheet/pdf/all?event=${r.id}`}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                        >
                          Download All Count Sheets
                        </Link>
                      </div>
                    )}
                    {!r.locations.length ? (
                      <p className="px-4 py-4 text-sm text-gray-500">No locations opened yet.</p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {r.locations.map((loc) => (
                          <li key={loc.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <p className="text-sm font-medium">
                                <LocationLabel location={loc} />
                              </p>
                              <p className={`text-xs ${STATUS_COLOR[loc.status]}`}>{STATUS_LABEL[loc.status]}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/api/count-sheet/pdf?event=${r.id}&location=${loc.id}`}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                              >
                                Download PDF
                              </Link>
                              <Link
                                href={`/count?event=${r.id}&location=${loc.id}`}
                                className="rounded-md bg-brand px-3 py-1.5 text-sm text-white"
                              >
                                Open count
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
