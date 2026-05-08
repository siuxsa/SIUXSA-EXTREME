import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronRight, 
  Play, 
  Terminal as TerminalIcon, 
  Plus, 
  Shield, 
  Activity, 
  History,
  Rocket,
  Search,
  Settings2,
  Database,
  Copy,
  Download,
  Check,
  X
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Tool, Task, ExecutionLog } from "./types";
import { SortableTaskItem } from "./components/SortableTaskItem";
import { SortableRegistryItem } from "./components/SortableRegistryItem";
import { MissionControlModal } from "./components/MissionControlModal";
import { cn } from "./lib/utils";

export default function App() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [target, setTarget] = useState("");
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showMissionControl, setShowMissionControl] = useState(false);

  const saveState = useCallback(async (key: string, value: any) => {
    try {
      await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
    } catch (e) {
      console.error("Failed to save state", e);
    }
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      const state = await res.json();
      if (state.target) setTarget(state.target);
      if (state.tasks) setTasks(state.tasks.map((t: any) => ({ ...t, status: 'idle', output: '' })));
      setIsInitialLoad(false);
    } catch (e) {
      console.error("Failed to fetch state", e);
      setIsInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (!isInitialLoad) {
      saveState("target", target);
    }
  }, [target, isInitialLoad, saveState]);

  useEffect(() => {
    if (!isInitialLoad && !isExecuting) {
      // Only save if not executing to avoid state clashing
      saveState("tasks", tasks);
    }
  }, [tasks, isInitialLoad, isExecuting, saveState]);
  const [skipRequested, setSkipRequested] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  const handleCopy = useCallback(() => {
    if (selectedTask?.output) {
      navigator.clipboard.writeText(selectedTask.output);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [selectedTask]);

  const handleDownload = useCallback(() => {
    if (selectedTask?.output) {
      const blob = new Blob([selectedTask.output], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedTask.toolName.toLowerCase()}_result_${target || 'unknown'}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [selectedTask, target]);

  const abortControllerRef = React.useRef<AbortController | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > 160 && newWidth < 480) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      document.body.style.cursor = "col-resize";
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "default";
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "default";
    };
  }, [isResizing, resize]);

  const [showAddTool, setShowAddTool] = useState(false);
  const [newTool, setNewTool] = useState({ name: "", description: "", command: "" });

  const [terminalInput, setTerminalInput] = useState("");
  const [currentEnv, setCurrentEnv] = useState({ cwd: "~", user: "siuxsa_admin" });

  const fetchEnv = useCallback(async () => {
    try {
      const res = await fetch("/api/env");
      const data = await res.json();
      setCurrentEnv({
        cwd: data.cwd.replace(window.location.origin, "").split("/").pop() || "~",
        user: data.user
      });
    } catch (e) {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchEnv();
  }, [fetchEnv]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchTools = () => {
    fetch("/api/tools")
      .then((res) => res.json())
      .then(setTools)
      .catch(err => addLog("Failed to fetch tool registry from backend", "error"));
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput;
    setTerminalInput("");
    addLog(`$ ${cmd}`, "info");

    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
      const { output, error, cwd } = await res.json();
      
      if (output === "CLEAR_SIGNAL") {
        setLogs([]);
      } else {
        if (output) addLog(output, error ? "error" : "info");
      }

      if (cwd) {
        setCurrentEnv(prev => ({ ...prev, cwd: cwd.split("/").pop() || "~" }));
      }
    } catch (error) {
      addLog("Terminal communication error.", "error");
    }
  };

  const handleAddTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTool.name) return;
    
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTool),
      });
      const added = await res.json();
      setTools([...tools, added]);
      setNewTool({ name: "", description: "", command: "" });
      setShowAddTool(false);
      addLog(`New tool added to registry: ${added.name}`, "info");
    } catch (err) {
      addLog("Failed to add tool to registry", "error");
    }
  };

  const deleteTool = async (id: string) => {
    try {
      await fetch(`/api/tools/${id}`, { method: "DELETE" });
      setTools(tools.filter(t => t.id !== id));
      addLog("Tool removed from registry", "info");
    } catch (err) {
      addLog("Failed to remove tool", "error");
    }
  };

  const updateTool = async (id: string, updates: Partial<Tool>) => {
    try {
      const res = await fetch(`/api/tools/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setTools(tools.map(t => t.id === id ? updated : t));
    } catch (err) {
      addLog("Failed to update tool in registry", "error");
    }
  };

  const addTask = (tool: Tool) => {
    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      toolId: tool.id,
      toolName: tool.name,
      command: tool.command,
      status: "idle",
    };
    setTasks([...tasks, newTask]);
    addLog(`Added to workflow`, "info", newTask.id, tool.name);
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const updateTaskCommand = (id: string, command: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, command } : t)));
  };

  const handleDragEndTasks = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragEndRegistry = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tools.findIndex((i) => i.id === active.id);
      const newIndex = tools.findIndex((i) => i.id === over.id);
      const newTools = arrayMove(tools, oldIndex, newIndex);
      setTools(newTools);
      
      try {
        await fetch("/api/tools/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newTools.map((t: Tool) => t.id) }),
        });
      } catch (err) {
        addLog("Failed to sync tool order to database", "error");
      }
    }
  };

  const addLog = (message: string, level: ExecutionLog["level"] = "info", taskId: string = "system", toolName: string = "System") => {
    setLogs((prev) => [
      {
        timestamp: new Date().toLocaleTimeString(),
        message,
        level,
        taskId,
        toolName,
      },
      ...prev,
    ].slice(0, 50));
  };

  const executeWorkflow = async () => {
    if (!target.trim()) return;
    if (tasks.length === 0) return;

    setIsExecuting(true);
    addLog(`Initializing orchestration for ${target}...`, "info");

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        
        // Reset status if it was previously failed/completed and we are re-running? 
        // Actually the button is disabled if running, but maybe we want to reset all to idle first.
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'running' } : t));

        // Perform $target substitution
        const substitutedCommand = task.command.replace(/\$target/g, target);
        addLog(`Starting command: ${substitutedCommand}`, "info", task.id, task.toolName);
        
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const res = await fetch("/api/execute-task", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({ 
              toolName: task.toolName, 
              target, 
              rawCommand: substitutedCommand 
            }),
          });
          const { output, fileName, error: isError } = await res.json();
          
          if (isError) {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed', output } : t));
            addLog(`Execution failed: ${output.split('\n')[0]}`, "error", task.id, task.toolName);
            addLog("Continuing to next sequence step...", "info");
          } else {
            setTasks(prev => prev.map(t => (t.id === task.id && t.status === 'running') ? { ...t, status: 'completed', output } : t));
            addLog(`Execution successful. Saved to: ${fileName}`, "info", task.id, task.toolName);
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed', output: "Task skipped by user." } : t));
            addLog(`Execution skipped by user.`, "warn", task.id, task.toolName);
            // Don't break the loop, continue to next task
            continue;
          } else {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed' } : t));
            addLog(`Process returned error code 1`, "error", task.id, task.toolName);
            addLog("Critical failure detected. Halting sequence.", "error");
            break;
          }
        } finally {
          abortControllerRef.current = null;
        }
    }

    setIsExecuting(false);
    addLog("Workflow orchestration sequence finalized.", "info");
  };

  const skipTask = (id: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const runSingleTask = async (task: Task) => {
    if (!target.trim()) {
      addLog("Target asset required for execution.", "warn");
      return;
    }

    setIsExecuting(true);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'running' } : t));
    const substitutedCommand = task.command.replace(/\$target/g, target);
    addLog(`Independent execution: ${substitutedCommand}`, "info", task.id, task.toolName);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/execute-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ 
          toolName: task.toolName, 
          target, 
          rawCommand: substitutedCommand 
        }),
      });
      const { output, fileName, error: isError } = await res.json();
      
      if (isError) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed', output } : t));
        addLog(`Execution failed: ${output.split('\n')[0]}`, "error", task.id, task.toolName);
      } else {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed', output } : t));
        addLog(`Execution successful. Saved to: ${fileName}`, "info", task.id, task.toolName);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed', output: "Execution aborted." } : t));
        addLog(`Execution aborted.`, "warn", task.id, task.toolName);
      } else {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed' } : t));
        addLog(`Communication failure.`, "error", task.id, task.toolName);
      }
    } finally {
      abortControllerRef.current = null;
      setIsExecuting(false);
    }
  };

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0d1117]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <Shield className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white group cursor-default">
                SIUXSA <span className="text-cyan-400 group-hover:text-red-500 transition-colors">EXTREME</span>
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-red-600 text-white uppercase tracking-widest leading-none animate-pulse">Root Access</span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none">Security Command Console</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">System Nominal</span>
          </div>
          <button 
            onClick={() => setShowMissionControl(true)}
            className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors group relative"
            title="Sequence Strategist"
          >
            <Settings2 className="w-4 h-4 group-hover:text-cyan-400 transition-colors" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-500 rounded-full animate-ping" />
          </button>
        </div>
      </header>

      <main className="flex-grow flex overflow-hidden h-[calc(100vh-64px)]">
        {/* Left Sidebar: Tool Registry */}
        <aside 
          style={{ width: `${sidebarWidth}px` }}
          className="border-r border-white/5 bg-[#0d1117]/40 flex flex-col pt-6 relative group"
        >
          {/* Resize Handle */}
          <div
            onMouseDown={startResizing}
            className={cn(
              "absolute top-0 right-[-4px] w-[8px] h-full cursor-col-resize z-50 transition-colors",
              isResizing ? "bg-cyan-500/50" : "hover:bg-cyan-500/20"
            )}
          />
          
          <div className="px-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Database className="w-3 h-3" /> Tool Registry
              </h2>
              <button 
                onClick={() => setShowAddTool(!showAddTool)}
                className="p-1 hover:bg-white/5 rounded text-cyan-500 transition-colors"
                title="Add Custom Tool"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <AnimatePresence>
              {showAddTool && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-6"
                  onSubmit={handleAddTool}
                >
                  <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/5">
                    <input
                      type="text"
                      placeholder="Tool Name"
                      value={newTool.name}
                      onChange={e => setNewTool({...newTool, name: e.target.value})}
                      className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/30"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={newTool.description}
                      onChange={e => setNewTool({...newTool, description: e.target.value})}
                      className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/30"
                    />
                    <input
                      type="text"
                      placeholder="Raw Command (use $target for dynamic asset)"
                      value={newTool.command}
                      onChange={e => setNewTool({...newTool, command: e.target.value})}
                      className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/30"
                    />
                    <div className="flex gap-2 pt-1">
                      <button 
                        type="submit"
                        className="flex-grow bg-cyan-500 text-black text-[10px] font-bold uppercase rounded-lg py-2 hover:bg-cyan-400 transition-colors"
                      >
                        Register
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowAddTool(false)}
                        className="flex-grow bg-white/5 text-slate-500 text-[10px] font-bold uppercase rounded-lg py-2 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                className="w-full bg-black/40 border border-white/5 rounded-lg py-2 pl-9 pr-4 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/30 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="flex-grow overflow-y-auto px-4 custom-scrollbar space-y-2 pb-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndRegistry}
            >
              <SortableContext
                items={filteredTools.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredTools.map((tool) => (
                  <SortableRegistryItem 
                    key={tool.id} 
                    tool={tool} 
                    onAdd={addTask} 
                    onRemove={deleteTool}
                    onUpdate={(updates) => updateTool(tool.id, updates)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </aside>

        {/* Center: Workflow Canvas */}
        <section className="flex-grow flex flex-col bg-[#010409]">
          <div className="p-8 pb-4">
            <div className="max-w-2xl mx-auto flex items-end justify-between gap-8">
              <div className="flex-grow">
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Target Asset</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="domain.tld or IP address"
                    className="flex-grow bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-cyan-500/50 transition-all shadow-xl"
                  />
                  <button
                    onClick={executeWorkflow}
                    disabled={isExecuting || !target || tasks.length === 0}
                    className={cn(
                      "px-6 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg",
                      isExecuting || !target || tasks.length === 0 
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5" 
                        : "bg-cyan-500 text-black hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                    )}
                  >
                    {isExecuting ? <Activity className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                    {isExecuting ? "Launch" : "Launch"}
                  </button>
                </div>
              </div>
              
              <div className="text-right shrink-0 pb-1 flex gap-6 items-end">
                <div className="text-right">
                  <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Registry Size</span>
                  <div className="text-2xl font-mono font-bold text-slate-600 leading-none">
                    {tools.length}
                  </div>
                </div>
                <div className="text-right border-l border-white/5 pl-6">
                  <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Sequence Units</span>
                  <div className="flex items-center justify-end gap-2 text-2xl font-mono font-bold leading-none">
                    <span className="text-cyan-400">{tasks.length}</span>
                    <span className="text-slate-800">/</span>
                    <span className="text-slate-600">32</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto px-8 py-4 custom-scrollbar relative">
            {tasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none pointer-events-none p-12">
                <div className="w-16 h-16 border border-dashed border-slate-500 rounded-full flex items-center justify-center mb-4">
                   <ChevronRight className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-bold mb-2">Workflow Empty</h3>
                <p className="text-sm max-w-xs">Select tools from the registry to begin constructing your orchestration pipeline.</p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-3 pb-8">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndTasks}
                >
                  <SortableContext
                    items={tasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {tasks.map((task) => (
                      <SortableTaskItem
                        key={task.id}
                        task={task}
                        onRemove={removeTask}
                        onUpdateCommand={updateTaskCommand}
                        onSkip={skipTask}
                        onRun={runSingleTask}
                        onViewOutput={(t) => setSelectedTask(t)}
                        isGlobalExecuting={isExecuting}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>

          {/* Bottom Panel: Terminal */}
          <div className="h-64 border-t border-white/5 bg-black flex flex-col">
            <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Interactive Terminal</span>
              </div>
          <div className="flex items-center gap-3">
            <div className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">Admin Mode</span>
            </div>
            <button 
              onClick={() => setLogs([])}
              className="text-[9px] text-slate-500 hover:text-white flex items-center gap-1 transition-colors"
            >
              <History className="w-3 h-3" /> Clear
            </button>
          </div>
            </div>

            <div className="flex-grow overflow-y-auto px-4 py-3 font-mono text-[11px] custom-scrollbar flex flex-col-reverse bg-[#010409]">
              <div className="mt-4 flex items-center gap-2">
                <span className="shrink-0 text-emerald-500 font-bold">{currentEnv.user}@siuxsa</span>
                <span className="shrink-0 text-slate-500">:</span>
                <span className="shrink-0 text-cyan-400 font-bold">~/{currentEnv.cwd}</span>
                <span className="shrink-0 text-slate-400">$</span>
                <form onSubmit={handleTerminalSubmit} className="flex-grow ml-1">
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder="Enter command..."
                    className="w-full bg-transparent border-none outline-none text-slate-100 placeholder:text-slate-800"
                    autoFocus
                  />
                </form>
              </div>
              
              <AnimatePresence initial={false}>
                {logs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "mb-1 flex gap-3",
                      log.level === 'error' ? 'text-red-400' : 'text-slate-400'
                    )}
                  >
                    <span className="text-slate-700 w-16 shrink-0">[{log.timestamp}]</span>
                    <span className="font-bold text-cyan-500 shrink-0">[{log.toolName}]</span>
                    <span className="flex-grow break-all whitespace-pre-wrap">{log.message}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {logs.length === 0 && (
                <div className="text-slate-800 italic">Terminal ready. Type 'ls' to see saved outputs.</div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Output Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-24">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <TerminalIcon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-cyan-400">{selectedTask.toolName}</h3>
                    <p className="text-[10px] text-slate-500 font-mono tracking-tight">{selectedTask.command}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-grow overflow-auto p-6 custom-scrollbar bg-[#010409]">
                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed selection:bg-cyan-500/30">
                  {selectedTask.output || "No output generated."}
                </pre>
              </div>
              <div className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-4">
                <div className="text-[10px] text-slate-600 font-mono">
                  EXIT_CODE: {selectedTask.status === 'completed' ? '0' : '1'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border border-white/5",
                      isCopied 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                        : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                    )}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {isCopied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold rounded-lg transition-all border border-white/5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-black uppercase tracking-widest rounded-lg transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MissionControlModal 
        isOpen={showMissionControl}
        onClose={() => setShowMissionControl(false)}
        tasks={tasks}
        onRun={runSingleTask}
        onRemove={removeTask}
        onReorder={handleDragEndTasks}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
