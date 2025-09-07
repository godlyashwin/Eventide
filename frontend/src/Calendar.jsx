import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EventModal from './EventModal.jsx';
import ReminderModal from './ReminderModal.jsx';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const Calendar = ({ selectedDate, setSelectedDate }) => {
  const [currentYear, setCurrentYear] = useState(selectedDate.year);
  const [currentLeftMonth, setCurrentLeftMonth] = useState(months.indexOf(selectedDate.month));
  const [currentRightMonth, setCurrentRightMonth] = useState((months.indexOf(selectedDate.month) + 1) % 12);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    updateCalendarDays();
  }, [currentLeftMonth, currentRightMonth, currentYear, selectedDate]);

  const updateCalendarDays = () => {
    const grids = document.querySelectorAll('.calendar-grid');
    grids.forEach((grid, index) => {
      const month = index === 0 ? currentLeftMonth : currentRightMonth;
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      const firstDay = new Date(currentYear, month, 1).getDay();
      grid.querySelectorAll('button').forEach(button => button.remove());

      for (let i = 0; i < 42; i++) {
        const button = document.createElement('button');
        button.className = 'h-12 w-full text-color text-sm font-medium leading-normal';
        const div = document.createElement('div');
        div.className = 'flex size-full items-center justify-center rounded-full';
        button.appendChild(div);

        const dayIndex = i + 1 - firstDay;
        if (dayIndex > 0 && dayIndex <= daysInMonth) {
          div.textContent = dayIndex;
          if (dayIndex === parseInt(selectedDate.day) && months[month] === selectedDate.month && parseInt(currentYear) === parseInt(selectedDate.year)) {
            div.classList.add('highlight-bg');
          }
        } else {
          button.style.visibility = 'hidden';
        }

        grid.appendChild(button);

        button.addEventListener('mouseenter', () => {
          if (div.textContent) {
            if (div.textContent === selectedDate.day.toString() && months[month] === selectedDate.month && currentYear === selectedDate.year) {
              div.classList.add('hover-highlight-bg');
            } else {
              div.classList.add('hover-bg');
            }
          }
        });

        button.addEventListener('mouseleave', () => {
          div.classList.remove('hover-bg');
          div.classList.remove('hover-highlight-bg');
          if (div.textContent === selectedDate.day.toString() && months[month] === selectedDate.month && currentYear === selectedDate.year) {
            div.classList.add('highlight-bg');
          }
        });

        button.addEventListener('click', () => {
          if (div.textContent) {
            //console.log('Day:',day,'Month:',month,'Year:',currentYear);
            if (div.textContent === selectedDate.day.toString() && months[month] === selectedDate.month && currentYear === selectedDate.year) {
              const dayNavigate = div.textContent.padStart(2, '0');
              const monthIndexNavigate = months.indexOf(months[month]) + 1;
              navigate(`/day-details?date=${currentYear}-${monthIndexNavigate.toString().padStart(2, '0')}-${dayNavigate}`);
            }
            document.querySelectorAll('.calendar-grid button div').forEach(d => d.classList.remove('highlight-bg'));
            setSelectedDate({
              day: parseInt(div.textContent),
              month: months[month],
              year: currentYear,
            });
            localStorage.setItem('chosenDay', div.textContent);
            localStorage.setItem('chosenMonth', months[month]);
            localStorage.setItem('chosenYear', currentYear);
            div.classList.add('hover-highlight-bg');
          }
        });

        button.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (div.textContent) {
            const day = div.textContent.padStart(2, '0');
            const monthIndex = months.indexOf(months[month]) + 1;
            navigate(`/day-details?date=${currentYear}-${monthIndex.toString().padStart(2, '0')}-${day}`);
          }
        });
      }
    });
  };

  const handlePrevMonth = () => {
    setCurrentLeftMonth(prev => {
      let newLeft = prev - 1;
      let newRight = currentRightMonth - 1;
      if (newLeft < 0) {
        newLeft = 10;
        newRight = 11;
        setCurrentYear(year => {
          console.log('Decreasing Year');
          const newYear = Number(year) - Number(0.5);
          localStorage.setItem('currentYear', newYear);
          return newYear;
        });
      }
      setCurrentRightMonth(newRight < 0 ? 11 : newRight);
      return newLeft;
    });
  };

  const handleNextMonth = () => {
    setCurrentRightMonth(prev => {
      let newRight = prev + 1;
      let newLeft = currentLeftMonth + 1;
      if (newRight > 11) {
        newLeft = 0;
        newRight = 1;
        setCurrentYear(year => {
          console.log('Increasing year');
          const newYear = Number(year) + Number(0.5);
          localStorage.setItem('currentYear', newYear);
          return newYear;
        });
      }
      setCurrentLeftMonth(newLeft > 11 ? 0 : newLeft);
      return newRight;
    });
  };

  const handleSaveEvent = async (eventData) => {
    try {
      const payload = {
        eventInfo: {
          date: eventData.date,
          title: eventData.title || 'Untitled Event',
          start: eventData.start,
          end: eventData.end,
          description: eventData.description || '',
          locked: eventData.locked || false,
          type: eventData.type || 'event',
        },
      };
      const response = await fetch('http://127.0.0.1:5000/create_schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save event');
      }
      setIsEventModalOpen(false);
    } catch (error) {
      console.error('Error saving event:', error);
      alert(`Failed to save event: ${error.message}`);
    }
  };

  const handleQuickEvent = () => {
    setIsEventModalOpen(true);
  };

  const handleCreateReminder = () => {
    setIsReminderModalOpen(true);
  };

  const formattedDate = `${selectedDate.year}-${(months.indexOf(selectedDate.month) + 1).toString().padStart(2, '0')}-${selectedDate.day.toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-4">
      <div className="flex items-center justify-between w-full max-w-[960px] px-4 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-color text-lg font-bold leading-tight tracking-[-0.015em]">
            {selectedDate.month} {selectedDate.day}, {selectedDate.year}
          </h2>
          <button
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 highlight-bg text-color text-sm font-bold leading-normal tracking-[0.015em]"
            onClick={handleQuickEvent}
          >
            <span className="truncate">Quick Event</span>
          </button>
          <button
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 highlight-bg text-color text-sm font-bold leading-normal tracking-[0.015em]"
            onClick={handleCreateReminder}
          >
            <span className="truncate">Quick Reminder</span>
          </button>
        </div>
      </div>
      <div className="flex items-start justify-center gap-6 p-4">
        <div className="flex min-w-72 max-w-[336px] flex-1 flex-col gap-0.5 min-h-[360px]">
          <div className="flex items-center p-1 justify-between">
            <button onClick={handlePrevMonth}>
              <div className="text-color flex size-10 items-center justify-center" data-icon="CaretLeft" data-size="18px" data-weight="regular">
                <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
                </svg>
              </div>
            </button>
            <p className="text-color text-base font-bold leading-tight flex-1 text-center pr-10">{months[currentLeftMonth]} {currentYear}</p>
          </div>
          <div className="calendar-grid grid grid-cols-7">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <p key={day} className="text-color text-[13px] font-bold leading-normal tracking-[0.015em] flex h-12 w-full items-center justify-center pb-0.5">{day}</p>
            ))}
          </div>
        </div>
        <div className="flex min-w-72 max-w-[336px] flex-1 flex-col gap-0.5 min-h-[360px]">
          <div className="flex items-center p-1 justify-between">
            <p className="text-color text-base font-bold leading-tight flex-1 text-center pl-10">{months[currentRightMonth]} {currentYear}</p>
            <button onClick={handleNextMonth}>
              <div className="text-color flex size-10 items-center justify-center" data-icon="CaretRight" data-size="18px" data-weight="regular">
                <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path>
                </svg>
              </div>
            </button>
          </div>
          <div className="calendar-grid grid grid-cols-7">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <p key={day} className="text-color text-[13px] font-bold leading-normal tracking-[0.015em] flex h-12 w-full items-center justify-center pb-0.5">{day}</p>
            ))}
          </div>
        </div>
      </div>
      {isEventModalOpen && (
        <EventModal
          event={{ date: formattedDate }}
          setIsModalOpen={setIsEventModalOpen}
          setEditingIndex={() => {}}
          handleSaveEvent={handleSaveEvent}
          gridInterval={15}
        />
      )}
      {isReminderModalOpen && (
        <ReminderModal
          event={{ date: formattedDate }}
          setIsModalOpen={setIsReminderModalOpen}
          handleSaveEvent={handleSaveEvent}
          gridInterval={15}
        />
      )}
    </div>
  );
};

export default Calendar;