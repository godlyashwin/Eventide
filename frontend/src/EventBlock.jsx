import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowCircleUp, faArrowsUpDownLeftRight, faLock, faUnlock, faArrowCircleDown, faCircle, faX, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { minutesToTime } from './utils';

function EventBlock({
  event,
  index,
  startHour,
  endHour,
  gridInterval,
  setEvents,
  saveToHistory,
  gridRef,
  setEditingIndex,
  setActiveSmallEventIndex,
  activeSmallEventIndex,
  isModalOpen,
  setIsModalOpen,
  isSmallEvent,
  setIsSmallEvent,
  handleSaveEvent,
  setIsReminderModalOpen,
  handleDelete,
  gridEndTime,
  gridStartTime,
  events,
  isMultiDay,
  setIsMultiDay,
  isPreview = false,
  isOriginal = false,
}) {
  const alertColors = {
      "trivial": 'black',
      'ongoing': 'blue',
      'attention-needed': 'orange',
      'important': 'red',
      'critical': 'purple',
    }
  const invertAlertColors = {
      "trivial": 'white',
      'ongoing': 'black',
      'attention-needed': 'black',
      'important': 'black',
      'critical': 'black',
    }
  const [isHovered, setIsHovered] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const eventRef = useRef(null);
  const isReminder = event.type === 'reminder';
  const [tempTimes, setTempTimes] = useState({
    start: event.start,
    end: event.end,
  });
  const [dragState, setDragState] = useState({
    isDragging: false,
    isResizing: false,
    handleType: null,
  });
  const dragData = useRef({
    startY: 0,
    startTop: 0,
    startHeight: 0,
    currentTop: 0,
    currentHeight: 0,
  });
  const debug = false;

  const getPixelToMinutesRatio = () => {
    const totalGridMinutes = (endHour - startHour) * 60;
    const gridHeight = gridRef.current?.clientHeight || 0;
    return gridHeight ? totalGridMinutes / gridHeight : 0;
  };

  const parseTime = (timeStr) => {
    if (timeStr instanceof Date) return timeStr;
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) {
      console.error(`Invalid time format: "${timeStr}", defaulting to 00:00`);
      return new Date(0);
    }
    let [_, h, m, p] = match;
    h = parseInt(h, 10);
    m = parseInt(m, 10);
    if (p) {
      h = p.toUpperCase() === 'PM' && h !== 12 ? h + 12 : h;
      h = p.toUpperCase() === 'AM' && h === 12 ? 0 : h;
    }
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  const overlapCount = isMultiDay ? 1 : (event.overlapCount != null ? Math.max(1, event.overlapCount) : 1);
  const positionIndex = isMultiDay ? 0 : (event.positionIndex != null ? event.positionIndex : 0);

  if (!isMultiDay && (event.overlapCount === undefined || event.positionIndex === undefined)) {
    console.error('EventBlock: Invalid overlap properties for event:', {
      id: event.id,
      startDate: event.startDate,
      endDate: event.endDate,
      title: event.title,
      start: event.start,
      end: event.end,
      overlapCount: event.overlapCount,
      positionIndex: event.positionIndex,
    });
  }

  const calculateVisiblePortion = () => {
    if (isMultiDay) {
      return {
        top: 0,
        height: 20, // Tiny height for multi-day events
        clipTop: false,
        clipBottom: false,
      };
    }
    const start = parseTime(event.start);
    const end = parseTime(event.end);
    const gridStartDate = parseTime(gridStartTime);
    const gridEndDate = parseTime(gridEndTime);
    const gridStartMinutes = gridStartDate.getHours() * 60 + gridStartDate.getMinutes();
    const gridEndMinutes = gridEndDate.getHours() * 60 + gridEndDate.getMinutes();
    const eventStartMinutes = start.getHours() * 60 + start.getMinutes();
    const eventEndMinutes = end.getHours() * 60 + end.getMinutes();
    const gridTotalMinutes = (endHour - startHour) * 60;
    const visibleStartMinutes = Math.max(eventStartMinutes, gridStartMinutes);
    const visibleEndMinutes = Math.min(eventEndMinutes, gridEndMinutes);
    const visibleDuration = Math.max(0, visibleEndMinutes - visibleStartMinutes);
    const clipTop = eventStartMinutes < gridStartMinutes;
    const clipBottom = eventEndMinutes > gridEndMinutes;
    return {
      top: ((visibleStartMinutes - startHour * 60) / gridTotalMinutes) * 100,
      height: isReminder ? (15 / gridTotalMinutes) * 100 : (visibleDuration / gridTotalMinutes) * 100,
      clipTop,
      clipBottom,
    };
  };

  const { top, height, clipTop, clipBottom } = calculateVisiblePortion();

  const handleClick = () => {
    if (event.locked || dragState.isDragging || dragState.isResizing || isPreview) return;
    if (isSmallEvent || isReminder) setActiveSmallEventIndex(index);
    else {
      setEditingIndex(index);
      setTimeout(() => {
        //setIsMultiDay(isMultiDay);
        setIsModalOpen(true);
      }, 0);
    }
  };

  const handleTitleClick = () => {
    if (event.locked || dragState.isDragging || dragState.isResizing || isPreview) return;
    if (isSmallEvent) return;
    setEditingIndex(index);
    if (!isReminder) {
      setTimeout(() => setIsModalOpen(true), 0);
    } else {
      setTimeout(() => setIsReminderModalOpen(true), 0);
    }
  };

  const handleLockToggle = (e) => {
    if (isPreview) return;
    e.stopPropagation();
    saveToHistory();
    setEvents((prev) => {
      const newEvents = [...prev];
      const globalIndex = newEvents.findIndex(e => e.id === event.id);
      if (globalIndex === -1) {
        console.error('Event not found for lock toggle:', { id: event.id, startDate: event.startDate });
        return prev;
      }
      newEvents[globalIndex] = { ...newEvents[globalIndex], locked: !newEvents[globalIndex].locked };
      handleSaveEvent(newEvents[globalIndex]);
      return newEvents;
    });
  };

  const handleDragStart = (e, handleType) => {
    if (event.locked || isMultiDay || isPreview) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = eventRef.current.getBoundingClientRect();
    const gridRect = gridRef.current.getBoundingClientRect();
    dragData.current = {
      startY: e.clientY,
      startTop: rect.top - gridRect.top,
      startHeight: rect.height,
      currentTop: rect.top - gridRect.top,
      currentHeight: rect.height,
    };
    setDragState({
      isDragging: handleType === 'middle',
      isResizing: handleType !== 'middle',
      handleType,
    });
    eventRef.current.classList.add('dragging');
    setRenderKey(prev => 1 - prev);
  };

  const handleMouseMove = (e) => {
    if (!dragState.isDragging && !dragState.isResizing) return;
    const deltaY = e.clientY - dragData.current.startY;
    const minutesPerPixel = getPixelToMinutesRatio();
    const pixelsPerMinute = minutesPerPixel ? 1 / minutesPerPixel : 0;
    const intervalPixels = gridInterval * pixelsPerMinute;
    const gridStartDate = parseTime(gridStartTime);
    const gridEndDate = parseTime(gridEndTime);
    const gridStartMinutes = gridStartDate.getHours() * 60 + gridStartDate.getMinutes();
    const gridEndMinutes = gridEndDate.getHours() * 60 + gridEndDate.getMinutes();
    const gridStartPx = 0; // Top of grid
    const gridEndPx = gridRef.current.clientHeight; // Bottom of grid

    if (dragState.handleType === 'middle') {
      let newTop = dragData.current.startTop + deltaY;
      newTop = Math.max(gridStartPx, Math.min(gridEndPx - dragData.current.startHeight, newTop));
      const snappedTop = Math.round(newTop / intervalPixels) * intervalPixels;
      const finalTop = Math.max(gridStartPx, Math.min(gridEndPx - dragData.current.startHeight, snappedTop));
      dragData.current.currentTop = finalTop;
      eventRef.current.style.top = `${(finalTop / gridRef.current.clientHeight) * 100}%`;
      const newStartMinutes = Math.round((finalTop * minutesPerPixel / gridInterval) * gridInterval + startHour * 60);
      const durationMinutes = Math.round(((parseTime(event.end) - parseTime(event.start)) / 60000) / gridInterval) * gridInterval;
      const newEndMinutes = newStartMinutes + durationMinutes;
      setTempTimes({
        start: minutesToTime(newStartMinutes),
        end: minutesToTime(newEndMinutes),
      });
    } else {
      if (dragState.handleType === 'top') {
        let newTop = dragData.current.startTop + deltaY;
        let newHeight = dragData.current.startHeight - deltaY;
        newTop = Math.max(gridStartPx, newTop);
        newHeight = Math.max(intervalPixels, dragData.current.startTop + dragData.current.startHeight - newTop);
        const snappedTop = Math.round(newTop / intervalPixels) * intervalPixels;
        const snappedHeight = Math.round(newHeight / intervalPixels) * intervalPixels;
        const finalTop = Math.max(gridStartPx, snappedTop);
        const finalHeight = Math.max(intervalPixels, snappedHeight);
        dragData.current.currentTop = finalTop;
        dragData.current.currentHeight = finalHeight;
        eventRef.current.style.top = `${(finalTop / gridRef.current.clientHeight) * 100}%`;
        eventRef.current.style.height = `${(finalHeight / gridRef.current.clientHeight) * 100}%`;
        const newStartMinutes = Math.round((finalTop * minutesPerPixel / gridInterval) * gridInterval + startHour * 60);
        const newEndMinutes = Math.round(((finalTop + finalHeight) * minutesPerPixel / gridInterval) * gridInterval + startHour * 60);
        setTempTimes({
          start: minutesToTime(newStartMinutes),
          end: minutesToTime(newEndMinutes),
        });
      } else {
        let newHeight = dragData.current.startHeight + deltaY;
        newHeight = Math.max(intervalPixels, Math.min(gridEndPx - dragData.current.currentTop, newHeight));
        const snappedHeight = Math.round(newHeight / intervalPixels) * intervalPixels;
        const finalHeight = Math.max(intervalPixels, Math.min(gridEndPx - dragData.current.currentTop, snappedHeight));
        dragData.current.currentHeight = finalHeight;
        eventRef.current.style.height = `${(finalHeight / gridRef.current.clientHeight) * 100}%`;
        const newStartMinutes = Math.round((dragData.current.currentTop * minutesPerPixel / gridInterval) * gridInterval + startHour * 60);
        const newEndMinutes = Math.round(((dragData.current.currentTop + finalHeight) * minutesPerPixel / gridInterval) * gridInterval + startHour * 60);
        setTempTimes({
          start: minutesToTime(newStartMinutes),
          end: minutesToTime(newEndMinutes),
        });
      }
    }
  };

  const handleMouseUp = () => {
    if (!dragState.isDragging && !dragState.isResizing) return;
    checkIsSmallEvent();
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) {
      console.error('Grid rect not available');
      resetDragState();
      return;
    }
    const totalMinutes = (endHour - startHour) * 60;
    const minutesPerPixel = totalMinutes / gridRect.height;
    const gridStartDate = parseTime(gridStartTime);
    const gridEndDate = parseTime(gridEndTime);
    const gridStartMinutes = gridStartDate.getHours() * 60 + gridStartDate.getMinutes();
    const gridEndMinutes = gridEndDate.getHours() * 60 + gridEndDate.getMinutes();
    let newStartMinutes, newEndMinutes;

    if (dragState.isResizing) {
      const topPx = dragData.current.currentTop;
      const heightPx = dragData.current.currentHeight;
      newStartMinutes = Math.round((topPx * minutesPerPixel / gridInterval) * gridInterval + startHour * 60);
      newEndMinutes = Math.round(((topPx + heightPx) * minutesPerPixel / gridInterval) * gridInterval + startHour * 60);
      newStartMinutes = Math.max(gridStartMinutes, Math.min(gridEndMinutes - gridInterval, newStartMinutes));
      newEndMinutes = Math.min(gridEndMinutes, Math.max(gridStartMinutes + gridInterval, newEndMinutes));
      if (newEndMinutes <= newStartMinutes) {
        if (dragState.handleType === 'top') {
          newStartMinutes = newEndMinutes - gridInterval;
        } else {
          newEndMinutes = newStartMinutes + gridInterval;
        }
      }
    } else {
      const topPx = dragData.current.currentTop;
      const durationMinutes = Math.round(((parseTime(event.end) - parseTime(event.start)) / 60000) / gridInterval) * gridInterval;
      newStartMinutes = Math.round((topPx * minutesPerPixel / gridInterval) * gridInterval + startHour * 60);
      newEndMinutes = newStartMinutes + durationMinutes;
      newStartMinutes = Math.max(gridStartMinutes, Math.min(gridEndMinutes - durationMinutes, newStartMinutes));
      newEndMinutes = Math.min(gridEndMinutes, newStartMinutes + durationMinutes);
    }

    if (newStartMinutes >= newEndMinutes || isNaN(newStartMinutes) || isNaN(newEndMinutes)) {
      console.error('Invalid time range:', { newStartMinutes, newEndMinutes, event });
      resetDragState();
      setTempTimes({ start: event.start, end: event.end });
      return;
    }

    const updatedEvent = {
      ...event,
      start: minutesToTime(newStartMinutes),
      end: minutesToTime(newEndMinutes),
    };

    setEvents(prev => {
      const globalIndex = prev.findIndex(e => e.id === event.id);
      if (globalIndex === -1) {
        console.error('Event not found in global events:', { id: event.id, startDate: event.startDate });
        return prev;
      }
      const newEvents = [...prev];
      newEvents[globalIndex] = updatedEvent;
      return newEvents;
    });

    handleSaveEvent(updatedEvent);
    saveToHistory();
    setTempTimes({ start: updatedEvent.start, end: updatedEvent.end });
    resetDragState();
  };

  const resetDragState = () => {
    setDragState({
      isDragging: false,
      isResizing: false,
      handleType: null,
    });
    if (eventRef.current) {
      eventRef.current.classList.remove('dragging');
      eventRef.current.style.top = '';
      eventRef.current.style.height = '';
    }
    setRenderKey(prev => 1 - prev);
  };

  const checkIsSmallEvent = () => {
    if (isReminder) return;
    if (eventRef.current && gridRef.current) {
      const height = eventRef.current.offsetHeight;
      setIsSmallEvent(height < 78);
    }
    setTempTimes({
      start: event.start,
      end: event.end,
    });
  };

  const calculateBoundaryPositions = () => {
    const gridStartDate = parseTime(gridStartTime);
    const gridEndDate = parseTime(gridEndTime);
    const gridStartMinutes = gridStartDate.getHours() * 60 + gridStartDate.getMinutes();
    const gridEndMinutes = gridEndDate.getHours() * 60 + gridEndDate.getMinutes();
    const totalMinutes = (endHour - startHour) * 60;
    return {
      start: ((gridStartMinutes - startHour * 60) / totalMinutes) * 100,
      end: ((gridEndMinutes - startHour * 60) / totalMinutes) * 100,
    };
  };

  const boundaries = calculateBoundaryPositions();

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging, dragState.isResizing, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (eventRef.current && gridRef.current && !isReminder) {
        const height = eventRef.current.offsetHeight;
        setIsSmallEvent(height < 78);
      }
    });
    if (eventRef.current) observer.observe(eventRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div key={renderKey} style={{ userSelect: 'none' }}>
      {debug && (
        <>
          <div
            style={{
              display: 'block',
              position: 'absolute',
              top: `${boundaries.start}%`,
              left: 0,
              right: 0,
              height: '2px',
              backgroundColor: 'red',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '4px',
                top: '4px',
                color: 'red',
                fontSize: '10px',
                backgroundColor: 'white',
                padding: '1px 3px',
                borderRadius: '2px',
              }}
            >
              Start: {gridStartTime}
            </span>
          </div>
          <div
            style={{
              display: 'block',
              position: 'absolute',
              top: `${boundaries.end}%`,
              left: 0,
              right: 0,
              height: '2px',
              backgroundColor: 'red',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                position: 'absolute',
                right: '4px',
                bottom: '4px',
                color: 'red',
                fontSize: '10px',
                backgroundColor: 'white',
                padding: '1px 3px',
                borderRadius: '2px',
              }}
            >
              End: {gridEndTime}
            </span>
          </div>
        </>
      )}
      <div
        ref={eventRef}
        className={`event-block ${event.locked ? 'locked' : ''} ${isReminder ? 'reminder' : ''} ${isSmallEvent ? 'small-event' : ''}`}
        style={{
          position: 'absolute',
          top: isMultiDay ? `${(event.multiDayIndex || 0) * 22}px` : `${top}%`,
          left: isMultiDay ? `${event.left || 0}%` : `${(positionIndex / overlapCount) * 100}%`,
          width: isMultiDay ? `${event.width || 100}%` : `${(100 / overlapCount)}%`,
          height: isMultiDay ? '20px' : isReminder ? '20px' : `${height}%`,
          backgroundImage: isReminder
            ? event.locked
              ? 'linear-gradient(to bottom, #ccc, var(--bg-color))'
              : 'linear-gradient(to bottom, var(--button-color), var(--button-color))'
            : undefined,
          backgroundColor: isReminder
            ? undefined
            : event.locked
            ? '#ccc'
            : isMultiDay
            ? 'var(--event-block-color)'
            : 'var(--highlight-color)',
          color: event.locked ? 'var(--text-color)' : 'var(--secondary-text-color)',
          border: isMultiDay ? '1px solid var(--border-color)' : undefined,
          borderWidth: isMultiDay ? undefined : '4px',
          borderTopWidth: isMultiDay ? undefined : clipTop ? 0 : 4,
          borderBottomWidth: isMultiDay ? undefined : clipBottom ? 0 : 4,
          borderStyle: isMultiDay ? undefined : isHovered ? 'solid' : 'dashed',
          borderRadius: isMultiDay ? '5px' : undefined,
          padding: isMultiDay ? '2px 5px' : isReminder ? '2px 4px' : '4px',
          boxSizing: isMultiDay ? 'border-box' : undefined,
          display: 'flex',
          flexDirection: isMultiDay ? 'row' : isReminder ? 'row' : 'column',
          alignItems: isMultiDay ? 'center' : isReminder ? 'center' : 'flex-start',
          fontSize: isMultiDay ? '12px' : isReminder ? '12px' : 'inherit',
          zIndex: isMultiDay ? 6 : isOriginal ? 1 : 2, // Lower zIndex for original events
          cursor: event.locked || isPreview ? 'not-allowed' : 'pointer',
          opacity: isOriginal ? 0.5 : 1, // Apply translucency for original events
        }}
        onMouseEnter={() => !isPreview && setIsHovered(true)}
        onMouseLeave={() => !isPreview && setIsHovered(false)}
        onClick={handleClick}
      >
        <div
          onClick={() => !isPreview && handleDelete(event.id)}
          style={{ position: 'absolute', display: isHovered && !event.locked && !isPreview ? 'block' : 'none', right: '0' }}
        >
          <FontAwesomeIcon icon={faX} />
        </div>
        {isReminder ? (
          !isPreview && !event.locked && isHovered && (
            <div
              className="drag-handle middle-reminder"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                cursor: 'grab',
                pointerEvents: 'auto',
                userSelect: 'none',
              }}
              onMouseDown={(e) => handleDragStart(e, 'middle')}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="fa-layers fa-fw">
                <FontAwesomeIcon icon={faCircle} transform="left-2 up-0.2" style={{ color: 'black', fontSize: '20px', textAlign: 'center' }} />
                <FontAwesomeIcon icon={faCircle} style={{ color: 'var(--button-color)', fontSize: '16px' }} />
                <FontAwesomeIcon icon={faArrowsUpDownLeftRight} transform="right-3 shrink-6" style={{ color: 'white' }} />
              </span>
            </div>
          )
        ) : (
          <>
            {!isPreview && !event.locked && !isMultiDay && isHovered && (
              <div
                className="drag-handle top"
                style={{
                  background: 'transparent',
                  position: 'absolute',
                  top: '-14px',
                  left: '50%',
                  transform: 'translate(-50%, 0%)',
                  zIndex: 100,
                  cursor: 'ns-resize',
                }}
                onMouseDown={(e) => handleDragStart(e, 'top')}
              >
                <span className="fa-layers fa-fw fa-lg">
                  <FontAwesomeIcon icon={faCircle} transform="left-2" style={{ color: 'black', fontSize: '25px', textAlign: 'center' }} />
                  <FontAwesomeIcon icon={faArrowCircleUp} style={{ color: 'var(--event-block-color)' }} />
                </span>
              </div>
            )}
            {!isPreview && !event.locked && !isMultiDay && isHovered && (
              <div
                className="drag-handle middle"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  cursor: 'grab',
                  pointerEvents: 'auto',
                  userSelect: 'none',
                }}
                onMouseDown={(e) => handleDragStart(e, 'middle')}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="fa-layers fa-fw fa-lg">
                  <FontAwesomeIcon icon={faCircle} transform="left-3.4 up-0.2" style={{ color: 'black', fontSize: '30px', textAlign: 'center' }} />
                  <FontAwesomeIcon icon={faCircle} transform="left-2" style={{ color: 'var(--event-block-color)', fontSize: '25px', textAlign: 'center' }} />
                  <FontAwesomeIcon icon={faArrowsUpDownLeftRight} transform="shrink-3" style={{ color: 'black' }} />
                </span>
              </div>
            )}
            {!isPreview && !event.locked && !isMultiDay && isHovered && (
              <div
                className="drag-handle bottom"
                style={{
                  background: 'transparent',
                  position: 'absolute',
                  bottom: '-15px',
                  left: '50%',
                  transform: 'translate(-50%, 0%)',
                  zIndex: 100,
                  cursor: 'ns-resize',
                }}
                onMouseDown={(e) => handleDragStart(e, 'bottom')}
              >
                <span className="fa-layers fa-fw fa-lg">
                  <FontAwesomeIcon icon={faCircle} transform="left-2" style={{ color: 'black', fontSize: '25px', textAlign: 'center' }} />
                  <FontAwesomeIcon icon={faArrowCircleDown} style={{ color: 'var(--event-block-color)' }} />
                </span>
              </div>
            )}
          </>
        )}
        <div
          style={{
            fontWeight: 'bold',
            fontSize: isMultiDay || isSmallEvent ? '12px' : 'inherit',
            display: 'flex',
          }}
          onClick={handleTitleClick}
        >
          <span>{event.title || 'Untitled Event'}</span>
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0px' }}>
            <div onClick={handleLockToggle} style={{ opacity: event.locked ? 1 : 0, position: 'absolute' }}>
              <FontAwesomeIcon icon={faLock} transform="shrink-6" />
            </div>
            <div onClick={handleLockToggle} style={{ opacity: event.locked ? 0 : 1, position: 'absolute' }}>
              <FontAwesomeIcon icon={faUnlock} transform="shrink-6" />
            </div>
          </div>
          <span className="fa-layers fa-fw fa-lg">
            <FontAwesomeIcon icon={faCircle} transform="left-2" style={{ color: `${invertAlertColors[event.urgency]}`, marginLeft: '17px', textAlign: 'center' }} />
            <FontAwesomeIcon icon={faCircleExclamation} style={{ color: `${alertColors[event.urgency]}`,display: 'flex', alignItems: 'center', marginTop: '0px', marginLeft: '15px' }} transform="shrink-3" />
          </span>
          
          {isMultiDay && (
            <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 'normal', marginLeft: '30px' }}>
              {dragState.isDragging || dragState.isResizing ? `${tempTimes.start} - ${tempTimes.end}` : `${event.start} - ${event.end}`}
            </span>
          )}
        </div>
        {!isMultiDay && (
          <div style={{ fontSize: '12px', textAlign: 'left' }}>
            {isReminder || isSmallEvent
              ? dragState.isDragging
                ? tempTimes.start
                : event.start
              : dragState.isDragging || dragState.isResizing
              ? `${tempTimes.start} - ${tempTimes.end}`
              : `${event.start} - ${event.end}`}
          </div>
        )}
        {!isReminder && !isSmallEvent && !isMultiDay && (
          <div
            style={{
              display: isHovered && !event.locked && !isPreview ? 'block' : 'none',
              fontWeight: 'bold',
              fontSize: '14px',
              backgroundColor: 'var(--event-block-color)',
              border: isHovered ? '1px solid var(--text-color)' : '0px',
              borderRadius: '7px',
              padding: isHovered ? '2px 10px' : '0px',
            }}
            onClick={handleClick}
          >
            {isHovered && !event.locked ? 'Edit' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventBlock;