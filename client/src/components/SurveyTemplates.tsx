import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { surveyApi } from '../services/api';
import { SurveyTemplate } from '../types/survey';

const SurveyTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await surveyApi.getTemplates();
      setTemplates(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load survey templates');
      setLoading(false);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const { _id } = await surveyApi.useTemplate(templateId);
      navigate(`/edit/${_id}`);
    } catch (err) {
      setError('Failed to create survey from template');
    }
  };

  if (loading) return <div>Loading templates...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="survey-templates">
      <h2>Survey Templates</h2>
      <div className="templates-grid">
        {templates.map((template) => (
          <div key={template._id} className="template-card">
            <h3>{template.title}</h3>
            <p>{template.description}</p>
            {template.category && (
              <div className="template-category">
                Category: {template.category}
              </div>
            )}
            {template.tags && (
              <div className="template-tags">
                {template.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={() => handleUseTemplate(template._id)}
              className="use-template-btn"
            >
              Use Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SurveyTemplates;