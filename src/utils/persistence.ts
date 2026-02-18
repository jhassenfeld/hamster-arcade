export const SAVE_KEY = 'hamster-arcade-save'

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY)
}

export function hasSaveData(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null
}
