const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const ExcelJS = require("exceljs"); // Import ExcelJS
const app = express();
const port = process.env.PORT || 3000;
const filePath = "data.json";

app.use(bodyParser.json());
app.use(express.static("public"));

// API Endpoints

// Get all entries
app.get("/data", (req, res) => {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).send("Error reading file");
    }
    res.send(data);
  });
});

// Add a new entry
app.post("/data", (req, res) => {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).send("Error reading file");
    }
    const entries = JSON.parse(data);
    const { date, hours, team } = req.body;
    entries.push({ date, hours: parseFloat(hours), team });
    fs.writeFile(filePath, JSON.stringify(entries, null, 2), (err) => {
      if (err) {
        return res.status(500).send("Error writing file");
      }
      res.send("Entry added");
    });
  });
});

// Delete the last entry
app.delete("/data", (req, res) => {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).send("Error reading file");
    }
    let entries = JSON.parse(data);
    entries.pop();
    fs.writeFile(filePath, JSON.stringify(entries, null, 2), (err) => {
      if (err) {
        return res.status(500).send("Error writing file");
      }
      res.send("Last entry deleted");
    });
  });
});

// Clear all entries
app.delete("/data/clear", (req, res) => {
  fs.writeFile(filePath, JSON.stringify([], null, 2), (err) => {
    if (err) {
      return res.status(500).send("Error writing file");
    }
    res.send("All entries cleared");
  });
});

// Export to Excel
app.get("/export", (req, res) => {
  fs.readFile(filePath, "utf8", async (err, data) => {
    if (err) {
      return res.status(500).send("Error reading file");
    }

    const entries = JSON.parse(data);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Entries");

    // Define columns
    worksheet.columns = [
      { header: "Data", key: "date", width: 15 },
      { header: "Ore di Luce", key: "hours", width: 15 },
      { header: "Chi ha Utilizzato", key: "team", width: 20 },
    ];

    // Add rows
    entries.forEach((entry) => {
      worksheet.addRow(entry);
    });

    // Send Excel file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="soccer_pitch_entries.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
