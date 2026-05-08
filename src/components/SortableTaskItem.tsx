import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, CheckCircle2, Circle, AlertCircle, Loader2, FileText, FastForward } from "lucide-react";
import { Task } from "../types";
import { cn } from "../lib/utils";

interface Props {
  key?: string;
  task: Task;
  onRemove: (id: string) => void;
  onUpdateCommand: (id: string, command: string) => void;
  onSkip: (id: string) => void;
  onRun: (task: Task) => void;
  onViewOutput: (task: Task) => void;
  isGlobalExecuting: boolean;
}

export function SortableTaskItem({ task, onRemove, onUpdateCommand, onSkip, onRun, onViewOutput, isGlobalExecuting }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case 'running': return <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Circle className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col transition-all",
        isDragging ? "opacity-50 scale-105" : ""
      )}
    >
      <div className={cn(
        "bg-slate-900/50 border border-white/5 rounded-xl p-4 flex items-center gap-4 relative z-10",
        isDragging ? "border-cyan-500/50 shadow-2xl bg-slate-800" : "hover:border-white/10 hover:bg-slate-900/80"
      )}>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/5 rounded text-slate-500 hover:text-slate-300"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>

        <div className="flex-grow">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold font-mono text-cyan-400">{task.toolName}</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Execution Unit</span>
          </div>
          <input
            type="text"
            value={task.command}
            onChange={(e) => onUpdateCommand(task.id, e.target.value)}
            disabled={isGlobalExecuting || task.status === 'running'}
            placeholder="Raw Command..."
            className="w-full bg-black/40 border border-white/5 rounded px-2 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/30 transition-colors disabled:opacity-50"
          />
        </div>

        <div className="flex items-center gap-2">
          {task.status !== 'running' && (
            <button
              onClick={() => onRun(task)}
              disabled={isGlobalExecuting}
              className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-all flex items-center gap-1 text-[10px] uppercase font-bold disabled:opacity-30 disabled:cursor-not-allowed group/run"
              title="Run this tool separately"
            >
              <Loader2 className="w-4 h-4 group-hover/run:animate-spin hidden" />
              <CheckCircle2 className="w-4 h-4 hidden" />
              <Circle className="w-4 h-4 hidden" />
              {/* Using native Play icon if possible or just Loader if it serves well, but Play is better */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                stroke="none"
                className="w-4 h-4"
              >
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
              Run
            </button>
          )}

          {task.status === 'running' && (
            <button
              onClick={() => onSkip(task.id)}
              className="p-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg transition-all flex items-center gap-1 text-[10px] uppercase font-bold"
              title="Skip current tool"
            >
              <FastForward className="w-4 h-4" />
              Skip
            </button>
          )}

          {task.output && (
            <button
              onClick={() => onViewOutput(task)}
              className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all flex items-center gap-1 text-[10px] uppercase font-bold"
            >
              <FileText className="w-4 h-4" />
              View Log
            </button>
          )}

          <button
            onClick={() => onRemove(task.id)}
            disabled={task.status === 'running' || isGlobalExecuting}
            className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
