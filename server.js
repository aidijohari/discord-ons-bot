const express = require("express");
const app = express();
// const fetch = require('node-fetch');

const PORT = process.env.PORT || 3001

app.get("/", (req, res) => {
    res.send("🤖 Bot is online");
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});