import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { surveyApi } from '../services/api';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface QuestionType {
  id: string;
  type: 'multiple_choice' | 'rating' | 'text' | 'dropdown';
  text: string;
  options?: string[];
  required: boolean;
  order: number;
  branchLogic?: {
    condition: string;
    value: string;
    showQuestionId?: string;
  };
}

interface SurveySettings {
  allowAnonymous: boolean;
  collectEmail: boolean;
  oneResponsePerIp: boolean;
  showResults: boolean;
  customThankYou: string;
}

const CreateSurvey = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [expiryDate, setExpiryDate] = useState('');
  const [settings, setSettings] = useState<SurveySettings>({
    allowAnonymous: true,
    collectEmail: false,
    oneResponsePerIp: true,
    showResults: true,
    customThankYou: 'Thank you for completing the survey!'
  });

  const addQuestion = (type: QuestionType['type']) => {
    const newQuestion: QuestionType = {
      id: crypto.randomUUID(),
      type,
      text: '',
      required: false,
      order: questions.length,
      options: type === 'multiple_choice' || type === 'dropdown' ? [''] : undefined
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<QuestionType>) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId ? {
        ...q,
        options: [...(q.options || []), '']
      } : q
    ));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId ? {
        ...q,
        options: q.options?.map((opt, idx) =>
          idx === optionIndex ? value : opt
        )
      } : q
    ));
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q =>
      q.id === questionId ? {
        ...q,
        options: q.options?.filter((_, idx) => idx !== optionIndex)
      } : q
    ));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order property
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setQuestions(updatedItems);
  };

  const addBranchLogic = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          branchLogic: {
            condition: 'equals',
            value: '',
            showQuestionId: ''
          }
        };
      }
      return q;
    }));
  };

  const updateBranchLogic = (questionId: string, updates: Partial<QuestionType['branchLogic']>) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          branchLogic: {
            ...q.branchLogic,
            ...updates
          }
        };
      }
      return q;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const surveyData = {
        title,
        description,
        questions: questions.map(q => ({
          ...q,
          options: q.options?.filter(opt => opt.trim() !== '')
        })),
        creator_id: user?.id,
        expires_at: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        settings: {
          allow_anonymous: settings.allowAnonymous,
          collect_email: settings.collectEmail,
          one_response_per_ip: settings.oneResponsePerIp,
          show_results: settings.showResults,
          custom_thank_you: settings.customThankYou
        }
      };

      const response = await surveyApi.createSurvey(surveyData);
      navigate(`/survey/${response._id}`);
    } catch (error) {
      console.error('Failed to create survey:', error);
    }
  };

  return (
    <div className="create-survey">
      <h1>Create New Survey</h1>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Survey Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="survey-settings">
          <h3>Survey Settings</h3>
          <div className="settings-grid">
            <label>
              <input
                type="checkbox"
                checked={settings.allowAnonymous}
                onChange={(e) => setSettings({...settings, allowAnonymous: e.target.checked})}
              />
              Allow Anonymous Responses
            </label>

            <label>
              <input
                type="checkbox"
                checked={settings.collectEmail}
                onChange={(e) => setSettings({...settings, collectEmail: e.target.checked})}
              />
              Collect Email Addresses
            </label>

            <label>
              <input
                type="checkbox"
                checked={settings.oneResponsePerIp}
                onChange={(e) => setSettings({...settings, oneResponsePerIp: e.target.checked})}
              />
              One Response per IP
            </label>

            <label>
              <input
                type="checkbox"
                checked={settings.showResults}
                onChange={(e) => setSettings({...settings, showResults: e.target.checked})}
              />
              Show Results to Respondents
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="thankYou">Custom Thank You Message</label>
            <textarea
              id="thankYou"
              value={settings.customThankYou}
              onChange={(e) => setSettings({...settings, customThankYou: e.target.value})}
              rows={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="expiry">Survey Expiry Date (Optional)</label>
            <input
              type="datetime-local"
              id="expiry"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
        </div>

        <div className="question-types">
          <button type="button" onClick={() => addQuestion('text')}>
            Add Text Question
          </button>
          <button type="button" onClick={() => addQuestion('multiple_choice')}>
            Add Multiple Choice
          </button>
          <button type="button" onClick={() => addQuestion('rating')}>
            Add Rating Scale
          </button>
          <button type="button" onClick={() => addQuestion('dropdown')}>
            Add Dropdown
          </button>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="questions">
            {(provided) => (
              <div 
                className="questions-list"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {questions.map((question, index) => (
                  <Draggable 
                    key={question.id} 
                    draggableId={question.id} 
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="question-item"
                      >
                        <div className="question-header">
                          <input
                            type="text"
                            value={question.text}
                            onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                            placeholder="Question text"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => removeQuestion(question.id)}
                            className="remove-question"
                          >
                            Remove
                          </button>
                        </div>

                        {(question.type === 'multiple_choice' || question.type === 'dropdown') && (
                          <div className="options-list">
                            {question.options?.map((option, optionIndex) => (
                              <div key={optionIndex} className="option-item">
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                                  placeholder={`Option ${optionIndex + 1}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeOption(question.id, optionIndex)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addOption(question.id)}
                              className="add-option"
                            >
                              Add Option
                            </button>
                          </div>
                        )}

                        {question.type === 'rating' && (
                          <div className="rating-settings">
                            <span>Rating Scale: 1-5</span>
                          </div>
                        )}

                        <div className="question-settings">
                          <label>
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                            />
                            Required
                          </label>

                          {/* Add branch logic section */}
                          {(question.type === 'multiple_choice' || question.type === 'dropdown') && (
                            <div className="branch-logic">
                              <button
                                type="button"
                                onClick={() => addBranchLogic(question.id)}
                                className="add-branch-logic"
                              >
                                {question.branchLogic ? 'Edit' : 'Add'} Branch Logic
                              </button>

                              {question.branchLogic && (
                                <div className="branch-logic-settings">
                                  <select
                                    value={question.branchLogic.showQuestionId || ''}
                                    onChange={(e) => updateBranchLogic(question.id, { showQuestionId: e.target.value })}
                                  >
                                    <option value="">Select question to show</option>
                                    {questions.filter(q => q.id !== question.id).map(q => (
                                      <option key={q.id} value={q.id}>
                                        {q.text || 'Untitled Question'}
                                      </option>
                                    ))}
                                  </select>

                                  <select
                                    value={question.branchLogic.value || ''}
                                    onChange={(e) => updateBranchLogic(question.id, { value: e.target.value })}
                                  >
                                    <option value="">Select answer</option>
                                    {question.options?.map((option, i) => (
                                      <option key={i} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <div className="form-actions">
          <button type="submit">Create Survey</button>
        </div>
      </form>
    </div>
  );
};

export default CreateSurvey;