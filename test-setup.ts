import { Window } from "happy-dom"
import "./__tests__/lib/supabase-mock"

const window = new Window()
Object.assign(globalThis, {
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  NodeFilter: window.NodeFilter,
  HTMLInputElement: window.HTMLInputElement,
  HTMLButtonElement: window.HTMLButtonElement,
  HTMLTextAreaElement: window.HTMLTextAreaElement,
  HTMLSelectElement: window.HTMLSelectElement,
  Text: window.Text,
  DocumentFragment: window.DocumentFragment,
  MutationObserver: window.MutationObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(cb, 0),
  cancelAnimationFrame: (id: number) => clearTimeout(id),
  ResizeObserver: class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
})
