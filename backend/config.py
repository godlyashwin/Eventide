from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# Initializes Flask application
app = Flask(__name__)

# Enable cross-origin requests
CORS(app)

# Configure SQLite database
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///eventide.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Create database instance
db = SQLAlchemy(app)