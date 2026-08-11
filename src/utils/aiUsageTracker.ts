const STORAGE_KEY = 'diarynote_ai_usage_history';

export interface DayUsage {
  date: string; // YYYY-MM-DD
  count: number;
  formattedDate: string; // e.g. "11 Aug 2026"
}

/**
 * Record an AI merge request for today
 */
export function recordAIRequest(): void {
  try {
    const today = new Date().toISOString().split('T')[0];
    const history = getAIUsageHistory();
    history[today] = (history[today] || 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to record AI request count:', err);
  }
}

/**
 * Get all historical daily usage
 */
export function getAIUsageHistory(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Get total requests sent today
 */
export function getTodayAICount(): number {
  const today = new Date().toISOString().split('T')[0];
  const history = getAIUsageHistory();
  return history[today] || 0;
}

/**
 * Get last N days of usage data formatted for GitHub-style activity heatmap
 */
export function getLastNDaysAIUsage(days: number = 28): DayUsage[] {
  const history = getAIUsageHistory();
  const result: DayUsage[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = history[dateStr] || 0;

    const formattedDate = d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    result.push({
      date: dateStr,
      count,
      formattedDate,
    });
  }

  return result;
}
