"use client";

import Link from "next/link";
import { useState } from "react";
import { LocationLabel } from "@/components/LocationLabel";

export interface CompletedCountRecord {
  id: string;
  locationName: string;
  yellowDogCode: string | null;
  type: "opening" | "closing";
  submittedAt: string;
  postedByName: string;
  thresholdFlag: boolean;
}

export interface CompletedEventRow {
  id: string;
  name: string;
  event_date: string;
  records: CompletedCountRecord[];
}

export function CompletedCountsAccordion({ rows }: { rows: CompletedEventRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold">Completed Counts</h2>
      {!rows.length ? (
        <p className="text-sm text-gray-500">No fully completed events yet.</p>
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
                    <p className="text-xs text-gray-500">{r.event_date}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span>{r.records.length} count{r.records.length === 1 ? "" : "s"} submitted</span>
                    <span className="text-gray-400">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto border-t border-gray-100">
                    <table className="w-full whitespace-nowrap text-left text-sm">
                      <thead className="text-gray-500">
                        <tr>
                          <th className="px-4 py-2">Location</th>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2">Post Date</th>
                          <th className="px-4 py-2">Post By</th>
                          <th className="px-4 py-2">Threshold Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.records.map((rec) => (
                          <tr key={rec.id} className="border-t border-gray-100">
                            <td className="px-4 py-2">
                              <Link href={`/count/history/${rec.id}`} className="text-brand hover:underline">
                                <LocationLabel location={{ name: rec.locationName, yellow_dog_code: rec.yellowDogCode }} />
                              </Link>
                            </td>
                            <td className="px-4 py-2 capitalize text-gray-500">{rec.type}</td>
                            <td className="px-4 py-2 text-gray-500">
                              {new Date(rec.submittedAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="px-4 py-2 text-gray-500">{rec.postedByName}</td>
                            <td className="px-4 py-2">
                              {rec.thresholdFlag ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                  Restock
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
