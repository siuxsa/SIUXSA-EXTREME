import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";

// NOTE: The infrastructure requires port 3000 for external access.
// While 6969 was requested, we must use 3000 to ensure the app is accessible.
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Database Initialization
  const db = new Database("siuxsa.db");
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      command TEXT,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed default tools if empty
  const toolCount = db.prepare("SELECT COUNT(*) as count FROM tools").get() as { count: number };
  if (toolCount.count === 0) {
    const defaultTools = [
      { id: "nmap", name: "Nmap", description: "Network Exploration and Security Auditing", command: "nmap -sV -sC $target", sort_order: 1 },
      { id: "subfinder", name: "Subfinder", description: "Passive Subdomain Enumeration", command: "subfinder -d $target", sort_order: 2 },
      { id: "dirsearch", name: "Dirsearch", description: "Web Content Discovery", command: "dirsearch -u $target", sort_order: 3 },
      { id: "nuclei", name: "Nuclei", description: "Template-based Vulnerability Scanner", command: "nuclei -t $target", sort_order: 4 },
      { id: "httpx", name: "HTTPX", description: "Multi-purpose HTTP Toolkit", command: "httpx $target -title -status-code", sort_order: 5 }
    ];
    
    const insert = db.prepare("INSERT INTO tools (id, name, description, command, sort_order) VALUES (@id, @name, @description, @command, @sort_order)");
    const insertMany = db.transaction((tools) => {
      for (const tool of tools) insert.run(tool);
    });
    insertMany(defaultTools);
  }

  // Environment state
  let currentCwd = process.cwd();
  let isRoot = false;

  // Helper for executing commands with WSL support
  const executeCommand = (cmd: string, cwd: string, callback: (error: any, stdout: string, stderr: string) => void) => {
    let finalCommand = cmd;
    let options: any = { cwd };

    if (process.platform === "win32") {
      // If on Windows, attempt to use WSL to run the command
      // We wrap the command in wsl and pass the current directory converted to a WSL path if possible
      // For simplicity, we just use 'wsl bash -c "..." '
      finalCommand = `wsl bash -c ${JSON.stringify(cmd)}`;
    } else {
      // On Linux/WSL, we explicitly use bash
      options.shell = "/bin/bash";
    }

    exec(finalCommand, options, callback);
  };

  // API: Global App State
  app.get("/api/state", (req, res) => {
    const state: Record<string, any> = {};
    const rows = db.prepare("SELECT * FROM app_state").all() as { key: string, value: string }[];
    rows.forEach(row => {
      try {
        state[row.key] = JSON.parse(row.value);
      } catch {
        state[row.key] = row.value;
      }
    });
    res.json(state);
  });

  app.post("/api/state", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)")
      .run(key, JSON.stringify(value));
    res.json({ success: true });
  });

  // API: Get Tool Registry (Sorted)
  app.get("/api/tools", (req, res) => {
    const tools = db.prepare("SELECT * FROM tools ORDER BY sort_order ASC").all();
    res.json(tools);
  });

  // API: Add Tool to Registry
  app.post("/api/tools", (req, res) => {
    const { name, description, command } = req.body;
    const id = Math.random().toString(36).substring(7);
    
    const maxOrder = db.prepare("SELECT MAX(sort_order) as maxOrder FROM tools").get() as { maxOrder: number };
    const sort_order = (maxOrder.maxOrder || 0) + 1;

    db.prepare("INSERT INTO tools (id, name, description, command, sort_order) VALUES (?, ?, ?, ?, ?)")
      .run(id, name, description, command, sort_order);
    
    res.json({ id, name, description, command, sort_order });
  });

  // API: Delete Tool from Registry
  app.delete("/api/tools/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM tools WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // API: Update Tool
  app.patch("/api/tools/:id", (req, res) => {
    const { id } = req.params;
    const { name, description, command } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (name !== undefined) { updates.push("name = ?"); values.push(name); }
    if (description !== undefined) { updates.push("description = ?"); values.push(description); }
    if (command !== undefined) { updates.push("command = ?"); values.push(command); }
    
    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE tools SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }
    
    const updated = db.prepare("SELECT * FROM tools WHERE id = ?").get(id);
    res.json(updated);
  });

  // API: Update Tool Order
  app.post("/api/tools/reorder", (req, res) => {
    const { order } = req.body;
    
    const updateOrder = db.transaction((ids: string[]) => {
      const stmt = db.prepare("UPDATE tools SET sort_order = ? WHERE id = ?");
      ids.forEach((id, index) => {
        stmt.run(index + 1, id);
      });
    });
    
    updateOrder(order);
    res.json({ success: true });
  });

  // API: Terminal Command Execution
  app.post("/api/terminal", (req, res) => {
    const { command } = req.body;
    let cmdLine = command.trim();
    
    if (cmdLine === "clear") {
      return res.json({ output: "CLEAR_SIGNAL" });
    }

    if (cmdLine === "su") {
      isRoot = true;
      return res.json({ output: "Session promoted to root privileges (Simulated)." });
    }

    if (cmdLine.startsWith("cd ")) {
      const targetDir = cmdLine.replace("cd ", "").trim();
      const resolvedPath = path.resolve(currentCwd, targetDir);
      
      // On Windows, if we are in WSL mode, we might need different validation
      // But for now we stick to the Node.js view of the filesystem
      if (fs.existsSync(resolvedPath) && fs.lstatSync(resolvedPath).isDirectory()) {
        currentCwd = resolvedPath;
        return res.json({ output: "", cwd: currentCwd });
      } else {
        return res.json({ output: `cd: ${targetDir}: No such file or directory`, error: true });
      }
    }

    // Execute real shell command
    executeCommand(cmdLine, currentCwd, (error, stdout, stderr) => {
      const output = stdout || stderr || (error ? error.message : "");
      res.json({ 
        output: output.trim(), 
        error: !!error,
        cwd: currentCwd
      });
    });
  });

  // API: Get current environment info
  app.get("/api/env", (req, res) => {
    res.json({
      cwd: currentCwd,
      user: isRoot ? "root" : "siuxsa_admin",
      platform: process.platform
    });
  });

  // API: Execution and save to Real FS
  app.post("/api/execute-task", async (req, res) => {
    const { toolName, target, rawCommand } = req.body;
    
    // Replace placeholder with actual target
    const finalCommand = rawCommand.replace(/\$target/g, target);
    
    const fileName = `${toolName.toLowerCase()}_${target.replace(/[^a-z0-9]/gi, '_')}.txt`;
    
    // Execute real shell command
    executeCommand(finalCommand, currentCwd, (error, stdout, stderr) => {
      const output = stdout || stderr || (error ? error.message : "");
      
      // Save to real filesystem
      try {
        const filePath = path.join(currentCwd, fileName);
        fs.writeFileSync(filePath, output);
      } catch (e) {
        console.error("Failed to write task output", e);
      }

      res.json({ 
        output: output.trim(), 
        fileName,
        error: !!error 
      });
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SIUXSA Orchestrator running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

