import { useState } from 'react';

const ScheduleForm = ({ existingContact = {}, updateCallback }) => {
  const [title, setTitle] = useState(existingContact.eventInfo?.title || '');
  const [date, setDate] = useState(existingContact.eventInfo?.date || '');
  const updating = Object.entries(existingContact).length !== 0;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !date.trim()) {
      alert('Please fill in both title and date');
      return;
    }
    const eventInfo = { title, date };
    const url = updating
      ? `http://127.0.0.1:5000/update_schedule/${existingContact.id}`
      : 'http://127.0.0.1:5000/create_schedule';
    const method = updating ? 'PATCH' : 'POST';
    console.log(`Sending ${method} request to ${url} with payload:`, { eventInfo });
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventInfo }),
    };
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log(`Received ${method} response:`, data);
      if (response.status !== 201 && response.status !== 200) {
        console.error(`Error in ${method} request:`, data.message);
        alert(data.message);
      } else {
        updateCallback();
      }
    } catch (error) {
      console.error(`Error in ${method} request:`, error);
      alert(error);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div>
        <label htmlFor="title">Event Title:</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="date">Date:</label>
        <input
          type="text"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <button type="submit">{updating ? 'Update' : 'Create'} Schedule</button>
    </form>
  );
};

export default ScheduleForm;