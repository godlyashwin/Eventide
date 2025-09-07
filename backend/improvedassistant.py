import os
from dotenv import load_dotenv, find_dotenv
import time
load_dotenv(find_dotenv())

API_KEY = os.getenv("GEMINI_API_KEY")
print("API_KEY:", API_KEY)

from google import genai
client = genai.Client(api_key=API_KEY)

policy = """
Good Schedule Policy:

Purpose:
To establish a framework for creating and maintaining schedules that maximize productivity, reduce stress, and ensure a healthy balance between responsibilities and personal well-being.

1. Structure & Clarity:
- Defined Start and End Times: Each task or activity should have clear boundaries to prevent spillover.
- Realistic Time Blocks: Allocate sufficient time for each task, considering preparation, execution, and wrap-up.
- Prioritization: Arrange tasks based on urgency and importance using systems such as the Eisenhower Matrix.
- Buffer Periods: Include short breaks between major tasks to handle unforeseen delays or mental resets.

2. Balance & Flexibility:
- Work–Rest Balance: Include downtime, meals, and leisure to avoid burnout.
- Flexible Adjustment: Allow for schedule revisions if unexpected changes occur, without derailing the whole plan.
- Diversity of Activities: Avoid clustering similar tasks back-to-back when possible to keep energy and focus high.

3. Feasibility & Realism:
- No Overloading: Limit the number of major commitments per day to maintain quality over quantity.
- Energy Matching: Schedule high-focus tasks when you are most alert and lower-focus tasks during natural dips in energy.
- Task Chunking: Break large projects into smaller, actionable steps to prevent overwhelm.

4. Accountability & Review:
- Tracking Progress: Use a planner, calendar app, or task manager to monitor task completion.
- Daily Check-In: Spend 5–10 minutes reviewing the next day’s schedule each evening.
- Weekly Review: Reflect on what worked, what didn’t, and adjust the schedule-making approach accordingly.

5. Well-Being Considerations:
- Health First: Schedule time for meals, exercise, hydration, and sleep as non-negotiable items.
- Avoid Marathon Sessions: Limit continuous work/study sessions to 90 minutes, followed by a break.
- Personal Goals: Include time for hobbies, relationships, and self-improvement to maintain life satisfaction.
"""
gemini_prompt = f"""
You are an AI schedule optimization agent.

Your task:
- You will receive a schedule in JSON format that follows this template:

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
      "type": "event"
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
      "type": "reminder" 
    }}
]

Optimization Rules:
1. You must optimize the schedule to best follow the Good Schedule Policy provided below.
2. You may only change parameters and attributes that the user allows you to modify.
3. Never add or remove schedule items unless explicitly permitted by the user.
4. Keep the JSON structure exactly as defined. All parameters must be present and correctly formatted.
5. Maintain locked items exactly as they are.

Validation Rules:
- If the provided JSON schedule is missing parameters or contains incorrect parameter types, output:
  "Incorrect JSON Object Structure" 
  and then specify what is wrong.
- If no JSON object is provided, output:
  "Empty Schedule Provided"
- If the schedule already perfectly follows the Good Schedule Policy, output:
  "Perfect Schedule"

{policy}

Output:
- If valid and changes are needed, output the updated JSON schedule only in the form of a valid JSON object, with the exact same template provided above, no explanations.
- If "Incorrect JSON Object Structure" or "Empty Schedule Provided" applies, follow the exact wording rule above.
- If "Perfect Schedule" applies, follow the exact wording rule above.
"""


def optimize(schedule):
    startTime = time.time()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=gemini_prompt + "\n\nSchedule to be Improved: " + str(schedule))
    endTime = time.time()
    print(response.text)
    print("Time It Took To Generate:",(endTime - startTime),"seconds")

example_schedule = """
{
  "schedule": [
    {
      "description": "Team meeting to discuss project progress",
      "end": "11:00 AM",
      "endDate": "2025-08-16",
      "id": 1,
      "locked": false,
      "start": "9:00 AM",
      "startDate": "2025-08-16",
      "title": "Project Meeting",
      "type": "event"
    },
    {
      "description": "Work on quarterly financial report",
      "end": "2:00 PM",
      "endDate": "2025-08-16",
      "id": 2,
      "locked": false,
      "start": "11:00 AM",
      "startDate": "2025-08-16",
      "title": "Financial Report",
      "type": "event"
    },
    {
      "description": "Client call for feedback",
      "end": "3:00 PM",
      "endDate": "2025-08-16",
      "id": 3,
      "locked": false,
      "start": "2:00 PM",
      "startDate": "2025-08-16",
      "title": "Client Call",
      "type": "event"
    },
    {
      "description": "Finalize marketing strategy draft",
      "end": "5:30 PM",
      "endDate": "2025-08-16",
      "id": 4,
      "locked": false,
      "start": "3:00 PM",
      "startDate": "2025-08-16",
      "title": "Marketing Draft",
      "type": "event"
    }
  ]
}
"""

optimize(example_schedule)