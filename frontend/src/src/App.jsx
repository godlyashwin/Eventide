import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from './Calendar.jsx';
import EventList from './EventList.jsx';
import { usePalette } from './PaletteContext.jsx';

function App() {
  const { selectedPalette } = usePalette();
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return {
      day: localStorage.getItem('chosenDay') || today.getDate(),
      month: localStorage.getItem('chosenMonth') || today.toLocaleString('default', { month: 'long' }),
      year: localStorage.getItem('chosenYear') || today.getFullYear(),
    };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const navigate = useNavigate();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const fetchSchedules = async (date) => {
    try {
      const formattedDate = `${date.year}-${String(months.indexOf(date.month) + 1).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
      console.log(`Sending GET request to http://127.0.0.1:5000/schedule?date=${formattedDate}`);
      const response = await fetch(`http://127.0.0.1:5000/schedule?date=${formattedDate}`);
      const data = await response.json();
      console.log('Received schedules:', data.schedule);
      setSchedules(data.schedule || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  useEffect(() => {
    fetchSchedules(selectedDate);
  }, [selectedDate]);

  const handleSummarizeCalendar = async () => {
    setIsLoading(true);
    setSummary('');
    
    try {
      // Get the formatted date for the selected date
      const formattedDate = `${selectedDate.year}-${String(months.indexOf(selectedDate.month) + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`;
      
      // Send the schedule data to the backend for summarization
      const response = await fetch('http://127.0.0.1:5000/summarize_calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formattedDate,
          schedule: schedules
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSummary(data.summary || 'No summary available');
      } else {
        console.error('Failed to get summary:', data.message);
        setSummary('Failed to generate summary. Please try again.');
      }
    } catch (error) {
      console.error('Error summarizing calendar:', error);
      setSummary('Error generating summary. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  console.log('Schedules:', schedules);
  
  return (
    <div className="relative flex size-full min-h-screen flex-col bg-bg-color group/design-root" style={{ fontFamily: '"Plus Jakarta Sans", "Noto Sans", sans-serif' }}>
      <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-color px-10 py-3">
          <div className="flex items-center gap-4 text-color">
            <div className="size-4">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z"
                  fill="currentColor"
                ></path>
              </svg>
            </div>
            <h2 className="text-color text-lg font-bold leading-tight tracking-[-0.015em]">Eventide</h2>
          </div>
          <div className="flex flex-1 justify-end gap-8">
            <div className="flex items-center gap-9">
              <a className="text-color text-sm font-medium leading-normal" href="#">Today</a>
              <a className="text-color text-sm font-medium leading-normal" href="#">Calendars</a>
              <a className="text-color text-sm font-medium leading-normal" href="#">Inbox</a>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/day-details?date=${selectedDate.year}-${String(months.indexOf(selectedDate.month) + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`)}
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 highlight-bg text-color text-sm font-bold leading-normal tracking-[0.015em]"
              >
                <span className="truncate">Manage Schedule</span>
              </button>
              <button
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 button-bg text-color text-sm font-bold leading-normal tracking-[0.015em]"
                onClick={() => navigate('/settings')}
              >
                <span className="truncate">Settings</span>
              </button>
            </div>
          </div>
        </header>
        <div className="px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            <Calendar selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
            <h2 id="summaryDate" className="text-color text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
              {selectedDate.month} {selectedDate.day}, {selectedDate.year}
            </h2>
            <EventList schedules={schedules} selectedDate={selectedDate} />
            <div className="flex px-4 py-3 justify-end">
              <button
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 button-bg text-color text-sm font-bold leading-normal tracking-[0.015em]"
                onClick={handleSummarizeCalendar}
                disabled={isLoading}
              >
                <span className="truncate">
                  {isLoading ? 'Generating Summary...' : 'Summarize Calendar'}
                </span>
              </button>
            </div>
            {summary && (
              <div className="px-4 py-3 mt-4 border border-color rounded-lg bg-bg-color">
                <h3 className="text-color text-lg font-bold mb-2">Calendar Summary</h3>
                <p className="text-color text-sm">{summary}</p>
              </div>
            )}
          </div>
        </div>
        {isLoading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-bg-color p-6 rounded-lg border border-color">
              <h3 className="text-color text-lg font-bold mb-4">Generating Summary...</h3>
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

export default App;