import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { surveyApi } from '../services/api';
import { Survey } from '../types/survey';
import { useAuth } from '../contexts/AuthContext';

const SurveyList = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        const data = await surveyApi.getSurveys();
        setSurveys(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load surveys');
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();
  }, []);

  const handleDelete = async (surveyId: string) => {
    if (!window.confirm('Are you sure you want to delete this survey?')) {
      return;
    }

    try {
      await surveyApi.deleteSurvey(surveyId);
      setSurveys(surveys.filter(s => s._id !== surveyId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete survey');
    }
  };

  const copyShareableLink = (survey: Survey) => {
    const url = `${window.location.origin}/survey/${survey._id}`;
    navigator.clipboard.writeText(url);
    alert('Survey link copied to clipboard!');
  };

  if (loading) return <div>Loading surveys...</div>;
  if (error) return <div className="error-message">{error}</div>;

  const isCreator = (survey: Survey) => 
    isAuthenticated && (user?.role === "creator" || survey.collaborators.includes(user?.id || ''));

  return (
    <div className="survey-list">
      <div className="list-header">
        <h1>Available Surveys</h1>
        {isAuthenticated && (user?.role === 'creator' || user?.role === 'admin') && (
          <Link to="/create" className="create-button">
            Create New Survey
          </Link>
        )}
      </div>

      {surveys.length === 0 ? (
        <div className="no-surveys">
          <p>No surveys available.</p>
        </div>
      ) : (
        <div className="surveys-grid">
          {surveys.map((survey) => (
            <div key={survey._id} className="survey-card">
              <h2>{survey.title}</h2>
              <p>{survey.description}</p>
              
              <div className="survey-meta">
                <span>Created: {new Date(survey.created_at).toLocaleDateString()}</span>
                {survey.expires_at && (
                  <span>Expires: {new Date(survey.expires_at).toLocaleDateString()}</span>
                )}
                <span>Responses: {survey.responses.length}</span>
              </div>

              <div className="survey-actions">
                {isCreator(survey) ? (
                  <>
                    <button onClick={() => navigate(`/results/${survey._id}`)}>
                      View Results
                    </button>
                    <button onClick={() => copyShareableLink(survey)}>
                      Share
                    </button>
                    <button 
                      onClick={() => handleDelete(survey._id)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => navigate(`/survey/${survey._id}`)}>
                      Take Survey
                    </button>
                    {survey.settings.showResults && survey.responses.length > 0 && (
                      <button onClick={() => navigate(`/results/${survey._id}`)}>
                        View Results
                      </button>
                    )}
                  </>
                )}
              </div>

              {isCreator(survey) && (
                <div className="survey-settings-summary">
                  <p>
                    {survey.settings.allowAnonymous ? '✓' : '✗'} Anonymous Responses
                  </p>
                  <p>
                    {survey.settings.collectEmail ? '✓' : '✗'} Collecting Emails
                  </p>
                  <p>
                    {survey.settings.oneResponsePerIp ? '✓' : '✗'} One Response per IP
                  </p>
                  <p>
                    {survey.settings.showResults ? '✓' : '✗'} Public Results
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SurveyList;