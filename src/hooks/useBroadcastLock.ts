"use client";

import { useEffect, useState } from "react";

const CHANNEL_NAME = "dialer-device-leader";
const HEARTBEAT_MS = 2500;
const STALE_MS = 7000;

type LeaderState = {
  isLeader: boolean;
  hasOtherTab: boolean;
};

type Packet = {
  type: "heartbeat" | "bye" | "claim";
  id: string;
  at: number;
};

/**
 * Elects a single leader tab per browser. Only the leader should register a
 * Twilio Device — a second register with the same identity would invalidate
 * the first, kicking an in-progress call off the first tab.
 */
export function useBroadcastLock(): LeaderState {
  const [state, setState] = useState<LeaderState>({
    isLeader: true,
    hasOtherTab: false,
  });

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      // Fallback: behave as leader. Older browsers are rare enough to ignore.
      setState({ isLeader: true, hasOtherTab: false });
      return;
    }
    const selfId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let leaderId = selfId;
    let lastSeenOther = 0;
    const channel = new BroadcastChannel(CHANNEL_NAME);

    function send(type: Packet["type"]) {
      channel.postMessage({ type, id: selfId, at: Date.now() } satisfies Packet);
    }

    channel.onmessage = (ev: MessageEvent<Packet>) => {
      const p = ev.data;
      if (!p || p.id === selfId) return;
      lastSeenOther = Date.now();
      if (p.type === "heartbeat" || p.type === "claim") {
        // Oldest ID wins (lower timestamp prefix).
        if (p.id < leaderId) {
          leaderId = p.id;
        }
      } else if (p.type === "bye") {
        if (p.id === leaderId) {
          leaderId = selfId;
        }
      }
      recompute();
    };

    function recompute() {
      const stale = Date.now() - lastSeenOther > STALE_MS;
      const isLeader = stale || leaderId === selfId;
      const hasOtherTab = !stale;
      setState((prev) =>
        prev.isLeader === isLeader && prev.hasOtherTab === hasOtherTab
          ? prev
          : { isLeader, hasOtherTab },
      );
    }

    // Announce ourselves.
    send("claim");
    const hb = window.setInterval(() => {
      send("heartbeat");
      recompute();
    }, HEARTBEAT_MS);

    function onUnload() {
      send("bye");
    }
    window.addEventListener("beforeunload", onUnload);

    return () => {
      window.clearInterval(hb);
      window.removeEventListener("beforeunload", onUnload);
      send("bye");
      channel.close();
    };
  }, []);

  return state;
}
