import { palette } from './palettes.js';

document.addEventListener('DOMContentLoaded', () => {
    const savedPalette = localStorage.getItem('palette') || 'Minimalist 1';
    const selectedPalette = palette[savedPalette] || palette['Minimalist 1'];
    document.documentElement.style.setProperty('--bg-color', `${selectedPalette[0]}`);
    document.documentElement.style.setProperty('--text-color', `${selectedPalette[1]}`);
    document.documentElement.style.setProperty('--button-color', `${selectedPalette[2]}`);
    document.documentElement.style.setProperty('--highlight-color', `${selectedPalette[3]}`);
    document.documentElement.style.setProperty('--secondary-text-color', `${selectedPalette[4]}`);
    document.documentElement.style.setProperty('--hover-highlight-color', `${selectedPalette[3]}`);
    document.documentElement.style.setProperty('--hover-color', '#e5e7eb');
    document.documentElement.style.setProperty('--event-block-color', `${selectedPalette[3]}`);

    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');

    const dateDisplay = document.getElementById('date-display');
    if (dateParam) {
        const [year, month, day] = dateParam.split('-');
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        dateDisplay.textContent = `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
    } else {
        dateDisplay.textContent = 'No date selected';
        document.getElementById('no-events').style.display = 'block';
        return;
    }

    const gridIntervalInput = document.getElementById('grid-interval');
    const gridStartTimeInput = document.getElementById('grid-start-time');
    const gridEndTimeInput = document.getElementById('grid-end-time');
    let editInterval = parseInt(gridIntervalInput.value) || 15;
    let startHour = gridStartTimeInput.value ? parseTime(gridStartTimeInput.value).getHours() + parseTime(gridStartTimeInput.value).getMinutes() / 60 : 0;
    let endHour = gridEndTimeInput.value ? parseTime(gridEndTimeInput.value).getHours() + parseTime(gridEndTimeInput.value).getMinutes() / 60 : 24;

    gridIntervalInput.addEventListener('change', () => {
        const newInterval = parseInt(gridIntervalInput.value);
        editInterval = isNaN(newInterval) || newInterval < 1 ? 15 : newInterval;
        gridIntervalInput.value = editInterval;
        renderEvents();
    });

    gridStartTimeInput.addEventListener('change', () => {
        const newStartHour = gridStartTimeInput.value ? parseTime(gridStartTimeInput.value).getHours() + parseTime(gridStartTimeInput.value).getMinutes() / 60 : 0;
        if (gridEndTimeInput.value && newStartHour >= (parseTime(gridEndTimeInput.value).getHours() + parseTime(gridEndTimeInput.value).getMinutes() / 60)) {
            alert('Start time must be before end time.');
            gridStartTimeInput.value = minutesToTime(startHour * 60);
            return;
        }
        startHour = newStartHour;
        renderTimeLabels();
        renderEvents();
    });

    gridEndTimeInput.addEventListener('change', () => {
        const newEndHour = gridEndTimeInput.value ? parseTime(gridEndTimeInput.value).getHours() + parseTime(gridEndTimeInput.value).getMinutes() / 60 : 24;
        if (newEndHour <= startHour) {
            alert('End time must be after start time.');
            gridEndTimeInput.value = endHour === 24 ? '00:00' : minutesToTime(endHour * 60);
            return;
        }
        endHour = newEndHour;
        renderTimeLabels();
        renderEvents();
    });

    function renderTimeLabels() {
        const timeLabelsContainer = document.getElementById('time-labels');
        timeLabelsContainer.innerHTML = '';
        for (let hour = Math.floor(startHour); hour < Math.ceil(endHour); hour++) {
            const label = document.createElement('div');
            label.className = 'time-label';
            label.style.top = `${(hour - startHour) * 60}px`;
            const hour12 = hour % 12 === 0 ? 12 : hour % 12;
            const period = hour < 12 ? 'AM' : 'PM';
            label.textContent = `${hour12}:00 ${period}`;
            label.style.fontSize = '15px';
            timeLabelsContainer.appendChild(label);
        }
    }

    let events = JSON.parse(localStorage.getItem(`events-${dateParam}`)) || [];
    if (dateParam === '2024-10-28' && events.length === 0) {
        events = [
            { title: 'Team Meeting', start: '10:00', end: '11:00', description: localStorage.getItem('event-Team Meeting-10:00 AM - 11:00 AM') || '', locked: false },
            { title: 'Lunch Break', start: '11:00', end: '12:00', description: localStorage.getItem('event-Lunch Break-11:00 AM - 12:00 PM') || '', locked: false },
            { title: 'Project Review', start: '12:00', end: '13:00', description: localStorage.getItem('event-Project Review-12:00 PM - 1:00 PM') || '', locked: false },
            { title: 'Client Call', start: '13:00', end: '14:00', description: localStorage.getItem('event-Client Call-1:00 PM - 2:00 PM') || '', locked: false },
            { title: 'Design Review', start: '14:00', end: '15:00', description: localStorage.getItem('event-Design Review-2:00 PM - 3:00 PM') || '', locked: false },
            { title: 'Wrap Up', start: '15:00', end: '16:00', description: localStorage.getItem('event-Wrap Up-3:00 PM - 4:00 PM') || '', locked: false }
        ];
        localStorage.setItem(`events-${dateParam}`, JSON.stringify(events));
    }

    const grid = document.querySelector('.schedule-grid');
    const sidePanel = document.getElementById('side-panel');
    const sidePanelTitle = document.getElementById('side-panel-title');
    const sidePanelTime = document.getElementById('side-panel-time');
    const sidePanelDescription = document.getElementById('side-panel-description');
    const sidePanelEditBtn = document.getElementById('side-panel-edit-btn');
    const noEventsMessage = document.getElementById('no-events');
    const modal = document.getElementById('event-modal');
    const titleInput = document.getElementById('event-title');
    const startInput = document.getElementById('event-start');
    const endInput = document.getElementById('event-end');
    const descriptionInput = document.getElementById('event-description');
    const saveBtn = document.getElementById('save-event-btn');
    const cancelBtn = document.getElementById('cancel-event-btn');
    const newEventBtn = document.getElementById('new-event-btn');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    let editingIndex = null;
    let activeSmallEventIndex = null;
    let hoveredEventIndex = null;
    let eventHistory = [];
    let redoHistory = [];
    const maxHistorySize = 10;

    function saveToHistory() {
        eventHistory.push(JSON.stringify(events));
        if (eventHistory.length > maxHistorySize) {
            eventHistory.shift();
        }
        redoHistory = [];
        undoBtn.disabled = false;
        redoBtn.disabled = true;
    }

    function undoAction() {
        if (eventHistory.length > 0) {
            redoHistory.push(JSON.stringify(events));
            if (redoHistory.length > maxHistorySize) {
                redoHistory.shift();
            }
            events = JSON.parse(eventHistory.pop());
            localStorage.setItem(`events-${dateParam}`, JSON.stringify(events));
            activeSmallEventIndex = null;
            modal.style.display = 'none';
            renderEvents();
            undoBtn.disabled = eventHistory.length === 0;
            redoBtn.disabled = false;
        }
    }

    function redoAction() {
        if (redoHistory.length > 0) {
            eventHistory.push(JSON.stringify(events));
            if (eventHistory.length > maxHistorySize) {
                eventHistory.shift();
            }
            events = JSON.parse(redoHistory.pop());
            localStorage.setItem(`events-${dateParam}`, JSON.stringify(events));
            activeSmallEventIndex = null;
            modal.style.display = 'none';
            renderEvents();
            redoBtn.disabled = redoHistory.length === 0;
            undoBtn.disabled = false;
        }
    }

    if (undoBtn) {
        undoBtn.addEventListener('click', undoAction);
        undoBtn.disabled = true;
    }
    if (redoBtn) {
        redoBtn.addEventListener('click', redoAction);
        redoBtn.disabled = true;
    }

function renderEvents() {
    console.clear();
    grid.querySelectorAll('.event-block, .small-event-block').forEach(block => block.remove());
    sidePanel.classList.remove('active');
    sidePanel.style.top = '0px';
    sidePanelTitle.textContent = '';
    sidePanelTime.textContent = '';
    sidePanelDescription.textContent = '';
    sidePanelDescription.style.display = 'none';

    const gridHeight = (endHour - startHour) * 60;
    grid.style.height = `${gridHeight}px`;
    document.querySelector('.time-labels').style.height = `${gridHeight}px`;

    if (events.length === 0) {
        noEventsMessage.style.display = 'block';
        return;
    }
    noEventsMessage.style.display = 'none';

    const sortedEvents = [...events].map((event, index) => ({
        ...event,
        index,
        startMinutes: parseTime(event.start).getHours() * 60 + parseTime(event.start).getMinutes(),
        endMinutes: parseTime(event.end).getHours() * 60 + parseTime(event.end).getMinutes()
    })).sort((a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes);

    const columns = new Array(events.length).fill().map(() => ({
        overlapCount: 1,
        column: 0,
        span: 1,
        overlaps: []
    }));

    sortedEvents.forEach((event, i) => {
        let overlapCount = 1;
        sortedEvents.forEach((other, j) => {
            if (i !== j && event.startMinutes < other.endMinutes && event.endMinutes > other.startMinutes) {
                columns[event.index].overlaps.push(other.index);
                overlapCount++;
            }
        });
        columns[event.index].overlapCount = overlapCount;
    });

    let maxOverlap = 1;
    sortedEvents.forEach((event, i) => {
        let currentOverlap = 1;
        sortedEvents.forEach((other, j) => {
            if (i !== j && event.startMinutes < other.endMinutes && event.endMinutes > other.startMinutes) {
                currentOverlap++;
            }
        });
        maxOverlap = Math.max(maxOverlap, currentOverlap);
    });

    let overlapPairs = []; // Track all unique overlap comparisons
    sortedEvents.forEach(event => {
        const overlaps = columns[event.index].overlaps;
        const usedColumns = new Set();
        sortedEvents.forEach(other => {
            if (other.index !== event.index && event.startMinutes < other.endMinutes && event.endMinutes > other.startMinutes && columns[other.index].column !== undefined) {
                usedColumns.add(columns[other.index].column);
            }
        });
        let col = 0;
        while (usedColumns.has(col) && col < maxOverlap) col++;
        columns[event.index].column = col < maxOverlap ? col : 0;

        let span = 1;
        for (let i = col + 1; i < maxOverlap; i++) {
            let canSpan = true;
            for (const otherIndex of sortedEvents) {
                if (otherIndex === event) {
                    continue
                }
                const pair = [otherIndex.index, event.index].sort();
                if (overlapPairs.some(existingPair => 
                    existingPair[0] === pair[0] && existingPair[1] === pair[1])) {
                    continue;
                }
                overlapPairs.push(pair);
                console.log(`Checked pair: ${pair[0]}, ${pair[1]}`);
                //console.log(`otherIndex: ${otherIndex.index}, Time: ${otherIndex.start} - ${otherIndex.end}`);
                //console.log('event: ' + event.index + ', Time: ' + event.start + ' - ' + event.end);
                console.log(`Is the start time (${event.start}) for ${event.title} BEFORE the end time (${otherIndex.end}) for ${otherIndex.title}: ${event.startMinutes < otherIndex.endMinutes}`);
                console.log(`Is the end time (${event.end}) for ${event.title} AFTER the start time (${otherIndex.start}) for ${otherIndex.title}: ${event.endMinutes > otherIndex.startMinutes}`);
                const isOverlapping = 
                    otherIndex.index !== event.index && 
                    event.startMinutes < otherIndex.endMinutes && 
                    event.endMinutes > otherIndex.startMinutes
                    /* && columns[otherIndex.index].column === i*/;
                
                // This logic '&& columns[otherIndex.index].column === i'
                // is what controls if the event block can span across other columns
                // It's too buggy right now, so it will be abandoned.
                console.log(`${event.title} and ${otherIndex.title} ${isOverlapping ? `are` : `are not`} overlapping`);
                if (isOverlapping) {
                    canSpan = false;
                    break;
                }
            }
            if (canSpan) {
                span++;
            } else {
                break;
            }
        }
        columns[event.index].span = span;

        //console.log(`Event ${event.title} (${event.start}-${event.end}): column=${col}, span=${span}, overlaps=[${overlaps}]`);
    });
        events.forEach((event, index) => {
            const startTime = parseTime(event.start);
            const endTime = parseTime(event.end);
            const startHours = startTime.getHours() + startTime.getMinutes() / 60;
            const duration = (endTime - startTime) / (1000 * 60);
            if (startHours < startHour || startHours >= endHour) return;
            const isSmallEvent = duration < 78;
            const top = (startHours - startHour) * 60;
            const height = duration * 1;
            const eventBlock = document.createElement('div');
            eventBlock.className = isSmallEvent ? 'small-event-block' : 'event-block';
            eventBlock.style.top = `${top}px`;
            eventBlock.style.height = `${height}px`;
            eventBlock.style.zIndex = index; // Ensure later events are on top
            eventBlock.dataset.index = index;

            const column = columns[index].column;
            const span = columns[index].span;
            const gridWidth = grid.clientWidth;
            const columnWidth = gridWidth / maxOverlap;
            const eventWidth = columnWidth * span;
            eventBlock.style.width = `${eventWidth}px`;
            eventBlock.style.left = `${(column) * columnWidth}px`;
            eventBlock.style.position = 'absolute';

            // Debugging output for positioning
            console.log(`Rendering ${event.title}: left=${column * columnWidth}px, width=${eventWidth}px`);

            let initialY = 0;
            let initialTop = 0;
            let currentAdjustingHeight = height;
            let currentAdjustingTop = top;

            eventBlock.style.outlineStyle = 'dashed';
            eventBlock.style.outlineColor = 'var(--text-color)';

            if (!isSmallEvent) {
                eventBlock.innerHTML = `
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
                    <div class="drag-handle fillertop" style="background-color: black; position: absolute; display: block; height: 13px; width: 12px; top: -8px; left: 50.2%; z-index: 99; opacity: 0"></div>
                    <div class="drag-handle top" style="background-color: var(--text-color); display: none; background: transparent; top: -10px; z-index: 100;">
                        <i class="fa fa-arrow-circle-up"></i>
                    </div>
                    <div class="drag-handle middle" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: transparent;">
                        <i class="fa fa-arrows-up-down-left-right"></i>
                    </div>
                    <button class="delete-btn text-color text-xs font-bold" style="position: absolute; top: 2px; right: 2px; display: none;">X</button>
                    <div class="flex flex-col">
                        <p class="text-color text-sm font-medium leading-normal line-clamp-1">${event.title}</p>
                        <button class="lock-btn text-color text-xs font-bold" style="position: absolute; top: 10px; left: ${(event.title.length + 1) * 6.5}; display: none;" title="${event.locked ? 'Unlock' : 'Lock'}">
                            <i class="fa fa-${event.locked ? 'lock' : 'unlock'}"></i>
                        </button>
                        <p class="secondary-text text-xs font-normal leading-normal">${event.start} - ${event.end}</p>
                        <button id="event-description-${index}" class="event-description text-color text-xs font-normal leading-normal mr-auto" style="display: block;">
                            ${event.description && event.description.length > 10 ? event.description.substring(0,10) + "..." : event.description || 'No description'}
                        </button>
                    </div>
                    <button class="edit-btn text-color text-xs font-bold ml-auto">Edit</button>
                    <div class="drag-handle bottom" style="background-color: var(--text-color); display: none; background: transparent; bottom: -5px; z-index: 100">
                        <i class="fa fa-arrow-circle-down"></i>
                    </div>
                    <div class="drag-handle fillerbottom" style="background-color: black; position: absolute; display: block; height: 12px; width: 12px; bottom: -7px; left: 50.15%; z-index: 99; opacity: 0"></div>
                `;
                grid.appendChild(eventBlock);
                const eventDesc = eventBlock.querySelector(`#event-description-${index}`);
                eventDesc.addEventListener('mouseenter', () => {
                    eventDesc.style.color = 'var(--hover-color)';
                });
                eventDesc.addEventListener('mouseleave', () => {
                    eventDesc.style.color = 'var(--text-color)';
                });
                eventDesc.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const descElement = eventDesc;
                    if (descElement.textContent.trim() === event.description.substring(0,10) + "...") {
                        descElement.textContent = event.description;
                    } else if (event.description && event.description.length > 10) {
                        descElement.textContent = event.description.substring(0,10) + "...";
                    }
                });

                const lockBtn = eventBlock.querySelector('.lock-btn');
                lockBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    saveToHistory();
                    events[index].locked = !events[index].locked;
                    localStorage.setItem(`events-${dateParam}`, JSON.stringify(events));
                    renderEvents();
                });
                lockBtn.addEventListener('mouseenter', () => {
                    lockBtn.style.color = 'var(--hover-color)';
                });
                lockBtn.addEventListener('mouseleave', () => {
                    lockBtn.style.color = 'var(--text-color)';
                });

                const editBtn = eventBlock.querySelector('.edit-btn');
                editBtn.addEventListener('click', () => {
                    editingIndex = index;
                    titleInput.value = event.title;
                    startInput.value = event.start;
                    endInput.value = event.end;
                    descriptionInput.value = event.description || '';
                    modal.style.display = 'flex';
                });
                editBtn.addEventListener('mouseenter', () => {
                    editBtn.style.color = 'var(--hover-color)';
                });
                editBtn.addEventListener('mouseleave', () => {
                    editBtn.style.color = 'var(--text-color)';
                });

                const deleteBtn = eventBlock.querySelector('.delete-btn');
                eventBlock.addEventListener('mouseenter', () => {
                    eventBlock.style.outlineStyle = 'solid';
                    eventBlock.style.outlineColor = 'black';
                    if (!event.locked) {
                        const topHandle = eventBlock.querySelector('.drag-handle.top');
                        const middleHandle = eventBlock.querySelector('.drag-handle.middle');
                        const bottomHandle = eventBlock.querySelector('.drag-handle.bottom');
                        const topFillerHandle = eventBlock.querySelector('.drag-handle.fillertop');
                        const bottomFillerHandle = eventBlock.querySelector('.drag-handle.fillerbottom');
                        topHandle.style.display = 'block';
                        middleHandle.style.display = 'block';
                        bottomHandle.style.display = 'block';
                        topFillerHandle.style.opacity = 1;
                        bottomFillerHandle.style.opacity = 1;
                        deleteBtn.style.display = 'block';
                    }
                    lockBtn.style.display = 'block';
                    hoveredEventIndex = index;
                });
                eventBlock.addEventListener('mouseleave', () => {
                    eventBlock.style.outlineStyle = 'dashed';
                    eventBlock.style.outlineColor = 'var(--text-color)';
                    const topHandle = eventBlock.querySelector('.drag-handle.top');
                    const middleHandle = eventBlock.querySelector('.drag-handle.middle');
                    const bottomHandle = eventBlock.querySelector('.drag-handle.bottom');
                    const topFillerHandle = eventBlock.querySelector('.drag-handle.fillertop');
                    const bottomFillerHandle = eventBlock.querySelector('.drag-handle.fillerbottom');
                    topHandle.style.display = 'none';
                    middleHandle.style.display = 'none';
                    bottomHandle.style.display = 'none';
                    topFillerHandle.style.opacity = 0;
                    bottomFillerHandle.style.opacity = 0;
                    deleteBtn.style.display = 'none';
                    lockBtn.style.display = 'none';
                    hoveredEventIndex = null;
                });
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    saveToHistory();
                    events.splice(index, 1);
                    localStorage.setItem(`events-${dateParam}`, JSON.stringify(events));
                    renderEvents();
                });
                deleteBtn.addEventListener('mouseenter', () => {
                    deleteBtn.style.color = 'var(--hover-color)';
                });
                deleteBtn.addEventListener('mouseleave', () => {
                    deleteBtn.style.color = 'var(--text-color)';
                });

                const topHandle = eventBlock.querySelector('.drag-handle.top');
                const middleHandle = eventBlock.querySelector('.drag-handle.middle');
                const bottomHandle = eventBlock.querySelector('.drag-handle.bottom');

                topHandle.addEventListener('mouseenter', () => {
                    topHandle.style.color = 'var(--hover-color)';
                    topHandle.style.backgroundColor = 'var(--hover-color)';
                });
                topHandle.addEventListener('mouseleave', () => {
                    topHandle.style.color = 'var(--text-color)';
                });
                middleHandle.addEventListener('mouseenter', () => {
                    middleHandle.style.color = 'var(--hover-color)';
                });
                middleHandle.addEventListener('mouseleave', () => {
                    middleHandle.style.color = 'var(--text-color)';
                });
                bottomHandle.addEventListener('mouseenter', () => {
                    bottomHandle.style.color = 'var(--hover-color)';
                });
                bottomHandle.addEventListener('mouseleave', () => {
                    bottomHandle.style.color = 'var(--text-color)';
                });

                let isResizing = false;
                let isTopHandle = false;
                let initialHeight = 0;

                function startResize(e, isTop) {
                    if (event.locked) return;
                    e.stopPropagation();
                    isResizing = true;
                    isTopHandle = isTop;
                    initialY = e.clientY;
                    initialTop = parseFloat(eventBlock.style.top);
                    initialHeight = parseFloat(eventBlock.style.height);
                    currentAdjustingTop = initialTop;
                    currentAdjustingHeight = initialHeight;
                    eventBlock.classList.add('dragging');
                }

                topHandle.addEventListener('mousedown', (e) => startResize(e, true));
                bottomHandle.addEventListener('mousedown', (e) => startResize(e, false));

                document.addEventListener('mousemove', (e) => {
                    if (isResizing) {
                        const deltaY = e.clientY - initialY;
                        let newTop = initialTop;
                        let newHeight = initialHeight;
                        if (isTopHandle) {
                            newTop = Math.max(0, initialTop + deltaY);
                            const maxTop = initialTop + initialHeight - editInterval;
                            newTop = Math.min(newTop, maxTop);
                            newTop = Math.round(newTop / editInterval) * editInterval;
                            newHeight = initialTop + initialHeight - newTop;
                        } else {
                            newHeight = Math.max(editInterval, initialHeight + deltaY);
                            const maxHeight = (endHour - startHour - (initialTop / 60)) * 60;
                            newHeight = Math.min(newHeight, maxHeight);
                            newHeight = Math.round(newHeight / editInterval) * editInterval;
                        }
                        currentAdjustingTop = newTop;
                        currentAdjustingHeight = newHeight;

                        eventBlock.style.top = `${newTop}px`;
                        eventBlock.style.height = `${newHeight}px`;
                        const newStartMinutes = Math.round((newTop / 60 + startHour) * 60);
                        const newEndMinutes = Math.round(((newTop + newHeight) / 60 + startHour) * 60);
                        const timeDisplay = eventBlock.querySelector('.secondary-text');
                        timeDisplay.textContent = `${minutesToTime(newStartMinutes)} - ${minutesToTime(newEndMinutes)}`;
                    }
                });

                document.addEventListener('mouseup', () => {
                    if (isResizing) {
                        isResizing = false;
                        eventBlock.classList.remove('dragging');
                        const newTop = parseFloat(currentAdjustingTop);
                        const newHeight = parseFloat(currentAdjustingHeight);
                        if (newHeight < editInterval) {
                            eventBlock.style.top = `${initialTop}px`;
                            eventBlock.style.height = `${initialHeight}px`;
                            const timeDisplay = eventBlock.querySelector('.secondary-text');
                            timeDisplay.textContent = `${event.start} - ${event.end}`;
                            return;
                        }
                        saveToHistory();
                        const newStartMinutes = Math.round((newTop / 60 + startHour) * 60);
                        const newEndMinutes = Math.round(((newTop + newHeight) / 60 + startHour) * 60);
                        events[index] = {
                            ...events[index],
                            start: minutesToTime(newStartMinutes),
                            end: minutesToTime(newEndMinutes)
                        };
                        localStorage.setItem(`events-${dateParam}`, JSON.stringify(events));
                        renderEvents();
                    }
                });

                let isDragging = false;
                middleHandle.addEventListener('mousedown', (e) => {
                    if (event.locked) return;
                    e.stopPropagation();
                    isDragging = true;
                    initialY = e.clientY;
                    initialTop = parseFloat(eventBlock.style.top);
                    eventBlock.classList.add('dragging');
                    const startX = e.clientX;
                    const startY = e.clientY;
                    let hasMoved = false;

                    const moveHandler = (moveEvent) => {
                        if (isDragging) {
                            if (Math.abs(moveEvent.clientX - startX) > 5 || Math.abs(moveEvent.clientY - startY) > 5) {
                                hasMoved = true;
                            }
                            const deltaY = moveEvent.clientY - initialY;
                            const newTop = Math.max(0, Math.min(gridHeight - height, initialTop + deltaY));
                            const snappedTop = Math.round(newTop / editInterval) * editInterval;
                            eventBlock.style.top = `${snappedTop}px`;
                            const newStartMinutes = Math.round((snappedTop / 60 + startHour) * 60);
                            const startHours = parseInt(event.start.split(':')[0]);
                            const startMinutes = parseInt(event.start.split(':')[1]);
                            const endHours = parseInt(event.end.split(':')[0]);
                            const endMinutes = parseInt(event.end.split(':')[1]);
                            const duration = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
                            const newEndMinutes = newStartMinutes + duration;
                            const newStartTime = minutesToTime(newStartMinutes);
                            const newEndTime = minutesToTime(newEndMinutes);
                            const timeDisplay = eventBlock.querySelector('.secondary-text');
                            timeDisplay.textContent = `${newStartTime} - ${newEndTime}`;
                        }
                    };

                    const upHandler = () => {
                        if (isDragging) {
                            isDragging = false;
                            eventBlock.classList.remove('dragging');
                            if (hasMoved) {
                                const newTop = parseFloat(eventBlock.style.top);
                                const newStartMinutes = Math.round((newTop / 60 + startHour) * 60);
                                const duration = (endTime - startTime) / (1000 * 60);
                                const newStartTime = minutesToTime(newStartMinutes);
                                const newEndTime = minutesToTime(newStartMinutes + duration);
                                saveToHistory();
                                events[index] = {
                                    ...events[index],
                                    start: newStartTime,
                                    end: newEndTime
                                };
                                localStorage.setItem(`events-${dateParam}`, JSON.stringify(events));
                                renderEvents();
                            }
                        }
                        document.removeEventListener('mousemove', moveHandler);
                        document.removeEventListener('mouseup', upHandler);
                    };

                    document.addEventListener('mousemove', moveHandler);
                    document.addEventListener('mouseup', upHandler);
                });
            } else {
                eventBlock.innerHTML = `
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
                    <div class="drag-handle fillertop" style="background-color: black; position: absolute; display: block; height: 13px; width: 12px; top: -8px; left: 50.2%; z-index: 99; opacity: 0"></div>
                    <div class="drag-handle top" style="background-color: var(--text-color); display: none; background: transparent; top: -10px; z-index: 100;">
                        <i class="fa fa-arrow-circle-up"></i>
                    </div>
                    <div class="drag-handle middle" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: transparent;">
                        <i class="fa fa-arrows-up-down-left-right"></i>
                    </div>
                    <button class="lock-btn text-color text-xs font-bold" style="position: absolute; top: 7px; left: ${(event.title.length + 19) * 6.7}px; display: none;" title="${event.locked ? 'Unlock' : 'Lock'}">
                        <i class="fa fa-${event.locked ? 'lock' : 'unlock'}"></i>
                    </button>
                    <button class="delete-btn text-color text-xs font-bold" style="position: absolute; top: 2px; right: 2px; display: none;">X</button>
                    <button id="edit-display-btn" class="edit-display-btn flex flex-col text-color text-sm font-medium leading-normal line-clamp-1">
                        ${event.title} (Click For Details)
                    </button>
                    <div class="drag-handle bottom" style="background-color: var(--text-color); display: none; background: transparent; bottom: -5px; z-index: 100">
                        <i class="fa fa-arrow-circle-down"></i>
                    </div>
                    <div class="drag-handle fillerbottom" style="background-color: black; position: absolute; display: block; height: 12px; width: 12px; bottom: -7px; left: 50.15%; z-index: 99; opacity: 0"></div>
                `;
                grid.appendChild(eventBlock);
                const sidePanelDisplayEditBtn = eventBlock.querySelector('.edit-display-btn');
                eventBlock.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (activeSmallEventIndex === index) {
                        sidePanel.classList.remove('active');
                        eventBlock.classList.remove('active');
                        activeSmallEventIndex = null;
                    } else {
                        grid.querySelectorAll('.small-event-block').forEach(block => block.classList.remove('active'));
                        eventBlock.classList.add('active');
                        sidePanel.classList.add('active');
                        sidePanel.style.top = `${Math.max(0, top) + 100}px`;
                        sidePanelTitle.textContent = event.title;
                        sidePanelTime.textContent = `${event.start} - ${event.end}`;
                        sidePanelDescription.textContent = event.description && event.description.length > 10 ? event.description.substring(0,10) + "..." : event.description || 'No description';
                        sidePanelDescription.style.display = 'block';
                        if (event.locked) {
                            sidePanelEditBtn.textContent = 'Unlock To Edit';
                        } else {
                            sidePanelEditBtn.textContent = 'Edit';
                        }
                        activeSmallEventIndex = index;
                    }
                });

                const lockBtn = eventBlock.querySelector('.lock-btn');
                lockBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    saveToHistory();
                    events[index].locked = !events[index].locked;
                    localStorage.setItem(`events-${dateParam}`, JSON.stringify(events));
                    renderEvents();
                });
                lockBtn.addEventListener('mouseenter', () => {
                    lockBtn.style.color = 'var(--hover-color)';
                });
                lockBtn.addEventListener('mouseleave', () => {
                    lockBtn.style.color = 'var(--text-color)';
                });

                const deleteBtn = eventBlock.querySelector('.delete-btn');
                eventBlock.addEventListener('mouseenter', () => {
                    eventBlock.style.outlineStyle = 'solid';
                    eventBlock.style.outlineColor = 'black';
                    if (!event.locked) {
                        const topHandle = eventBlock.querySelector('.drag-handle.top');
                        const middleHandle = eventBlock.querySelector('.drag-handle.middle');
                        const bottomHandle = eventBlock.querySelector('.drag-handle.bottom');
                        const topFillerHandle = eventBlock.querySelector('.drag-handle.fillertop');
                        const bottomFillerHandle = eventBlock.querySelector('.drag-handle.fillerbottom');
                        topHandle.style.display = 'block';
                        middleHandle.style.display = 'block';
                        bottomHandle.style.display = 'block';
                        topFillerHandle.style.opacity = 1;
                        bottomFillerHandle.style.opacity = 1;
                        deleteBtn.style.display = 'block';
                    }
                    lockBtn.style.display = 'block';
                    sidePanelDisplayEditBtn.style.color = 'var(--hover-color)';
                    hoveredEventIndex = index;
                });
                eventBlock.addEventListener('mouseleave', () => {
                    eventBlock.style.outlineStyle = 'dashed';
                    eventBlock.style.outlineColor = 'var(--hover-color)';
                    const topHandle = eventBlock.querySelector('.drag-handle.top');
                    const middleHandle = eventBlock.querySelector('.drag-handle.middle');
                    const bottomHandle = eventBlock.querySelector('.drag-handle.bottom');
                    const topFillerHandle = eventBlock.querySelector('.drag-handle.fillertop');
                    const bottomFillerHandle = eventBlock.querySelector('.drag-handle.fillerbottom');
                    topHandle.style.display = 'none';
                    middleHandle.style.display = 'none';
                    bottomHandle.style.display = 'none';
                    deleteBtn.style.display = 'none';
                    lockBtn.style.display = 'none';
                    topFillerHandle.style.opacity = 0;
                    bottomFillerHandle.style.opacity = 0;
                    sidePanelDisplayEditBtn.style.color = 'var(--text-color)';
                    hoveredEventIndex = null;
                });
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    saveToHistory();
                    events.splice(index, 1);
                    localStorage.setItem(`events-${dateParam}`, JSON.stringify(events));
                    renderEvents();
                });
                deleteBtn.addEventListener('mouseenter', () => {
                    deleteBtn.style.color = 'var(--hover-color)';
                });
                deleteBtn.addEventListener('mouseleave', () => {
                    deleteBtn.style.color = 'var(--text-color)';
                });

                const topHandle = eventBlock.querySelector('.drag-handle.top');
                const middleHandle = eventBlock.querySelector('.drag-handle.middle');
                const bottomHandle = eventBlock.querySelector('.drag-handle.bottom');

                topHandle.addEventListener('mouseenter', () => {
                    topHandle.style.color = 'var(--hover-color)';
                });
                topHandle.addEventListener('mouseleave', () => {
                    topHandle.style.color = 'var(--text-color)';
                });
                middleHandle.addEventListener('mouseenter', () => {
                    middleHandle.style.color = 'var(--hover-color)';
                });
                middleHandle.addEventListener('mouseleave', () => {
                    middleHandle.style.color = 'var(--text-color)';
                });
                bottomHandle.addEventListener('mouseenter', () => {
                    bottomHandle.style.color = 'var(--hover-color)';
                });
                bottomHandle.addEventListener('mouseleave', () => {
                    bottomHandle.style.color = 'var(--text-color)';
                });

                let isResizing = false;
                let isTopHandle = false;
                let initialHeight = 0;

                function startResize(e, isTop) {
                    if (event.locked) return;
                    e.stopPropagation();
                    isResizing = true;
                    isTopHandle = isTop;
                    initialY = e.clientY;
                    initialTop = parseFloat(eventBlock.style.top);
                    initialHeight = parseFloat(eventBlock.style.height);
                    currentAdjustingTop = initialTop;
                    currentAdjustingHeight = initialHeight;
                    eventBlock.classList.add('dragging');
                }

                topHandle.addEventListener('mousedown', (e) => startResize(e, true));
                bottomHandle.addEventListener('mousedown', (e) => startResize(e, false));

                document.addEventListener('mousemove', (e) => {
                    if (isResizing) {
                        const deltaY = e.clientY - initialY;
                        let newTop = initialTop;
                        let newHeight = initialHeight;

                        if (isTopHandle) {
                            newTop = Math.max(0, initialTop + deltaY);
                            const maxTop = initialTop + initialHeight - editInterval;
                            newTop = Math.min(newTop, maxTop);
                            newTop = Math.round(newTop / editInterval) * editInterval;
                            newHeight = initialTop + initialHeight - newTop;
                        } else {
                            newHeight = Math.max(editInterval, initialHeight + deltaY);
                            const maxHeight = (endHour - startHour - (initialTop / 60)) * 60;
                            newHeight = Math.min(newHeight, maxHeight);
                            newHeight = Math.round(newHeight / editInterval) * editInterval;
                        }
                        currentAdjustingTop = newTop;
                        currentAdjustingHeight = newHeight;

                        eventBlock.style.top = `${newTop}px`;
                        eventBlock.style.height = `${newHeight}px`;
                    }
                });

                document.addEventListener('mouseup', () => {
                    if (isResizing) {
                        isResizing = false;
                        eventBlock.classList.remove('dragging');
                        const newTop = parseFloat(currentAdjustingTop);
                        const newHeight = parseFloat(currentAdjustingHeight);
                        if (newHeight < editInterval) {
                            eventBlock.style.top = `${initialTop}px`;
                            eventBlock.style.height = `${initialHeight}px`;
                            return;
                        }
                        saveToHistory();
                        const newStartMinutes = Math.round((newTop / 60 + startHour) * 60);
                        const newEndMinutes = Math.round(((newTop + newHeight) / 60 + startHour) * 60);
                        events[index] = {
                            ...events[index],
                            start: minutesToTime(newStartMinutes),
                            end: minutesToTime(newEndMinutes)
                        };
                        localStorage.setItem(`events-${dateParam}`, JSON.stringify(events));
                        renderEvents();
                    }
                });

                let isDragging = false;
                middleHandle.addEventListener('mousedown', (e) => {
                    if (event.locked) return;
                    e.stopPropagation();
                    isDragging = true;
                    initialY = e.clientY;
                    initialTop = parseFloat(eventBlock.style.top);
                    eventBlock.classList.add('dragging');
                    const startX = e.clientX;
                    const startY = e.clientY;
                    let hasMoved = false;

                    const moveHandler = (moveEvent) => {
                        if (isDragging) {
                            if (Math.abs(moveEvent.clientX - startX) > 5 || Math.abs(moveEvent.clientY - startY) > 5) {
                                hasMoved = true;
                            }
                            const deltaY = moveEvent.clientY - initialY;
                            const newTop = Math.max(0, Math.min(gridHeight - height, initialTop + deltaY));
                            const snappedTop = Math.round(newTop / editInterval) * editInterval;
                            eventBlock.style.top = `${snappedTop}px`;
                        }
                    };

                    const upHandler = () => {
                        if (isDragging) {
                            isDragging = false;
                            eventBlock.classList.remove('dragging');
                            if (hasMoved) {
                                const newTop = parseFloat(eventBlock.style.top);
                                const newStartMinutes = Math.round((newTop / 60 + startHour) * 60);
                                const duration = (endTime - startTime) / (1000 * 60);
                                const newStartTime = minutesToTime(newStartMinutes);
                                const newEndTime = minutesToTime(newStartMinutes + duration);
                                saveToHistory();
                                events[index] = {
                                    ...events[index],
                                    start: newStartTime,
                                    end: newEndTime
                                };
                                localStorage.setItem(`events-${dateParam}`, JSON.stringify(events));
                                renderEvents();
                            } else {
                                if (isSmallEvent) {
                                    if (activeSmallEventIndex === index) {
                                        sidePanel.classList.remove('active');
                                        eventBlock.classList.remove('active');
                                        activeSmallEventIndex = null;
                                    } else {
                                        grid.querySelectorAll('.small-event-block').forEach(block => block.classList.remove('active'));
                                        eventBlock.classList.add('active');
                                        sidePanel.classList.add('active');
                                        sidePanel.style.top = `${Math.max(0, top)}px`;
                                        sidePanelTitle.textContent = event.title;
                                        sidePanelTime.textContent = `${event.start} - ${event.end}`;
                                        sidePanelDescription.textContent = event.description && event.description.length > 10 ? event.description.substring(0,10) + "..." : event.description || 'No description';
                                        sidePanelDescription.style.display = 'block';
                                        activeSmallEventIndex = index;
                                    }
                                }
                            }
                        }
                        document.removeEventListener('mousemove', moveHandler);
                        document.removeEventListener('mouseup', upHandler);
                    };

                    document.addEventListener('mousemove', moveHandler);
                    document.addEventListener('mouseup', upHandler);
                });
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && hoveredEventIndex !== null && !modal.style.display.includes('flex') && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                if (events[hoveredEventIndex].locked) {
                    alert('Cannot delete a locked event. Unlock it first.');
                    return;
                }
                saveToHistory();
                events.splice(hoveredEventIndex, 1);
                localStorage.setItem(`events-${dateParam}`, JSON.stringify(events));
                hoveredEventIndex = null;
                renderEvents();
            }
        });

        sidePanelEditBtn.addEventListener('mouseenter', () => {
            sidePanelEditBtn.style.color = 'var(--hover-color)';
        });
        sidePanelEditBtn.addEventListener('mouseleave', () => {
            sidePanelEditBtn.style.color = 'var(--text-color)';
        });
        sidePanelEditBtn.onclick = () => {
            if (activeSmallEventIndex !== null) {
                const event = events[activeSmallEventIndex];
                if (event.locked) {
                    alert('Cannot edit a locked event. Unlock it first.');
                    return;
                }
                editingIndex = activeSmallEventIndex;
                titleInput.value = event.title;
                startInput.value = event.start;
                endInput.value = event.end;
                descriptionInput.value = event.description || '';
                modal.style.display = 'flex';
            }
        };
        sidePanelDescription.addEventListener('mouseenter', () => {
            sidePanelDescription.style.color = 'var(--secondary-text-color)';
        });
        sidePanelDescription.addEventListener('mouseleave', () => {
            sidePanelDescription.style.color = 'var(--text-color)';
        });
        sidePanelDescription.onclick = () => {
            if (activeSmallEventIndex !== null) {
                const event = events[activeSmallEventIndex];
                if (sidePanelDescription.textContent === event.description.substring(0,10) + "...") {
                    sidePanelDescription.textContent = event.description;
                } else if (event.description && event.description.length > 10) {
                    sidePanelDescription.textContent = event.description.substring(0,10) + "...";
                }
            }
        };
    }

    function parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    function minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60) % 24;
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    newEventBtn.addEventListener('click', () => {
        editingIndex = null;
        titleInput.value = '';
        startInput.value = '';
        endInput.value = '';
        descriptionInput.value = '';
        modal.style.display = 'flex';
    });

    saveBtn.addEventListener('click', () => {
        const title = titleInput.value.trim();
        const start = startInput.value;
        const end = endInput.value;
        const description = descriptionInput.value.trim();

        if (!title || !start || !end) {
            alert('Please fill in title, start time, and end time.');
            return;
        }

        const startTime = parseTime(start);
        const endTime = parseTime(end);
        if (endTime <= startTime) {
            alert('End time must be after start time.');
            return;
        }

        saveToHistory();
        const event = { title, start, end, description, locked: false };
        if (editingIndex !== null) {
            events[editingIndex] = event;
        } else {
            events.push(event);
        }

        localStorage.setItem(`events-${dateParam}`, JSON.stringify(events));
        modal.style.display = 'none';
        activeSmallEventIndex = null;
        renderEvents();
    });

    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    renderTimeLabels();
    renderEvents();
});