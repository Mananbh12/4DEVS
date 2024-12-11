const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
  classe: { type: String, required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
});

const ClassCollection = mongoose.model("ClassCollection", classSchema); // Une collection par classe

module.exports = ClassCollection;
