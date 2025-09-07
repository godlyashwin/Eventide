export const parseTime = (timeStr) => {
  if (!timeStr) {
    console.warn('Empty time string provided, defaulting to 00:00');
    return new Date(0);
  }
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    console.error(`Invalid time format: "${timeStr}", defaulting to 00:00`);
    return new Date(0);
  }
  const [, hoursStr, minutesStr, period] = match;
  let hours = parseInt(hoursStr, 10);
  console.log('hours:',hours);
  const minutes = parseInt(minutesStr, 10);
  console.log('minutes:',minutes);
  if (isNaN(hours) || isNaN(minutes)) {
    console.error(`Failed to parse hours (${hoursStr}) or minutes (${minutesStr}) from "${timeStr}"`);
    return new Date(0);
  }
  console.log('period:',period);
  if (period) {
    // Logic: 
    // If the period is PM, that means its the SECOND half of the 12-hour system
    // This means that the hour needs to be added by 12 (2:00 PM -> 14:00 Military Time)
    // Else keep it the same
    hours = period.toUpperCase() === 'PM' && hours !== 12 ? hours + 12 : hours;
  }
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const calculatePosition = (event, gridStartTime, gridEndTime) => {
  const start = parseTime(event.start);
  const end = parseTime(event.end);
  const startMinutes = (start.getHours() + start.getMinutes() / 60 - parseTime(gridStartTime).getHours() - parseTime(gridStartTime).getMinutes() / 60) * 60;
  const duration = (end.getHours() + end.getMinutes() / 60 - start.getHours() - start.getMinutes() / 60) * 60;
  const totalMinutes = ((parseTime(gridEndTime).getHours() + parseTime(gridEndTime).getMinutes() / 60) - (parseTime(gridStartTime).getHours() + parseTime(gridStartTime).getMinutes() / 60)) * 60;
  const top = Math.max(0, (startMinutes / totalMinutes) * 100); // Sets it to 0 if top is negative (Breaks the schedule boundary)
  const height = (duration / totalMinutes) * 100;
  console.log(`top: ${top}, height: ${height}`);
  return { top: `${top}%`, height: `${height}%` };
};

export const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const period = hours < 12 || hours === 24 ? 'AM' : 'PM';
  const h12 = hours % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
};
/*
Use this to delete a specific event manually
fetch('http://127.0.0.1:5000/delete_schedule/1', {
  method: 'DELETE'
})
  .then(response => response.json())
  .then(data => console.log('Delete response:', data))
  .catch(error => console.error('Error deleting event:', error));
*/