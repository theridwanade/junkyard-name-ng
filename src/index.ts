import "dotenv/config";
import express from "express";
import morgan from "morgan";
import path from "path";
import fs from "fs/promises";

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(morgan("dev"));
app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.get("/", async (req, res) => {
    try {
        const filePath = path.join(__dirname, "..", "public", "projects.json");
        const data = await fs.readFile(filePath, "utf-8");
        const projects = JSON.parse(data);

        res.render("index", { title: "Junk Yard", projects });
    } catch (error) {
        console.error("Error loading projects:", error);
        res.render("index", { title: "Junk Yard", projects: [] });
    }
});


app.get("/healthz", (req, res) => {
  res.json({ status: "OK" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
