import { parseTime } from './utils.jsx';

function SidePanel({
  events,
  activeSmallEventIndex,
  setEditingIndex,
  setActiveSmallEventIndex,
  gridStartTime,
  setIsModalOpen,
  saveToHistory,
  setEvents
}) {
  const event = events[activeSmallEventIndex];

  if (!event) return null;

  const handleEdit = () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('SidePanel handleEdit:', { event, activeSmallEventIndex });
    }
    setEditingIndex(activeSmallEventIndex);
    setActiveSmallEventIndex(null);
    setTimeout(() => setIsModalOpen(true), 0);
  };

  const handleDelete = async () => {
    if (event.locked) {
      alert('Cannot delete a locked event.');
      return;
    }
    try {
      const previousEvents = [...events];
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      const response = await fetch(`http://127.0.0.1:5000/delete_schedule/${event.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        setEvents(previousEvents);
        throw new Error(data.message || 'Failed to delete event');
      }
      saveToHistory();
      setActiveSmallEventIndex(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(`Failed to delete event: ${error.message}`);
    }
  };

  return (
    <div
      className="side-panel fixed top-0 right-0 h-full w-80 bg-bg-color border-l border-color p-6 shadow-lg transition-all duration-300 ease-in-out"
      style={{ fontFamily: '"Plus Jakarta Sans", "Noto Sans", sans-serif', zIndex: '1001' }}
    >
      <h3 className="text-color text-lg font-bold mb-4">{event.title || 'Untitled Event'}</h3>
      <p className="text-color text-sm mb-2">{`${event.start} - ${event.end}`}</p>
      <p className="text-color text-sm mb-2">{event.description || 'No description'}</p>
      <p className="text-color text-sm mb-4">{event.locked ? 'Locked' : 'Unlocked'}</p>
      <div className="flex flex-col gap-3">
        <button
          onClick={handleEdit}
          disabled={event.locked}
          className="new-event-btn text-color text-sm font-bold leading-normal tracking-[0.015em] truncate"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={event.locked}
          className="new-event-btn text-color text-sm font-bold leading-normal tracking-[0.015em] truncate"
        >
          Delete
        </button>
        <button
          onClick={() => setActiveSmallEventIndex(null)}
          className="new-event-btn text-color text-sm font-bold leading-normal tracking-[0.015em] truncate"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default SidePanel;