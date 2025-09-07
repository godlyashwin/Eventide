# main.py
from flask import request, jsonify
from config import app, db
from models import Schedule
import logging
from os import system
from dotenv import load_dotenv
import os
import json
import google.generativeai as genai
from aiPrompts import gemini_optimizer_prompt, gemini_summarizer_prompt

system("clear||cls")
logging.basicConfig(level=logging.DEBUG)
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))



@app.route("/schedule", methods=["GET"])
def get_schedule_info():
    logging.debug("Received GET request to /schedule")
    date = request.args.get("date")
    schedules = Schedule.query.all()
    if date:
        # Include events where date is between startDate and endDate
        schedules = [s for s in schedules if s.eventInfo.get('startDate') <= date <= s.eventInfo.get('endDate')]
    json_schedule = list(map(lambda x: x.to_json(), schedules))
    logging.debug(f"Returning schedules: {json_schedule}")
    return jsonify({"schedule": json_schedule}), 200

@app.route("/create_schedule", methods=["POST"])
def create_schedule():
    logging.debug("Received POST request to /create_schedule")
    data = request.get_json()
    event_info = data.get("eventInfo")
    if not event_info or not all(key in event_info for key in ["title", "startDate", "endDate", "start", "end"]):
        logging.error("Missing or invalid eventInfo; required fields: title, startDate, endDate, start, end")
        return jsonify({"message": "Error: Missing required fields: title, startDate, endDate, start, end"}), 400
    event_info['reminder'] = event_info.get('reminder', False) if isinstance(event_info.get('reminder'), bool) else False
    logging.debug(f"Creating schedule with eventInfo: {event_info}")
    new_schedule = Schedule(eventInfo=event_info)
    try:
        db.session.add(new_schedule)
        db.session.commit()
        logging.info(f"Schedule created successfully: {type(new_schedule)}")
    except Exception as e:
        logging.error(f"Error creating schedule: {str(e)}")
        return jsonify({"message": str(e)}), 400
    return jsonify({"message": "Schedule created!", "id": new_schedule.id, "eventInfo": new_schedule.eventInfo}), 201

@app.route("/update_schedule/<int:schedule_id>", methods=["PATCH"])
def update_schedule(schedule_id):
    logging.debug(f"Received PATCH request to /update_schedule/{schedule_id}")
    schedule = Schedule.query.get(schedule_id)
    if not schedule:
        logging.error(f"Schedule with ID {schedule_id} not found")
        return jsonify({"message": "Schedule not found"}), 404
    data = request.json
    event_info = data.get("eventInfo", schedule.eventInfo)
    if not all(key in event_info for key in ["title", "startDate", "endDate", "start", "end", "urgency"]):
        logging.error("Missing or invalid eventInfo; required fields: title, startDate, endDate, start, end","urgency")
        return jsonify({"message": "Missing required fields: title, startDate, endDate, start, end, urgency"}), 400
    event_info['reminder'] = event_info.get('reminder', schedule.eventInfo.get('reminder', False)) if isinstance(event_info.get('reminder'), bool) else schedule.eventInfo.get('reminder', False)
    logging.debug(f"Updating schedule with eventInfo: {event_info}")
    schedule.eventInfo = event_info
    db.session.commit()
    logging.info("Schedule updated successfully")
    return jsonify({"message": "Schedule updated"}), 200

@app.route("/delete_schedule/<int:schedule_id>", methods=["DELETE"])
def delete_schedule(schedule_id):
    logging.debug(f"Received DELETE request to /delete_schedule/{schedule_id}")
    schedule = Schedule.query.get(schedule_id)
    if not schedule:
        logging.error(f"Schedule with ID {schedule_id} not found")
        return jsonify({"message": "Schedule not found"}), 404
    db.session.delete(schedule)
    db.session.commit()
    logging.info("Schedule deleted successfully")
    return jsonify({"message": "Schedule deleted"}), 200

@app.route("/optimize_schedule", methods=["POST"])
def optimize_schedule():
    logging.debug("Received POST request to /optimize_schedule")
    data = request.get_json()
    schedule = data.get("schedule")
    allowed = data.get("allowed_modifications", [])
    if not schedule:
        return jsonify({"message": "Empty Schedule Provided"}), 400

    allowed_str = []
    if 'times' in allowed:
        allowed_str.append("start and end times")
    if 'dates' in allowed:
        allowed_str.append("startDate and endDate")
    if 'locked' in allowed:
        allowed_str.append("locked status")
    if 'name' in allowed:
        allowed_str.append("name")
    if 'description' in allowed:
        allowed_str.append("description")
    if 'urgency' in allowed:
        allowed_str.append("urgency")

    additional_prompt = f"The user allows you to modify: {', '.join(allowed_str)}." if allowed_str else "The user does not allow any modifications."
    locked_rule = "\n5. Maintain locked items exactly as they are." if 'locked' not in allowed else "\n5. You may modify locked status as needed."

    full_prompt = gemini_optimizer_prompt + locked_rule + "\n\n" + additional_prompt + "\n\nSchedule to be Improved: " + json.dumps({"schedule": schedule})

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(full_prompt)
        output = response.text.strip()
        if output.startswith("```json"):
            output = output[7:-3].strip()
        if output in ["Perfect Schedule", "Empty Schedule Provided"] or output.startswith("Incorrect JSON Object Structure"):
            return jsonify({"message": output}), 200
        improved_schedule = json.loads(output)
        return jsonify(improved_schedule), 200
    except Exception as e:
        logging.error(f"Error optimizing schedule: {str(e)}")
        return jsonify({"message": "Failed to optimize schedule"}), 500

@app.route("/summarize_calendar", methods=["POST"])
def summarize_calendar():
    logging.debug("Received POST request to /summarize_calendar")
    data = request.get_json()
    schedule = data.get("schedule", [])
    if not schedule:
        return jsonify({"message": "No events to summarize", "summary": "No events scheduled for this date."}), 200
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(gemini_summarizer_prompt)
        summary = response.text.strip()
        lines = summary.split('\n')
        if lines and lines[0].startswith('```'):
            lines = lines[1:]  # Remove first line
        if lines and lines[-1].strip() == '```':
            lines = lines[:-1]  # Remove last line
        summary = '\n'.join(lines).strip()
        return jsonify({"summary": summary}), 200
        
    except Exception as e:
        logging.error(f"Error summarizing calendar: {str(e)}")
        return jsonify({"message": "Failed to generate summary"}), 500
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)