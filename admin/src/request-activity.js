const listeners = new Set();
const active = new Map();
const publish = () => { const latest = Array.from(active.values()).at(-1) || null; listeners.forEach((listener) => listener(latest)); };
export const beginRequest = (id, label) => { active.set(id, { id, label, stages: [{label:"Sending request to OperIQ"}], done:false }); publish(); };
export const finishRequest = (id) => { const request=active.get(id);if(request)active.set(id,{...request,done:true});publish();setTimeout(()=>{active.delete(id);publish();},3000); };
export const updateRequest = (id, progress) => { const request=active.get(id);if(!request)return;active.set(id,{...request,stages:progress.stages||request.stages,serverDone:progress.done});publish(); };
export const subscribeToRequests = (listener) => { listeners.add(listener); listener(Array.from(active.values()).at(-1) || null); return () => listeners.delete(listener); };
