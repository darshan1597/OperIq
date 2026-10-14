import mongoose from "mongoose";
import connectDb from "../config/db.js";
import { findPublishedWorkspaceRecordBySlug, mutate } from "../services/store.service.js";

const slug = process.argv[2] || "evergreen-studio";

try {
  await connectDb();
  const record = await findPublishedWorkspaceRecordBySlug(slug);
  if (!record) throw new Error(`Published workspace '${slug}' was not found`);

  const seeded = await mutate(record.workspaceId, (state) => {
    state.customers ||= [];
    state.staff ||= [];
    state.appointments ||= [];
    state.tasks ||= [];
    state.complaints ||= [];

    const addMissing = (collection, rows) => {
      const ids = new Set(collection.map((item) => item.id));
      for (const row of rows) if (!ids.has(row.id)) collection.push(row);
    };

    addMissing(state.customers, [
      { id: "demo-customer-ananya", name: "Ananya Kapoor", email: "ananya.demo@example.com", service: "Classic Haircut", visits: 4, status: "Active", initials: "AK", color: "mint" },
      { id: "demo-customer-rohan", name: "Rohan Mehta", email: "rohan.demo@example.com", service: "Beard Trim and Styling", visits: 2, status: "Active", initials: "RM", color: "lavender" },
      { id: "demo-customer-priya", name: "Priya Sharma", email: "priya.demo@example.com", service: "Hair Colouring", visits: 1, status: "Waitlisted", initials: "PS", color: "peach" },
    ]);

    addMissing(state.staff, [
      { id: "demo-staff-neha", name: "Neha Rao", email: "neha.demo@example.com", skills: ["Classic Haircut", "Hair Styling", "Hair Colouring"], status: "Available", initials: "NR", color: "lavender" },
      { id: "demo-staff-vikram", name: "Vikram Singh", email: "vikram.demo@example.com", skills: ["Classic Haircut", "Beard Trim and Styling"], status: "Available", initials: "VS", color: "mint" },
      { id: "demo-staff-meera", name: "Meera Nair", email: "meera.demo@example.com", skills: ["Signature Facial", "Hair Spa Treatment"], status: "Unavailable", initials: "MN", color: "peach" },
    ]);

    addMissing(state.appointments, [
      { id: "demo-booking-haircut", customerId: "demo-customer-ananya", staffId: "demo-staff-neha", date: "2026-10-14", time: "10:00", service: "Classic Haircut", duration: 45, status: "Confirmed" },
      { id: "demo-booking-beard", customerId: "demo-customer-rohan", staffId: "demo-staff-vikram", date: "2026-10-14", time: "14:00", service: "Beard Trim and Styling", duration: 30, status: "Confirmed" },
      { id: "demo-booking-colour", customerId: "demo-customer-priya", staffId: "demo-staff-neha", date: "2026-10-15", time: "11:00", service: "Hair Colouring", duration: 120, status: "Awaiting customer" },
    ]);

    addMissing(state.tasks, [
      { id: "demo-task-confirm", title: "Confirm Priya's colour consultation", assignedTo: "demo-staff-neha", status: "To do", priority: "High" },
      { id: "demo-task-stock", title: "Check grooming product stock", assignedTo: "demo-staff-vikram", status: "In progress", priority: "Normal" },
      { id: "demo-task-followup", title: "Follow up after hair spa service", assignedTo: "demo-staff-meera", status: "Done", priority: "Normal" },
    ]);

    addMissing(state.complaints, [
      { id: "demo-complaint-incomplete", customerId: "demo-customer-ananya", bookingId: "demo-booking-haircut", subject: "Service was incomplete", message: "The requested finishing service was not completed.", amount: 600, status: "Open", createdAt: "2026-10-13T09:30:00.000Z" },
    ]);

    return {
      customers: state.customers.length,
      staff: state.staff.length,
      appointments: state.appointments.length,
      tasks: state.tasks.length,
      complaints: state.complaints.length,
    };
  });

  console.log(`Seeded '${slug}' successfully.`);
  console.table(seeded);
  console.log("Test IDs:");
  console.log("customerId: demo-customer-ananya");
  console.log("staffId: demo-staff-neha");
  console.log("bookingId: demo-booking-haircut");
  console.log("complaintId: demo-complaint-incomplete");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
