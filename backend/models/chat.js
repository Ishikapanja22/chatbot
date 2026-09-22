const mongoose = require('mongoose');
const chatSchema = new mongoose.Schema({
    sessionId: String,
    question: String,
    answer: String,
    createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('Chat', chatSchema);