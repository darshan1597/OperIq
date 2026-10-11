import React from "react";
import { Search, ArrowRight } from "lucide-react";
export function SearchBox({ query, setQuery }) {
  return (
    <label className="search flex items-center gap-[7px] border border-border rounded-md py-2 px-2.5 text-[#9aa58f] [&_input]:w-[130px] [&_input]:bg-transparent [&_input]:[border:0] [&_input]:text-tiny [&_input]:text-[#516a43] phone:[&_input]:w-[75px] !border-[#e6eaf2] !bg-[#f8f9fc] !text-[#76839d] !rounded-lg [&_input]:!text-navy">
      <Search size={16} />
      <input
        aria-label="Search records"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </label>
  );
}

export function Empty({ icon: Icon, title, text, button, buttonText = "Start a workflow" }) {
  return (
    <div className="empty text-center py-[55px] px-5 [&_h3]:text-lg [&_h3]:tracking-[-.4px] [&_p]:text-xs [&_p]:text-[#97a08f] [&_p]:max-w-[400px] [&_p]:mt-3 [&_p]:mx-[auto] [&_p]:mb-[22px] [&_p]:leading-loose [&_h3]:!text-navy [&_p]:!text-[#76849e]">
      <span className="empty-icon h-[65px] w-[65px] bg-[#f1f5e9] text-[#8ba774] inline-grid place-items-center rounded-[20px] mb-5 !bg-[#fff0e2] !text-orange !rounded-[18px]">
        <Icon size={28} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {button && <button
          className="secondary inline-flex items-center justify-center gap-1.5 bg-white text-[#47613b] border border-[#dce5d7] rounded-md py-2.5 px-3.5 text-xs !text-[#cf440a] !border-[#ffd9c3] !rounded-lg !bg-[#fffaf6]"
          onClick={button}
        >
          {buttonText} <ArrowRight size={15} />
        </button>}
    </div>
  );
}
