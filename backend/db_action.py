from config import app, db
from models import Schedule
from datetime import datetime
import bleach
from sqlalchemy.exc import DatabaseError
import google.generativeai as genai
from dotenv import load_dotenv
import os
from aiPrompts import gemini_event_generator_prompt, gemini_schedule_generator_prompt
import json
import logging
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
options = ['Clear','Delete','Create','Generate Event','Generate Schedule','Quit']
prompt = ''
confirmation = False

logging.basicConfig(level=logging.DEBUG)

def printDatabase():
    with app.app_context():
        try:
            schedules = Schedule.query.all()
            if not schedules:
                print("No events or reminders found in the database.")
                logging.info("No events or reminders found in the database")
            else:
                print("\nCurrent Schedule:")
                print("-" * 50)
                for schedule in schedules:
                    event_info = schedule.to_json()
                    print(f"ID: {event_info['id']}")
                    print(f"Title: {event_info['title']}")
                    print(f"Type: {event_info['type']}")
                    print(f"Start: {event_info['startDate']} {event_info['start']}")
                    print(f"End: {event_info['endDate']} {event_info['end']}")
                    print(f"Description: {event_info['description']}")
                    print(f"Locked: {event_info['locked']}")
                    print("-" * 50)
                logging.info(f"Displayed {len(schedules)} events/reminders from the database")
        except DatabaseError as e:
            logging.error(f"Database error: {str(e)}")
            print(f"Database error: {str(e)}")
        except Exception as e:
            logging.error(f"Error retrieving events: {str(e)}")
            print(f"Error retrieving events: {str(e)}")
def confirmAction(code):
    checkConfirmation = input(f"Type {code} to confirm clearing the database: ")
    if checkConfirmation != code:
        logging.info("Operation cancelled.")
        exit()
    return True

def validateDate(date):
    try:
        datetime.strptime(date, "%Y-%m-%d")
        return True
    except ValueError:
        logging.error("Invalid date format. Use YYYY-MM-DD for dates.")
        return False
def validateTime(time):
    try:
        datetime.strptime(time, "%I:%M %p")
        return True
    except ValueError:
        logging.error("Invalid time format. Use HH:MM AM/PM for times.")
        return False
    
while not(prompt in options and confirmation):
    prompt = input("""
What would you like to do?
    Clear ==> Clear the Database
    Delete ==> Delete a Certain Event/Reminder
    Create ==> Create a Custom Event/Reminder
    Generate Event ==> Generate a Random Event
    Generate Schedule ==> Generate a Schedule (Clears the Original Database)
    Quit ==> Quit the Program
                
    """)
    if (prompt in options):
        if (prompt == 'Clear'):
            confirmation = confirmAction('DELETE THE WHOLE SCHEDULE')
        if (prompt == 'Delete'):
            confirmation = confirmAction('DELETE A SPECIFIED EVENT')
        if (prompt == 'Create'):
            confirmation = confirmAction('CREATE CUSTOM EVENT')
        if (prompt == 'Generate Event'):
            confirmation = confirmAction('GENERATE A RANDOM EVENT')
        if (prompt == 'Generate Schedule'):
            confirmation = confirmAction('DELETE THE OLD SCHEDULE AND GENERATE A NEW SCHEDULE')
        if (prompt == 'Quit'):
            exit()
    else:
        logging.error(f"Error: {prompt} is not a valid action")

if prompt == 'Clear':
    with app.app_context():
        try:
            # Delete all records from the Schedule table
            num_deleted = db.session.query(Schedule).delete()
            db.session.commit()
            logging.error(f"Successfully deleted {num_deleted} events from the database.")
        except DatabaseError as e:
            db.session.rollback()
            logging.error(f"Database error: {str(e)}")
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error deleting events: {str(e)}")

if prompt == 'Delete':
    with app.app_context():
        try:
            printDatabase()
            while True:
                try:
                    schedule_id = input("Enter the event ID to delete: ")
                    break
                except ValueError:
                    print("Error: Please enter a valid integer ID or 'cancel'.")
            schedule = Schedule.query.get(schedule_id)
            if not schedule:
                logging.error(f"Schedule with ID {schedule_id} not found")
                print(f"Error: No event or reminder found with ID {schedule_id}")
                exit()
            event_title = schedule.eventInfo.get('title', 'unknown')
            db.session.delete(schedule)
            db.session.commit()
            logging.info(f"Successfully deleted event/reminder ID {schedule_id}: {event_title}")
            print(f"Successfully deleted event/reminder: {event_title} (ID {schedule_id})")
        except DatabaseError as e:
            db.session.rollback()
            logging.error(f"Database error: {str(e)}")
            print(f"Database error: {str(e)}")
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error deleting event: {str(e)}")
            print(f"Error deleting event: {str(e)}")

