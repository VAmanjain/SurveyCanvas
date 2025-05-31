import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { surveyApi } from '../services/api';
import { Survey, Question, SurveyResponse } from '../types/survey';
import { useAuth } from '../contexts/AuthContext';

const TakeSurvey = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        if (!id) throw new Error('Survey ID is required');
        const data = await surveyApi.getSurvey(id);
        setSurvey(data);
        
        // Check if survey has expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError('This survey has expired');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load survey');
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [id]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case 'text':
        return (
          <textarea
            value={answers[question.id] || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Your answer"
            required={question.required}
          />
        );

      case 'multiple_choice':
        return (
          <div className="options">
            {question.options?.map((option, index) => (
              <label key={index} className="option">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={answers[question.id] === option}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  required={question.required}
                />
                {option}
              </label>
            ))}
          </div>
        );

      case 'rating':
        return (
          <div className="rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className="rating-option">
                <input
                  type="radio"
                  name={question.id}
                  value={value}
                  checked={answers[question.id] === value}
                  onChange={(e) => handleAnswerChange(question.id, Number(e.target.value))}
                  required={question.required}
                />
                {value}
              </label>
            ))}
          </div>
        );

      case 'dropdown':
        return (
          <select
            value={answers[question.id] || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            required={question.required}
          >
            <option value="">Select an option</option>
            {question.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default:
        return <div>Unsupported question type</div>;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey) return;

    try {
      const response: SurveyResponse = {
        answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value
        })),
        submittedAt: new Date()
      };

      if (survey.settings.collectEmail) {
        response.respondentEmail = email;
      }

      await surveyApi.submitResponse(survey._id, response);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit response');
    }
  };

  if (loading) return <div>Loading survey...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!survey) return <div>Survey not found</div>;
  if (submitted) {
    return (
      <div className="thank-you">
        <h2>{survey.settings.customThankYou}</h2>
        {survey.settings.showResults && (
          <button onClick={() => navigate(`/results/${survey._id}`)}>
            View Results
          </button>
        )}
      </div>
    );
  }

  const visibleQuestions = survey.questions.filter(question => {
    if (!question.branchLogic) return true;
    
    const dependentAnswer = answers[question.branchLogic.showQuestionId || ''];
    return dependentAnswer === question.branchLogic.value;
  });

  return (
    <div className="take-survey">
      <h1>{survey.title}</h1>
      <p className="description">{survey.description}</p>

      {survey.expires_at && (
        <p className="expiry-notice">
          Survey closes on: {new Date(survey.expires_at).toLocaleDateString()}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        {survey.settings.collectEmail && (
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        )}

        {visibleQuestions.map((question) => (
          <div key={question.id} className="question">
            <label className="question-text">
              {question.text}
              {question.required && <span className="required">*</span>}
            </label>
            {renderQuestion(question)}
          </div>
        ))}

        <button type="submit" className="submit-button">
          Submit Response
        </button>
      </form>
    </div>
  );
};

export default TakeSurvey;