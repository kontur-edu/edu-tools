export default class LocalEvent {
  private listeners: ((...args: any[]) => void)[] = [];

  on(listener: (...args: any[]) => void): () => void {
    this.listeners.push(listener);
    return () => this.off(listener);
  }

  off(listener: (...args: any[]) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  emit(...args: any[]): void {
    this.listeners.forEach(listener => listener(...args));
  }
}
