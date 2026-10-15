/** Commercial affiliate terms must be approved before this opt-in is enabled. */
export function affiliateProgramEnabled(environment: Record<string, string | undefined> = process.env): boolean {
  return environment.AFFILIATE_PROGRAM_ENABLED === "true";
}
