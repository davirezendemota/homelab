import { Dashboard } from "@/components/Dashboard";
import { getPagePayload } from "@/lib/metrics-cache";
import { requestHost } from "@/lib/request-host";

export default async function Home() {
  const host = await requestHost();
  const initialData = await getPagePayload(host);
  return <Dashboard initialData={initialData} />;
}
