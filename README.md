# LearnBridge 🎓

### From Learning Gaps to Guided Growth

LearnBridge is an AI-assisted learning platform designed to help learners identify knowledge gaps, understand where they need improvement, and receive guided support for their next steps.

Instead of stopping at assessment scores, LearnBridge connects assessment results with learning-gap identification, study guidance, learning plans, resources, and progress tracking.

## ✨ Key Features

- **Learning Assessments:** Complete assessments to evaluate your understanding of learning topics.
- **Server-Side Grading:** Answers are evaluated by the backend to determine assessment results.
- **Learning-Gap Identification:** Assessment results help identify topics that require further attention.
- **Study Agent:** A guided workflow that examines learning gaps, researches and evaluates resources, and supports the creation of learning plans and reports.
- **Learning Plans:** Review study plans and their associated learning activities.
- **Learning Resources:** Access resources intended to support further study.
- **Progress Tracking:** Review learning progress and completed activities.
- **Learning Reports:** Explore assessment results and insights to help guide your next steps.

## 🧰 Tech Stack

**Frontend**
- React
- TypeScript
- Tailwind CSS

**Backend**
- Python
- Django
- Django REST Framework

**Architecture**
- REST API
- HTTP and JSON communication between frontend and backend
- Server-side assessment evaluation and learning-gap processing

## 🔄 How It Works

1. **Assess:** The learner completes an assessment.
2. **Evaluate:** The backend grades the answers and determines the result.
3. **Identify:** The system derives learning gaps from the assessment attempt.
4. **Guide:** The Study Agent workflow supports research, resource evaluation, study planning, and report generation.
5. **Learn:** The learner reviews the available learning plan and resources.
6. **Track:** The learner can review progress and use the available reports to guide further study.

## 🏗️ System Architecture

```text
Learner
   |
   v
React + TypeScript Frontend
   |
   | HTTP / JSON
   v
Django REST Framework API
   |
   v
Assessment and Grading
   |
   v
Learning-Gap Identification
   |
   v
Study Agent Workflow
   |
   v
Learning Plans, Resources
and Reports
   |
   v
Learner Progress
```

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- Python
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/olasunkamiabdulrasheed-design/LearBridge.git
cd LearBridge
```

### 2. Set up the backend

Navigate to the backend directory, create and activate a Python virtual environment, install the project's dependencies, and configure the environment variables required by the application.

Then start the Django development server:

```bash
python manage.py runserver 7000
```

Run this command from the directory containing `manage.py`.

### 3. Set up the frontend

Navigate to the frontend directory and install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal. Ensure the frontend is configured to communicate with the running backend API.

> **Note:** The exact directory names, dependency files, environment variables, and setup commands should match the current repository configuration.

## 🔐 Configuration and Security

- Keep secret keys, credentials, and API keys out of source control.
- Use environment variables for sensitive configuration.
- Configure the frontend API base URL for the target environment.
- Configure appropriate CORS settings and production security settings before deployment.

## 🧪 Testing

The project includes backend tests and frontend type-checking/build workflows.

Run the commands defined by the repository's current test and package configuration to verify changes before deployment.

## 🎯 Project Goal

LearnBridge aims to make learning more focused by connecting assessment outcomes to practical next steps. It is built around a simple idea: understanding what you need to improve is the beginning of a better learning journey.

## 🛣️ What's Next

Potential areas for future development include:

- More personalized learning recommendations.
- Expanded learning-resource discovery.
- Improved progress insights and reporting.
- Further testing, accessibility improvements, and production deployment.

## 👨‍💻 Built For

**ForgeHacks 2026**

LearnBridge is a full-stack project exploring how assessment-driven learning and AI-assisted workflows can support a more guided learning experience.

---

**LearnBridge — Turn learning gaps into guided growth.**
