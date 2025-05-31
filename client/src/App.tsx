import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import NavBar from './components/NavBar'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import ForgotPassword from './components/auth/ForgotPassword'
import ResetPassword from './components/auth/ResetPassword'
import SurveyList from './components/SurveyList'
import CreateSurvey from './components/CreateSurvey'
import TakeSurvey from './components/TakeSurvey'
import SurveyResults from './components/SurveyResults'
import SurveyTemplates from './components/SurveyTemplates'
import './App.css'

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <NavBar />
          
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            
            {/* Protected Routes for Survey Creation and Management */}
            <Route element={<ProtectedRoute allowedRoles={['creator', 'admin']} />}>
              <Route path="/templates" element={<SurveyTemplates />} />
              <Route path="/create" element={<CreateSurvey />} />
              <Route path="/results/:id" element={<SurveyResults />} />
            </Route>

            {/* Mixed Access Routes */}
            <Route element={<ProtectedRoute requireAuth={false} />}>
              <Route path="/" element={<SurveyList />} />
              <Route path="/survey/:id" element={<TakeSurvey />} />
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
