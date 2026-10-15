// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingNavbar } from "./landing-navbar";

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("public demo navigation", () => {
  it.each(["", "javascript:alert(1)"])("keeps links on existing app routes when the marketing destination is %s", destination => {
    vi.stubEnv("NEXT_PUBLIC_LANDING_SITE_URL", destination);
    render(<LandingNavbar locale="fr" />);
    const links = screen.getAllByRole("link");
    expect(links.every(link => ["/fr/essai", "/fr/login"].includes(link.getAttribute("href") ?? ""))).toBe(true);
    expect(screen.getAllByRole("link", { name: "Essayer la démo" })).toHaveLength(2);
    expect(screen.queryByText(/gratuitement|affiliation/i)).toBeNull();
  });

  it("uses the explicit product preview and never advertises an affiliate program", () => {
    vi.stubEnv("NEXT_PUBLIC_LANDING_SITE_URL", "https://preview.example.invalid");
    vi.stubEnv("NEXT_PUBLIC_HELP_SITE_URL", "");
    render(<LandingNavbar locale="fr" />);
    expect(screen.getAllByRole("link", { name: "Fonctionnalités" }).every(link => link.getAttribute("href") === "https://preview.example.invalid/fr/features/")).toBe(true);
    expect(screen.getAllByRole("link", { name: /Centre d'aide/ }).every(link => link.getAttribute("href") === "/fr/essai")).toBe(true);
    expect(screen.queryByText(/affiliation/i)).toBeNull();
    expect(screen.getAllByRole("link").some(link => link.getAttribute("href")?.includes("caleonis.com"))).toBe(false);
  });
});
