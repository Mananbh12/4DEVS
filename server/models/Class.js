const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
  classe: { type: String, required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
});

module.exports = mongoose.model("Class", classSchema);
