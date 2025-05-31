from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime
from ..models.survey import Survey, Question
from flask_cors import cross_origin

bp = Blueprint('surveys', __name__)

def check_survey_access(survey, user_id, required_role=None):
    if not survey:
        return False, 'Survey not found', 404
    
    # Allow access if survey is public and no specific role is required
    if survey['is_public'] and not required_role:
        return True, None, 200

    # Check if user is creator or collaborator
    is_creator = str(survey['creator_id']) == str(user_id)
    is_collaborator = user_id in survey.get('collaborators', [])
    
    if not (is_creator or is_collaborator) and required_role:
        return False, 'Unauthorized access', 403
    
    return True, None, 200

@bp.route('/api/surveys', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_surveys():
    try:
        verify_jwt_in_request(optional=True)  # Verify if token exists
        user_id = get_jwt_identity()
    except:
        user_id = None
    if user_id:
        # If authenticated, show user's created surveys and collaborated surveys
        surveys = list(current_app.db.surveys.find({
            '$or': [
                {'creator_id': user_id},
                {'collaborators': user_id},
                {'is_public': True}
            ]
        }))
    else:
        # If not authenticated, only show public surveys
        surveys = list(current_app.db.surveys.find({'is_public': True}))
    
    for survey in surveys:
        survey['_id'] = str(survey['_id'])
    
    return jsonify(surveys)

@bp.route('/api/surveys', methods=['POST'])
@jwt_required()
@cross_origin(supports_credentials=True)
def create_survey():
    user_id = get_jwt_identity()
    claims = get_jwt()
    
    if claims.get('role') not in ['creator', 'admin']:
        return jsonify({'error': 'Unauthorized'}), 403

    survey_data = request.json
    survey = Survey(
        title=survey_data['title'],
        description=survey_data['description'],
        creator_id=user_id
    )
    
    # Add questions
    for q_data in survey_data.get('questions', []):
        question = Question(
            question_type=q_data['type'],
            text=q_data['text'],
            options=q_data.get('options'),
            required=q_data.get('required', False)
        )
        survey.add_question(question)
    
    # Set survey settings
    if 'settings' in survey_data:
        survey.settings.update(survey_data['settings'])
    
    # Set expiration if provided
    if 'expires_at' in survey_data:
        survey.expires_at = datetime.fromisoformat(survey_data['expires_at'])
    
    result = current_app.db.surveys.insert_one(survey.to_dict())
    return jsonify({'_id': str(result.inserted_id)}), 201

@bp.route('/api/surveys/<survey_id>', methods=['GET'])
@jwt_required()  # This is the important addition
@cross_origin(supports_credentials=True)
def get_survey(survey_id):
    survey = current_app.db.surveys.find_one({'_id': ObjectId(survey_id)})
    if not survey:
        return jsonify({'error': 'Survey not found'}), 404

    user_id = get_jwt_identity()

    has_access, error_msg, status_code = check_survey_access(survey, user_id)
    if not has_access:
        return jsonify({'error': error_msg}), status_code

    survey['_id'] = str(survey['_id'])
    return jsonify(survey)

@bp.route('/api/surveys/<survey_id>', methods=['PUT'])
@jwt_required()
@cross_origin(supports_credentials=True)
def update_survey(survey_id):
    user_id = get_jwt_identity()
    survey = current_app.db.surveys.find_one({'_id': ObjectId(survey_id)})
    
    has_access, error_msg, status_code = check_survey_access(survey, user_id, required_role='creator')
    if not has_access:
        return jsonify({'error': error_msg}), status_code

    update_data = request.json
    survey_obj = Survey.from_dict(survey)
    
    # Update basic info
    survey_obj.title = update_data.get('title', survey_obj.title)
    survey_obj.description = update_data.get('description', survey_obj.description)
    survey_obj.updated_at = datetime.utcnow()
    
    # Update questions if provided
    if 'questions' in update_data:
        survey_obj.questions = [Question.from_dict(q) for q in update_data['questions']]
    
    # Update settings if provided
    if 'settings' in update_data:
        survey_obj.settings.update(update_data['settings'])
    
    # Update expiration if provided
    if 'expires_at' in update_data:
        survey_obj.expires_at = datetime.fromisoformat(update_data['expires_at'])
    
    # Update collaborators if provided
    if 'collaborators' in update_data:
        survey_obj.collaborators = update_data['collaborators']

    current_app.db.surveys.update_one(
        {'_id': ObjectId(survey_id)},
        {'$set': survey_obj.to_dict()}
    )
    
    return jsonify({'message': 'Survey updated successfully'})

@bp.route('/api/surveys/<survey_id>/respond', methods=['POST'])
@cross_origin(supports_credentials=True)
def submit_response(survey_id):
    survey = current_app.db.surveys.find_one({'_id': ObjectId(survey_id)})
    if not survey:
        return jsonify({'error': 'Survey not found'}), 404
    
    # Check if survey has expired
    if survey.get('expires_at') and datetime.utcnow() > survey['expires_at']:
        return jsonify({'error': 'Survey has expired'}), 400
    
    response_data = request.json
    response_data['submitted_at'] = datetime.utcnow()
    
    # Add IP address if one response per IP is enabled
    if survey['settings'].get('one_response_per_ip'):
        ip_address = request.remote_addr
        existing_response = current_app.db.surveys.find_one({
            '_id': ObjectId(survey_id),
            'responses.ip_address': ip_address
        })
        if existing_response:
            return jsonify({'error': 'Already submitted response from this IP'}), 400
        response_data['ip_address'] = ip_address
    
    # Validate required questions
    for question in survey['questions']:
        if question['required']:
            answered = False
            for answer in response_data['answers']:
                if answer['questionId'] == question['id']:
                    answered = True
                    break
            if not answered:
                return jsonify({'error': f'Question "{question["text"]}" is required'}), 400
    
    result = current_app.db.surveys.update_one(
        {'_id': ObjectId(survey_id)},
        {'$push': {'responses': response_data}}
    )
    
    if result.modified_count == 0:
        return jsonify({'error': 'Failed to submit response'}), 500
        
    return jsonify({
        'message': 'Response submitted successfully',
        'thank_you_message': survey['settings'].get('custom_thank_you', 'Thank you for completing the survey!')
    }), 200

@bp.route('/api/surveys/<survey_id>/results', methods=['GET'])
@jwt_required()
@cross_origin(supports_credentials=True)
def get_survey_results(survey_id):
    user_id = get_jwt_identity()
    survey = current_app.db.surveys.find_one({'_id': ObjectId(survey_id)})
    
    has_access, error_msg, status_code = check_survey_access(survey, user_id, required_role='creator')
    if not has_access:
        return jsonify({'error': error_msg}), status_code
    
    # If results are public and user is not creator/collaborator
    if not has_access and not survey['settings'].get('show_results', True):
        return jsonify({'error': 'Results are not public'}), 403
    
    responses = survey.get('responses', [])
    
    return jsonify({
        'total_responses': len(responses),
        'responses': responses
    })

@bp.route('/api/surveys/<survey_id>/collaborators', methods=['POST'])
@jwt_required()
@cross_origin(supports_credentials=True)
def add_collaborator(survey_id):
    user_id = get_jwt_identity()
    survey = current_app.db.surveys.find_one({'_id': ObjectId(survey_id)})
    
    if str(survey['creator_id']) != str(user_id):
        return jsonify({'error': 'Only the survey creator can add collaborators'}), 403
    
    collaborator_id = request.json.get('user_id')
    if not collaborator_id:
        return jsonify({'error': 'Collaborator ID is required'}), 400
    
    current_app.db.surveys.update_one(
        {'_id': ObjectId(survey_id)},
        {'$addToSet': {'collaborators': collaborator_id}}
    )
    
    return jsonify({'message': 'Collaborator added successfully'})

@bp.route('/api/surveys/<survey_id>', methods=['DELETE'])
@jwt_required()
@cross_origin(supports_credentials=True)
def delete_survey(survey_id):
    user_id = get_jwt_identity()
    claims = get_jwt()
    
    survey = current_app.db.surveys.find_one({'_id': ObjectId(survey_id)})
    if not survey:
        return jsonify({'error': 'Survey not found'}), 404
    
    # Only creator or admin can delete
    if str(survey['creator_id']) != str(user_id) and claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    current_app.db.surveys.delete_one({'_id': ObjectId(survey_id)})
    return jsonify({'message': 'Survey deleted successfully'})

@bp.route('/api/surveys/templates', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_survey_templates():
    templates = list(current_app.db.survey_templates.find({}))
    for template in templates:
        template['_id'] = str(template['_id'])
    return jsonify(templates)

@bp.route('/templates', methods=['GET'])
@jwt_required()
@cross_origin(supports_credentials=True)
def get_templates():
    """Get all survey templates"""
    try:
        templates = Survey.get_templates()
        return jsonify(templates), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/templates/<template_id>/use', methods=['POST'])
@jwt_required()
@cross_origin(supports_credentials=True)
def use_template(template_id):
    """Create a new survey from a template"""
    try:
        user_id = get_jwt_identity()
        template = Survey.get_by_id(template_id)
        
        if not template:
            return jsonify({'error': 'Template not found'}), 404
            
        # Create new survey from template
        new_survey = {
            'title': f"{template['title']} (Copy)",
            'description': template['description'],
            'questions': template['questions'],
            'creator_id': user_id,
            'created_at': datetime.datetime.utcnow(),
            'settings': template.get('settings', {})
        }
        
        survey_id = Survey.create(new_survey)
        return jsonify({'_id': str(survey_id)}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/results/<survey_id>/analytics', methods=['GET'])
@jwt_required()
@cross_origin(supports_credentials=True)
def get_survey_analytics(survey_id):
    """Get enhanced analytics for a survey"""
    try:
        analytics = Survey.get_analytics(survey_id)
        if not analytics:
            return jsonify({'error': 'Survey not found'}), 404
            
        return jsonify(analytics), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500