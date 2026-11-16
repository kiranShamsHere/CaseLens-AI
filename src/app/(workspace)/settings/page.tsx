"use client";

import { Bell, Database, ShieldCheck, Wifi } from "lucide-react";
import { Badge, PageHeading, Panel, PanelTitle } from "@/components/ui";

export default function Settings() {
  return (
    <>
      <PageHeading
        eyebrow="Workspace preferences"
        title="Settings"
        description="Connectivity, appearance, and data availability for this device."
        action={<Badge tone="blue">Prototype</Badge>}
      />

      <div className="grid w-full grid-cols-1 gap-5">
        <Panel>
          <PanelTitle title="Connectivity" />
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:p-6">
            <Wifi size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-[#a47b33]" />
            <div className="min-w-0 flex-1 sm:max-w-4xl">
              <h3 className="text-sm font-semibold">Connection status</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#839089]">
                The workspace detects browser connectivity and sends queued review decisions after reconnection. Each decision remains marked unsynced until the API confirms receipt.
              </p>
            </div>
            <Badge tone="blue">Review queue enabled</Badge>
          </div>
        </Panel>

        <Panel>
          <PanelTitle title="Offline access" />
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:p-6">
            <Database size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-[#a47b33]" />
            <div className="min-w-0 flex-1 sm:max-w-4xl">
              <h3 className="text-sm font-semibold">Case summaries and evidence</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#839089]">
                Viewed case metadata and evidence excerpts may be stored on this device for up to 14 days. Original document files are never cached. Use only on a trusted, access-controlled device.
              </p>
            </div>
            <Badge tone="green">14-day local cache</Badge>
          </div>
        </Panel>

        <Panel>
          <PanelTitle title="Review preferences" />
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:p-6">
            <ShieldCheck size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-[#a47b33]" />
            <div className="min-w-0 flex-1 sm:max-w-4xl">
              <h3 className="text-sm font-semibold">Human review required</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#839089]">
                High-impact findings remain unverified until a case worker checks the source evidence.
              </p>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelTitle title="Notifications" />
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:p-6">
            <Bell size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-[#a47b33]" />
            <div className="min-w-0 flex-1 sm:max-w-4xl">
              <h3 className="text-sm font-semibold">Review reminders</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#839089]">
                Notifications will be available when the case service supports them.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
