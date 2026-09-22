# 🎓 Unipegaso AI Virtual Assistant

[![React](https://img.shields.io/badge/React-19.x-blue.svg?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-black.svg?logo=express)](https://expressjs.com/)
[![LangChain](https://img.shields.io/badge/LangChain-v0.3-orange.svg?logo=langchain)](https://js.langchain.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991.svg?logo=openai)](https://openai.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas_Vector_Search-47A248.svg?logo=mongodb)](https://www.mongodb.com/products/platform/atlas-vector-search)
[![Playwright](https://img.shields.io/badge/Playwright-Crawler-2EAD33.svg?logo=playwright)](https://playwright.dev/)

An intelligent, full-stack **Retrieval-Augmented Generation (RAG)** virtual assistant built specifically for [Università Telematica Pegaso (unipegaso.it)](https://www.unipegaso.it/).

This chatbot automatically crawls official Unipegaso pages, generates vector embeddings, indexes content inside **MongoDB Atlas Vector Search**, and delivers accurate, context-grounded answers in English using **LangChain** and **OpenAI GPT-4o-mini**.

---

## 🌟 Key Features

- 🕷️ **Automated Web Scraping**: Playwright and Axios crawler that discovers sitemaps recursively and extracts clean textual content across university courses, departments, faculty, exam locations, and news.
- 🧠 **Context-Aware Semantic Search**: Utilizes OpenAI `text-embedding-3-small` and MongoDB Atlas Vector Search with **Maximal Marginal Relevance (MMR)** retrieval ($k=25$, $\text{fetchK}=100$).
- 🌐 **Multilingual Semantic Translation**: Seamlessly processes user queries and Italian web content to produce clear, structured responses exclusively in English.
- ⚡ **Full-Stack Architecture**:
  - **Backend**: Express REST API, LangChain RAG pipeline, Mongoose session persistence, and Vercel serverless-ready routing.
  - **Frontend**: Responsive, modern React chat interface with session management and real-time message history.
- 🔒 **Zero Hallucination Guardrails**: Prompt engineered to answer strictly based on indexed context and explicitly disclaim unverified knowledge.

---

## 🏗️ Architecture & RAG Pipeline

```
[ Unipegaso.it Sitemap & Pages ]
              │
              ▼ (Playwright & Axios Scraper)
    [ Raw Scraped Text Files ]
              │
              ▼ (Recursive Text Splitter + OpenAI Embeddings)
  [ MongoDB Atlas Vector Database ]
              │
              ├── User asks Question (Frontend / API)
              ▼
   [ MMR Vector Retriever ] (k=25, fetchK=100)
              │
              ▼
   [ LangChain CombineDocs Chain + GPT-4o-mini ]
              │
              ▼
    [ English Response + MongoDB Chat History ]
```

---

## 📁 Project Structure

```text
chatbot/
├── backend/
│   ├── api/                 # Serverless API endpoints (Vercel)
│   ├── models/              # Mongoose schemas (Chat sessions & history)
│   ├── scraped_data/        # Extracted text data from unipegaso.it
│   ├── .env.example         # Template for environment variables
│   ├── index.js             # Express application & RAG pipeline
│   ├── ingest.js            # Text chunking, embedding generation & MongoDB upload
│   ├── package.json         # Backend dependencies & scripts
│   ├── scrape.js            # Automated Playwright web crawler
│   └── vercel.json          # Deployment configuration
├── frontend/
│   ├── public/              # Static assets & HTML template
│   ├── src/                 # React UI components & styling
│   └── package.json         # Frontend dependencies & scripts
├── .gitignore               # Unified repository ignore rules
└── README.md                # Project documentation
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Axios, UUID
- **Backend**: Node.js, Express 5, Mongoose, MongoDB Driver
- **AI & RAG**: LangChain (`@langchain/openai`, `@langchain/community`, `@langchain/core`), OpenAI API
- **Web Crawler**: Playwright, Fast-XML-Parser, Cheerio, Axios
- **Database**: MongoDB Atlas (Vector Search + Document Store)
- **Deployment**: Vercel

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB Atlas Account** with a Vector Search Index configured
- **OpenAI API Key**

---

### 2. Setup Environment Variables

In the `backend/` directory, create a `.env` or `.env.local` file based on `.env.example`:

```bash
# backend/.env
OPENAI_API_KEY=your_openai_api_key_here
MONGODB_URI=your_mongodb_atlas_connection_string_here
PORT=5000
```

> **MongoDB Atlas Vector Search Index Configuration:**
> Create a Vector Search Index named `vector_index` on the `embeddings` collection inside the `unipegaso` database:
> ```json
> {
>   "fields": [
>     {
>       "numDimensions": 1536,
>       "path": "embedding",
>       "similarity": "cosine",
>       "type": "vector"
>     }
>   ]
> }
> ```

---

### 3. Installation & Data Pipeline

#### Step A: Install Backend Dependencies
```bash
cd backend
npm install
npx playwright install chromium
```

#### Step B: (Optional) Crawl Website Data
If you want to re-crawl [unipegaso.it](https://www.unipegaso.it/):
```bash
node scrape.js
```

#### Step C: Generate Embeddings & Ingest into MongoDB
Chunk and upload the scraped documentation into MongoDB Atlas:
```bash
node ingest.js
```

---

### 4. Running the Application Locally

#### Start the Backend Server:
```bash
cd backend
node index.js
# Server runs on http://localhost:5000
```

#### Start the Frontend Interface:
Open a new terminal window:
```bash
cd frontend
npm install
npm start
# App runs on http://localhost:3000
```

---

## 📡 API Reference

### 1. Ask a Question (RAG)
- **Endpoint**: `POST /api/chat`
- **Body**:
  ```json
  {
    "question": "What master's degrees are offered at Unipegaso?",
    "sessionId": "optional-uuid-session-id"
  }
  ```
- **Response**:
  ```json
  {
    "answer": "Università Telematica Pegaso offers various Master's Degree programs..."
  }
  ```

### 2. Get Chat Session History
- **Endpoint**: `GET /api/chat/:sessionId`
- **Response**:
  ```json
  [
    {
      "_id": "...",
      "sessionId": "...",
      "question": "...",
      "answer": "...",
      "createdAt": "..."
    }
  ]
  ```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m "Add amazing feature"`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [ISC License](backend/package.json).
