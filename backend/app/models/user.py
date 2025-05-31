from datetime import datetime
from bson import ObjectId

class User:
    def __init__(self, email, password_hash, role='respondent', name=None):
        self.email = email
        self.password_hash = password_hash
        self.role = role  # 'admin', 'creator', or 'respondent'
        self.name = name
        self.created_at = datetime.utcnow()
        self.last_login = None
        self.reset_token = None
        self.reset_token_expires = None
        self.is_active = True
        self.is_verified = True  # Always set to True since we removed verification

    def to_dict(self):
        return {
            'email': self.email,
            'role': self.role,
            'name': self.name,
            'created_at': self.created_at,
            'last_login': self.last_login,
            'is_active': self.is_active
        }

    @staticmethod
    def from_dict(data):
        user = User(
            email=data['email'],
            password_hash=data.get('password_hash'),
            role=data.get('role', 'respondent'),
            name=data.get('name')
        )
        user.created_at = data.get('created_at', datetime.utcnow())
        user.last_login = data.get('last_login')
        user.is_active = data.get('is_active', True)
        return user