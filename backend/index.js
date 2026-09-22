require("dotenv").config();
const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");
const { OpenAIEmbeddings, ChatOpenAI } = require("@langchain/openai");
const { MongoDBAtlasVectorSearch, } = require("@langchain/community/vectorstores/mongodb_atlas");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { createStuffDocumentsChain, } = require("langchain/chains/combine_documents");
const { createRetrievalChain } = require("langchain/chains/retrieval");
const Chat = require("./models/chat");
const app = express();
app.use(cors());
app.use(express.json());
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB (Mongoose) connected"))
    .catch((err) => console.error("MongoDB error:", err));
let retrievalChainPromise = null;
const PROMPT = ChatPromptTemplate.fromTemplate(`
You are the official virtual assistant for unipegaso.it (Università Telematica Pegaso).
Answer ONLY using the context below, which was scraped from the unipegaso.it website.
Rules:
- The context is mostly in Italian; the question may be in English or Italian. Match concepts by meaning, not by exact word — e.g. "master's degree" should match "laurea magistrale","professors" should match "docenti", "campuses"/"locations" should match "sedi", etc.
- Treat a short or vague query (a single word, a topic name, or a partial phrase) as "tell me about this topic" — search the ENTIRE context carefully before concluding there is no relevant information.
- If the context contains ANY information relevant to the question, answer using it, even if the exact wording differs, and even if the match is partial. Combine information from several context chunks if needed instead of relying on only one.
- If the question asks for a list (e.g. "what master's degrees do you offer", "what cities doyou have exam centers in") and the context contains a "category summary" chunk enumerating many items, use it and list the items you find.
- If the answer is genuinely not contained anywhere in the context, respond with exactly:"I am not aware of this."
- If the question is about a topic that is relevant to unipegaso.it (e.g. a different university, a different country, or a general topic like "how to cook pasta"), respond with by giving correct information about unipegaso.it.
- Try to answer all the related field in unipegaso(e.g. "teacher bonus","how many teachers are there","the teacher name","latets news about unipegaso","the latest event","the latest blog post","the latest research project","the latest master program","the latest phd program","the latest course","the latest campus")
- Do not use any outside knowledge, even if you know the real answer.
- Do not guess or invent information not present in the context.
- ALWAYS respond in English. This is a hard requirement with no exceptions: even though thecontext is written in Italian, and even if the user's question is written in Italian, youmust translate the relevant information and write your entire answer in English. Never output Italian sentences in your answer.
Context:
{context}
Question: {input}
Remember: your answer must be written entirely in English, no matter what language the context above is in.
`);
async function buildChain() {
    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        model: "text-embedding-3-small",
    });
    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    const collection = mongoClient.db("unipegaso").collection("embeddings");
    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
        collection,
        indexName: "vector_index",
        textKey: "text",
        embeddingKey: "embedding",
    });
    const retriever = vectorStore.asRetriever({
        searchType: "mmr",
        k: 25,
        searchKwargs: { fetchK: 100, lambda: 0.5 },
    });
    const llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o-mini",
        temperature: 0,
    });
    const combineDocsChain = await createStuffDocumentsChain({
        llm,
        prompt: PROMPT,
    });
    const chain = await createRetrievalChain({ retriever, combineDocsChain });
    console.log("RAG chain ready (mmr, k=25, fetchK=100).");
    return chain;
}
function getRetrievalChain() {
    if (!retrievalChainPromise) {
        retrievalChainPromise = buildChain().catch((err) => {
            retrievalChainPromise = null;
            throw err;
        });
    }
    return retrievalChainPromise;
}
getRetrievalChain().catch((err) =>
    console.error("Initial chain setup failed:", err),
);
app.post("/api/chat", async (req, res) => {
    try {
        const { question, sessionId } = req.body;
        if (!question) {
            return res.status(400).json({ error: "question is required" });
        }
        const chain = await getRetrievalChain();
        if (!chain) {
            return res
                .status(503)
                .json({ error: "Still starting up, try again in a moment" });
        }
        const result = await chain.invoke({ input: question });
        console.log(
            `Q: "${question}" | Retrieved sources:`,
            result.context.map((d) => d.metadata.source || "unknown_source"),
        );
        const answer = result.answer;
        await Chat.create({ sessionId, question, answer });
        res.json({ answer });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});
app.get("/api/chat/:sessionId", async (req, res) => {
    try {
        const history = await Chat.find({ sessionId: req.params.sessionId }).sort({
            createdAt: 1,
        });
        res.json(history);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch chat history" });
    }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
