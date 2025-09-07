import { useState } from 'react';
import { parseTime } from './utils';

function EventModal({ event, setIsModalOpen, setEditingIndex, handleSaveEvent, gridInterval, isMultiDay }) {
  console.log('event modal:',event.title,'is multiday?',isMultiDay || false)
  const [title, setTitle] = useState(event.title || '');
  const [start, setStart] = useState(event.start || '09:00 AM');
  const [end, setEnd] = useState(event.end || '05:00 PM');
  const [description, setDescription] = useState(event.description || '');
  const [locked, setLocked] = useState(event.locked || false);
  const currentDate = new Date();
  const defaultDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
  const [startDate, setStartDate] = useState(event.startDate || defaultDate);
  const [endDate, setEndDate] = useState(event.endDate || defaultDate);
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
    if (event.id !== undefined && !event.id) {
      console.error('Event ID is missing for editing');
      alert('Error: Event ID is missing for update. Please try again.');
      return;
    }
    if (startDate > endDate) {
      alert('End date must be on or after start date.');
      return;
    }
    const snappedStart = snapToGrid(start);
    const snappedEnd = snapToGrid(end);
    const startTime = parseTime(snappedStart);
    const endTime = parseTime(snappedEnd);
    if (startTime >= endTime && startDate === endDate) {
      alert('End time must be after start time for events on the same day.');
      return;
    }
    if (isMultiDay) {
      handleSaveEvent({
        id: event.id,
        startDate,
        endDate,
        title,
        start: snappedStart,
        end: snappedEnd,
        description,
        locked,
        type: event.type || 'event',
        urgency
      });
    } else {
      handleSaveEvent({
        id: event.id,
        startDate,
        endDate: startDate,
        title,
        start: snappedStart,
        end: snappedEnd,
        description,
        locked,
        type: event.type || 'event',
        urgency
      });
    }
    setIsModalOpen(false);
    setEditingIndex(null);
  };

  const urgencyOptions = ['trivial', 'ongoing', 'attention-needed', 'important', 'critical'];

  if (!isMultiDay) {
    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-bg-color p-6 rounded-lg border border-color max-w-md w-full">
        <h3 className="text-color text-lg font-bold mb-4">{event.id ? 'Edit Event' : 'New Event'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
              placeholder="Event Date"
            />
          </div>
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
              placeholder="Event Title"
            />
          </div>
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">Start Time</label>
            <input
              type="time"
              value={to24Hour(start)}
              onChange={(e) => setStart(to12Hour(e.target.value))}
              step={gridInterval * 60}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
            />
          </div>
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">End Time</label>
            <input
              type="time"
              value={to24Hour(end)}
              onChange={(e) => setEnd(to12Hour(e.target.value))}
              step={gridInterval * 60}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
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
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
              placeholder="Event Description"
            />
          </div>
          <div className="mb-4">
            <label className="text-color text-sm font-medium flex items-center">
              <input
                type="checkbox"
                checked={locked}
                onChange={(e) => setLocked(e.target.checked)}
                className="mr-2"
              />
              Locked
            </label>
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              className="new-event-btn"
              onClick={() => {
                setIsModalOpen(false);
                setEditingIndex(null);
              }}
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
  } else {
    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-bg-color p-6 rounded-lg border border-color max-w-md w-full">
        <h3 className="text-color text-lg font-bold mb-4">{event.id ? 'Edit Event' : 'New Event'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
              placeholder="Start Date"
            />
          </div>
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
              placeholder="End Date"
            />
          </div>
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
              placeholder="Event Title"
            />
          </div>
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">Start Time</label>
            <input
              type="time"
              value={to24Hour(start)}
              onChange={(e) => setStart(to12Hour(e.target.value))}
              step={gridInterval * 60}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
            />
          </div>
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">End Time</label>
            <input
              type="time"
              value={to24Hour(end)}
              onChange={(e) => setEnd(to12Hour(e.target.value))}
              step={gridInterval * 60}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
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
          <div className="mb-4">
            <label className="text-color text-sm font-medium mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
              placeholder="Event Description"
            />
          </div>
          <div className="mb-4">
            <label className="text-color text-sm font-medium flex items-center">
              <input
                type="checkbox"
                checked={locked}
                onChange={(e) => setLocked(e.target.checked)}
                className="mr-2"
              />
              Locked
            </label>
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              className="new-event-btn"
              onClick={() => {
                setIsModalOpen(false);
                setEditingIndex(null);
              }}
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
}

export default EventModal;