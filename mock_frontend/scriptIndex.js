import { palette } from './palettes.js';

const currentDate = new Date();

// Initialize chosenDay, chosenMonth, and chosenYear from localStorage or current date
let chosenDay = localStorage.getItem('chosenDay') !== null ? parseInt(localStorage.getItem('chosenDay')) : currentDate.getDate();
let chosenMonth = localStorage.getItem('chosenMonth') || currentDate.toLocaleString('default', { month: 'long' });
let chosenYear = localStorage.getItem('chosenYear') !== null ? parseInt(localStorage.getItem('chosenYear')) : currentDate.getFullYear();
let currentYear = localStorage.getItem('currentYear') !== null ? parseInt(localStorage.getItem('currentYear')) : chosenYear;
// Save initial values to localStorage if not already set
if (localStorage.getItem('chosenDay') === null) {
    localStorage.setItem('chosenDay', chosenDay);
}
if (!localStorage.getItem('chosenMonth')) {
    localStorage.setItem('chosenMonth', chosenMonth);
}
if (localStorage.getItem('chosenYear') === null) {
    localStorage.setItem('chosenYear', chosenYear);
}
if (localStorage.getItem('currentYear') === null) {
    localStorage.setItem('currentYear', currentYear);
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize months
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    const monthDisplays = document.querySelectorAll('.flex.items-center.p-1 p');
    const prevButton = document.querySelector('button [data-icon="CaretLeft"]');
    const nextButton = document.querySelector('button [data-icon="CaretRight"]');
    console.log('Iiuhgiurgh');
    let currentLeftMonth = months.indexOf(chosenMonth); // Use index of chosenMonth
    let currentRightMonth = (currentLeftMonth + 1) % 12; // Next month
    console.log('chosenMonth: ' + chosenMonth);
    console.log('currentLeftMonth: ' + currentLeftMonth);
    console.log('currentRightMonth: ' + currentRightMonth);

    // Get the current palette for hover-highlight-color fallback
    const savedPalette = localStorage.getItem('palette') || 'Minimalist 1';
    const selectedPalette = palette[savedPalette] || palette['Minimalist 1'];

    // Initial update
    updateMonthDisplays();

    function updateSelectedDayDisplay() {
        const selectedDayElement = document.getElementById('selected-day');
        if (chosenDay && chosenMonth) {
            selectedDayElement.textContent = `Selected: ${chosenMonth} ${chosenDay}, ${chosenYear}`;
        } else {
            selectedDayElement.textContent = 'Selected: None';
        }
        const summaryDate = document.getElementById("summaryDate");
        summaryDate.textContent = `${chosenMonth} ${chosenDay}, ${chosenYear}`;
    }

    function updateMonthDisplays() {
        monthDisplays[0].textContent = `${months[currentLeftMonth]} ${currentYear}`;
        monthDisplays[1].textContent = `${months[currentRightMonth]} ${currentYear}`;
        
        // Update day buttons for the new months
        updateCalendarDays();
        updateSelectedDayDisplay();
    }

    function updateCalendarDays() {
        const grids = document.querySelectorAll('.grid');
        
        grids.forEach((grid, index) => {
            const month = index === 0 ? currentLeftMonth : currentRightMonth;
            const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
            const firstDay = new Date(currentYear, month, 1).getDay();
            // Clear existing buttons
            grid.querySelectorAll('button').forEach(button => button.remove());
            
            // Create buttons for all 42 possible cells (6 rows * 7 columns)
            for (let i = 0; i < 42; i++) {
                const button = document.createElement('button');
                button.className = 'h-12 w-full text-color text-sm font-medium leading-normal';
                const div = document.createElement('div');
                div.className = 'flex size-full items-center justify-center rounded-full';
                button.appendChild(div);
                
                const dayIndex = i + 1 - firstDay;
                if (dayIndex > 0 && dayIndex <= daysInMonth) {
                    div.textContent = dayIndex;
                    // Highlight chosen day if it matches the current month
                    if (dayIndex === parseInt(chosenDay) && months[month] === chosenMonth && currentYear === chosenYear) {
                        div.classList.add('highlight-bg');
                    }
                } else {
                    button.style.visibility = 'hidden';
                }
                
                grid.appendChild(button);
                
                // Attach event listeners
                button.addEventListener('mouseenter', () => {
                    if (div.textContent) { // If it's a valid day (Code won't execute if day doesn't exist, like Feb 31st)
                        if (div.textContent === chosenDay.toString() && 
                            button.closest('.grid').previousElementSibling.querySelector('p').textContent.includes(chosenMonth) &&
                            button.closest('.grid').previousElementSibling.querySelector('p').textContent.includes(chosenYear)) {
                            div.classList.add('hover-highlight-bg');
                        } else {
                            div.classList.add('hover-bg');
                        }
                    }
                });
                
                button.addEventListener('mouseleave', () => {
                    div.classList.remove('hover-bg');
                    div.classList.remove('hover-highlight-bg');
                    if (div.textContent === chosenDay.toString() && 
                        button.closest('.grid').previousElementSibling.querySelector('p').textContent.includes(chosenMonth) &&
                        button.closest('.grid').previousElementSibling.querySelector('p').textContent.includes(chosenYear)) {
                        div.classList.add('highlight-bg');
                    } else {
                        div.classList.add('button-color');
                    }
                });
                
                button.addEventListener('click', () => {
                    if (div.textContent) {
                        // Remove highlight from all buttons
                        document.querySelectorAll('.grid button div').forEach(d => d.classList.remove('highlight-bg'));
                        // Update chosen day, month, and year
                        chosenDay = parseInt(div.textContent);
                        const dateElement = button.closest('.grid').previousElementSibling.querySelector('p');
                        chosenMonth = dateElement.textContent.split(' ')[0];
                        chosenYear = parseInt(dateElement.textContent.split(' ')[1]);
                        // Save to localStorage
                        localStorage.setItem('chosenDay', chosenDay);
                        localStorage.setItem('chosenMonth', chosenMonth);
                        localStorage.setItem('chosenYear', chosenYear);
                        // Add highlight to clicked button
                        div.classList.add('hover-highlight-bg');
                        // Update selected day display
                        updateSelectedDayDisplay();
                    }
                });

                button.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (div.textContent) {
                        const monthElement = button.closest('.grid').previousElementSibling.querySelector('p');
                        const month = monthElement.textContent.split(' ')[0];
                        const year = monthElement.textContent.split(' ')[1];
                        const day = div.textContent.padStart(2, '0'); // Ensure 2-digit day
                        const monthIndex = months.indexOf(month) + 1;
                        window.location.href = `day-details.html?date=${year}-${monthIndex.toString().padStart(2, '0')}-${day}`;
                    }
                });
            }
        });
        
        // Reset event descriptions
        document.querySelectorAll('.event-description').forEach(desc => {
            desc.style.display = 'none';
        });
    }

    prevButton.parentElement.addEventListener('click', () => {
        // If old format is January - February, new format is November - December
        currentLeftMonth--;
        currentRightMonth--;
        if (currentLeftMonth < 0) {
            currentLeftMonth = 10;
            currentRightMonth = 11;
            currentYear--;
            localStorage.setItem('currentYear', currentYear);
        } else if (currentRightMonth < 0) {
            currentRightMonth = 11;
        }
        updateMonthDisplays();
    });

    nextButton.parentElement.addEventListener('click', () => {
        // If old format was November - December, new format is January - February
        currentLeftMonth++;
        currentRightMonth++;
        if (currentRightMonth > 11) {
            currentLeftMonth = 0;
            currentRightMonth = 1;
            currentYear++;
            localStorage.setItem('currentYear', currentYear);
        } else if (currentLeftMonth > 11) {
            currentLeftMonth = 0;
        }
        updateMonthDisplays();
    });

    // Event description handling
    const eventArrows = document.querySelectorAll('.shrink-0 [data-icon="CaretRight"]');
    eventArrows.forEach(arrow => {
        arrow.parentElement.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the parent onclick
            const eventContainer = arrow.closest('.flex.items-center.gap-4');
            const eventTitle = eventContainer.querySelector('p.text-base').textContent;
            const eventTime = eventContainer.querySelector('p.text-sm').textContent;
            const descElement = eventContainer.querySelector('.event-description');

            if (descElement && descElement.style.display !== 'none') {
                arrow.style.transform = 'rotate(0deg)';
                descElement.style.display = 'none';
            } else {
                const description = 'Hello World!'; // Placeholder
                if (description !== null) {
                    localStorage.setItem(`event-${eventTitle}-${eventTime}`, description);
                    
                    let newDescElement = descElement;
                    if (!newDescElement) {
                        newDescElement = document.createElement('p');
                        newDescElement.className = 'event-description text-color text-sm font-normal leading-normal mt-2';
                        eventContainer.querySelector('.flex.flex-col').appendChild(newDescElement);
                    }
                    newDescElement.textContent = description || 'No description';
                    newDescElement.style.display = 'block';
                    arrow.style.transform = 'rotate(90deg)';
                }
            }
        });
    });

    // Initial call
    updateSelectedDayDisplay();

    // Manage Schedule button functionality
    const manageScheduleBtn = document.getElementById('manage-schedule-btn');
    manageScheduleBtn.addEventListener('click', () => {
        const day = chosenDay.toString().padStart(2, '0');
        const monthIndex = months.indexOf(chosenMonth) + 1;
        window.location.href = `day-details.html?date=${chosenYear}-${monthIndex.toString().padStart(2, '0')}-${day}`;
    });

    // Missing functionality report
    console.log('Missing functionality report:');
    console.log('- "Summarize Calendar" button: No functionality implemented');
    console.log('- Header navigation links (Today, Calendars, Inbox): No functionality implemented');
});