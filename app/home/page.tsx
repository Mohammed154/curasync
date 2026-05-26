// Redirect /home → / (canonical URL is the root)
import { redirect } from "next/navigation";
export default function HomeRedirect() {
  redirect("/");
}
