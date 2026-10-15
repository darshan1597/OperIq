import { useEffect, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { subscribeToRequests, updateRequest } from "../request-activity.js";
import { API_BASE_URL } from "../api.js";

export default function RequestActivity() {
    const [request, setRequest] = useState(null);
    const [dismissedRequestId, setDismissedRequestId] = useState(null);
    useEffect(() => subscribeToRequests(setRequest), []);
    useEffect(() => {
        if (!request?.id || request.done) return;
        const poll = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/progress/${request.id}`);
                if (response.ok) updateRequest(request.id, await response.json());
            } catch {}
        };
        poll();
        const timer = setInterval(poll, 500);
        return () => clearInterval(timer);
    }, [request?.id, request?.done]);
    if (!request || request.id === dismissedRequestId) return null;
    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed left-1/2 top-4 z-[1000] w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-[#ffd0b8] bg-white p-4 text-xs text-[#42516b] shadow-[0_18px_55px_#19223830]"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 font-bold text-[#101c35]">
                    <LoaderCircle
                        size={16}
                        className={request.done ? "text-[#15945e]" : "animate-spin text-orange"}
                    />
                    <span className="truncate">{request.done ? "Request completed" : request.label}</span>
                </div>
                <button
                    type="button"
                    onClick={() => setDismissedRequestId(request.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#e2e7ef] bg-[#f8f9fc] px-2.5 py-2 text-[10px] font-semibold text-[#586780]"
                    aria-label="Close progress panel; request continues in background"
                    title="Close panel; request continues in background"
                >
                    <X size={14} /> Close
                </button>
            </div>
            {!request.done && <p className="mt-2 text-[10px] text-[#7a879b]">You can close this panel. The request will continue in the background.</p>}
            <ol className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {request.stages.map((stage, index) => (
                    <li
                        key={`${stage.at || index}-${stage.label}`}
                        className="flex gap-2 text-[11px]"
                    >
                        <span
                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${index === request.stages.length - 1 && !request.done ? "animate-pulse bg-orange" : "bg-[#20a66a]"}`}
                        />
                        <span>{stage.label}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
}
