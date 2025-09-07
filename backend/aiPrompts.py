from datetime import datetime

currentDate = datetime.now().date()

policy = """
Good Schedule/Event Policy:

Purpose:
To establish a framework for creating and maintaining schedules that maximize productivity, reduce stress, and ensure a healthy balance between responsibilities and personal well-being.

1. Structure & Clarity:
- Defined Start and End Times: Each task or activity should have clear boundaries to prevent spillover.
- Realistic Time Blocks: Allocate sufficient time for each task, considering preparation, execution, and wrap-up.
- Prioritization: Arrange tasks based on urgency and importance using systems such as the Eisenhower Matrix.
- Buffer Periods: Include short breaks between major tasks to handle unforeseen delays or mental resets.

2. Balance & Flexibility:
- Work-Rest Balance: Include downtime, meals, and leisure to avoid burnout.
- Flexible Adjustment: Allow for schedule revisions if unexpected changes occur, without derailing the whole plan.
- Diversity of Activities: Avoid clustering similar tasks back-to-back when possible to keep energy and focus high.

3. Feasibility & Realism:
- No Overloading: Limit the number of major commitments per day to maintain quality over quantity.
- Energy Matching: Schedule high-focus tasks when you are most alert and lower-focus tasks during natural dips in energy.
- Task Chunking: Break large projects into smaller, actionable steps to prevent overwhelm.

4. Accountability & Review:
- Tracking Progress: Use a planner, calendar app, or task manager to monitor task completion.
- Daily Check-In: Spend 5-10 minutes reviewing the next day’s schedule each evening.
- Weekly Review: Reflect on what worked, what didn’t, and adjust the schedule-making approach accordingly.

5. Well-Being Considerations:
- Health First: Schedule time for meals, exercise, hydration, and sleep as non-negotiable items.
- Avoid Marathon Sessions: Limit continuous work/study sessions to 90 minutes, followed by a break.
- Personal Goals: Include time for hobbies, relationships, and self-improvement to maintain life satisfaction.
"""

template = """
"schedule": [
    {{
      "description": "Event 1 Description", 
      "end": "HH:MM PM", 
      "endDate": "YYYY-MM-DD", 
      "id": 1,
      "locked": false,
      "start": "HH:MM AM",
      "startDate": "YYYY-MM-DD",
      "title": "Event 1",
      "type": "event",
      "urgency": "trivial"
    }},
    {{
      "description": "Reminder 2 Description", 
      "end": "HH:MM PM", 
      "endDate": "YYYY-MM-DD",
      "id": 2, 
      "locked": true, 
      "start": "HH:MM AM",
      "startDate": "YYYY-MM-DD",
      "title": "test",
      "type": "reminder",
      "urgency": "critical"
    }}
]
"""

optimization_rules = """
Optimization Rules:
1. You must optimize the schedule to best follow the Good Schedule Policy provided below.
2. You may only change parameters and attributes that the user allows you to modify.
3. Never add or remove schedule items unless explicitly permitted by the user.
4. Keep the JSON structure exactly as defined. All parameters must be present and correctly formatted.
"""

validation_rules = """
Validation Rules:
- If the provided JSON schedule is missing parameters or contains incorrect parameter types, output:
  "Incorrect JSON Object Structure" 
  and then specify what is wrong.
- If no JSON object is provided, output:
  "Empty Schedule Provided"
- If the schedule already perfectly follows the Good Schedule Policy, output:
  "Perfect Schedule"
"""

optimizer_output = """
Output:
- If schedule is valid and changes are needed, output the updated JSON schedule only in the form of a valid JSON object, with the exact same template provided above, no explanations.
- If "Incorrect JSON Object Structure" or "Empty Schedule Provided" applies, follow the exact wording rule above.
- If "Perfect Schedule" applies, follow the exact wording rule above.
"""

event_generator_output = """
Output:
- Provide only the JSON object for the event, strictly following the template above.
- Do not include explanations or additional text outside the JSON object.
"""

schedule_generator_output = """
Output:
- Provide only the JSON object for the schedule, strictly following the template above.
- Do not include explanations or additional text outside the JSON object.
"""

constraints = f"""
Constraints:
- If told to generate one event, the event must be of type "event" (not "reminder").
- If told to generate a schedule, the events can be diverse, and be either events or reminders
- Use the current date ({currentDate}) for startDate and endDate.
- endDate must be on or after startDate.
- start and end times must be in "HH:MM AM/PM" format and within the same day (for simplicity).
- end time must be after start time, with a duration of at least 30 minutes but no more than 4 hours.
- title must be concise (5-20 characters) and descriptive.
- description must be brief (10-50 characters) and provide context for the event.
- locked should be set to false unless the event is critical (e.g., a fixed appointment).
- Ensure the event(s) is scheduled during reasonable hours (e.g., 8 AM-10 PM) to align with typical waking hours.
- urgency can only have the following options: ['trivial', 'ongoing', 'attention-needed', 'important', 'critical']
- urgency should match the title and description (ex: if title mentions important meetings, urgency shouldn't be 'trivial', but at least 'important')
"""




gemini_optimizer_prompt = f"""
You are an AI schedule optimization agent.

Your task:
- You will receive a schedule in JSON format that follows this template:

{template}

{optimization_rules}

{validation_rules}

{policy}

{optimizer_output}
"""

gemini_event_generator_prompt = f"""
You are an AI agent that generates random, but realistic and sensible, events.

Your task:
- You will create a single random event in JSON format that follows this template:

{template}

{policy}

{constraints}

{event_generator_output}
"""

gemini_schedule_generator_prompt = f"""
You are an AI agent that generates a random, but realistic and sensible, schedule.

Your task:
- You will create a single schedule in JSON format that follows this template:

{template}

{policy}

{constraints}

{schedule_generator_output}
"""

gemini_summarizer_prompt = f"""
You are an AI agent that generates a detailed summary of a provided schedule.

Your task:
- Once provided, you will create a summary that contains:
  1. Total number of events
  2. Key events and their times
  3. Any important notes or reminders
  4. Overall assessment of the day's schedule

Expect the schedule to be in the exact form of this JSON template:

{template}

Output:
- Do not include external explanations or additional text outside the summary
- Do NOT CREATE ANY MULTIPLE LINES. Your output will be compressed to one line, so attempting to have bullet points in it will look concerning. 
- Use punctuation to separate points, not line breaks.
"""