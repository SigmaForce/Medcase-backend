export const clampObjectiveSimulationActiveElapsed = (input: {
  currentActiveElapsedSecs: number | null
  nextActiveElapsedSecs: number
  timedLimitSecs: number | null
}): number => {
  const upperLimit = input.timedLimitSecs ?? Number.MAX_SAFE_INTEGER
  const elapsed = Math.max(input.currentActiveElapsedSecs ?? 0, input.nextActiveElapsedSecs)

  return Math.min(Math.max(elapsed, 0), upperLimit)
}
