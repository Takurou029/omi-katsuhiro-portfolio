// アプリの外から毎日呼び戻すためのリマインダー生成。
// 静的アプリ（サーバーなし）ではプッシュ通知が使えないため、
// 毎日繰り返しのカレンダー予定（.ics）を生成してユーザーのカレンダーに載せる。
// GoogleカレンダーやApple/Outlookカレンダーの通知が「開かない日の装置」になる。

/** "HH:MM" 形式かどうか。 */
export function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

/**
 * 毎日繰り返しのリマインダー予定（iCalendar 形式）を生成する。
 * @param time  "HH:MM"（ローカル時刻・フローティング時刻として出力）
 * @param url   予定の説明に載せるアプリのURL（任意）
 * @param today DTSTART の基準日（テスト用に注入可能）
 */
export function buildDailyReminderIcs(
  time: string,
  url = "",
  today: Date = new Date(),
): string {
  if (!isValidTime(time)) {
    throw new Error(`不正な時刻形式です: ${time}`);
  }
  const [hh, mm] = time.split(":");
  const yyyy = today.getFullYear();
  const mo = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dtStart = `${yyyy}${mo}${dd}T${hh}${mm}00`;
  const stamp = `${yyyy}${mo}${dd}T000000Z`;

  const description = [
    "今日の3問だけ。3分で終わります。",
    url ? `アプリを開く: ${url}` : "",
  ]
    .filter(Boolean)
    .join("\\n");

  // フローティング時刻（TZID なし）：ユーザーのカレンダーのローカル時刻で毎日発火する。
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//nsca-cpt-study-app//daily-reminder//JA",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:nsca-cpt-daily-reminder-${dtStart}@nsca-cpt-study-app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    "RRULE:FREQ=DAILY",
    "SUMMARY:NSCA-CPT 今日の3問",
    `DESCRIPTION:${description}`,
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    "DESCRIPTION:NSCA-CPT 今日の3問",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
