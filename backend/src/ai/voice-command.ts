import { MemoryEventType } from '@voxa/shared';

export type VoiceCommandKind = 'note' | 'idea' | 'task' | 'reminder';

export interface ParsedVoiceCommand {
  kind: VoiceCommandKind;
  eventType: MemoryEventType;
  content: string;
  reminder?: {
    title: string;
    remindAt: Date;
  };
}

const COMMAND_PATTERNS: Array<{
  kind: VoiceCommandKind;
  eventType: MemoryEventType;
  pattern: RegExp;
}> = [
  {
    kind: 'reminder',
    eventType: MemoryEventType.TASK,
    pattern: /^(?:напоминание|напомни|напомнить|reminder|remind me)\b(?:\s+(?:мне|меня))?[\s:,-]*/i,
  },
  {
    kind: 'idea',
    eventType: MemoryEventType.IDEA,
    pattern: /^(?:идея|идею|мысль|idea)\b[\s:,-]*/i,
  },
  {
    kind: 'task',
    eventType: MemoryEventType.TASK,
    pattern: /^(?:задача|дело|todo|to do|task|action|надо|нужно)\b[\s:,-]*/i,
  },
  {
    kind: 'note',
    eventType: MemoryEventType.QUICK_NOTE,
    pattern: /^(?:заметка|запиши|запомни|note)\b[\s:,-]*/i,
  },
];

export function parseVoiceCommand(text: string): ParsedVoiceCommand | null {
  const normalized = normalizeVoiceText(text);
  if (!normalized) {
    return null;
  }

  for (const command of COMMAND_PATTERNS) {
    const match = normalized.match(command.pattern);
    if (!match) {
      continue;
    }

    const rawContent = normalized.slice(match[0].length).trim();
    const content = rawContent || normalized;

    if (command.kind === 'reminder') {
      const reminder = parseReminder(content);
      return {
        kind: command.kind,
        eventType: command.eventType,
        content: reminder.title,
        reminder,
      };
    }

    return {
      kind: command.kind,
      eventType: command.eventType,
      content,
    };
  }

  return null;
}

export function normalizeVoiceText(text: string) {
  return text.trim().replace(/\s+/g, ' ');
}

function parseReminder(content: string) {
  const normalized = normalizeVoiceText(content);
  const { remindAt, textWithoutDate } = inferReminderTime(normalized);
  const title = textWithoutDate.trim() || normalized || 'Reminder';

  return {
    title,
    remindAt,
  };
}

function inferReminderTime(text: string) {
  const now = new Date();
  const lower = text.toLowerCase();
  const inMinutes = lower.match(/\b(?:через\s+)?(\d{1,3})\s*(?:минут|минуты|минуту|minutes?|mins?)\b/);
  const inHours = lower.match(/\b(?:через\s+)?(\d{1,2})\s*(?:час|часа|часов|hours?|hrs?)\b/);

  if (inMinutes) {
    const minutes = Number(inMinutes[1]);
    return {
      remindAt: new Date(now.getTime() + minutes * 60 * 1000),
      textWithoutDate: removeMatchedPhrase(text, inMinutes[0]),
    };
  }

  if (inHours) {
    const hours = Number(inHours[1]);
    return {
      remindAt: new Date(now.getTime() + hours * 60 * 60 * 1000),
      textWithoutDate: removeMatchedPhrase(text, inHours[0]),
    };
  }

  if (/\b(завтра|tomorrow)\b/.test(lower)) {
    const remindAt = new Date(now);
    remindAt.setDate(remindAt.getDate() + 1);
    remindAt.setHours(9, 0, 0, 0);
    return {
      remindAt,
      textWithoutDate: removeMatchedPhrase(text, lower.includes('завтра') ? 'завтра' : 'tomorrow'),
    };
  }

  if (/\b(сегодня|today)\b/.test(lower)) {
    const remindAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return {
      remindAt,
      textWithoutDate: removeMatchedPhrase(text, lower.includes('сегодня') ? 'сегодня' : 'today'),
    };
  }

  return {
    remindAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    textWithoutDate: text,
  };
}

function removeMatchedPhrase(text: string, phrase: string) {
  return normalizeVoiceText(text.replace(new RegExp(escapeRegExp(phrase), 'i'), ''));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
