import { create } from 'zustand';

let messageIdCounter = 0;
let logIdCounter = 0;

const generateId = () => `${Date.now()}-${++messageIdCounter}`;
const generateLogId = () => `log-${Date.now()}-${++logIdCounter}`;

const useCallStore = create((set, get) => ({
  // ─── Call state ──────────────────────────────────────────────────
  callStatus: 'idle', // 'idle' | 'ringing' | 'active' | 'listening' | 'processing' | 'speaking' | 'ended'
  sessionId: null,
  callDuration: 0, // seconds elapsed

  // ─── Messages ────────────────────────────────────────────────────
  messages: [], // [{ id, role:'user'|'assistant', content, timestamp, isStreaming }]

  // ─── Agent activity ──────────────────────────────────────────────
  activeAgent: null, // 'stt' | 'llm' | 'tts' | null
  agentTimings: [], // [{ agent, durationMs, timestamp }]

  // ─── System logs ─────────────────────────────────────────────────
  logs: [], // [{ id, level:'info'|'warn'|'error', message, timestamp }]
  logsVisible: false,

  // ─── Actions: Call state ─────────────────────────────────────────
  setCallStatus: (status) => set({ callStatus: status }),

  setSessionId: (id) => set({ sessionId: id }),

  incrementDuration: () => set((state) => ({ callDuration: state.callDuration + 1 })),

  resetDuration: () => set({ callDuration: 0 }),

  // ─── Actions: Messages ───────────────────────────────────────────
  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: msg.id ?? generateId(),
          role: msg.role,
          content: msg.content ?? '',
          timestamp: msg.timestamp ?? new Date().toISOString(),
          isStreaming: msg.isStreaming ?? false,
        },
      ],
    })),

  updateStreamingMessage: (id, token) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content: msg.content + token, isStreaming: true } : msg
      ),
    })),

  finalizeMessage: (id) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, isStreaming: false } : msg
      ),
    })),

  // ─── Actions: Agent activity ─────────────────────────────────────
  setActiveAgent: (agent) => set({ activeAgent: agent }),

  addTiming: (timing) =>
    set((state) => ({
      agentTimings: [
        ...state.agentTimings,
        {
          agent: timing.agent,
          durationMs: timing.durationMs,
          timestamp: timing.timestamp ?? new Date().toISOString(),
        },
      ],
    })),

  // ─── Actions: Logs ───────────────────────────────────────────────
  addLog: (log) =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          id: log.id ?? generateLogId(),
          level: log.level ?? 'info',
          message: log.message,
          timestamp: log.timestamp ?? new Date().toISOString(),
        },
      ],
    })),

  clearLogs: () => set({ logs: [] }),

  toggleLogs: () => set((state) => ({ logsVisible: !state.logsVisible })),

  // ─── Actions: Reset ──────────────────────────────────────────────
  resetCall: () =>
    set((state) => ({
      messages: [],
      agentTimings: [],
      activeAgent: null,
      callDuration: 0,
      sessionId: null,
      callStatus: 'idle',
      // Preserve logs across resets
      logs: state.logs,
    })),
}));

export default useCallStore;