if prompt == 'Create':
    with app.app_context():
        try:
            eventOrReminder = input("Is this an event or a reminder? (event/reminder): ")
            while eventOrReminder not in ["event", "reminder"]:
                eventOrReminder = input("Invalid input. Please enter 'event' or 'reminder': ")
            while True:
                errors = []
                newStartDate = input("Enter new startDate (YYYY-MM-DD): ") if eventOrReminder == 'event' else input("Enter date for reminder (YYYY-MM-DD): ")
                errors.append('noError' if validateDate(newStartDate) else "newStartDate")
                newEndDate = input("Enter new endDate (YYYY-MM-DD): ") if eventOrReminder == 'event' else newStartDate
                errors.append('noError' if validateDate(newEndDate) else "newEndDate")
                if eventOrReminder == 'event' and newEndDate < newStartDate:
                    errors.append("endDateBeforeStart")
                newTitle = input("Enter title: ")
                newTitle = bleach.clean(newTitle)
                newStartTime = input("Enter start time (HH:MM AM/PM): ")
                errors.append('noError' if validateTime(newStartTime) else "newStartTime")
                newEndTime = input("Enter end time (HH:MM AM/PM): ")
                errors.append('noError' if validateTime(newEndTime) else "newEndTime")
                newDescription = input("Enter description: ")
                newDescription = bleach.clean(newDescription)
                newLocked = input("Is this event locked? (Y/N): ")
                while newLocked not in ['Y', 'N']:
                    newLocked = input("Invalid input, please enter Y or N: ")
                newLocked = newLocked == 'Y'
                newUrgency = input("Enter urgency for event/reminder (trivial / ongoing / attention-needed / important / critical): ")
                while newUrgency not in ['trivial', 'ongoing', 'attention-needed', 'important', 'critical']:
                    newUrgency = input("Invalid input, please enter urgency for event/reminder (trivial / ongoing / attention-needed / important / critical): ")
                if set(errors) != {'noError'}:
                    logging.error("Error, the following inputs are invalid:", ", ".join([e for e in errors if e != 'noError']))
                    continue
                break
            newSchedule = Schedule(eventInfo={
                'description': newDescription,
                'end': newEndTime,
                'endDate': newEndDate,
                'locked': newLocked,
                'start': newStartTime,
                'startDate': newStartDate,
                'title': newTitle,
                'type': eventOrReminder,
                'urgency': newUrgency
            })
            db.session.add(newSchedule)
            db.session.commit()
            logging.info(f"Successfully created {eventOrReminder}: {newTitle}")
        except DatabaseError as e:
            db.session.rollback()
            logging.error(f"Database error: {str(e)}")
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error adding event: {str(e)}")

