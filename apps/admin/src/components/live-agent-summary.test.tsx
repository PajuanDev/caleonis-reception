// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { AgentBasicSettingsPage } from "./live-agent-basic-settings-surface";
import { createRecordedBrowserTelemetry } from "@/lib/telemetry-testing";

const telemetryRef = vi.hoisted(() => ({ current: null as ReturnType<typeof createRecordedBrowserTelemetry> | null }));
vi.mock("@/components/product-analytics", () => ({ useTelemetry: () => telemetryRef.current!.telemetry }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "fr" }, t: (key: string, values?: { field?: string }) => values?.field ? `${key}:${values.field}` : key }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const clients: QueryClient[] = [];
beforeEach(() => {
  telemetryRef.current = createRecordedBrowserTelemetry();
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => null });
});
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; vi.unstubAllGlobals(); vi.clearAllMocks(); });

function setup(canManageTenant = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(client);
  const profile = { greeting: "Bonjour, comment vous aider ?", summary: "Lavage intérieur sur rendez-vous.", transferNumber: "+33123456789", transferMode: "on_request", appointmentChangePolicy: null, bookingMode: "instant" };
  const configuration = () => ({ business: { defaultLocale: "fr" }, profile: { ...profile } });
  client.setQueryData(["agent-settings", "business"], configuration());
  let responseForPatch = async (_body: Record<string, unknown>): Promise<Response> => Response.json({ ok: true });
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      const response = await responseForPatch(body);
      if (response.ok && typeof body.summary === "string") profile.summary = body.summary;
      return response;
    }
    return Response.json(configuration());
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<QueryClientProvider client={client}><AgentBasicSettingsPage businessId="business" canManageTenant={canManageTenant} /></QueryClientProvider>);
  return { fetchMock, profile, setPatchResponse: (next: typeof responseForPatch) => { responseForPatch = next; }, patches: () => fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH") };
}

const editLabel = "agent:actions.editField:agent:fields.summary.label";
async function editSummary() {
  await userEvent.click(screen.getByRole("button", { name: editLabel }));
  const dialog = await screen.findByRole("dialog", { name: "agent:fields.summary.label" });
  return { dialog, input: within(dialog).getByRole("textbox", { name: "agent:fields.summary.label" }) as HTMLTextAreaElement };
}

describe("manual business summary with the existing agent API", () => {
  it("loads the saved summary into the upstream dialog and discards a cancelled draft without writing", async () => {
    const fixture = setup();
    const { dialog, input } = await editSummary();
    expect(input.value).toBe(fixture.profile.summary);
    fireEvent.change(input, { target: { value: "Brouillon non enregistré" } });
    expect(fixture.patches()).toHaveLength(0);
    await userEvent.click(within(dialog).getByRole("button", { name: "agent:actions.cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((await editSummary()).input.value).toBe("Lavage intérieur sur rendez-vous.");
    expect(fixture.patches()).toHaveLength(0);
  });

  it("sends only the explicit summary save, blocks duplicate/pending edits and records success after persistence", async () => {
    const fixture = setup();
    let finishSave!: (response: Response) => void;
    fixture.setPatchResponse(() => new Promise(resolve => { finishSave = resolve; }));
    const { dialog, input } = await editSummary();
    fireEvent.change(input, { target: { value: "  Nettoyage intérieur et extérieur sur rendez-vous.  " } });
    await userEvent.click(within(dialog).getByRole("button", { name: "agent:actions.save" }));
    expect(fixture.patches()).toHaveLength(1);
    expect(input.disabled).toBe(true);
    const pending = within(dialog).getByRole("button", { name: "agent:actions.saving" }) as HTMLButtonElement;
    expect(pending.disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: "agent:actions.cancel" }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(pending);
    expect(fixture.patches()).toHaveLength(1);
    expect(toast.success).not.toHaveBeenCalled();
    expect(telemetryRef.current!.events.some(event => event.name === "web.agent.settings_saved")).toBe(false);
    finishSave(Response.json({ ok: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const [url, init] = fixture.patches()[0]!;
    expect(url).toBe("/api/agent?businessId=business");
    expect(JSON.parse(String(init?.body))).toEqual({ businessId: "business", summary: "Nettoyage intérieur et extérieur sur rendez-vous." });
    expect(fixture.profile.greeting).toBe("Bonjour, comment vous aider ?");
    expect(fixture.profile.transferNumber).toBe("+33123456789");
    expect((await editSummary()).input.value).toBe("Nettoyage intérieur et extérieur sur rendez-vous.");
    telemetryRef.current!.expectEvent("web.agent.settings_saved", { businessId: "business", setting: "summary" });
    expect(toast.success).toHaveBeenCalledWith("agent:actions.saved");
  });

  it("retains the failed draft and retries only after another user save", async () => {
    const fixture = setup();
    fixture.setPatchResponse(async () => Response.json({ error: "Temporary failure" }, { status: 503 }));
    const { dialog, input } = await editSummary();
    fireEvent.change(input, { target: { value: "Résumé à conserver après erreur." } });
    await userEvent.click(within(dialog).getByRole("button", { name: "agent:actions.save" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("agent:actions.saveFailed"));
    expect(input.value).toBe("Résumé à conserver après erreur.");
    expect(input.disabled).toBe(false);
    expect(fixture.profile.summary).toBe("Lavage intérieur sur rendez-vous.");
    expect(fixture.patches()).toHaveLength(1);
    expect(toast.success).not.toHaveBeenCalled();
    fixture.setPatchResponse(async () => Response.json({ ok: true }));
    await userEvent.click(within(dialog).getByRole("button", { name: "agent:actions.save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fixture.patches()).toHaveLength(2);
    expect(fixture.profile.summary).toBe("Résumé à conserver après erreur.");
  });

  it("rejects blank and overlong drafts while accepting exactly 2000 characters", async () => {
    const fixture = setup();
    const { dialog, input } = await editSummary();
    expect(input.maxLength).toBe(2000);
    const save = within(dialog).getByRole("button", { name: "agent:actions.save" }) as HTMLButtonElement;
    for (const value of ["   ", "x".repeat(2001)]) {
      fireEvent.change(input, { target: { value } });
      expect(save.disabled).toBe(true);
      await userEvent.click(save);
      expect(fixture.patches()).toHaveLength(0);
    }
    fireEvent.change(input, { target: { value: "x".repeat(2000) } });
    await userEvent.click(save);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fixture.profile.summary).toHaveLength(2000);
    expect(fixture.patches()).toHaveLength(1);
  });

  it("keeps viewer access read-only and never offers AI generation", async () => {
    const fixture = setup(false);
    const edit = screen.getByRole("button", { name: editLabel }) as HTMLButtonElement;
    expect(edit.disabled).toBe(true);
    await userEvent.click(edit);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fixture.patches()).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /regenerate|rewrite/i })).toBeNull();
  });
});
