import "dotenv/config";
import express from "express";
import morgan from "morgan";
import path from "path";
import fs from "fs/promises";
import fetch from "node-fetch";
import {marked} from "marked";

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

app.get("/projects/:projectId", async (req, res) => {
    const { projectId } = req.params;
    try {
        const filePath = path.join(__dirname, "..", "public", "projects.json");
        const data = await fs.readFile(filePath, "utf-8");
        const projects = JSON.parse(data);
        const project = projects.find((p: { name: string }) => p.name === projectId);

        const descriptionUrl = `https://raw.githubusercontent.com/theridwanade/${project.name}/main/README.md`
        const response = await fetch(descriptionUrl);

        if (!response.ok) throw new Error("Failed to fetch Markdown");
        const md = await response.text();
        const html = await marked(md);

        if (project) {
            res.render("project", { title: project.name, description: html });
        } else {
            res.status(404).send("Project not found");
        }
    } catch (error) {
        console.error("Error loading project:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/healthz", (req, res) => {
  res.json({ status: "OK" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

