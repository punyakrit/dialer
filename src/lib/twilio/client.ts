"use client";

import { Device, type Call } from "@twilio/voice-sdk";
import type { TwilioEdge } from "./types";

export type DeviceState =
  | "idle"
  | "registering"
  | "ready"
  | "busy"
  | "offline"
  | "error";

export type DeviceManagerListeners = {
  onState?: (state: DeviceState) => void;
  onError?: (err: { code?: number | string; message: string }) => void;
  onIncoming?: (call: Call) => void;
  onActiveCallChanged?: (call: Call | null) => void;
  onWarning?: (name: string, data?: unknown) => void;
  onMute?: (muted: boolean) => void;
};

export type FetchTokenFn = () => Promise<{ token: string; ttlSec: number; edge?: string }>;

/**
 * Browser wrapper around the Twilio Voice SDK v2 Device. Handles registration,
 * token refresh on `tokenWillExpire`, a clean disconnect path, and bridges
 * lifecycle events to optional listener callbacks.
 *
 * The class never persists tokens or reads them back; callers pass a
 * `fetchToken` closure so we never touch credentials directly.
 */
export class DeviceManager {
  private device: Device | null = null;
  private activeCall: Call | null = null;
  private listeners: DeviceManagerListeners;
  private fetchToken: FetchTokenFn;
  private destroyed = false;

  constructor(opts: {
    fetchToken: FetchTokenFn;
    listeners?: DeviceManagerListeners;
  }) {
    this.fetchToken = opts.fetchToken;
    this.listeners = opts.listeners ?? {};
  }

  async init(edgeOverride?: TwilioEdge): Promise<void> {
    if (this.device) return;
    this.emitState("registering");
    try {
      const { token, edge } = await this.fetchToken();
      const effectiveEdge = (edgeOverride ?? edge ?? "singapore") as TwilioEdge;
      this.device = new Device(token, {
        // The SDK re-exports this as TS string unions that don't include our
        // "mumbai"/"singapore" strictly, so cast at the call site.
        edge: effectiveEdge as unknown as string,
        logLevel: "warn",
        codecPreferences: ["opus", "pcmu"] as unknown as Call.Codec[],
        closeProtection: true,
        allowIncomingWhileBusy: false,
      });
      this.wire();
      await this.device.register();
      this.emitState("ready");
    } catch (err) {
      this.emitError(err);
      this.emitState("error");
    }
  }

  private wire() {
    const d = this.device!;
    d.on("registered", () => this.emitState("ready"));
    d.on("unregistered", () => this.emitState("offline"));
    d.on("tokenWillExpire", () => {
      void this.refreshToken();
    });
    d.on("error", (err: { code?: number; message: string }) => {
      this.emitError(err);
      this.emitState("error");
    });
    d.on("incoming", (call: Call) => {
      this.listeners.onIncoming?.(call);
    });
  }

  private async refreshToken(): Promise<void> {
    if (!this.device) return;
    try {
      const { token } = await this.fetchToken();
      this.device.updateToken(token);
    } catch (err) {
      this.emitError(err);
    }
  }

  async dial(params: Record<string, string>): Promise<Call | null> {
    if (!this.device) {
      await this.init();
    }
    if (!this.device) return null;
    try {
      const call = await this.device.connect({ params });
      this.activeCall = call;
      this.listeners.onActiveCallChanged?.(call);
      this.emitState("busy");
      this.wireCall(call);
      return call;
    } catch (err) {
      this.emitError(err);
      return null;
    }
  }

  acceptIncoming(call: Call) {
    call.accept();
    this.activeCall = call;
    this.listeners.onActiveCallChanged?.(call);
    this.emitState("busy");
    this.wireCall(call);
  }

  private wireCall(call: Call) {
    call.on("accept", () => this.emitState("busy"));
    call.on("disconnect", () => this.onCallEnded());
    call.on("cancel", () => this.onCallEnded());
    call.on("reject", () => this.onCallEnded());
    call.on("error", (err: { message: string; code?: number }) => {
      this.emitError(err);
    });
    call.on("mute", (muted: boolean) => {
      this.listeners.onMute?.(muted);
    });
    call.on("warning", (name: string, data?: unknown) => {
      this.listeners.onWarning?.(name, data);
    });
  }

  private onCallEnded() {
    this.activeCall = null;
    this.listeners.onActiveCallChanged?.(null);
    this.emitState(this.device ? "ready" : "offline");
  }

  setMute(muted: boolean) {
    this.activeCall?.mute(muted);
  }

  isMuted(): boolean {
    return this.activeCall?.isMuted() ?? false;
  }

  hangup() {
    this.activeCall?.disconnect();
  }

  sendDigits(digits: string) {
    this.activeCall?.sendDigits(digits);
  }

  async setInputDevice(deviceId: string): Promise<void> {
    const audio = this.device?.audio;
    if (!audio) return;
    try {
      await audio.setInputDevice(deviceId);
    } catch (err) {
      this.emitError(err);
    }
  }

  async setOutputDevices(deviceIds: string[]): Promise<void> {
    const audio = this.device?.audio;
    if (!audio || !audio.speakerDevices) return;
    try {
      await audio.speakerDevices.set(deviceIds);
    } catch (err) {
      this.emitError(err);
    }
  }

  async unregister(): Promise<void> {
    if (!this.device) return;
    try {
      await this.device.unregister();
    } catch {
      /* ignore */
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    try {
      this.activeCall?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      this.device?.destroy();
    } catch {
      /* ignore */
    }
    this.device = null;
    this.activeCall = null;
    this.emitState("offline");
  }

  isReady(): boolean {
    return !!this.device && this.device.state === "registered";
  }

  private emitState(state: DeviceState) {
    this.listeners.onState?.(state);
  }

  private emitError(err: unknown) {
    const normalized =
      err instanceof Error
        ? { message: err.message }
        : typeof err === "object" && err !== null
          ? {
              code: (err as { code?: number | string }).code,
              message:
                (err as { message?: string }).message ?? "Unknown device error",
            }
          : { message: String(err) };
    this.listeners.onError?.(normalized);
  }
}