if prompt == 'Generate Event':
    with app.app_context():
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(gemini_event_generator_prompt)
            output = response.text.strip()
            if output.startswith("```json"):
                output = output[7:-3].strip()
            event_data = json.loads(output)
            print("event_data:",event_data)
            # Check if 'schedule' key exists and contains a single event
            if 'schedule' not in event_data:
                raise ValueError("AI output missing 'schedule' key")
            if not isinstance(event_data['schedule'], list):
                raise ValueError("AI output 'schedule' must be a single event object, in the format as [{ }]")
            schedule_data = event_data['schedule'][0] # Because the schedule is in form of a [ { } ], the first element is the schedule itself
            # Validate required fields
            required_fields = ['startDate', 'endDate', 'title', 'start', 'end', 'description', 'locked', 'type','urgency']
            missing_fields = [k for k in required_fields if k not in schedule_data]
            if missing_fields:
                raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
            if schedule_data['type'] != 'event':
                raise ValueError("Generated event must be of type 'event'")
            if not (validateDate(schedule_data['startDate']) and validateDate(schedule_data['endDate'])):
                raise ValueError("Invalid date format in AI-generated event")
            if not (validateTime(schedule_data['start']) and validateTime(schedule_data['end'])):
                raise ValueError("Invalid time format in AI-generated event")
            if schedule_data['endDate'] < schedule_data['startDate']:
                raise ValueError("endDate cannot be before startDate")
            if not (schedule_data['urgency'] in ['trivial', 'ongoing', 'attention-needed', 'important', 'critical']):
                raise ValueError("Urgency isn't properly specified")
            # Remove id if present to let database handle it
            if 'id' in schedule_data:
                del schedule_data['id']
            newSchedule = Schedule(eventInfo=schedule_data)
            db.session.add(newSchedule)
            db.session.commit()
            logging.info(f"Successfully created AI-generated event: {schedule_data['title']}")
            print(f"Successfully created event: {schedule_data['title']}")
        except json.JSONDecodeError as e:
            logging.error(f"Error parsing AI-generated event: {str(e)}")
            print(f"Error parsing AI-generated event: {str(e)}")
        except ValueError as e:
            logging.error(f"Invalid AI-generated event: {str(e)}")
            print(f"Invalid AI-generated event: {str(e)}")
        except DatabaseError as e:
            db.session.rollback()
            logging.error(f"Database error: {str(e)}")
            print(f"Database error: {str(e)}")
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error generating event: {str(e)}")
            print(f"Error generating event: {str(e)}")

if prompt == 'Generate Schedule':
    with app.app_context():
        try:
            # Delete all records from the Schedule table
            num_deleted = db.session.query(Schedule).delete()
            db.session.commit()
            logging.error(f"Successfully deleted {num_deleted} events from the database.")
        except DatabaseError as e:
            db.session.rollback()
            logging.error(f"Database error: {str(e)}")
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error deleting events: {str(e)}")
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(gemini_schedule_generator_prompt)
            output = response.text.strip()
            if output.startswith("```json"):
                output = output[7:-3].strip()
            schedule_data = json.loads(output)
            if 'schedule' not in schedule_data or not isinstance(schedule_data['schedule'], list):
                raise ValueError("AI output must be a JSON object with a 'schedule' array")
            required_fields = ['startDate', 'endDate', 'title', 'start', 'end', 'description', 'locked', 'type', 'urgency']
            for item in schedule_data['schedule']:
                missing_fields = [k for k in required_fields if k not in item]
                if missing_fields:
                    raise ValueError(f"Missing required fields: {', '.join(missing_fields)} for item {item.get('id', 'unknown')}")
                if item['type'] not in ['event', 'reminder']:
                    raise ValueError(f"Invalid type for item {item.get('id', 'unknown')}")
                if not (validateDate(item['startDate']) and validateDate(item['endDate'])):
                    raise ValueError(f"Invalid date format for item {item.get('id', 'unknown')}")
                if not (validateTime(item['start']) and validateTime(item['end'])):
                    raise ValueError(f"Invalid time format for item {item.get('id', 'unknown')}")
                if item['endDate'] < item['startDate']:
                    raise ValueError(f"endDate before startDate for item {item.get('id', 'unknown')}")
                if item['type'] == 'reminder' and item['startDate'] != item['endDate']:
                    raise ValueError(f"Reminders must have same startDate and endDate for item {item.get('id', 'unknown')}")
                if not (item['urgency'] in ['trivial', 'ongoing', 'attention-needed', 'important', 'critical']):
                    raise ValueError(f"Urgency ({item['urgency']}) for item {item.get('id','unknown')} is not valid")
                if 'id' in item:
                    del item['id']
                new_schedule = Schedule(event_info=item)
                db.session.add(new_schedule)
            db.session.commit()
            logging.info(f"Successfully created schedule with {len(schedule_data['schedule'])} items")
            print(f"Successfully created schedule with {len(schedule_data['schedule'])} items")
        except json.JSONDecodeError as e:
            logging.error(f"Error parsing AI-generated schedule: {str(e)}")
            print(f"Error parsing AI-generated schedule: {str(e)}")
        except ValueError as e:
            logging.error(f"Invalid AI-generated schedule: {str(e)}")
            print(f"Invalid AI-generated schedule: {str(e)}")
        except DatabaseError as e:
            db.session.rollback()
            logging.error(f"Database error: {str(e)}")
            print(f"Database error: {str(e)}")
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error generating schedule: {str(e)}")
            print(f"Error generating schedule: {str(e)}")