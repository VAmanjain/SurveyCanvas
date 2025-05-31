from flask import Flask
from flask_cors import CORS
from pymongo import MongoClient, errors
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
import os
from datetime import timedelta


def create_app():
    load_dotenv()
    
    app = Flask(__name__)
    
    # Configure CORS
    CORS(app, 
         supports_credentials=True, origins= ["http://localhost:5173", "http://127.0.0.1:5173"],
                
         allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
         expose_headers=["Authorization"],
         allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    

    # Configure Flask-JWT-Extended
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key')  # Change in production
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)
    jwt = JWTManager(app)

    # Email configuration
    app.config['SENDGRID_API_KEY'] = os.getenv('SENDGRID_API_KEY')
    app.config['SENDGRID_FROM_EMAIL'] = os.getenv('SENDGRID_FROM_EMAIL')
    app.config['CLIENT_URL'] = os.getenv('CLIENT_URL', 'http://localhost:5173')

    # MongoDB Atlas setup
    try:
        client = MongoClient(os.getenv('MONGODB_URI'))
        app.db = client['survey_app']
        # Test the connection
        client.admin.command('ping')
        print("Successfully connected to MongoDB Atlas!")
    except errors.ConnectionFailure as e:
        print("Error connecting to MongoDB Atlas:", e)
        raise
    except Exception as e:
        print("Unexpected error:", e)
        raise

    # Register blueprints
    from app.routes import survey_routes, auth_routes
    app.register_blueprint(survey_routes.bp)
    app.register_blueprint(auth_routes.bp)

    return app

# Create the application instance
app = create_app()