import type { ActivityContent } from './content';

export function getBangkokDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function activityGroup(activity: ActivityContent, today: string): number {
  const start = activity.startDate;
  const end = activity.endDate ?? start;
  if (start && start <= today && end && end >= today) return 0;
  if (start && start > today) return 1;
  if (!start && !end) return 2;
  return 3;
}

export function sortActivities(
  activities: readonly ActivityContent[],
  today = getBangkokDate()
): ActivityContent[] {
  return [...activities].sort((left, right) => {
    const groupDifference = activityGroup(left, today) - activityGroup(right, today);
    if (groupDifference !== 0) return groupDifference;
    const leftDate = left.startDate ?? left.endDate ?? '';
    const rightDate = right.startDate ?? right.endDate ?? '';
    return activityGroup(left, today) === 3
      ? rightDate.localeCompare(leftDate)
      : leftDate.localeCompare(rightDate);
  });
}
