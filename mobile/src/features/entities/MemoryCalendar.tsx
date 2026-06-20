import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MemoryHistoryDay } from '@voxa/shared';
import { palette, spacing } from '../../app/theme';

interface MemoryCalendarProps {
  month: Date;
  selectedDate: Date;
  days: MemoryHistoryDay[];
  canGoNextMonth: boolean;
  labels: {
    today: string;
    previousMonth: string;
    nextMonth: string;
    currentMonth: string;
  };
  onSelectDate: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export const MemoryCalendar = memo(function MemoryCalendar({
  month,
  selectedDate,
  days,
  canGoNextMonth,
  labels,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: MemoryCalendarProps) {
  const counts = useMemo(() => new Map(days.map((day) => [day.date, day.count])), [days]);
  const cells = useMemo(() => buildMonthCells(month), [month]);
  const weekdays = useMemo(() => buildWeekdays(), []);

  return (
    <View style={styles.calendar}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={labels.previousMonth} onPress={onPreviousMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>
        <View style={styles.monthBlock}>
          <Text style={styles.monthTitle}>{formatMonthTitle(month)}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={labels.currentMonth} onPress={onToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>{labels.today}</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.nextMonth}
          disabled={!canGoNextMonth}
          onPress={onNextMonth}
          style={[styles.navButton, !canGoNextMonth ? styles.navButtonDisabled : null]}
        >
          <Text style={[styles.navButtonText, !canGoNextMonth ? styles.navButtonTextDisabled : null]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdays}>
        {weekdays.map((weekday) => (
          <Text key={weekday} style={styles.weekday}>{weekday}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (!cell) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const key = formatLocalIsoDate(cell);
          const count = counts.get(key) ?? 0;
          const selected = isSameDay(cell, selectedDate);
          const today = isSameDay(cell, new Date());

          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelectDate(cell)}
              style={[styles.dayCell, selected ? styles.dayCellSelected : null, today && !selected ? styles.dayCellToday : null]}
            >
              <Text style={[styles.dayText, selected ? styles.dayTextSelected : null, today && !selected ? styles.dayTextToday : null]}>
                {cell.getDate()}
              </Text>
              <View style={[styles.dot, count ? styles.dotActive : null]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

function buildMonthCells(month: Date) {
  const first = startOfMonth(month);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const mondayBasedOffset = (first.getDay() + 6) % 7;
  const cells: Array<Date | null> = Array.from({ length: mondayBasedOffset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function buildWeekdays() {
  const monday = new Date(2026, 5, 15);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2);
  });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function formatMonthTitle(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  calendar: {
    gap: spacing.sm,
    borderRadius: 8,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  navButtonDisabled: {
    opacity: 0.45,
  },
  navButtonText: {
    color: palette.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  navButtonTextDisabled: {
    color: palette.muted,
  },
  monthBlock: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  monthTitle: {
    color: palette.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  todayButton: {
    minHeight: 28,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  todayButtonText: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  weekdays: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    color: palette.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 3,
  },
  dayCellSelected: {
    backgroundColor: palette.success,
  },
  dayCellToday: {
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.success,
  },
  dayText: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  dayTextSelected: {
    color: palette.text,
  },
  dayTextToday: {
    color: palette.success,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: palette.accentStrong,
  },
});
