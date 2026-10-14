import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { subscribeToRequests, updateRequest } from "../../api/request-activity.js";

export default function RequestActivity() {
  const [request, setRequest] = useState(null);
  useEffect(() => subscribeToRequests(setRequest), []);
  useEffect(() => {
    if (!request?.id || request.done) return;
    const poll = async () => {
      try { const response = await fetch(`/api/progress/${request.id}`); if (response.ok) updateRequest(request.id, await response.json()); } catch { /* The original request reports connection errors. */ }
    };
    poll();
    const timer = setInterval(poll, 500);
    return () => clearInterval(timer);
  }, [request?.id, request?.done]);
  if (!request) return null;
  return <div className="fixed left-1/2 top-4 z-[1000] w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-[#ffd0b8] bg-white p-4 text-xs text-[#42516b] shadow-[0_18px_55px_#19223830]" role="status" aria-live="polite"><div className="flex items-center gap-2 font-bold text-navy"><LoaderCircle size={16} className={request.done ? "text-[#15945e]" : "animate-spin text-orange"}/><span>{request.done ? "Request completed" : request.label}</span></div><ol className="mt-3 max-h-48 space-y-2 overflow-y-auto">{request.stages.map((stage,index)=><li key={`${stage.at || index}-${stage.label}`} className="flex gap-2 text-[11px]"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${index===request.stages.length-1&&!request.done?"animate-pulse bg-orange":"bg-[#20a66a]"}`}/><span>{stage.label}</span></li>)}</ol></div>;
}
