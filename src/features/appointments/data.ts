import "server-only";
import {requireAdmin} from "@/lib/auth";
export async function appointmentOptions() {
  const {db}=await requireAdmin();
  const [contacts,leads,profiles]=await Promise.all([
    db.from("contacts").select("*").order("name").limit(500),
    db.from("leads").select("id,contact_id,service").order("created_at",{ascending:false}).limit(1000),
    db.from("profiles").select("id,full_name").eq("active",true).order("full_name"),
  ]);
  if(contacts.error || leads.error || profiles.error) throw new Error("No fue posible cargar los datos de agenda.");
  return {contacts:contacts.data,leads:leads.data,profiles:profiles.data};
}
