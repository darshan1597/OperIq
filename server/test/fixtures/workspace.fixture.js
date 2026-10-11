import { createWorkspace } from "../../utils/create-workspace.js";

export function workspaceFixture() {
  const workspace = createWorkspace({ businessName: "Test Studio", ownerName: "Test Owner" });
  const date = new Date().toISOString().slice(0, 10);
  workspace.customers.push({ id: "c1", name: "Test Customer" }, { id: "c2", name: "Second Customer" });
  workspace.staff.push(
    { id: "s1", name: "Qualified Staff", skills: ["Hair styling"], status: "Available" },
    { id: "s2", name: "Other Staff", skills: ["Hair styling"], status: "Available" },
    { id: "s3", name: "Unqualified Staff", skills: ["Massage"], status: "Available" },
  );
  workspace.appointments.push({
    id: "b1",
    customerId: "c1",
    staffId: "s1",
    service: "Hair styling",
    date,
    time: "09:00",
    duration: 60,
    status: "Confirmed",
  });
  return workspace;
}
