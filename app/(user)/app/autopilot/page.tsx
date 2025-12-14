import type { JSX } from "react";
import { redirect } from "next/navigation";
import { AutopilotShell } from "@/components/autopilot/AutopilotShell";
import { resolveUserContext } from "@/lib/user-context";
import { getAutopilotPrereqs, getFirstMissingPrereq } from "../onboarding/_lib/prereqs";

export default async function AutopilotPage(): Promise<JSX.Element> {
  const { userId } = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
  const prereqs = await getAutopilotPrereqs(userId);
  const missing = getFirstMissingPrereq(prereqs);

  if (missing !== null) {
    redirect(`/app/onboarding?missing=${missing}`);
  }

  return <AutopilotShell />;
}
