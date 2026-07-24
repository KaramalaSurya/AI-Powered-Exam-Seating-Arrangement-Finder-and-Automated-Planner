# SeatX: Deployment Guide

This document outlines the step-by-step instructions for deploying **SeatX (AI-Powered Examination Seating Planning and Student Seating Finder System)** to production environments.

---

## 🐋 Option 1: Docker Compose Deployment (Recommended)

This is the easiest and most portable method for deploying on any virtual machine (e.g., AWS EC2, DigitalOcean Droplet, Linode, or local server).

### Prerequisites
*   [Docker](https://docs.docker.com/get-docker/) installed.
*   [Docker Compose](https://docs.docker.com/compose/install/) installed.

### Steps
1.  **Clone the Repository** (if not already done) to your server:
    ```bash
    git clone <your-repo-url> seatx
    cd seatx
    ```

2.  **Configure Environment Variables**:
    Create a `.env` file in the root directory to define your API endpoint and Gemini API Key:
    ```env
    # For a server at ip 192.0.2.1, replace with http://192.0.2.1:8085
    # For a domain setup, replace with http://api.yourdomain.com
    VITE_API_URL=http://localhost:8085
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

3.  **Build and Start Containers**:
    Execute the following command to build the Docker images and start the services in detached (background) mode:
    ```bash
    docker compose up -d --build
    ```

4.  **Verification**:
    *   **Frontend**: Open a browser to `http://<your-server-ip>` (Port 80).
    *   **Backend**: The backend API Docs will be available at `http://<your-server-ip>:8085/docs`.
    *   The database `backend/mits_exam.db` will persist locally on your server.

---

## 🖥️ Option 2: Manual VPS Deployment (FastAPI + Nginx)

If you prefer to deploy without Docker, you can run the FastAPI backend behind a system supervisor (systemd) and serve React static assets via Nginx directly.

### Step A: Deploy the Backend
1.  **Install System Prerequisites**:
    ```bash
    sudo apt update
    sudo apt install -y python3-pip python3-venv git nginx
    ```

2.  **Set Up Backend App Directory**:
    Move to the backend folder and create a virtual environment:
    ```bash
    cd /var/www/seatx/backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

3.  **Create a systemd Service File**:
    Create `/etc/systemd/system/seatx-backend.service`:
    ```ini
    [Unit]
    Description=SeatX FastAPI Backend Service
    After=network.target

    [Service]
    User=www-data
    WorkingDirectory=/var/www/seatx/backend
    ExecStart=/var/www/seatx/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8085
    Restart=always

    [Install]
    WantedBy=multi-user.target
    ```

4.  **Start and Enable Backend**:
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl start seatx-backend
    sudo systemctl enable seatx-backend
    ```

### Step B: Build and Deploy the Frontend
1.  **Build Frontend Locally or on Server**:
    Navigate to the `frontend` folder, install Node.js and dependencies, then build:
    ```bash
    cd /var/www/seatx/frontend
    npm install
    # Build with the production API endpoint URL
    VITE_API_URL=http://<your-server-ip-or-domain>/api npm run build
    ```
    This generates a optimized production folder named `/var/www/seatx/frontend/dist`.

2.  **Configure Nginx**:
    Update the Nginx default config file `/etc/nginx/sites-available/default`:
    ```nginx
    server {
        listen 80;
        server_name yourdomain.com; # Replace with your domain or server IP

        # 1. Serve static React files
        location / {
            root /var/www/seatx/frontend/dist;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # 2. Reverse proxy /api requests to FastAPI Uvicorn backend
        location /api {
            proxy_pass http://127.0.0.1:8085/api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

3.  **Restart Nginx**:
    ```bash
    sudo nginx -t
    sudo systemctl restart nginx
    ```

---

## ☁️ Option 3: Cloud Provider Deployment (Render / Railway / Vercel)

If you prefer serverless cloud hosting:

### 1. Frontend (Render Static Site, Vercel, or Netlify)

#### Option A: Render Static Site (Recommended)
1. In the Render Dashboard, click **New +** and select **Static Site**.
2. Connect your GitHub repository.
3. Configure the build settings:
   - **Name**: `seatx-frontend` (or your choice)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add **Environment Variable**:
   - `VITE_API_URL`: `https://your-backend-name.onrender.com` (Your deployed Render backend URL)
5. Add **Rewrite Rule** (for SPA Routing):
   - Go to **Redirects / Rewrites** in the service sidebar.
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`

#### Option B: Vercel or Netlify
*   Connect your GitHub repository to **Vercel** or **Netlify**.
*   Set **Framework Preset** to `Vite`.
*   Set **Root Directory** to `frontend`.
*   Set **Build Command** to `npm run build`.
*   Set **Output Directory** to `dist`.
*   Add Environment Variable `VITE_API_URL` set to your backend URL.

### 2. Backend (Render, Railway, or Fly.io)
*   **Render**: Create a new **Web Service** pointing to your repository.
    *   Set **Runtime / Language**: `Python`
    *   Set **Build Command**: `pip install -r backend/requirements.txt`
    *   Set **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
    *   Set **Root Directory**: Leave as default (`.`) or set to repo root.
    *   Add Environment Variables:
        *   `PYTHONPATH`: `.`
        *   `PORT`: `8085` (or default assigned by Render)
        *   `GEMINI_API_KEY`: Your Google Gemini API Key
