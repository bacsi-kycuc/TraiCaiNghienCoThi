/**
 * Utilities for calculating Weekly Voting Cycles (Monday to Sunday)
 */

export interface WeekDetails {
  weekId: string;
  prevWeekId: string;
  weekLabel: string;
  prevWeekLabel: string;
  monday: Date;
  sunday: Date;
}

export function getWeekDetails(dateInput: Date = new Date()): WeekDetails {
  const d = new Date(dateInput);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  
  // Calculate offset to Monday (1)
  // If Sunday (0), distance is -6 days. Otherwise, 1 - day.
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Previous week calculation
  const prevMonday = new Date(monday);
  prevMonday.setDate(monday.getDate() - 7);
  prevMonday.setHours(0, 0, 0, 0);

  const prevSunday = new Date(sunday);
  prevSunday.setDate(sunday.getDate() - 7);
  prevSunday.setHours(23, 59, 59, 999);

  const formatId = (dt: Date) => {
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `week_${yyyy}_${mm}_${dd}`;
  };

  const formatDisplay = (startDt: Date, endDt: Date) => {
    const sD = String(startDt.getDate()).padStart(2, '0');
    const sM = String(startDt.getMonth() + 1).padStart(2, '0');
    const eD = String(endDt.getDate()).padStart(2, '0');
    const eM = String(endDt.getMonth() + 1).padStart(2, '0');
    const y = endDt.getFullYear();
    return `${sD}/${sM} - ${eD}/${eM}/${y}`;
  };

  return {
    weekId: formatId(monday),
    prevWeekId: formatId(prevMonday),
    weekLabel: formatDisplay(monday, sunday),
    prevWeekLabel: formatDisplay(prevMonday, prevSunday),
    monday,
    sunday,
  };
}

export function getWeekTimeRemaining(sunday: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
} {
  const now = Date.now();
  const diff = sunday.getTime() - now;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formatted: '00g 00p',
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let formatted = '';
  if (days > 0) {
    formatted = `${days} ngày ${hours} giờ`;
  } else if (hours > 0) {
    formatted = `${hours} giờ ${minutes} phút`;
  } else {
    formatted = `${minutes} phút ${seconds} giây`;
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    formatted,
  };
}
