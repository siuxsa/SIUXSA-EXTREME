# Sequence Strategist: Extreme Edition

Sequence Strategist is a high-performance orchestration platform designed for building, managing, and executing automated command pipelines. It bridges the gap between high-level workflow design and low-level system execution, featuring deep integration with WSL (Windows Subsystem for Linux) and a reactive, real-time interface.

![Orchestration Engine](https://raw.githubusercontent.com/lucide-react/lucide/main/icons/settings-2.svg)

## 🚀 Key Features

- **Strategic Pipelining**: Chain multiple command-line tools into a single, cohesive execution sequence.
- **WSL & Bash Native**: Automatically detects platform and routes commands through `wsl bash` on Windows or native `bash` on Linux systems.
- **Mission Control**: A dedicated orchestration layer for reordering sequences (drag-and-drop), managing step removal, and triggering independent tool runs.
- **Dynamic Tool Registry**: Add, edit, and persist your custom tool library using an integrated SQLite database.
- **Proactive Persistence**: Global application state (targets, tasks, configuration) is saved to the database, allowing you to resume exactly where you left off.
- **Real-time Terminal Insight**: Live streaming logs, status tracking, and instant terminal output access for every orchestrated step.
- **Output Management**: High-speed copy-to-clipboard and direct text-file downloads for all generated tool results.

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Motion (framer-motion).
- **Backend**: Node.js, Express.
- **Database**: SQLite (via `better-sqlite3`).
- **Interactions**: `@dnd-kit` for strategic reordering.

## 📥 Installation

### Prerequisites

- **Node.js**: v18 or higher.
- **WSL (Optional but Recommended)**: Enable Linux subsystem on Windows for full tool compatibility.

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/sequence-strategist.git
   cd sequence-strategist
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Declare Environment Variables**:
   Create a `.env` file (or use defaults):
   ```env
   PORT=3000
   ```

4. **Launch Development Environment**:
   ```bash
   npm run dev
   ```

## 🎮 How to Use

1. **Configure Registry**: Use the right-hand sidebar to add tools. Use `$target` as a placeholder in your commands (e.g., `grep "error" $target`).
2. **Build Sequence**: Add tools from your registry to the "Active Pipeline" (left sidebar).
3. **Set Target**: Enter the file path or directory you want to analyze in the central "Target Asset" field.
4. **Mission Control**: Click the gear icon in the header to open the Strategic Strategist popup. Here you can drag tools to change the sequence order or run specific tools independently.
5. **Ignite**: Hit the "Engage Sequence" button.
6. **Review**: Click on any completed step to view full terminal output, copy logs, or download the result.

## ⚖️ License

MIT © [SIUXSA Admin]
