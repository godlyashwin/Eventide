import { useState } from 'react';
import { parseTime } from './utils';

function ReminderModal({ event, dateParam, setIsModalOpen, handleSaveEvent, gridInterval, setEditingIndex }) {
  console.log('event received by reminderModal:',event);
  console.log('eventID recieved:', event.id);
  console.log('date:',dateParam);
  const [title, setTitle] = useState(event.title || '');
  const [start, setStart] = useState(event.start || '09:00 AM');
  const [date, setDate] = useState(dateParam.date || `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`);
  const [duration, setDuration] = useState(15); // Default duration in minutes
  const [urgency, setUrgency] = useState(event.urgency || 'trivial');

  const to24Hour = (time12h) => {
    if (!time12h) return '00:00';
    const match = time12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) {
      console.error(`Invalid time format: "${time12h}"`);
      return time12h;
    }
    const [, hoursStr, minutes, period] = match;
    let hours = parseInt(hoursStr, 10);
    if (period) {
      hours = period.toUpperCase() === 'PM' && hours !== 12 ? hours + 12 : hours;
      hours = period.toUpperCase() === 'AM' && hours === 12 ? 0 : hours;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  const to12Hour = (time24h) => {
    if (!time24h) return '12:00 AM';
    const match = time24h.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      console.error(`Invalid time format: "${time24h}"`);
      return time24h;
    }
    const [, hoursStr, minutes] = match;
    let hours = parseInt(hoursStr, 10);
    const period = hours < 12 || hours === 24 ? 'AM' : 'PM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes.padStart(2, '0')} ${period}`;
  };

  const snapToGrid = (time) => {
    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) {
      console.error(`Invalid time format for snapToGrid: "${time}"`);
      return time;
    }
    const [, hoursStr, minutesStr, period] = match;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (period) {
      hours = period.toUpperCase() === 'PM' && hours !== 12 ? hours + 12 : hours;
      hours = period.toUpperCase() === 'AM' && hours === 12 ? 0 : hours;
    }
    const totalMinutes = hours * 60 + minutes;
    const snappedMinutes = Math.round(totalMinutes / gridInterval) * gridInterval;
    const snappedHours = Math.floor(snappedMinutes / 60);
    const snappedMins = snappedMinutes % 60;
    const h12 = snappedHours % 12 || 12;
    const p = snappedHours < 12 || snappedHours === 24 ? 'AM' : 'PM';
    return `${h12.toString().padStart(2, '0')}:${snappedMins.toString().padStart(2, '0')} ${p}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (dateParam.id !== undefined && !dateParam.id) {
      console.error('Event ID is missing for editing');
      alert('Error: Event ID is missing for update. Please try again.');
      return;
    }
    const snappedStart = snapToGrid(start);
    const startTime = parseTime(snappedStart);
    const durationMinutes = parseInt(duration, 10);
    if (isNaN(durationMinutes) || durationMinutes < 1) {
      alert('Duration must be a positive number');
      return;
    }
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000); // Calculate end based on duration
    const end = `${(endTime.getHours() % 12 || 12).toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')} ${endTime.getHours() < 12 || endTime.getHours() === 24 ? 'AM' : 'PM'}`;
    console.log('endTime:',endTime);
    console.log('end:',end);
    console.log('event:',event);
      handleSaveEvent({
      id: event.id || undefined,
      date,
      title,
      start: snappedStart,
      end,
      description: '',
      locked: false,
      type: 'reminder',
      urgency
    });
    setIsModalOpen(false);
    setEditingIndex(null);
  };

  const urgencyOptions = ['trivial', 'ongoing', 'attention-needed', 'important', 'critical'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-bg-color p-6 rounded-lg border border-color max-w-md w-full">
        <h3 className="text-color text-lg font-bold mb-4">{event.id ? 'Edit Reminder' : 'New Reminder'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
              placeholder="Reminder Date"
            />
          </div>
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
              placeholder="Reminder Title"
            />
          </div>
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">Time</label>
            <input
              type="time"
              value={to24Hour(start)}
              onChange={(e) => setStart(to12Hour(e.target.value))}
              step={gridInterval * 60}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
            />
          </div>
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="1"
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
              placeholder="Duration in minutes"
            />
          </div>
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">Urgency</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
            >
              {urgencyOptions.map(option => (
                <option key={option} value={option}>
                  {option.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              className="new-event-btn"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 highlight-bg text-color text-sm font-bold leading-normal tracking-[0.015em]"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReminderModal;