import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api, messageFor } from "../api.js";
import AdminChat from "./AdminChat.jsx";

export default function AskOperIQPage() {
  const { load } = useOutletContext();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const ask = async (prompt = question) => {
    const value = prompt.trim();
    if (!value || busy) return;
    setMessages((current) => [...current, { role: "user", text: value }]);
    setQuestion("");
    setBusy(true);
    try {
      const response = (await api.post("/admin/ask", { question: value }, {
        progressLabel: "Planning the request and checking ArmorIQ policy…",
      })).data;
      setMessages((current) => [...current, {
        role: "assistant",
        text: response.answer,
        meta: `${response.action} · ${response.status}`,
        reason: response.reason,
        requestId: response.requestId,
        delegationId: response.delegationId,
      }]);
      await load(false);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", text: messageFor(error), error: true }]);
    } finally {
      setBusy(false);
    }
  };
  return <AdminChat question={question} setQuestion={setQuestion} messages={messages} busy={busy} ask={ask}/>;
}
