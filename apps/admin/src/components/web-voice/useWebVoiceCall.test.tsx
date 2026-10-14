// @vitest-environment jsdom

import { createElement, useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useWebVoiceCall } from "./useWebVoiceCall";
import { VOICE_RECORDING_CONSENT_VERSION } from "@lobbystack/shared";

type HookControls = ReturnType<typeof useWebVoiceCall>;

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

function createMockMediaStream(trackStop: ReturnType<typeof vi.fn>) {
  const track = { stop: trackStop } as unknown as MediaStreamTrack;
  const tracks = [track];

  return {
    getAudioTracks: () => tracks,
    getTracks: () => tracks,
  } as unknown as MediaStream;
}

function HookHarness(props: {
  endpoint: string;
  onReady: (controls: HookControls) => void;
}) {
  const { endpoint, onReady } = props;
  const controls = useWebVoiceCall({
    businessSlug: "acme-dental",
    endpoint,
  });

  useEffect(() => {
    onReady(controls);
  }, [controls, onReady]);

  return null;
}

describe("useWebVoiceCall", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stops a pending start call when the dialog is dismissed before media access resolves", async () => {
    const getUserMediaDeferred = createDeferred<MediaStream>();
    const getUserMediaMock = vi.fn(() => getUserMediaDeferred.promise);
    const trackStop = vi.fn();
    const localStream = createMockMediaStream(trackStop);
    const peerConnectionInstance = {
      addTrack: vi.fn(),
      close: vi.fn(),
      connectionState: "new",
      createOffer: vi.fn(async () => ({ sdp: "offer-sdp" })),
      onconnectionstatechange: null,
      ontrack: null,
      setLocalDescription: vi.fn(async () => undefined),
      setRemoteDescription: vi.fn(async () => undefined),
    } as unknown as RTCPeerConnection;
    const peerConnectionMock = vi.fn(() => peerConnectionInstance);
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ sessionId: "session-123", sdp: "answer-sdp" }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("RTCPeerConnection", peerConnectionMock);
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: {
        getUserMedia: getUserMediaMock,
      },
    });

    let controls: HookControls | null = null;
    render(
      createElement(HookHarness, {
        endpoint: "https://app.example.com/api/voice/live/session",
        onReady: (nextControls) => {
          controls = nextControls;
        },
      }),
    );

    await waitFor(() => {
      expect(controls).not.toBeNull();
    });

    const startPromise = controls!.startCall();

    await waitFor(() => { expect(controls?.recordingConsentOpen).toBe(true); });
    expect(getUserMediaMock).not.toHaveBeenCalled();
    await act(async () => { controls!.resolveRecordingConsent(true); });

    await waitFor(() => {
      expect(controls?.status).toBe("requesting_microphone");
    });

    await act(async () => {
      await controls!.forceEndCall();
    });

    getUserMediaDeferred.resolve(localStream);

    await act(async () => {
      await startPromise;
    });

    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(peerConnectionMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses recording without requesting the microphone or creating a session", async () => {
    const getUserMediaMock = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia: getUserMediaMock } });
    let controls: HookControls | null = null;
    render(createElement(HookHarness, { endpoint: "/api/voice/live/session", onReady: (value) => { controls = value; } }));
    await act(async () => { void controls!.startCall(); });
    expect(controls!.recordingConsentOpen).toBe(true);
    expect(getUserMediaMock).not.toHaveBeenCalled();
    await act(async () => { controls!.resolveRecordingConsent(false); });
    expect(controls!.recordingConsentOpen).toBe(false);
    expect(controls!.status).toBe("idle");
    expect(getUserMediaMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a deliberate current consent only after acceptance", async () => {
    const localStream = createMockMediaStream(vi.fn());
    const getUserMediaMock = vi.fn(async () => localStream);
    const peer = { addTrack: vi.fn(), close: vi.fn(), createDataChannel: vi.fn(() => ({ readyState: "connecting" })), createOffer: vi.fn(async () => ({ sdp: "offer" })), setLocalDescription: vi.fn(), setRemoteDescription: vi.fn() };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ sessionId: "live_1", endToken: "token", sdp: "answer" }), { status: 201 }));
    vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia: getUserMediaMock } });
    vi.stubGlobal("RTCPeerConnection", vi.fn(function () { return peer; }));
    vi.stubGlobal("fetch", fetchMock);
    let controls: HookControls | null = null;
    render(createElement(HookHarness, { endpoint: "/api/voice/live/session", onReady: (value) => { controls = value; } }));
    let startPromise: Promise<void> | undefined;
    await act(async () => { startPromise = controls!.startCall(); });
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => { controls!.resolveRecordingConsent(true); await startPromise; });
    expect(getUserMediaMock).toHaveBeenCalledOnce();
    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body).toMatchObject({ recordingConsent: true, recordingConsentVersion: VOICE_RECORDING_CONSENT_VERSION, sdp: "offer" });
  });
});
