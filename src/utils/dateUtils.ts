export const generateSundays = (): Date[] => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const sundays: Date[] = [];
  
  // Generate sundays for current month and next 3 months
  for (let monthOffset = 0; monthOffset < 4; monthOffset++) {
    const targetDate = new Date(currentYear, today.getMonth() + monthOffset, 1);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    
    // Find all Sundays in this month
    const date = new Date(targetYear, targetMonth, 1);
    while (date.getMonth() === targetMonth) {
      if (date.getDay() === 0) { // 0 is Sunday
        sundays.push(new Date(date));
      }
      date.setDate(date.getDate() + 1);
    }
  }
  
  return sundays;
};

export const groupSchedulesByMonth = (schedules: any[]): { [key: string]: any[] } => {
  const groups: { [key: string]: any[] } = {};
  
  schedules.forEach(schedule => {
    const date = new Date(schedule.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push({ ...schedule, monthName });
  });
  
  return groups;
};

export const generateSundaysForMonth = (year: number, month: number): Date[] => {
  const sundays: Date[] = [];
  const date = new Date(year, month, 1);
  
  // Find all Sundays in this specific month
  while (date.getMonth() === month) {
    if (date.getDay() === 0) { // 0 is Sunday
      sundays.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }
  
  return sundays;
};

export const generateSundaysForCurrentAndNext = (): Date[] => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const currentMonthSundays = generateSundaysForMonth(currentYear, currentMonth);
  
  // Next month
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonthSundays = generateSundaysForMonth(nextYear, nextMonth);
  
  return [...currentMonthSundays, ...nextMonthSundays];
};

export const getMonthInfo = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  return {
    key: `${year}-${month}`,
    name: date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
    year,
    month
  };
};

export const getAdjacentMonths = (year: number, month: number) => {
  // Previous month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  
  // Next month
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  
  return {
    previous: getMonthInfo(prevYear, prevMonth),
    current: getMonthInfo(year, month),
    next: getMonthInfo(nextYear, nextMonth)
  };
};