require("dotenv").config();
console.log("MONGODB_URI loaded:", !!process.env.MONGODB_URI);
const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { MongoDBAtlasVectorSearch } = require("@langchain/community/vectorstores/mongodb_atlas");
const { Document } = require("langchain/document");
const CATEGORIES = [
  {
    prefix: "www_unipegaso_it_docenti_",
    label: "Docenti (elenco professori e ricercatori)",
  },
  { prefix: "www_unipegaso_it_sedi_", label: "Sedi d'esame in Italia" },
  { prefix: "www_unipegaso_it_facolta_", label: "Facoltà" },
  { prefix: "www_unipegaso_it_dipartimenti_", label: "Dipartimenti" },
  {
    prefix: "www_unipegaso_it_lauree_triennali_",
    label: "Corsi di Laurea Triennale",
  },
  {
    prefix: "www_unipegaso_it_lauree_magistrali_",
    label: "Corsi di Laurea Magistrale",
  },
  {
    prefix: "www_unipegaso_it_lauree_magistrali_ciclo_unico_",
    label: "Corsi di Laurea Magistrale a Ciclo Unico",
  },
  {
    prefix: "www_unipegaso_it_ambiti_lauree_",
    label: "Ambiti di Laurea (aree tematiche dei corsi)",
  },
  {
    prefix: "www_unipegaso_it_master_1_livello_",
    label: "Master di Primo Livello",
  },
  {
    prefix: "www_unipegaso_it_master_2_livello_",
    label: "Master di Secondo Livello",
  },
  {
    prefix: "www_unipegaso_it_alta_formazione_",
    label: "Corsi di Alta Formazione",
  },
  {
    prefix: "www_unipegaso_it_perfezionamenti_",
    label: "Corsi di Perfezionamento",
  },
  {
    prefix: "www_unipegaso_it_aree_master_",
    label: "Aree Master (categorie tematiche dei master)",
  },
  { prefix: "www_unipegaso_it_inglese_", label: "Corsi di Lingua Inglese" },
  { prefix: "www_unipegaso_it_blog_", label: "Articoli del Blog" },
  { prefix: "www_unipegaso_it_ateneo_eventi_", label: "Eventi dell'Ateneo" },
  { prefix: "www_unipegaso_it_notizie_", label: "Notizie" },
  {
    prefix: "www_unipegaso_it_ricerca_scientifica_dottorati_di_ricerca_",
    label: "Dottorati di Ricerca",
  },
  {
    prefix: "www_unipegaso_it_ricerca_scientifica_progetti_",
    label: "Progetti di Ricerca",
  },
  {
    prefix: "www_unipegaso_it_centri_alta_formazione_",
    label: "Centri di Alta Formazione",
  },
  {
    prefix: "www_unipegaso_it_poli_di_orientamento_",
    label: "Poli di Orientamento",
  },
  { prefix: "www_unipegaso_it_studenti_", label: "Servizi per gli Studenti" },
  { prefix: "www_unipegaso_it_ateneo_", label: "Informazioni sull'Ateneo" },
];
function extractTitle(content, filename) {
  const match = content.match(/Page Title:\s*(.+)/);
  if (match && match[1].trim()) return match[1].trim();
  return filename
    .replace(/^www_unipegaso_it_/, "")
    .replace(/\.txt$/, "")
    .replace(/_/g, " ");
}
function buildCategorySummaries(files, dataDir) {
  const summaries = [];
  const claimed = new Set();
  for (const { prefix, label } of CATEGORIES) {
    const matchedFiles = files.filter((f) => f.startsWith(prefix));
    if (matchedFiles.length === 0) continue;
    const titles = matchedFiles.map((f) => {
      claimed.add(f);
      const content = fs.readFileSync(path.join(dataDir, f), "utf-8");
      return extractTitle(content, f);
    });
    summaries.push(
      new Document({
        pageContent: `${label} dell'Università Telematica Pegaso (Unipegaso). Elenco completo (${titles.length} elementi): ${titles.join(", ")}.`,
        metadata: { source: `category_summary_${prefix}` },
      }),
    );
  }
  return { summaries, claimed };
}
async function main() {
  const dataDir = path.join(__dirname, "scraped_data");
  const files = fs.readdirSync(dataDir);
  const rawDocs = files.map((file) => {
    const content = fs.readFileSync(path.join(dataDir, file), "utf-8");
    return new Document({ pageContent: content, metadata: { source: file } });
  });
  const { summaries, claimed } = buildCategorySummaries(files, dataDir);
  rawDocs.push(...summaries);
  console.log(
    `Loaded ${files.length} raw pages + ${summaries.length} category summaries`,
  );
  const uncategorized = files.filter((f) => !claimed.has(f));
  if (uncategorized.length > 0) {
    console.log(
      `\n${uncategorized.length} files not covered by any category summary (still embedded individually):`,
    );
    uncategorized.slice(0, 20).forEach((f) => console.log("  -", f));
    if (uncategorized.length > 20)
      console.log(`  ... and ${uncategorized.length - 20} more`);
  }
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
  });
  const splitDocs = await splitter.splitDocuments(rawDocs);
  console.log(`\nSplit into ${splitDocs.length} chunks total`);
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const collection = client.db("unipegaso").collection("embeddings");
  await collection.deleteMany({});
  console.log("Cleared existing embeddings collection.");
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    model: "text-embedding-3-small",
  });
  await MongoDBAtlasVectorSearch.fromDocuments(splitDocs, embeddings, {
    collection,
    indexName: "vector_index",
    textKey: "text",
    embeddingKey: "embedding",
  });
  console.log(
    "Ingestion complete — text is now saved and searchable in MongoDB.",
  );
  await client.close();
}
main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
