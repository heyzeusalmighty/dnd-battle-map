export const waitForOpen = (ws: WebSocket, timeoutMs = 5000) => {
  return new Promise<void>((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) return resolve();
    const t = setTimeout(() => {
      cleanup();
      reject(new Error("WS open timeout"));
    }, timeoutMs);
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error("WS error before open"));
    };
    const cleanup = () => {
      clearTimeout(t);
      ws.removeEventListener("open", onOpen);
      ws.removeEventListener("error", onErr);
    };
    ws.addEventListener("open", onOpen);
    ws.addEventListener("error", onErr);
  });
}

export const waitFor = (
  predicate: () => boolean,
  label: string,
  timeoutMs = 15000,
  checkMs = 50
) => {
  return new Promise<void>((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      if (predicate()) return resolve();
      if (Date.now() - t0 > timeoutMs)
        return reject(new Error(`${label} timeout`));
      setTimeout(tick, checkMs);
    };
    tick();
  });
}