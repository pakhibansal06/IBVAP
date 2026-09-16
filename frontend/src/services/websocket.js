const WS_BASE = import.meta.env.VITE_WS_URL || null;

export function createTelemetrySocket(onMessage, onError) {
  let wsUrl = WS_BASE;
  if (!wsUrl) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
  }

  let socket = null;
  let isClosedIntentionally = false;
  let reconnectTimer = null;

  function connect() {
    // Only one socket at a time
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket Connected to Border Telemetry Stream');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (e) {
        console.error('Error parsing telemetry frame:', e);
      }
    };

    socket.onerror = (err) => {
      if (onError) onError(err);
    };

    socket.onclose = () => {
      if (!isClosedIntentionally) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };
  }

  connect();

  return {
    close: () => {
      isClosedIntentionally = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    }
  };
}