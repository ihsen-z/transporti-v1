# Server Startup Guide - Transporti V1

This guide provides step-by-step instructions for starting the backend and frontend servers of the Transporti V1 project.

## Prerequisites

### Software
- **Python 3.10+**: Required for the Django backend.
- **Node.js (v20+) & npm (v10+)**: Required for the Next.js frontend.
- **Git**: For version control.

### Dependencies
- **Backend**: Python packages listed in `backend/requirements.txt`.
- **Frontend**: Node packages listed in `frontend/package.json`.

### Environment Variables
Ensure you have the following files configured:
- `backend/.env`: Use `backend/.env.example` as a template.
- `frontend/.env.local`: Contains frontend-specific settings (API URLs, feature flags).

---

## 1. Backend Server Startup

Follow these steps to start the Django API server:

1.  **Open a terminal** and navigate to the project root.
2.  **Move to the backend directory**:
    ```bash
    cd backend
    ```
3.  **Activate the virtual environment**:
    ```bash
    # Windows
    .\venv\Scripts\activate
    # Linux/MacOS
    source venv/bin/activate
    ```
4.  **Install dependencies** (if not already done):
    ```bash
    pip install -r requirements.txt
    ```
5.  **Run database migrations**:
    ```bash
    python manage.py migrate
    ```
6.  **Start the server**:
    ```bash
    python manage.py runserver
    ```
    *The backend will be available at: `http://localhost:8000`*

---

## 2. Frontend Server Startup

Follow these steps to start the Next.js development server:

1.  **Open a new terminal** and navigate to the project root.
2.  **Move to the frontend directory**:
    ```bash
    cd frontend
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Start the development server**:
    ```bash
    npm run dev
    ```
    *The frontend will be available at: `http://localhost:3000`*

---

## Expected Results

When both servers are running correctly:
- **Frontend**: Accessing `http://localhost:3000` in your browser should display the Transporti V1 landing page.
- **Backend**: Accessing `http://localhost:8000/health/` should return a JSON response: `{"status": "healthy", ...}`.
- **Console**: You should see "Ready" messages in your terminals without red error logs.

---

## Troubleshooting

| Error | Cause | Solution |
| :--- | :--- | :--- |
| `ModuleNotFoundError` (Backend) | Missing Python package. | Run `pip install -r requirements.txt` with venv activated. |
| `npm ERR! code ELIFECYCLE` (Frontend) | Failed to start Next.js. | Run `npm install` again to fix corrupted node_modules. |
| `Port 8000/3000 already in use` | Another process is using the port. | Kill the existing process or use `python manage.py runserver 8001` or set `PORT=3001` for npm. |
| `Database error` | Local DB not initialized. | Run `python manage.py migrate`. |
| `404 Not Found` (API) | Wrong URL or endpoint. | Check `urls.py` or use `/health/` for status. |
| `CORS Error` in Browser | Frontend origin not allowed. | Ensure `CORS_ALLOWED_ORIGINS` in `backend/.env` includes `http://localhost:3000`. |
