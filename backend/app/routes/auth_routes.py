from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import validators
from ..models.user import User
from bson.objectid import ObjectId
import secrets
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from flask_cors import cross_origin

bp = Blueprint('auth', __name__)

@bp.route('/api/auth/register', methods=['POST'])
@cross_origin(supports_credentials=True)
def register():
    data = request.json
    
    # Validate input
    if not all(key in data for key in ['email', 'password', 'name']):
        return jsonify({'error': 'Missing required fields'}), 400
        
    if not validators.email(data['email']):
        return jsonify({'error': 'Invalid email format'}), 400
        
    if len(data['password']) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    # Check if user already exists
    if current_app.db.users.find_one({'email': data['email']}):
        return jsonify({'error': 'Email already registered'}), 409

    # Create new user
    hashed_password = generate_password_hash(data['password'])
    
    user = User(
        email=data['email'],
        password_hash=hashed_password,
        role=data.get('role', 'creator'),  # Default to creator role
        name=data['name']
    )
    # Set user as verified by default
    user.is_verified = True

    current_app.db.users.insert_one(user.__dict__)

    return jsonify({'message': 'Registration successful. You can now login.'}), 201

@bp.route('/api/auth/login', methods=['POST'])
@cross_origin(supports_credentials=True)
def login():
    data = request.json
    
    if not all(key in data for key in ['email', 'password']):
        return jsonify({'error': 'Missing email or password'}), 400

    user_data = current_app.db.users.find_one({'email': data['email']})
    if not user_data:
        return jsonify({'error': 'Invalid credentials'}), 401

    user = User.from_dict(user_data)
    
    if not check_password_hash(user.password_hash, data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is deactivated'}), 403

    # Update last login
    current_app.db.users.update_one(
        {'email': user.email},
        {'$set': {'last_login': datetime.utcnow()}}
    )

    # Create access token
    access_token = create_access_token(
        identity=str(user_data['_id']),
        additional_claims={'role': user.role}
    )

    return jsonify({
        'token': access_token,
        'user': user.to_dict()
    }), 200

@bp.route('/api/auth/verify/<token>', methods=['GET'])
@cross_origin(supports_credentials=True)
def verify_email(token):
    user_data = current_app.db.users.find_one({'verification_token': token})
    if not user_data:
        return jsonify({'error': 'Invalid verification token'}), 400

    current_app.db.users.update_one(
        {'_id': user_data['_id']},
        {
            '$set': {'is_verified': True},
            '$unset': {'verification_token': ''}
        }
    )

    return jsonify({'message': 'Email verified successfully'}), 200

@bp.route('/api/auth/forgot-password', methods=['POST'])
@cross_origin(supports_credentials=True)
def forgot_password():
    data = request.json
    if 'email' not in data:
        return jsonify({'error': 'Email is required'}), 400

    user_data = current_app.db.users.find_one({'email': data['email']})
    if not user_data:
        return jsonify({'message': 'If the email exists, a reset link will be sent'}), 200

    reset_token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)

    current_app.db.users.update_one(
        {'_id': user_data['_id']},
        {
            '$set': {
                'reset_token': reset_token,
                'reset_token_expires': expires
            }
        }
    )

    # Send reset email
    try:
        sg = SendGridAPIClient(current_app.config['SENDGRID_API_KEY'])
        reset_url = f"{current_app.config['CLIENT_URL']}/reset-password/{reset_token}"
        message = Mail(
            from_email=current_app.config['SENDGRID_FROM_EMAIL'],
            to_emails=data['email'],
            subject='Reset your password',
            html_content=f'Click <a href="{reset_url}">here</a> to reset your password. This link expires in 1 hour.'
        )
        sg.send(message)
    except Exception as e:
        print(f"Failed to send reset email: {e}")

    return jsonify({'message': 'If the email exists, a reset link will be sent'}), 200

@bp.route('/api/auth/reset-password/<token>', methods=['POST'])
@cross_origin(supports_credentials=True)
def reset_password(token):
    data = request.json
    if 'password' not in data:
        return jsonify({'error': 'New password is required'}), 400

    if len(data['password']) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    user_data = current_app.db.users.find_one({
        'reset_token': token,
        'reset_token_expires': {'$gt': datetime.utcnow()}
    })

    if not user_data:
        return jsonify({'error': 'Invalid or expired reset token'}), 400

    hashed_password = generate_password_hash(data['password'])
    
    current_app.db.users.update_one(
        {'_id': user_data['_id']},
        {
            '$set': {'password_hash': hashed_password},
            '$unset': {
                'reset_token': '',
                'reset_token_expires': ''
            }
        }
    )

    return jsonify({'message': 'Password reset successful'}), 200

@bp.route('/api/auth/change-password', methods=['POST'])
@jwt_required()
@cross_origin(supports_credentials=True)
def change_password():
    user_id = get_jwt_identity()
    data = request.json
    
    if not all(key in data for key in ['current_password', 'new_password']):
        return jsonify({'error': 'Current and new password required'}), 400

    if len(data['new_password']) < 8:
        return jsonify({'error': 'New password must be at least 8 characters'}), 400

    user_data = current_app.db.users.find_one({'_id': ObjectId(user_id)})
    if not user_data:
        return jsonify({'error': 'User not found'}), 404

    if not check_password_hash(user_data['password_hash'], data['current_password']):
        return jsonify({'error': 'Current password is incorrect'}), 401

    hashed_password = generate_password_hash(data['new_password'])
    
    current_app.db.users.update_one(
        {'_id': ObjectId(user_id)},
        {'$set': {'password_hash': hashed_password}}
    )

    return jsonify({'message': 'Password changed successfully'}), 200

@bp.route('/api/auth/me', methods=['GET'])
@jwt_required()
@cross_origin(supports_credentials=True)
def get_current_user():
    user_id = get_jwt_identity()
    user_data = current_app.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user_data:
        return jsonify({'error': 'User not found'}), 404

    user = User.from_dict(user_data)
    return jsonify(user.to_dict()), 200