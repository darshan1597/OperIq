const styles = {
  Completed: "bg-[#e9f7ef] text-[#15784b]",
  Held: "bg-[#fff0df] text-[#d4580e]",
  Blocked: "bg-[#fff0f1] text-[#b93f4a]",
  Failed: "bg-[#fff0f1] text-[#b93f4a]",
  "Unexpectedly allowed": "bg-[#fff0f1] text-[#b93f4a]",
  "Waiting for owner approval": "bg-[#eef2f8] text-[#60708a]",
};

export default function StatusBadge({ status, icon: Icon }) {
  return <span className={`inline-flex w-max items-center gap-1.5 rounded-full px-2.5 py-2 text-[9px] font-black uppercase ${styles[status] || "bg-[#edf6f0] text-[#16804d]"}`}>
    {Icon && <Icon size={14}/>} {status}
  </span>;
}
