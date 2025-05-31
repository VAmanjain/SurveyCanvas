from datetime import datetime
from typing import List, Optional, Dict, Any
from bson import ObjectId
from flask import current_app
from statistics import mean

class Question:
    def __init__(self, question_type: str, text: str, options: List[str] = None, 
                required: bool = False, order: int = 0):
        self.id = str(ObjectId())
        self.type = question_type  # 'multiple_choice', 'rating', 'text', 'dropdown'
        self.text = text
        self.options = options
        self.required = required
        self.order = order
        self.branch_logic = {}  # For conditional questions

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'type': self.type,
            'text': self.text,
            'options': self.options,
            'required': self.required,
            'order': self.order,
            'branch_logic': self.branch_logic
        }

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> 'Question':
        question = Question(
            question_type=data['type'],
            text=data['text'],
            options=data.get('options'),
            required=data.get('required', False),
            order=data.get('order', 0)
        )
        question.id = data.get('id', str(ObjectId()))
        question.branch_logic = data.get('branch_logic', {})
        return question

class Survey:
    def __init__(self, title: str, description: str, creator_id: str):
        self.id = str(ObjectId())
        self.title = title
        self.description = description
        self.creator_id = creator_id
        self.questions: List[Question] = []
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.expires_at: Optional[datetime] = None
        self.is_public = True
        self.shareable_link = str(ObjectId())
        self.responses = []
        self.collaborators = []
        self.settings = {
            'allow_anonymous': True,
            'collect_email': False,
            'one_response_per_ip': True,
            'show_results': True,
            'custom_thank_you': 'Thank you for completing the survey!'
        }

    def add_question(self, question: Question) -> None:
        question.order = len(self.questions)
        self.questions.append(question)

    def reorder_questions(self, question_ids: List[str]) -> None:
        question_map = {q.id: q for q in self.questions}
        self.questions = [question_map[qid] for qid in question_ids]
        for i, question in enumerate(self.questions):
            question.order = i

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'creator_id': self.creator_id,
            'questions': [q.to_dict() for q in self.questions],
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'expires_at': self.expires_at,
            'is_public': self.is_public,
            'shareable_link': self.shareable_link,
            'responses': self.responses,
            'collaborators': self.collaborators,
            'settings': self.settings
        }

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> 'Survey':
        survey = Survey(
            title=data['title'],
            description=data['description'],
            creator_id=data['creator_id']
        )
        survey.id = data.get('id', str(ObjectId()))
        survey.questions = [Question.from_dict(q) for q in data.get('questions', [])]
        survey.created_at = data.get('created_at', datetime.utcnow())
        survey.updated_at = data.get('updated_at', datetime.utcnow())
        survey.expires_at = data.get('expires_at')
        survey.is_public = data.get('is_public', True)
        survey.shareable_link = data.get('shareable_link', str(ObjectId()))
        survey.responses = data.get('responses', [])
        survey.collaborators = data.get('collaborators', [])
        survey.settings = data.get('settings', {
            'allow_anonymous': True,
            'collect_email': False,
            'one_response_per_ip': True,
            'show_results': True,
            'custom_thank_you': 'Thank you for completing the survey!'
        })
        return survey

    @staticmethod
    def get_templates():
        """Get all available survey templates"""
        templates = current_app.db.survey_templates.find({})
        return [{
            '_id': str(template['_id']),
            'title': template['title'],
            'description': template['description'],
            'category': template.get('category'),
            'tags': template.get('tags', []),
            'questions': template['questions'],
            'popularity': template.get('popularity', 0)
        } for template in templates]

    @staticmethod
    def get_analytics(survey_id):
        """Get enhanced analytics for a survey"""
        survey = current_app.db.surveys.find_one({'_id': ObjectId(survey_id)})
        if not survey:
            return None

        responses = survey.get('responses', [])
        total_responses = len(responses)
        
        # Calculate completion rate
        completed_responses = sum(1 for r in responses if all(
            q.get('answer') is not None 
            for q in r.get('answers', [])
        ))
        completion_rate = completed_responses / total_responses if total_responses > 0 else 0

        # Analyze each question
        question_analytics = []
        for question in survey['questions']:
            q_type = question['type']
            q_id = str(question['_id'])
            
            # Get all answers for this question
            answers = [
                r['answers'][q_id]['answer']
                for r in responses
                if 'answers' in r 
                and q_id in r['answers']
                and r['answers'][q_id].get('answer') is not None
            ]
            
            analytics = {
                'questionText': question['text'],
                'type': q_type,
                'data': {}
            }
            
            if q_type in ['multiple_choice', 'dropdown']:
                # Count frequency of each option
                options = question['options']
                counts = {option: answers.count(option) for option in options}
                analytics['data'] = {
                    'labels': list(counts.keys()),
                    'values': list(counts.values())
                }
                
            elif q_type == 'rating':
                # Calculate rating distribution and average
                ratings = [int(a) for a in answers if str(a).isdigit()]
                if ratings:
                    analytics['data'] = {
                        'labels': list(range(1, max(ratings) + 1)),
                        'values': [ratings.count(i) for i in range(1, max(ratings) + 1)],
                        'average': mean(ratings)
                    }
                    
            elif q_type == 'text':
                # Store text responses
                analytics['data'] = {
                    'responses': answers
                }
                
            question_analytics.append(analytics)

        return {
            'totalResponses': total_responses,
            'completionRate': completion_rate,
            'questionAnalytics': question_analytics,
            'responses': [{
                'submittedAt': r.get('submitted_at', datetime.utcnow()),
                'answers': r.get('answers', {})
            } for r in responses]
        }

def calculate_completion_rate(responses: List[Dict]) -> float:
    """Calculate the survey completion rate"""
    if not responses:
        return 0.0
    
    completed = sum(1 for response in responses if all(
        answer.get('value') for answer in response.get('answers', [])
    ))
    return completed / len(responses)

def analyze_question(question: Dict, responses: List[Dict]) -> Dict:
    """Analyze responses for a single question"""
    analysis = {
        'questionId': question['id'],
        'questionText': question['text'],
        'type': question['type'],
        'data': {}
    }

    # Get all answers for this question
    answers = [
        response['answers'][i]['value']
        for response in responses
        for i, ans in enumerate(response.get('answers', []))
        if ans.get('questionId') == question['id']
    ]

    if question['type'] in ['multiple_choice', 'dropdown']:
        # Count frequency of each option
        option_counts = {}
        for option in question.get('options', []):
            count = sum(1 for answer in answers if answer == option)
            option_counts[option] = count

        analysis['data'] = {
            'labels': list(option_counts.keys()),
            'values': list(option_counts.values())
        }

    elif question['type'] == 'rating':
        if answers:
            # Calculate average and distribution
            ratings = [int(rating) for rating in answers if rating.isdigit()]
            analysis['data'] = {
                'average': sum(ratings) / len(ratings) if ratings else 0,
                'labels': list(range(1, 6)),  # Assuming 1-5 rating scale
                'values': [sum(1 for r in ratings if r == i) for i in range(1, 6)]
            }

    elif question['type'] == 'text':
        # Store text responses for word cloud or text analysis
        analysis['data'] = {
            'responses': answers
        }

    return analysis