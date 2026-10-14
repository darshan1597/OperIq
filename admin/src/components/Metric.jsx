export default function Metric({ icon: Icon, label, value, accent }) {
  return (
    <article className="flex items-center gap-3.5 rounded-2xl border border-[#e3e7ee] bg-white p-[18px]">
      <span
        className={`grid h-10 w-10 place-items-center rounded-xl ${accent ? "bg-[#fff0e7] text-[#e5530c]" : "bg-[#eef2f8] text-[#536582]"}`}
      >
        <Icon size={19} />
      </span>
      <div>
        <small className="block text-[10px] font-bold text-[#78869c]">
          {label}
        </small>
        <strong className="mt-1 block text-2xl">{value}</strong>
      </div>
    </article>
  );
}
