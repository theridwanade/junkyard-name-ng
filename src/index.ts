import "dotenv/config";
import express from "express";
import morgan from "morgan";
import path from "path";
import fs from "fs/promises";
import fetch from "node-fetch";
import { marked } from "marked";

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(morgan("dev"));
app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));


async function getLastCommitDate(repo: string) {
    const url = `https://api.github.com/repos/theridwanade/${repo}/commits?per_page=1`;
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "JunkyardBot",
                ...(process.env.GITHUB_TOKEN
                    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
                    : {}),
            },
        });

        if (!res.ok) throw new Error(`Failed to fetch commits for ${repo}`);
        const commits = await res.json()

        // Extract commit date or fallback to now
        // @ts-ignore
        return commits?.[0]?.commit?.author?.date || new Date().toISOString();
    } catch (error) {
        const err = error as Error;
        console.error(`❌ Error fetching last commit for ${repo}:`, err.message);
        return new Date().toISOString(); // fallback date
    }
}


app.get("/", async (req, res) => {
    try {
        const filePath = path.join(__dirname, "..", "public", "projects.json");
        const data = await fs.readFile(filePath, "utf-8");
        const projects = JSON.parse(data);

        res.render("index", {
            title: "Junkyard – Ridwan’s Experimental Projects & Tools",
            description:
                "Explore Junkyard by theridwanade – a space for experimental tools, scripts, and open-source projects built with Rust, TypeScript, Python and curiosity.",
            projects,
        });
    } catch (error) {
        console.error("Error loading projects:", error);
        res.render("index", {
            title: "Junkyard – Ridwan’s Experimental Projects & Tools",
            description:
                "Explore Junkyard by theridwanade – a space for experimental tools, scripts, and open-source projects built with Rust, TypeScript, Python and curiosity.",
            projects: [],
        });
    }
});

app.get("/projects/:projectId", async (req, res) => {
    const { projectId } = req.params;
    try {
        const filePath = path.join(__dirname, "..", "public", "projects.json");
        const data = await fs.readFile(filePath, "utf-8");
        const projects = JSON.parse(data);
        const project = projects.find((p: { name: string; }) => p.name === projectId);

        if (!project) return res.status(404).send("Project not found");

        const descriptionUrl = `https://raw.githubusercontent.com/theridwanade/${project.name}/main/README.md`;
        const response = await fetch(descriptionUrl);

        if (!response.ok) throw new Error("Failed to fetch Markdown");
        const md = await response.text();
        const content = await marked(md);

        res.render("project", {
            title: project.name,
            description: project.description,
            content,
        });
    } catch (error) {
        console.error("Error loading project:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/sitemap.xml", async (req, res) => {
    try {
        const baseUrl = "https://junkyard.name.ng";
        const filePath = path.join(__dirname, "..", "public", "projects.json");
        const data = await fs.readFile(filePath, "utf-8");
        const projects = JSON.parse(data);

        // Fetch all last commit dates in parallel
        const commits = await Promise.all(
            projects.map(async (p: { name: string; }) => ({
                name: p.name,
                date: await getLastCommitDate(p.name),
            }))
        );

        // Build sitemap URLs (no standalone /projects route)
        const urls = [
            { loc: `${baseUrl}/`, lastmod: new Date().toISOString(), priority: 1.0 },
            ...commits.map((c) => ({
                loc: `${baseUrl}/projects/${encodeURIComponent(c.name)}`,
                lastmod: c.date,
                priority: 0.9,
            })),
        ];

        // Construct XML
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
            .map(
                (u) => `
  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`
            )
            .join("")}
</urlset>`;

        // Send XML response
        res.header("Content-Type", "application/xml");
        res.send(xml);
    } catch (error) {
        console.error("Error generating sitemap:", error);
        res.status(500).send("Failed to generate sitemap");
    }
});

app.get("/healthz", (req, res) => {
    res.json({ status: "OK" });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
