import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { surveyApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { SurveyAnalytics } from '../types/survey';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface QuestionAnalytics {
  questionText: string;
  type: string;
  data: {
    labels?: string[];
    values?: number[];
    average?: number;
    responses?: string[];
  };
}

export default function SurveyResults() {
  const { user } = useAuth();
  const { surveyId } = useParams<{ surveyId: string }>();
  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveyTitle, setSurveyTitle] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!surveyId) {
        setError('Invalid survey ID');
        setLoading(false);
        return;
      }

      try {
        const data = await surveyApi.getSurveyAnalytics(surveyId as string);
        const formattedResponses = data.responses.map(r => ({
          ...r,
          submittedAt: r.submittedAt instanceof Date ? r.submittedAt : new Date(r.submittedAt)
        }));
        setAnalytics({
          ...data,
          responses: formattedResponses
        });
      } catch (err) {
        setError('Failed to load survey analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [surveyId]);

  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!surveyId) return <div className="error">Invalid survey ID</div>;
  
  // Move permission check after loading state
  if (!user || (user.role !== 'creator' && user.role !== 'admin')) {
    return <Navigate to="/" replace />;
  }

  if (!analytics) return <div>No data available</div>;

  const renderQuestionAnalytics = (question: QuestionAnalytics) => {
    switch (question.type) {
      case 'multiple_choice':
      case 'dropdown':
        return (
          <div className="chart-container">
            <Bar
              data={{
                labels: question.data.labels,
                datasets: [{
                  label: 'Responses',
                  data: question.data.values,
                  backgroundColor: 'rgba(75, 192, 192, 0.6)',
                }],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: true, text: question.questionText }
                }
              }}
            />
          </div>
        );

      case 'rating':
        return (
          <div className="rating-analytics">
            <h4>{question.questionText}</h4>
            <Bar
              data={{
                labels: question.data.labels,
                datasets: [{
                  label: 'Number of ratings',
                  data: question.data.values,
                  backgroundColor: 'rgba(153, 102, 255, 0.6)',
                }],
              }}
            />
            {question.data.average && (
              <p>Average rating: {question.data.average.toFixed(2)}</p>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="text-responses">
            <h4>{question.questionText}</h4>
            <div className="responses-list">
              {question.data.responses?.map((response, index) => (
                <div key={index} className="text-response">
                  "{response}"
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="survey-results">
      <div className="results-header">
        <h2>{surveyTitle || 'Survey Results'}</h2>
        <div className="export-options">
          <button className="export-button" onClick={() => window.print()}>
            Export PDF
          </button>
        </div>
      </div>
      
      <div className="overview-stats">
        <div className="stat-card">
          <h3>Total Responses</h3>
          <p>{analytics?.totalResponses}</p>
        </div>
        <div className="stat-card">
          <h3>Completion Rate</h3>
          <p>{analytics ? (analytics.completionRate * 100).toFixed(1) : 0}%</p>
        </div>
        <div className="stat-card">
          <h3>Average Time</h3>
          <p>{analytics?.averageTimeSpent || '0'} min</p>
        </div>
      </div>

      <div className="questions-analytics">
        {analytics?.questionAnalytics.map((question, index) => (
          <div key={index} className="question-analytics">
            {renderQuestionAnalytics(question)}
          </div>
        ))}
      </div>

      <style>
        {`
          .survey-results {
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
          }

          .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }

          .export-button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
          }

          .export-button:hover {
            background: #45a049;
          }

          .overview-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }

          .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
          }

          .questions-analytics {
            display: grid;
            gap: 30px;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          }

          @media print {
            .export-options {
              display: none;
            }
            
            .survey-results {
              padding: 0;
            }
            
            .chart-container {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }

          @media (max-width: 768px) {
            .results-header {
              flex-direction: column;
              gap: 10px;
            }
            
            .questions-analytics {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>
    </div>
  );
}