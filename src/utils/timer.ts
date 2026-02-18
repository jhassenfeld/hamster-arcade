let intervalId: number | null = null

export function startTimer(tickFn: () => void): number {
  if (intervalId !== null) {
    clearInterval(intervalId)
  }
  intervalId = window.setInterval(tickFn, 1000)
  return intervalId
}

export function stopTimer(): void {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}
