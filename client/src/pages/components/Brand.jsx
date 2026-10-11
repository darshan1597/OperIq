export function LogoMark() {
  return (
    <span className="inline-flex h-[37px] w-[37px] shrink-0 items-center justify-center overflow-hidden rounded-[10px]" aria-hidden="true" >
      <img
        src="/brand/operiq-symbol.png"
        alt=""
        width="37"
        height="37"
        className="block h-full w-full object-contain"
      />
    </span>
  );
}

export function BrandWordmark() {
  return (
    <>
      <LogoMark />
      <span className="text-[#09152e]">
        oper<span className="text-[#ff550b]">iq</span>
      </span>
    </>
  );
}
