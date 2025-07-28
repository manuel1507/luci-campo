const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const ExcelJS = require("exceljs");

const app = express();
const port = process.env.PORT || 3000;

// GitHub config
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = "manuel1507/luci-campo"; // <-- Sostituisci con il tuo repo
const GITHUB_FILE_PATH = "data.json";
const GITHUB_BRANCH = "main";

app.use(bodyParser.json());
app.use(express.static("public"));

// Funzione per leggere il file da GitHub
async function readGitHubFile() {
  const res = await axios.get(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
  const content = Buffer.from(res.data.content, "base64").toString("utf8");
  return { content, sha: res.data.sha };
}

// Funzione per scrivere il file su GitHub
async function writeGitHubFile(newContent, sha, message) {
  const encodedContent = Buffer.from(newContent).toString("base64");
  await axios.put(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`, {
    message,
    content: encodedContent,
    sha,
    branch: GITHUB_BRANCH
  }, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
}

// GET all entries
app.get("/data", async (req, res) => {
  try {
    const { content } = await readGitHubFile();
    res.send(content);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error reading file from GitHub");
  }
});

// POST new entry
app.post("/data", async (req, res) => {
  try {
    const { content, sha } = await readGitHubFile();
    const entries = JSON.parse(content);
    const { date, hours, team } = req.body;
    entries.push({ date, hours: parseFloat(hours), team });
    await writeGitHubFile(JSON.stringify(entries, null, 2), sha, "Add new entry");
    res.send("Entry added and pushed to GitHub");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating file on GitHub");
  }
});

// DELETE last entry
app.delete("/data", async (req, res) => {
  try {
    const { content, sha } = await readGitHubFile();
    let entries = JSON.parse(content);
    entries.pop();
    await writeGitHubFile(JSON.stringify(entries, null, 2), sha, "Delete last entry");
    res.send("Last entry deleted and pushed to GitHub");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting entry on GitHub");
  }
});

// DELETE all entries
app.delete("/data/clear", async (req, res) => {
  try {
    const { sha } = await readGitHubFile();
    await writeGitHubFile(JSON.stringify([], null, 2), sha, "Clear all entries");
    res.send("All entries cleared and pushed to GitHub");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error clearing entries on GitHub");
  }
});

// EXPORT to Excel
app.get("/export", async (req, res) => {
  try {
    const { content } = await readGitHubFile();
    const entries = JSON.parse(content);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Entries");

    worksheet.columns = [
      { header: "Data", key: "date", width: 15 },
      { header: "Ore di Luce", key: "hours", width: 15 },
      { header: "Chi ha Utilizzato", key: "team", width: 20 },
    ];

    entries.forEach((entry) => {
      worksheet.addRow(entry);
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="soccer_pitch_entries.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error exporting data");
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
