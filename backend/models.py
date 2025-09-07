from config import db

class Schedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    eventInfo = db.Column(db.JSON, unique=False, nullable=False)

    def to_json(self):
        return {
            'id': self.id,
            'startDate': self.eventInfo.get('startDate'),
            'endDate': self.eventInfo.get('endDate'),
            'title': self.eventInfo.get('title'),
            'start': self.eventInfo.get('start'),
            'end': self.eventInfo.get('end'),
            'description': self.eventInfo.get('description', ''),
            'locked': self.eventInfo.get('locked', False),
            'type': self.eventInfo.get('type', 'event'),
            'urgency': self.eventInfo.get('urgency','trivial')
            # trivial, ongoing, attention-needed, important, critical
        }