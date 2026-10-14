import { ArrowRight, ShieldCheck, Sparkles, X } from "lucide-react";

export default function WorkflowModal({ modal, busy, setModal, goal, setGoal, askAnswer, setAskAnswer, selectedWorkflow, setSelectedWorkflow, probe, setProbe, data, prompts, run }) {
  return (
    <>
      {modal && (
        <div
          className="modal-backdrop fixed [inset:0] bg-[#17271f66] [backdrop-filter:blur(5px)] z-[50] flex items-center justify-center p-5 !bg-[#111d3a66]"
          onClick={() => !busy && setModal(false)}
        >
          <section
            className="modal w-[590px] max-h-[90vh] overflow-auto p-[30px] bg-white border border-[#eef2e5] rounded-2xl shadow-[0_25px_100px_#152f2a25] [&_h2]:text-[26px] [&_h2]:tracking-[-1px] [&>p]:text-xs [&>p]:text-[#8f9b82] [&>p]:leading-loose [&>p]:mt-2.5 [&_textarea]:block [&_textarea]:mt-[9px] [&_textarea]:mx-0 [&_textarea]:mb-4 [&_textarea]:w-full [&_textarea]:min-h-[140px] [&_textarea]:resize-y [&_textarea]:bg-[#fafcf7] [&_textarea]:border [&_textarea]:border-[#e2e8d9] [&_textarea]:rounded-lg [&_textarea]:p-3.5 [&_textarea]:text-xs [&_textarea]:leading-loose [&_textarea]:text-[#526a43] phone:p-[22px] phone:[&_h2]:text-[23px] phone:[&_.workflow-tabs]:gap-1 !border-[#e9ecf3] !rounded-[18px] [&_h2]:!text-navy [&>p]:!text-[#75839c] [&_textarea]:!text-[#405675] [&_textarea]:!bg-[#fafbfe] [&_textarea]:!border-[#e4e9f2]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-top flex justify-between mb-5 [&_.sparkle-icon]:bg-[#edf4e2] [&_.sparkle-icon]:w-[45px] [&_.sparkle-icon]:h-[45px] [&_.sparkle-icon]:rounded-xl [&_.sparkle-icon]:!bg-[#fff0e2] [&_.sparkle-icon]:!text-orange">
              <span className="sparkle-icon inline-flex items-center justify-center text-[#759554] !text-orange">
                <Sparkles size={22} />
              </span>
              <button
                className="icon-button p-1 bg-[none] text-[#78847a] flex items-center justify-center"
                aria-label="Close dialog"
                disabled={busy}
                onClick={() => setModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="eyebrow text-caption tracking-[1.8px] font-650 text-[#929b8b] mb-[11px] !text-[#8892a5]">
              YOUR AI OPERATIONS TEAM
            </div>
            <h2 id="dialog-title">What needs to happen?</h2>
            <p>
              Give your team a goal. Keep control of the important decisions.
            </p>
            <div className="my-6 rounded-xl border border-[#e8ebf2] bg-[#f8f9fc] p-4">
              <span className="mb-3 block text-[10px] font-bold uppercase tracking-[1.3px] text-[#8792a7]">Try an activity</span>
              <div className="flex flex-wrap gap-2">
              {[
                ["enquiry", "Customer enquiry"],
                ["absence", "Staff disruption"],
                ["complaint", "Service recovery"],
                ["access", "Team onboarding"],
              ].map(([w, label]) => (
                <button
                  key={w}
                  disabled={busy}
                  className="rounded-full border border-[#e1e6ef] bg-white px-3 py-2 text-[10px] font-semibold text-[#66748e] transition hover:border-[#ffc9a8] hover:text-orange"
                  onClick={() => {
                    setGoal(prompts[w]);
                    setSelectedWorkflow(w);
                    setAskAnswer("");
                  }}
                >
                  {label}
                </button>
              ))}
              </div>
            </div>
            <label
              className="input-label text-2xs text-[#82926f] font-600 !text-[#536582]"
              htmlFor="goal"
            >
              Your request
            </label>
            <textarea
              id="goal"
              autoFocus
              value={goal}
              onChange={(e) => { setGoal(e.target.value); setAskAnswer(""); }}
              placeholder="Describe what you want OperIQ to handle…"
              disabled={busy}
            />
            {askAnswer && (
              <div className="mb-4 rounded-xl border border-[#dce9e1] bg-[#f3faf6] p-4 text-sm leading-6 text-[#244936]">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[1.2px] text-[#478262]">OperIQ answer</span>
                {askAnswer}
              </div>
            )}
            <div className="mode-note bg-[#f4f7ee] border border-[#e7eddc] p-3.5 flex items-start gap-2.5 rounded-[7px] text-2xs leading-loose text-[#94a082] [&_svg]:[flex-shrink:0] [&_svg]:mt-0.5 [&_svg]:text-[#89a16d] [&_strong]:block [&_strong]:text-tiny [&_strong]:text-[#687f50] [&_strong]:mb-1 !bg-[#fff8f1] !border-[#ffe5d0] !text-[#8d796d] [&_strong]:!text-[#a65429] [&_svg]:!text-orange">
              <ShieldCheck size={19} />
              <span>
                {data.integration.mode === "sandbox" ? (
                  <>
                    <strong>Sandbox rehearsal</strong>Runs a safe workflow using
                    the records currently in your workspace. No AI model or
                    ArmorIQ enforcement is claimed.
                  </>
                ) : (
                  <>
                    <strong>Live execution</strong>The model creates a plan and
                    permitted tools execute through ArmorIQ. Credentials and
                    registered MCP access are required.
                  </>
                )}
              </span>
            </div>
            <label className="probe-option flex items-center gap-2 text-2xs text-[#8b987d] my-[18px] mx-0 leading-loose [&_input]:[accent-color:#547740] !text-[#74829b] [&_input]:![accent-color:var(--orange)]">
              <input
                type="checkbox"
                checked={probe}
                disabled={data.integration.mode !== "live" || busy}
                onChange={(e) => setProbe(e.target.checked)}
              />
              Attempt an unplanned export to test real ArmorIQ enforcement
            </label>
            <button
              className="primary inline-flex items-center justify-center gap-2 bg-[var(--forest)] text-white border border-[var(--forest)] py-3 px-4 rounded-lg text-tiny font-500 whitespace-nowrap !bg-orange !border-orange !rounded-lg !text-xs !py-3 !px-4 !shadow-[0_3px_7px_#ff550b0b] [&:hover:not(:disabled)]:!shadow-[0_5px_15px_#ff550b25] run-button w-full p-3.5 [&_svg:last-child]:ml-[auto]"
              disabled={busy || goal.trim().length < 5}
              onClick={run}
            >
              {busy ? (
                <>
                  <span className="spinner w-[13px] h-[13px] [border:2px_solid_#ffffff50] [border-top-color:#fff] rounded-full [animation:spin_1s_linear_infinite]" />
                  Coordinating your workflow…
                </>
              ) : (
                <>
                  <Sparkles size={17} />
                  {selectedWorkflow === "auto" ? "Ask OperIQ" : "Run workflow"}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
