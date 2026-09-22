# Università Telematica Pegaso AI Chatbot

An intelligent RAG (Retrieval-Augmented Generation) chatbot designed to answer questions about Università Telematica Pegaso (unipegaso.it), powered by OpenAI, LangChain, MongoDB Atlas Vector Search, Express, and React.

---

## 🚀 Features

- **Retrieval-Augmented Generation (RAG):** Context-aware question answering based on scraped university content.
- **MongoDB Atlas Vector Search:** Efficient vector embeddings storage and semantic similarity search.
- **OpenAI Integration:** Embeddings and conversational responses using OpenAI models (`gpt-4o-mini` / `text-embedding-3-small`).
- **Modern Web Interface:** Clean and responsive chat UI built with React.
- **Vercel & Cloud Ready:** Configured for seamless deployment.

---

## 📁 Project Structure

```text
chatbot/
├── backend/
│   ├── api/                 # Serverless API routes (Vercel)
│   ├── models/              # Mongoose data models
│   ├── index.js             # Express server & LangChain RAG pipeline
│   ├── scrape.js            # Web crawler / scraper for university pages
│   ├── ingest.js            # Vector embedding and database ingestion
│   ├── package.json
│   └── vercel.json          # Backend deployment config
├── frontend/
│   ├── public/              # Static assets
│   ├── src/                 # React UI components and styles
│   └── package.json
└── README.md
```

---

## 🛠️ Tech Stack

- **Frontend:** React, HTML5, CSS3
- **Backend:** Node.js, Express, LangChain
- **AI / Embeddings:** OpenAI API (`@langchain/openai`)
- **Database & Vector Search:** MongoDB Atlas (Mongoose & `MongoDBAtlasVectorSearch`)
- **Hosting / Deployment:** Vercel

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- Active MongoDB Atlas Cluster with Vector Search index configured
- OpenAI API Key

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   MONGODB_URI=your_mongodb_connection_string
   PORT=5000
   ```
4. Start the development server:
   ```bash
   npm start
   ```

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm start
   ```

---

## 🌐 Deploying to Vercel

- **Backend:** Deployed with `vercel.json` routing requests to serverless API functions or Express entrypoint.
- **Frontend:** Standard React app deployment on Vercel with environment variable pointing to the backend API.

---

## ⚠️ Notes on MongoDB Cluster

If your MongoDB Atlas cluster is paused or stopped, make sure to:
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Resume / start your cluster.
3. Verify Network Access (IP Whitelist) allows connections (`0.0.0.0/0` for Vercel serverless deployments).
