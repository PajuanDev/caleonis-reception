// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "fr", resolvedLanguage: "fr" }, t: (key: string, options?: { date?: string }) => options?.date ? `${key}:${options.date}` : key }) }));
vi.mock("./live-notification-settings-surface", () => ({ LiveNotificationSettingsSurface: () => null }));

import { LiveWidgetSettingsSurface } from "./live-widget-settings-surface";

const clients: QueryClient[] = [];

function setup(issuanceEnabled: boolean, keys: Array<Record<string, unknown>> = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(client);
  client.setQueryData(["businesses"], { businesses: [{ businessId: "business", name: "Acme", active: true }] });
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("/api/billing")) return Response.json({ account: { plan: "starter" }, widgetIssuanceEnabled: issuanceEnabled });
    if (url.includes("/api/widget-keys") && init?.method === "POST") return Response.json({ key: { id: "widget", key: "wk_live_test" } });
    if (url.includes("/api/widget-keys")) return Response.json({ keys });
    return Response.json({ businesses: [{ businessId: "business", name: "Acme", active: true }] });
  }));
  render(<QueryClientProvider client={client}><LiveWidgetSettingsSurface /></QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  clients.forEach(client => client.clear());
  clients.length = 0;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("website widget issuance restriction", () => {
  it("shows the restricted notice and hides the create form when issuance is disabled", async () => {
    setup(false);
    expect(await screen.findByText("widget.restricted.title")).toBeTruthy();
    expect(screen.queryByText("widget.create.action")).toBeNull();
    expect(screen.queryByText(/sessions per month/)).toBeNull();
  });

  it("offers the create form once an operator enables issuance", async () => {
    setup(true);
    expect(await screen.findByText("widget.create.action")).toBeTruthy();
    expect(screen.queryByText("widget.restricted.title")).toBeNull();
  });

  it("formats the last-used date with the active dashboard locale", async () => {
    const lastUsedAt = "2026-09-23T12:00:00.000Z";
    setup(true, [{ id: "widget", label: "Website", status: "active", allowedOrigins: ["https://example.com"], config: {}, lastUsedAt, createdAt: lastUsedAt }]);
    const expected = new Intl.DateTimeFormat("fr", { dateStyle: "medium" }).format(new Date(lastUsedAt));
    expect(await screen.findByText(`widget.keys.lastUsed:${expected}`)).toBeTruthy();
  });

  it("copies a snippet that keeps the receptionist API origin when embedded on a customer's site", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    setup(true);
    await screen.findByText("widget.create.action");
    await user.type(screen.getByLabelText("widget.fields.origins"), "https://customer.example");
    await user.click(screen.getByRole("button", { name: "widget.create.action" }));
    await user.click(await screen.findByRole("button", { name: "widget.created.copySnippet" }));

    const snippet = writeText.mock.calls[0]?.[0];
    expect(snippet).toBeTruthy();
    const script = new DOMParser().parseFromString(snippet!, "text/html").querySelector("script")!;
    expect(script.src).toBe(`${window.location.origin}/embed.js`);
    expect(script.dataset.baseUrl).toBe(window.location.origin);
    expect(script.dataset.baseUrl).not.toBe("https://customer.example");
    expect(script.dataset.widgetKey).toBe("wk_live_test");
    expect(new URL("/api/widget/session", script.dataset.baseUrl).origin).toBe(window.location.origin);
  });
});
