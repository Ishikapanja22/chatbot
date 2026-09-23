# Chatbot
Unipegaso AI Chatbot is a Retrieval-Augmented Generation (RAG) system built for Università Telematica Pegaso. 
It automatically crawls the university's website, converts the content into vector embeddings, and answers user queries in English using semantically retrieved, context-grounded data — even though the source website is in Italian.
# Live Website Source
https://www.unipegaso.it/

## Live Demo
(https://frontend-sigma-sage-86.vercel.app/)


##  Features

### AI & Search
- Automated web crawler that extracts university data directly from sitemaps
- Vector embedding generation using OpenAI's
- Semantic retrieval via **MongoDB Atlas Vector Search** with Maximal Marginal Relevance (MMR)
- Context-grounded response generation using OpenAI's 
- Multilingual pipeline — ingests Italian content, responds fluently in English

###  Application
- Interactive, responsive React chat interface
- Chat session management via UUID
- Persistent chat history stored in MongoDB
- RESTful API built with Express & Mongoose
- Serverless-ready configuration for Vercel deployment


##  Tech Stack
- Frontend : React
- Backend  : Node.js, Express
- AI / RAG : LangChain, OpenAI API
- Database : MongoDB Atlas (Vector Search + Chat History)
- Web Crawler : Playwright, Axios, Fast-XML-Parser
- ODM  : Mongoose
- HTTP Client : Axios             

##  Folder Structure
chatbot/
├── backend/
│   ├── api/
│   │   └── index.js
│   ├── models/
│   │   └── chat.js
│   ├── scraped_data/
│   ├── index.js
│   ├── ingest.js
│   ├── scrape.js
│   ├── package.json
│   └── vercel.json
└── frontend/
    ├── public/
    ├── src/
    │   ├── App.js
    │   ├── App.css
    │   └── index.js
    └── package.json

## Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
OPENAI_API_KEY=your_openai_api_key
```
Start the backend server:
```bash
node index.js
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```


