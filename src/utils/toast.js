const listeners = new Set();
let toastId = 0;

export const toast = {
  show(message, type = 'info') {
    const t = { id: ++toastId, message, type };
    listeners.forEach(fn => fn(t));
  },
  error(msg) { this.show(msg, 'error'); },
  success(msg) { this.show(msg, 'success'); },
  warn(msg) { this.show(msg, 'warning'); },
  info(msg) { this.show(msg, 'info'); }
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
