import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function EventList({ schedules, selectedDate }) {
  const navigate = useNavigate();
  const [expandedEvents, setExpandedEvents] = useState({});

  const parseToDate = (date) => {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
    console.log("Date to be parsed:", date)
    
    // Convert month to number and ensure it's 2-digit string
    const monthNumber = (months.indexOf(date.month) + 1).toString().padStart(2, '0');
    
    // Ensure day is 2-digit string
    const dayString = date.day.toString().padStart(2, '0');
    
    const parsedDate = `${date.year}-${monthNumber}-${dayString}`;
    console.log("Parsed Date:", parsedDate);
    
    return parsedDate;
  }

  function checkProgress(startDate, endDate, selectedDate) {
  // Convert strings to Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);
  const selected = new Date(selectedDate);
  
  // Calculate total days between start and end (inclusive)
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  
  // Calculate which day selectedDate is (1-based index)
  const currentDay = Math.ceil((selected - start) / (1000 * 60 * 60 * 24)) + 1;
  
  // Validate that selectedDate is within the range
  if (currentDay < 1) {
    return "Selected date is before the start date";
  }
  
  if (currentDay > totalDays) {
    return "Selected date is after the end date";
  }
  
  return `/ (Day ${currentDay} of ${totalDays})`;
}

  const handleDelete = async (id) => {
    try {
      console.log(`Sending DELETE request to http://127.0.0.1:5000/delete_schedule/${id}`);
      await fetch(`http://127.0.0.1:5000/delete_schedule/${id}`, { method: 'DELETE' });
      navigate(0); // Refresh to reload schedules
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleEdit = (event) => {
    navigate(`/day-details?date=${event.startDate}&edit=${event.id}`);
  };

  const toggleExpand = (id) => {
    setExpandedEvents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDateRange = (startDate, endDate) => {
    if (startDate === endDate) {
      return startDate;
    }
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (startYear === endYear) {
      return `${monthNames[startMonth - 1]} ${startDay} - ${monthNames[endMonth - 1]} ${endDay}, ${startYear}`;
    }
    return `${monthNames[startMonth - 1]} ${startDay}, ${startYear} - ${monthNames[endMonth - 1]} ${endDay}, ${endYear}`;
  };
//{event.startDate} {event.endDate} {parseToDate(selectedDate)}
  return (
    <div className="px-4">
      {schedules.length === 0 ? (
        <p className="text-color text-sm">No events for this date.</p>
      ) : (
        schedules.map(event => (
          <div key={event.id} className="border border-color rounded-lg p-4 mb-2 bg-bg-color">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-color text-base font-medium">{event.title || 'Untitled Event'}</h3>
                <p className="secondary-text text-sm">
                  {formatDateRange(event.startDate, event.endDate)} / {event.start} - {event.end}
                  {(event.startDate !== event.endDate) && (
                    <span>{checkProgress(event.startDate,event.endDate,parseToDate(selectedDate))}</span>
                  )}
                </p>
                {event.description && (
                  <>
                    <p className="secondary-text text-sm truncate">{expandedEvents[event.id] ? event.description : `${event.description.slice(0, 50)}...`}</p>
                    <button
                      onClick={() => toggleExpand(event.id)}
                      className="text-color text-sm underline"
                    >
                      {expandedEvents[event.id] ? 'Show Less' : 'Show More'}
                    </button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(event)}
                  className="new-event-btn"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="new-event-btn"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default EventList;