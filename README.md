﻿# SurveyCanvas 📋

A modern, feature-rich survey management system built with React, TypeScript, and Flask.

## 🌟 Features

### For Survey Creators
- **Flexible Survey Creation**
  - Multiple question types (multiple choice, rating, text, dropdown)
  - Drag-and-drop question reordering
  - Conditional logic for questions
  - Custom survey settings and branding

### For Respondents
- **User-Friendly Interface**
  - Clean, responsive design
  - Mobile-friendly layout
  - Progress tracking
  - Anonymous response option

### Analytics & Results
- **Rich Data Visualization**
  - Real-time response tracking
  - Visual charts and graphs
  - Exportable results
  - Detailed analytics dashboard

## 🚀 Tech Stack

### Frontend
- React 18
- TypeScript
- Chart.js
- React Router
- Axios
- React Beautiful DnD

### Backend
- Flask
- MongoDB
- JWT Authentication
- Python 3.8+

## 📋 Prerequisites
- Node.js (v16+)
- Python (3.8+)
- MongoDB
- pip (Python package manager)

## 🛠️ Installation

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup
```bash
cd client
npm install
```

## ⚙️ Configuration

### Backend Configuration
Create a `.env` file in the backend directory:
```env
FLASK_APP=app
FLASK_ENV=development
MONGODB_URI=mongodb://localhost:27017/surveyforge
JWT_SECRET_KEY=your_secret_key
```

### Frontend Configuration
Create a `.env` file in the client directory:
```env
VITE_API_URL=http://localhost:5000/api
```

## 🚀 Running the Application

### Start Backend Server
```bash
cd backend
flask run
```

### Start Frontend Development Server
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 👥 User Roles

### Admin
- Full system access
- User management
- Template management

### Creator
- Create and manage surveys
- View analytics
- Share surveys

### Respondent
- Take surveys
- View public results (if enabled)

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`

### Survey Endpoints
- `GET /api/surveys`
- `POST /api/surveys`
- `GET /api/surveys/:id`
- `PUT /api/surveys/:id`
- `DELETE /api/surveys/:id`

### Response Endpoints
- `POST /api/surveys/:id/respond`
- `GET /api/surveys/:id/results`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Chart.js for data visualization
- React Beautiful DnD for drag-and-drop functionality
- Flask community for the excellent backend framework
- MongoDB for robust data storage

## 📞 Support

For support, please open an issue in the repository or contact the development team.
