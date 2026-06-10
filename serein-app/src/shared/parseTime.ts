// 中文自然时间解析：识别 "明天下午3点"、"今天晚上8:30"、"后天上午10点"、"周五下午2点"
// 返回时间戳；若识别不到返回 null

const WEEKDAYS: Record<string, number> = {
  '日': 0, '天': 0,
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6
};

const NUM_MAP: Record<string, number> = {
  '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
};

function chineseToNumber(s: string): number | null {
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (s in NUM_MAP) return NUM_MAP[s];
  // "十一" "十二" "二十" "二十三"
  if (s.includes('十')) {
    const [a, b] = s.split('十');
    const tens = a === '' ? 1 : NUM_MAP[a] ?? null;
    const ones = b === '' ? 0 : NUM_MAP[b] ?? null;
    if (tens === null || ones === null) return null;
    return tens * 10 + ones;
  }
  return null;
}

export interface ParsedTime {
  date: Date;
  matchedText: string;
  cleanText: string; // 去掉时间表达后的剩余文本
}

export function parseChineseDateTime(input: string, now: Date = new Date()): ParsedTime | null {
  // 整体匹配模式：[日期相对]?[时段]?[小时][:分]?[分?]
  // 日期相对：今天/今日/明天/明日/后天/大后天/周X/星期X/周末
  // 时段：上午/下午/中午/早上/晚上/凌晨/傍晚
  // 小时：N点 / N:MM / N点半 / N点M分

  const pattern = /(今天|今日|明天|明日|后天|大后天|(?:周|星期|礼拜)([一二三四五六日天]))?\s*(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上)?\s*(\d{1,2}|[零一二三四五六七八九十]+)\s*(?::(\d{1,2})|点(?:(\d{1,2}|[零一二三四五六七八九十]+)\s*分?|半)?)/;

  const m = pattern.exec(input);
  if (!m) return null;

  const [matched, relDay, weekChar, period, hourStr, colonMin, hanMin] = m;
  const target = new Date(now);
  target.setSeconds(0, 0);

  // 日期偏移
  if (relDay) {
    if (relDay === '今天' || relDay === '今日') {/* no-op */}
    else if (relDay === '明天' || relDay === '明日') target.setDate(target.getDate() + 1);
    else if (relDay === '后天') target.setDate(target.getDate() + 2);
    else if (relDay === '大后天') target.setDate(target.getDate() + 3);
    else if (weekChar) {
      const want = WEEKDAYS[weekChar];
      const diff = (want + 7 - target.getDay()) % 7;
      target.setDate(target.getDate() + (diff === 0 ? 7 : diff));
    }
  }

  let hour = chineseToNumber(hourStr);
  if (hour === null) return null;
  let minute = 0;
  if (colonMin) minute = parseInt(colonMin, 10);
  else if (hanMin) {
    const v = chineseToNumber(hanMin);
    if (v !== null) minute = v;
  } else if (matched.includes('半')) minute = 30;

  // 时段对小时的修正
  if (period) {
    if (period === '凌晨') {/* hour 保持 0-5 */}
    else if (period === '早上' || period === '早晨' || period === '上午') {/* keep */}
    else if (period === '中午') { if (hour < 12) hour += hour === 12 ? 0 : 0; if (hour < 11) hour = 12; }
    else if (period === '下午' || period === '傍晚') { if (hour < 12) hour += 12; }
    else if (period === '晚上') { if (hour < 12) hour += 12; }
  } else {
    // 没有时段：若小时<8 且没有指定相对日期，则可能默认为下午
    // 这里保守不调整
  }

  target.setHours(hour, minute, 0, 0);

  // 如果计算出的时间已过且没有显式日期，推到明天
  if (!relDay && target.getTime() < now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const cleanText = input.replace(matched, '').replace(/\s{2,}/g, ' ').trim();
  return { date: target, matchedText: matched, cleanText };
}
