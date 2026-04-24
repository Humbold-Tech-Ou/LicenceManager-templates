import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { LicenseEvent } from "@/types/tenant";
import { getEventConfig } from "@/lib/events";

export default function EventTimeline({ events, limit = 25 }: { events: LicenseEvent[]; limit?: number }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? events : events.slice(0, limit);
  const hasMore = !showAll && events.length > limit;

  if (events.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sin eventos registrados</p>;
  }

  return (
    <div className="space-y-4">
      {shown.map((ev) => {
        const config = getEventConfig(ev.event_type);
        const meta = ev.metadata as Record<string, unknown> | null;
        return (
          <div key={ev.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${config.dotColor}`} />
              <div className="flex-1 w-px bg-border" />
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium text-foreground">{config.label}</p>
              {meta && Object.keys(meta).length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(ev.created_at!), { addSuffix: true, locale: es })}
              </p>
            </div>
          </div>
        );
      })}
      {hasMore && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-1 w-full text-center text-xs text-primary hover:underline"
        >
          Ver todos ({events.length} eventos)
        </button>
      )}
    </div>
  );
}
