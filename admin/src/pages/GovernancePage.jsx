import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import GovernanceTable from "../components/GovernanceTable.jsx";
import MetricsGrid from "../components/MetricsGrid.jsx";

export default function GovernancePage(){
  const {data}=useOutletContext();
  const [filter,setFilter]=useState("held"),[workspace,setWorkspace]=useState("all"),[agent,setAgent]=useState("all"),[tool,setTool]=useState("all");
  const all=data?.actions||[], agents=[...new Set(all.map((item)=>item.agent).filter(Boolean))].sort(), tools=[...new Set(all.map((item)=>item.action).filter(Boolean))].sort();
  const actions=useMemo(()=>all.filter((item)=>(filter==="all"||(filter==="allowed"&&item.status==="Completed")||(filter==="held"&&item.status==="Held")||(filter==="blocked"&&["Blocked","Unexpectedly allowed"].includes(item.status))||(filter==="failed"&&item.status==="Failed"))&&(workspace==="all"||item.workspaceId===workspace)&&(agent==="all"||item.agent===agent)&&(tool==="all"||item.action===tool)),[all,filter,workspace,agent,tool]);
  const choices=[[workspace,setWorkspace,"All workspaces",(data?.workspaces||[]).map((item)=>[item.workspaceId,item.businessName])],[agent,setAgent,"All agents",agents.map((item)=>[item,item])],[tool,setTool,"All tools",tools.map((item)=>[item,item.replaceAll("_"," ")])]];
  const controls=<div className="grid justify-items-end gap-2 max-md:mt-4 max-md:justify-items-start"><div className="flex gap-1 rounded-xl bg-[#f1f3f7] p-1">{[["held","Held"],["allowed","Allowed"],["blocked","Blocked"],["failed","Failed"],["all","All"]].map(([value,label])=><button key={value} className={`rounded-lg border-0 px-3 py-2 text-[10px] font-extrabold ${filter===value?"bg-white text-[#172641] shadow-sm":"bg-transparent text-[#69778d]"}`} onClick={()=>setFilter(value)}>{label}</button>)}</div><div className="flex flex-wrap justify-end gap-2 max-md:justify-start">{choices.map(([value,setValue,label,options])=><select key={label} value={value} onChange={(event)=>setValue(event.target.value)} className="max-w-48 rounded-lg border border-[#dfe4ec] bg-white px-2.5 py-2 text-[9px] font-bold text-[#52627a]"><option value="all">{label}</option>{options.map(([key,text])=><option key={key} value={key}>{text}</option>)}</select>)}</div></div>;
  return <><MetricsGrid data={data}/><GovernanceTable title="Governance history" actions={actions} data={data} controls={controls}/></>;
}
