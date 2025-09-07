import { useState, useRef, useEffect } from 'react';
import EventBlock from './EventBlock.jsx';
import SidePanel from './SidePanel.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle, faClock } from '@fortawesome/free-solid-svg-icons';

function ScheduleGrid({
  events,
  setEvents,
  gridInterval,
  gridStartTime,
  gridEndTime,
  selectedDates,
  saveToHistory,
  isModalOpen,
  setIsModalOpen,
  handleSaveEvent,
  setActiveSmallEventIndex,
  activeSmallEventIndex,
  setEditingIndex,
  setIsReminderModalOpen,
  handleDelete,
  showCurrentTime,
  setIsMultiDay,
  isPreview,
  isOriginal
}) {
  const [isSmallEvent, setIsSmallEvent] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTimeTooltip, setShowTimeTooltip] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const gridRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const getCurrentTimePosition = () => {
    const startTime = parseTime(gridStartTime);
    const endTime = parseTime(gridEndTime);
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    if (currentMinutes < startMinutes) return 0;
    if (currentMinutes > endMinutes) return 100;
    return ((currentMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
  };

  const parseTime = (timeStr) => {
    if (!timeStr) {
      console.error('Empty time string provided, defaulting to 00:00');
      return new Date(0);
    }
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) {
      console.error(`Invalid time format: "${timeStr}", defaulting to 00:00`);
      return new Date(0);
    }
    const [, hoursStr, minutesStr, period] = match;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(hours) || isNaN(minutes)) {
      console.error(`Failed to parse hours (${hoursStr}) or minutes (${minutesStr}) from "${timeStr}"`);
      return new Date(0);
    }
    if (period) {
      hours = period.toUpperCase() === 'PM' && hours !== 12 ? hours + 12 : hours;
      hours = period.toUpperCase() === 'AM' && hours === 12 ? 0 : hours;
    }
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const calculateOverlaps = (dayEvents) => {
    if (!Array.isArray(dayEvents) || dayEvents.length === 0) {
      return [];
    }
    const sortedEvents = dayEvents
      .filter(event => {
        if (!event || !event.id || !event.startDate || !event.endDate || !event.start || !event.end) {
          console.error('Invalid event in calculateOverlaps:', event);
          return false;
        }
        return true;
      })
      .map((ev, idx) => ({
        ...ev,
        index: idx,
        startMinutes: parseTime(ev.start).getHours() * 60 + parseTime(ev.start).getMinutes(),
        endMinutes: parseTime(ev.end).getHours() * 60 + parseTime(ev.end).getMinutes(),
      }))
      .sort((a, b) => a.startMinutes - b.startMinutes || a.index - b.index);

    const positions = new Array(sortedEvents.length).fill().map(() => ({
      overlapCount: 1,
      positionIndex: 0,
    }));
    let groups = [];
    let unusedEvents = [...sortedEvents];
    let usedEventIndices = new Set();

    while (unusedEvents.length > 0) {
      const parent = unusedEvents[0];
      let group = [parent];
      unusedEvents.forEach((ev, idx) => {
        if (
          ev.index !== parent.index &&
          ev.startMinutes < parent.endMinutes &&
          ev.endMinutes > parent.startMinutes
        ) {
          group.push(ev);
        }
      });
      groups.push(group);
      group.forEach(ev => usedEventIndices.add(ev.index));
      unusedEvents = unusedEvents.filter(ev => !usedEventIndices.has(ev.index));
      group.forEach((ev, positionIndex) => {
        positions[ev.index] = {
          overlapCount: group.length,
          positionIndex: positionIndex,
        };
      });
    }

    return sortedEvents.map((ev, idx) => ({
      ...ev,
      overlapCount: positions[idx].overlapCount,
      positionIndex: positions[idx].positionIndex,
    }));
  };

  const getHourlyLabels = () => {
    const labels = [];
    const start = Math.floor(parseTime(gridStartTime).getHours() + parseTime(gridStartTime).getMinutes() / 60);
    const end = Math.ceil(parseTime(gridEndTime).getHours() + parseTime(gridEndTime).getMinutes() / 60);
    for (let hour = start; hour <= end; hour++) {
      const h = hour % 12 || 12;
      const period = hour < 12 || hour === 24 ? 'AM' : 'PM';
      labels.push(`${h}:00 ${period}`);
    }
    return labels;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Separate multi-day and single-day events
  const multiDayEvents = events.filter(event => event.startDate !== event.endDate);
  const singleDayEvents = events.filter(event => event.startDate === event.endDate);

  // Process single-day events with overlaps
  const eventsWithOverlaps = selectedDates.map(date => ({
    date,
    events: calculateOverlaps(singleDayEvents.filter(event => event.startDate === date)),
  }));

  // Calculate multi-day event positions
  const multiDayEventsWithPositions = multiDayEvents.map((event, index) => {
    const startIndex = selectedDates.indexOf(event.startDate);
    const endIndex = selectedDates.indexOf(event.endDate);
    const startCol = startIndex >= 0 ? startIndex : 0;
    const endCol = endIndex >= 0 ? endIndex : selectedDates.length - 1;
    const width = ((endCol - startCol + 1) / selectedDates.length) * 100;
    const left = (startCol / selectedDates.length) * 100;
    return { ...event, startCol, endCol, width, left, multiDayIndex: index };
  });

  return (
    <div className="schedule-container">
      <div className="time-labels">
        {getHourlyLabels().map((time, i) => (
          <div
            key={`time-label-${time}-${i}`}
            className="time-label"
            style={{ top: `${(i / (getHourlyLabels().length - 1)) * 100 + (multiDayEvents.length * 4) + 6}vh` }}
          >
            {time}
          </div>
        ))}
      </div>

      {selectedDates.length > 0 && (
        <div className="date-row" style={{
          display: 'flex',
          width: '95%',
          position: 'absolute',
          top: '10px',
          left: '70px',
        }}>
          {selectedDates.map((date, index) => (
            <div
              key={`selected-date-${index}`}
              className="text-color text-sm text-center"
              style={{
                width: `${100 / selectedDates.length}%`,
                padding: '4px',
                fontWeight: date === today ? 'bold' : 'normal',
                color: date === today ? 'red' : 'var(--text-color)',
              }}
            >
              {(() => {
                const [year, month, day] = date.split('-');
                return `${monthNames[parseInt(month) - 1].substring(0,3)} ${parseInt(day)}`;
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Multi-day events container */}
      <div className="multi-day-events" style={{
        position: 'absolute',
        top: '40px',
        left: '70px',
        width: '95%',
        height: '40px',
        zIndex: 5,
      }}>
        {multiDayEventsWithPositions.map(event => (
          <EventBlock
            key={`multi-day-${event.id}-${event.multiDayIndex}`}
            event={event}
            index={event.multiDayIndex}
            startHour={parseTime(gridStartTime).getHours() + parseTime(gridStartTime).getMinutes() / 60}
            endHour={parseTime(gridEndTime).getHours() + parseTime(gridEndTime).getMinutes() / 60}
            gridInterval={gridInterval}
            setEvents={setEvents}
            saveToHistory={saveToHistory}
            gridRef={gridRef}
            setEditingIndex={setEditingIndex}
            setActiveSmallEventIndex={setActiveSmallEventIndex}
            activeSmallEventIndex={activeSmallEventIndex}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            isSmallEvent={isSmallEvent}
            setIsSmallEvent={setIsSmallEvent}
            handleSaveEvent={handleSaveEvent}
            setIsReminderModalOpen={setIsReminderModalOpen}
            handleDelete={handleDelete}
            gridEndTime={gridEndTime}
            gridStartTime={gridStartTime}
            events={multiDayEvents}
            isMultiDay={true}
            setIsMultiDay={setIsMultiDay}
          />
        ))}
      </div>

      <div className="schedule-grid" ref={gridRef} style={{ display: 'flex', width: '95%', left: `70px`, position: 'absolute', top: `${40+(multiDayEvents.length*23)}px` }}>
        {showCurrentTime && selectedDates.includes(today) && currentTime >= parseTime(gridStartTime) && currentTime <= parseTime(gridEndTime) && (
          <div
            style={{
              position: 'absolute',
              top: `${getCurrentTimePosition()}%`,
              left: `${(selectedDates.indexOf(today) / selectedDates.length) * 100}%`,
              width: `${100 / selectedDates.length}%`,
              height: '2px',
              backgroundColor: 'black',
              zIndex: 10,
              display: 'flex',
              justifyContent: 'center' /* Centers flex items horizontally along the main axis */
            }}
            onMouseOver={() => setShowTimeTooltip(true)}
            onMouseLeave={() => setShowTimeTooltip(false)}
          >
            <div>
              <span className="fa-layers fa-fw">
                <FontAwesomeIcon icon={faCircle} transform="up-11" style={{ color: 'black', fontSize: '15px', textAlign: 'center' }} />
                <FontAwesomeIcon icon={faClock} transform="up-13" style={{ color: 'var(--event-block-color)', fontSize: '13px', textAlign: 'center' }} />
              </span>
            </div>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '-28px',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                opacity: showTimeTooltip ? 1 : 0,
              }}
            >
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}

        {eventsWithOverlaps.map(({ date, events: dayEvents }, colIndex) => (
          <div
            key={`day-column-${date}`}
            style={{
              backgroundColor: `var(--secondary-text-color)`,
              width: `${100 / selectedDates.length}%`,
              position: 'relative',
              borderRight: colIndex < selectedDates.length - 1 ? '1px solid var(--border-color)' : 'none',
            }}
          >
            {Array.from({ length: selectedDates.length }).map((_, i) => (
              <div
                key={`vertical-line-${i}`}
                className="border-t border-color border-b border-color bg-[var(--button-color)]"
                style={{ zIndex: '1', position: 'absolute', marginLeft: '100%', height: `100%`, width: '1px', }}
              ></div>
            ))}
            {Array.from({ length: getHourlyLabels().length - 1 }).map((_, i) => (
              <div
                key={`grid-line-${date}-${i}`}
                className="border-t border-color border-b border-color"
                style={{ height: `${100 / (getHourlyLabels().length - 1)}vh` }}
              ></div>
            ))}
            {dayEvents.map((event, eventIndex) => (
              <EventBlock
                key={`${event.id}-${event.date}`}
                event={event}
                index={eventIndex}
                startHour={parseTime(gridStartTime).getHours() + parseTime(gridStartTime).getMinutes() / 60}
                endHour={parseTime(gridEndTime).getHours() + parseTime(gridEndTime).getMinutes() / 60}
                gridInterval={gridInterval}
                setEvents={setEvents}
                saveToHistory={saveToHistory}
                gridRef={gridRef}
                setEditingIndex={setEditingIndex}
                setActiveSmallEventIndex={setActiveSmallEventIndex}
                activeSmallEventIndex={activeSmallEventIndex}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                isSmallEvent={isSmallEvent}
                setIsSmallEvent={setIsSmallEvent}
                handleSaveEvent={handleSaveEvent}
                setIsReminderModalOpen={setIsReminderModalOpen}
                handleDelete={handleDelete}
                gridEndTime={gridEndTime}
                gridStartTime={gridStartTime}
                events={dayEvents}
                isPreview={isPreview}
                isOriginal={isOriginal}
              />
            ))}
          </div>
        ))}
      </div>

      {activeSmallEventIndex !== null && (
        <SidePanel
          events={events}
          activeSmallEventIndex={activeSmallEventIndex}
          setEditingIndex={setEditingIndex}
          setActiveSmallEventIndex={setActiveSmallEventIndex}
          gridStartTime={gridStartTime}
          setIsModalOpen={setIsModalOpen}
          saveToHistory={saveToHistory}
          setEvents={setEvents}
        />
      )}
    </div>
  );
}

export default ScheduleGrid;