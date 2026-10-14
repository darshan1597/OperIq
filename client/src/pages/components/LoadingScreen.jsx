import { LogoMark } from "./Brand.jsx";

export default function LoadingScreen({ error, onRetry, onLogout }) {
  return (
    <div className="loading min-h-screen flex items-center justify-center flex-col gap-5 [&_h2]:text-2xl [&_p]:text-[#71809b] [&_input]:p-3 [&_input]:w-[300px] [&_input]:border [&_input]:border-border [&_input]:rounded-md [&_button]:py-3 [&_button]:px-5 [&_button]:bg-[var(--forest)] [&_button]:text-white [&_button]:rounded-md">
      <LogoMark />
      <h2>Opening OperIQ</h2>
      <p>{error || "Preparing your workspace…"}</p>
      {error && (
        <>
          <button onClick={onRetry}>Retry connection</button>
          <button onClick={onLogout}>Sign out</button>
        </>
      )}
    </div>
  );
}
