import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ScheduleGrid from './ScheduleGrid.jsx';
import EventModal from './EventModal.jsx';
import ReminderModal from './ReminderModal.jsx';
import { usePalette } from './PaletteContext.jsx';
import { parseTime } from './utils.jsx';

function DayDetails() {
  const { selectedPalette } = usePalette();
  const location = useLocation();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(location.search);
  const dateParam = urlParams.get('date');
  const editParam = urlParams.get('edit');
  const [viewMode, setViewMode] = useState('single');
  const [selectedDates, setSelectedDates] = useState(dateParam ? [dateParam] : []);
  const [dateDisplay, setDateDisplay] = useState('No date selected');
  const [gridInterval, setGridInterval] = useState(15);
  const [gridStartTime, setGridStartTime] = useState('00:00');
  const [gridEndTime, setGridEndTime] = useState('23:59');
  const [events, setEvents] = useState([]);
  const [actionHistory, setActionHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [activeSmallEventIndex, setActiveSmallEventIndex] = useState(null);
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [rangeStartDate, setRangeStartDate] = useState(selectedDates[0] || '');
  const [rangeEndDate, setRangeEndDate] = useState('');
  const [showCurrentTime, setShowCurrentTime] = useState(true);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const actionsDropdownRef = useRef(null);
  const maxHistorySize = 10;
  const debug = false;
  const [isImproveModalOpen, setIsImproveModalOpen] = useState(false);
  const [allowedMods, setAllowedMods] = useState({
    times: false,
    dates: false,
    locked: false,
    name: false,
    description: false,
    urgency: false,
  });
  const [previewSchedule, setPreviewSchedule] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOriginalEvents, setShowOriginalEvents] = useState(false);

  useEffect(() => {
    if (selectedDates.length > 0) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      if (viewMode === 'single') {
        const [year, month, day] = selectedDates[0].split('-');
        setDateDisplay(`${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`);
      } else if (viewMode === 'week') {
        const startDate = new Date(selectedDates[0]);
        const endDate = new Date(selectedDates[selectedDates.length - 1]);
        setDateDisplay(
          `${monthNames[startDate.getMonth()]} ${startDate.getDate()}, ${startDate.getFullYear()} - ` +
          `${monthNames[endDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`
        );
      } else if (viewMode === 'custom' || viewMode === 'range') {
        setDateDisplay(`${selectedDates.length} day${selectedDates.length > 1 ? 's' : ''} selected`);
      }
      fetchEvents(selectedDates);
    } else {
      setDateDisplay('No date selected');
    }
  }, [selectedDates, viewMode]);

  useEffect(() => {
    consoleDebug('DayDetails modal open:', { editingIndex, event: editingIndex !== null ? events[editingIndex] : 'New event' });
  }, [isEventModalOpen, editingIndex, events]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target)) {
        setIsActionsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const consoleDebug = (logger) => {
    if (process.env.NODE_ENV !== 'production' && debug) {
      console.log(logger);
    }
  };

  const fetchEvents = async (dates) => {
    try {
      const eventPromises = dates.map(date =>
        fetch(`http://127.0.0.1:5000/schedule?date=${date}`).then(res => res.json())
      );
      const eventResponses = await Promise.all(eventPromises);
      const eventMap = new Map();
      eventResponses.forEach((data, index) => {
        if (!data.schedule) {
          console.error(`Failed to fetch events for date ${dates[index]}: No schedule data`);
          return;
        }
        data.schedule
          .filter(event => {
            if (!event.id || (!event.startDate && !event.date) || !event.start || !event.end || !event.urgency) {
              console.error(`Invalid event for date ${dates[index]}:`, event);
              return false;
            }
            return true;
          })
          .forEach(event => {
            const primaryDate = event.startDate || event.date;
            if (!eventMap.has(event.id)) {
              eventMap.set(event.id, {
                id: event.id,
                startDate: event.startDate || event.date,
                endDate: event.endDate || event.date,
                title: event.title || 'Untitled Event',
                start: event.start,
                end: event.end,
                description: event.description || '',
                locked: event.locked || false,
                type: event.type || 'event',
                urgency: event.urgency,
                primaryDate,
              });
            }
          });
      });
      const allEvents = Array.from(eventMap.values());
      setEvents(allEvents);
      setActionHistory([]);
      setRedoHistory([]);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    }
  };

  const handleSaveEvent = async (eventData) => {
    try {
      const payload = {
        eventInfo: {
          startDate: eventData.startDate || eventData.date,
          endDate: eventData.endDate || eventData.date,
          title: eventData.title || 'Untitled Event',
          start: eventData.start,
          end: eventData.end,
          description: eventData.description || '',
          locked: eventData.locked || false,
          urgency: eventData.urgency,
          type: eventData.type || 'event',
        },
      };
      let response;
      let data;
      let action;
      if (eventData.id) {
        const oldEvent = events.find(e => e.id === eventData.id);
        response = await fetch(`http://127.0.0.1:5000/update_schedule/${eventData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to update event');
        }
        action = {
          type: 'update',
          id: eventData.id,
          oldEvent: { ...oldEvent },
          newEvent: { id: eventData.id, ...payload.eventInfo },
        };
        setEvents(prev => prev.map(e => (e.id === eventData.id ? { id: eventData.id, ...payload.eventInfo } : e)));
      } else {
        for (let key in payload.eventInfo) {
          console.log(key + ': ' + payload.eventInfo[key]);
        }
        response = await fetch('http://127.0.0.1:5000/create_schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to create event');
        }
        action = {
          type: 'create',
          event: { id: data.id, ...payload.eventInfo },
        };
        setEvents(prev => [...prev, { id: data.id, ...payload.eventInfo }]);
      }
      setActionHistory(prev => {
        const newHistory = [...prev, action];
        if (newHistory.length > maxHistorySize) newHistory.shift();
        return newHistory;
      });
      setRedoHistory([]);
      setIsEventModalOpen(false);
      setIsReminderModalOpen(false);
    } catch (error) {
      console.error('Error saving event:', error);
      alert(`Failed to save event: ${error.message}`);
    }
  };

  const handleGridIntervalChange = (e) => {
    const newInterval = parseInt(e.target.value);
    setGridInterval(isNaN(newInterval) || newInterval < 1 ? 15 : newInterval);
  };

  const handleGridStartTimeChange = (e) => {
    const newStartTime = e.target.value;
    const startDate = parseTime(newStartTime);
    const endDate = parseTime(gridEndTime);
    if (startDate >= endDate) {
      console.error('Start time must be before end time.');
      return;
    }
    setGridStartTime(newStartTime);
  };

  const handleGridEndTimeChange = (e) => {
    const newEndTime = e.target.value;
    const startDate = parseTime(gridStartTime);
    const endDate = parseTime(newEndTime);
    if (endDate <= startDate) {
      console.error('End time must be after start time.');
      return;
    }
    setGridEndTime(newEndTime);
  };

  const deleteEvent = async (eventID) => {
    try {
      const id = parseInt(eventID, 10);
      if (isNaN(id)) {
        throw new Error(`Invalid event ID: ${eventID}`);
      }
      const deletedEvent = events.find(e => e.id === id);
      if (!deletedEvent) {
        throw new Error(`Event with ID ${id} not found`);
      }
      const response = await fetch(`http://127.0.0.1:5000/delete_schedule/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete event');
      }
      setEvents(prev => {
        const newEvents = prev.filter(e => e.id !== id);
        setActionHistory(prevHistory => {
          const newHistory = [...prevHistory, { type: 'delete', event: { ...deletedEvent } }];
          if (newHistory.length > maxHistorySize) newHistory.shift();
          return newHistory;
        });
        setRedoHistory([]);
        return newEvents;
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(`Failed to delete event: ${error.message}`);
    }
  };

  const undoAction = async () => {
    if (actionHistory.length === 0) {
      consoleDebug('No actions to undo');
      return;
    }
    try {
      const lastAction = actionHistory[actionHistory.length - 1];
      let newEvents = [...events];
      if (lastAction.type === 'create') {
        const response = await fetch(`http://127.0.0.1:5000/delete_schedule/${lastAction.event.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to undo create action');
        }
        newEvents = newEvents.filter(e => e.id !== lastAction.event.id);
      } else if (lastAction.type === 'update') {
        const response = await fetch(`http://127.0.0.1:5000/update_schedule/${lastAction.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventInfo: lastAction.oldEvent }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to undo update action');
        }
        newEvents = newEvents.map(e => (e.id === lastAction.id ? { ...lastAction.oldEvent } : e));
      } else if (lastAction.type === 'delete') {
        const response = await fetch('http://127.0.0.1:5000/create_schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventInfo: lastAction.event }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to undo delete action');
        }
        newEvents.push({ ...lastAction.event, id: data.id });
      }
      setEvents(newEvents);
      setRedoHistory(prev => {
        const newRedo = [...prev, lastAction];
        if (newRedo.length > maxHistorySize) newRedo.shift();
        return newRedo;
      });
      setActionHistory(prev => prev.slice(0, -1));
      setActiveSmallEventIndex(null);
      setIsEventModalOpen(false);
      setIsReminderModalOpen(false);
    } catch (error) {
      console.error('Error during undo:', error);
      alert(`Failed to undo: ${error.message}`);
    }
  };

  const redoAction = async () => {
    if (redoHistory.length === 0) {
      consoleDebug('No actions to redo');
      return;
    }
    try {
      const lastRedo = redoHistory[redoHistory.length - 1];
      let newEvents = [...events];
      if (lastRedo.type === 'create') {
        const response = await fetch('http://127.0.0.1:5000/create_schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventInfo: lastRedo.event }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to redo create action');
        }
        newEvents.push({ ...lastRedo.event, id: data.id });
      } else if (lastRedo.type === 'update') {
        const response = await fetch(`http://127.0.0.1:5000/update_schedule/${lastRedo.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventInfo: lastRedo.newEvent }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to redo update action');
        }
        newEvents = newEvents.map(e => (e.id === lastRedo.id ? { ...lastRedo.newEvent } : e));
      } else if (lastRedo.type === 'delete') {
        const response = await fetch(`http://127.0.0.1:5000/delete_schedule/${lastRedo.event.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to redo delete action');
        }
        newEvents = newEvents.filter(e => e.id !== lastRedo.event.id);
      }
      setEvents(newEvents);
      setRedoHistory(prev => prev.slice(0, -1));
      setActionHistory(prev => {
        const newHistory = [...prev, lastRedo];
        if (newHistory.length > maxHistorySize) newHistory.shift();
        return newHistory;
      });
      setActiveSmallEventIndex(null);
      setIsEventModalOpen(false);
      setIsReminderModalOpen(false);
    } catch (error) {
      console.error('Error during redo:', error);
      alert(`Failed to redo: ${error.message}`);
    }
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'single' && selectedDates.length > 1) {
      setSelectedDates([selectedDates[0]]);
    } else if (mode === 'week') {
      const startDate = new Date(selectedDates[0] || new Date());
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        weekDates.push(date.toISOString().split('T')[0]);
      }
      setSelectedDates(weekDates.sort());
    }
  };

  const handleAddCustomDate = () => {
    if (newDate && !selectedDates.includes(newDate)) {
      setSelectedDates(prev => [...prev, newDate].sort());
      setNewDate('');
    }
  };

  const handleRemoveCustomDate = (date) => {
    setSelectedDates(prev => prev.filter(d => d !== date));
  };

  const handleAddCustomRange = () => {
    if (!rangeStartDate || !rangeEndDate) {
      alert('Please select both start and end dates.');
      return;
    }
    const start = new Date(rangeStartDate);
    const end = new Date(rangeEndDate);
    if (end < start) {
      alert('End date must be after start date.');
      return;
    }
    const timeDiff = end - start;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
    if (daysDiff > 14) {
      alert('The selected range cannot exceed 14 days.');
      return;
    }
    const rangeDates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      rangeDates.push(d.toISOString().split('T')[0]);
    }
    setSelectedDates(rangeDates.sort());
    setRangeStartDate('');
    setRangeEndDate('');
  };

  const handleNewEvent = () => {
    setEditingIndex(null);
    setIsEventModalOpen(true);
    setIsMultiDay(false);
    setIsActionsDropdownOpen(false);
  };

  const handleNewMultiDayEvent = () => {
    setEditingIndex(null);
    setIsEventModalOpen(true);
    setIsMultiDay(true);
    setIsActionsDropdownOpen(false);
  };

  const handleNewReminder = () => {
    setEditingIndex(null);
    setIsReminderModalOpen(true);
    setIsActionsDropdownOpen(false);
  };

  const handleSubmitImprove = async () => {
    setIsLoading(true);
    setIsImproveModalOpen(false);
    const allowed = [];
    if (allowedMods.times) allowed.push('times');
    if (allowedMods.dates) allowed.push('dates');
    if (allowedMods.locked) allowed.push('locked');
    if (allowedMods.name) allowed.push('name');
    if (allowedMods.description) allowed.push('description');
    if (allowedMods.urgency) allowed.push('urgency');
    const schedule = events.map(e => ({
      description: e.description,
      end: e.end,
      endDate: e.endDate,
      id: e.id,
      locked: e.locked,
      start: e.start,
      startDate: e.startDate,
      title: e.title,
      type: e.type,
      urgency: e.urgency
    }));
    try {
      const response = await fetch('http://127.0.0.1:5000/optimize_schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, allowed_modifications: allowed }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.message) {
          alert(data.message);
        } else {
          setPreviewSchedule(data.schedule);
          setIsPreviewModalOpen(true);
        }
      } else {
        alert(data.message || 'Failed to optimize');
      }
    } catch (err) {
      console.error('Error optimizing schedule:', err);
      alert('Error optimizing schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptPreview = async () => {
    if (!previewSchedule) return;
    try {
      for (const newEvent of previewSchedule) {
        const existing = events.find(e => e.id === newEvent.id);
        if (existing) {
          await fetch(`http://127.0.0.1:5000/update_schedule/${newEvent.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventInfo: newEvent }),
          });
        }
      }
      setEvents(previewSchedule);
      setIsPreviewModalOpen(false);
      setPreviewSchedule(null);
      setShowOriginalEvents(false);
    } catch (error) {
      console.error('Error accepting preview:', error);
      alert('Failed to accept preview');
    }
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-bg-color group/design-root" style={{ fontFamily: 'Consolas, Noto Sans, sans-serif' }}>
      <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-color px-10 py-3 gap-[2.75rem]">
          <div className="flex items-center gap-4 text-color">
            <div className="size-4">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z"
                  fill="currentColor"
                ></path>
              </svg>
            </div>
            <h2 className="text-color text-lg font-bold leading-tight tracking-[-0.015em]">Eventide - Day Details</h2>
          </div>
          <div className="flex flex-1 justify-end gap-8">
            <div className="flex items-center gap-2">
              <label htmlFor="view-mode" className="text-color text-sm font-medium">View Mode</label>
              <select
                id="view-mode"
                value={viewMode}
                onChange={(e) => handleViewModeChange(e.target.value)}
                className="border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
                style={{ width: '130px' }}
              >
                <option value="single">Single Day</option>
                <option value="week">Current Week</option>
                <option value="custom">Custom Days</option>
                <option value="range">Custom Range</option>
              </select>
            </div>
            {viewMode === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
                />
                <button
                  onClick={handleAddCustomDate}
                  className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 button-bg text-color text-sm font-bold"
                  disabled={!newDate}
                >
                  <span className="truncate">Submit</span>
                </button>
                <div className="flex flex-wrap gap-2">
                  {selectedDates.map(date => (
                    <div key={date} className="flex items-center gap-1 bg-button-bg px-2 py-1 rounded">
                      <span>{date}</span>
                      <button onClick={() => handleRemoveCustomDate(date)} className="text-color">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {viewMode === 'range' && (
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <label htmlFor="range-start-date" className="text-color text-sm font-medium mb-1">Start Date</label>
                  <input
                    id="range-start-date"
                    type="date"
                    value={rangeStartDate}
                    onChange={(e) => setRangeStartDate(e.target.value)}
                    className="border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="range-end-date" className="text-color text-sm font-medium mb-1">End Date</label>
                  <input
                    id="range-end-date"
                    type="date"
                    value={rangeEndDate}
                    onChange={(e) => setRangeEndDate(e.target.value)}
                    className="border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
                  />
                </div>
                <button
                  onClick={handleAddCustomRange}
                  className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 button-bg text-color text-sm font-bold"
                  disabled={!rangeStartDate || !rangeEndDate}
                >
                  <span className="truncate">Submit</span>
                </button>
              </div>
            )}
            <div className="relative" ref={actionsDropdownRef}>
              <button
                className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 button-bg text-color text-sm font-bold"
                style={{ zIndex: '1001' }}
                onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)}
              >
                <span className="truncate">Actions</span>
              </button>
              {isActionsDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-bg-color border border-color rounded-lg shadow-lg z-10 flex flex-col"
                style={{zIndex: "1000"}}>
                  <button
                    className="flex w-full text-left p-3 text-color text-sm hover:bg-button-bg"
                    onClick={() => {
                      setIsImproveModalOpen(true);
                      setIsActionsDropdownOpen(false);
                    }}
                  >
                    Improve Schedule
                  </button>
                  <button
                    className="flex w-full text-left p-3 text-color text-sm hover:bg-button-bg"
                    onClick={handleNewEvent}
                  >
                    New Event
                  </button>
                  <button
                    className="flex w-full text-left p-3 text-color text-sm hover:bg-button-bg"
                    onClick={handleNewMultiDayEvent}
                  >
                    New Multi-Day Event
                  </button>
                  <button
                    className="flex w-full text-left p-3 text-color text-sm hover:bg-button-bg"
                    onClick={handleNewReminder}
                  >
                    New Reminder
                  </button>
                  <button
                    className="flex w-full text-left p-3 text-color text-sm hover:bg-button-bg disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={actionHistory.length === 0}
                    onClick={undoAction}
                  >
                    Undo
                  </button>
                  <button
                    className="flex w-full text-left p-3 text-color text-sm hover:bg-button-bg disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={redoHistory.length === 0}
                    onClick={redoAction}
                  >
                    Redo
                  </button>
                  <button
                    className="flex w-full text-left p-3 text-color text-sm hover:bg-button-bg"
                    onClick={() => {
                      navigate('/');
                      setIsActionsDropdownOpen(false);
                    }}
                  >
                    Back to Calendar
                  </button>
                  <button
                    className="flex w-full text-left p-3 text-color text-sm hover:bg-button-bg"
                    onClick={() => {
                      navigate('/settings');
                      setIsActionsDropdownOpen(false);
                    }}
                  >
                    Settings
                  </button>
                  <button
                    className="flex w-full text-left p-3 text-color text-sm hover:bg-button-bg"
                    onClick={() => setShowCurrentTime(!showCurrentTime)}
                  >
                    {showCurrentTime ? 'Hide Current Time' : 'Show Current Time'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="flex flex-col flex-1 overflow-auto">
          <div className="px-10 py-5">
            <div className="flex items-center gap-4 px-4 pb-3">
              <h2 id="date-display" className="text-color text-[22px] font-bold leading-tight tracking-[-0.015em] px-12">
                {dateDisplay}
              </h2>
              <div className="flex flex-col">
                <label htmlFor="grid-interval" className="text-color text-sm font-medium mb-1">Grid Interval (min)</label>
                <input
                  id="grid-interval"
                  type="number"
                  min="1"
                  value={gridInterval}
                  onChange={handleGridIntervalChange}
                  className="w-20 border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="grid-start-time" className="text-color text-sm font-medium mb-1">Start Time</label>
                <input
                  id="grid-start-time"
                  type="time"
                  value={gridStartTime}
                  onChange={handleGridStartTimeChange}
                  className="w-[120px] border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="grid-end-time" className="text-color text-sm font-medium mb-1">End Time</label>
                <input
                  id="grid-end-time"
                  type="time"
                  value={gridEndTime}
                  onChange={handleGridEndTimeChange}
                  className="w-[120px] border border-color rounded-lg p-2 text-color text-sm bg-bg-color"
                />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto px-10 pb-10">
            <ScheduleGrid
              events={events}
              setEvents={setEvents}
              gridInterval={gridInterval}
              gridStartTime={gridStartTime}
              gridEndTime={gridEndTime}
              selectedDates={selectedDates}
              saveToHistory={() => {}}
              isModalOpen={isEventModalOpen}
              setIsModalOpen={setIsEventModalOpen}
              handleSaveEvent={handleSaveEvent}
              setEditingIndex={setEditingIndex}
              setActiveSmallEventIndex={setActiveSmallEventIndex}
              activeSmallEventIndex={activeSmallEventIndex}
              setIsReminderModalOpen={setIsReminderModalOpen}
              handleDelete={deleteEvent}
              showCurrentTime={showCurrentTime}
              setIsMultiDay={setIsMultiDay}
            />
          </div>
        </div>
        {isEventModalOpen && (
          <EventModal
            event={editingIndex !== null ? events[editingIndex] : { startDate: selectedDates[0], endDate: selectedDates[0] }}
            setIsModalOpen={setIsEventModalOpen}
            setEditingIndex={setEditingIndex}
            handleSaveEvent={handleSaveEvent}
            gridInterval={gridInterval}
            isMultiDay={isMultiDay}
          />
        )}
        {isReminderModalOpen && (
          <ReminderModal
            event={editingIndex !== null ? events[editingIndex] : { startDate: selectedDates[0], endDate: selectedDates[0] }}
            dateParam={{ date: selectedDates[0] }}
            setIsModalOpen={setIsReminderModalOpen}
            handleSaveEvent={handleSaveEvent}
            gridInterval={gridInterval}
            setEditingIndex={setEditingIndex}
          />
        )}
        {isImproveModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-bg-color p-6 rounded-lg border border-color">
              <h3 className="text-color text-lg font-bold mb-4">Select Parameters to Modify</h3>
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={allowedMods.times}
                  onChange={(e) => setAllowedMods({ ...allowedMods, times: e.target.checked })}
                  className="mr-2"
                />
                Start/End Times
              </label>
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={allowedMods.dates}
                  onChange={(e) => setAllowedMods({ ...allowedMods, dates: e.target.checked })}
                  className="mr-2"
                />
                Start/End Dates
              </label>
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={allowedMods.locked}
                  onChange={(e) => setAllowedMods({ ...allowedMods, locked: e.target.checked })}
                  className="mr-2"
                />
                Locked Status
              </label>
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={allowedMods.name}
                  onChange={(e) => setAllowedMods({ ...allowedMods, name: e.target.checked })}
                  className="mr-2"
                />
                Name
              </label>
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={allowedMods.description}
                  onChange={(e) => setAllowedMods({ ...allowedMods, description: e.target.checked })}
                  className="mr-2"
                />
                Description
              </label>
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={allowedMods.urgency}
                  onChange={(e) => setAllowedMods({ ...allowedMods, description: e.target.checked })}
                  className="mr-2"
                />
                Urgency
              </label>
              <div className="flex justify-end gap-4">
                <button
                  onClick={handleSubmitImprove}
                  className="px-4 py-2 button-bg text-color rounded-lg"
                >
                  Submit
                </button>
                <button
                  onClick={() => setIsImproveModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 text-color rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {isPreviewModalOpen && previewSchedule && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-bg-color p-8 rounded-lg border border-color max-w-5xl w-full max-h-[90vh] overflow-auto">
              <h3 className="text-color text-lg font-bold mb-4">Preview Improved Schedule</h3>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showOriginalEvents}
                    onChange={(e) => setShowOriginalEvents(e.target.checked)}
                    className="mr-2"
                  />
                  Show Original Events (Translucent)
                </label>
              </div>
              <div className="flex justify-end gap-6 mt-6">
                <button
                  onClick={handleAcceptPreview}
                  className="px-6 py-3 button-bg text-color rounded-lg text-base font-semibold"
                >
                  Accept
                </button>
                <button
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setShowOriginalEvents(false);
                  }}
                  className="px-6 py-3 bg-gray-300 text-color rounded-lg text-base font-semibold"
                >
                  Decline
                </button>
              </div>
              <div className="relative">
                <ScheduleGrid
                  events={previewSchedule}
                  setEvents={() => {}}
                  gridInterval={gridInterval}
                  gridStartTime={gridStartTime}
                  gridEndTime={gridEndTime}
                  selectedDates={selectedDates}
                  saveToHistory={() => {}}
                  isModalOpen={false}
                  setIsModalOpen={() => {}}
                  handleSaveEvent={() => {}}
                  setEditingIndex={() => {}}
                  setActiveSmallEventIndex={() => {}}
                  activeSmallEventIndex={null}
                  setIsReminderModalOpen={() => {}}
                  handleDelete={() => {}}
                  showCurrentTime={false}
                  setIsMultiDay={() => {}}
                  isPreview={true}
                />
                {showOriginalEvents && (
                  <div style={{ opacity: 0.5, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    <ScheduleGrid
                      events={events}
                      setEvents={() => {}}
                      gridInterval={gridInterval}
                      gridStartTime={gridStartTime}
                      gridEndTime={gridEndTime}
                      selectedDates={selectedDates}
                      saveToHistory={() => {}}
                      isModalOpen={false}
                      setIsModalOpen={() => {}}
                      handleSaveEvent={() => {}}
                      setEditingIndex={() => {}}
                      setActiveSmallEventIndex={() => {}}
                      activeSmallEventIndex={null}
                      setIsReminderModalOpen={() => {}}
                      handleDelete={() => {}}
                      showCurrentTime={false}
                      setIsMultiDay={() => {}}
                      isPreview={true}
                      isOriginal={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {isLoading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-bg-color p-6 rounded-lg border border-color">
              <h3 className="text-color text-lg font-bold mb-4">Optimizing Schedule...</h3>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-color"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DayDetails;