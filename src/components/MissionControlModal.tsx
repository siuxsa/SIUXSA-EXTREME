import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  GripVertical, 
  Shield, 
  Zap, 
  ArrowDown, 
  Trash2,
  Maximize2
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "../types";
import { cn } from "../lib/utils";

interface SortableItemProps {
  key?: string;
  task: Task;
  onRemove: (id: string) => void;
  onRun: (task: Task) => void;
  index: number;
}

function SortableMissionItem({ task, onRemove, onRun, index }: SortableItemProps) {
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex flex-col items-center",
        isDragging ? "z-50" : "z-10"
      )}
    >
      <div className={cn(
        "w-full max-w-xl bg-[#0d1117] border border-white/5 rounded-2xl p-4 transition-all",
        isDragging ? "shadow-[0_0_50px_rgba(6,182,212,0.2)] border-cyan-500 scale-105" : "hover:border-white/10"
      )}>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Step</span>
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm font-black text-slate-500 border border-white/5">
              {String(index + 1).padStart(2, '0')}
            </div>
          </div>

          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-cyan-400 transition-colors"
          >
            <GripVertical className="w-5 h-5" />
          </button>

          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              <h4 className="text-base font-bold text-white tracking-tight truncate">{task.toolName}</h4>
            </div>
            <div className="flex items-center gap-2">
               <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-500 text-[9px] font-bold uppercase tracking-widest border border-cyan-500/20 shrink-0">
                Authorized
               </span>
               <code className="text-[10px] text-slate-500 font-mono italic truncate max-w-[150px]">
                {task.command}
               </code>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRun(task)}
              className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
              title="Execute Step"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                stroke="none"
              >
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            </button>
            <button
              onClick={() => onRemove(task.id)}
              className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Connector line */}
      <div className="h-6 w-px bg-gradient-to-b from-white/10 to-transparent last:hidden" />
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onReorder: (event: DragEndEvent) => void;
  onRun: (task: Task) => void;
  onRemove: (id: string) => void;
}

export function MissionControlModal({ isOpen, onClose, tasks, onReorder, onRun, onRemove }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] overflow-hidden flex items-center justify-center p-4 sm:p-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#02040a]/95 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative w-full max-w-5xl h-full max-h-[85vh] bg-[#0d1117] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20">
               <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_0%,_#06b6d433_0%,_transparent_50%)]" />
            </div>

            {/* Header */}
            <header className="shrink-0 p-6 flex items-center justify-between relative z-10 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                  <Maximize2 className="w-6 h-6 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tighter flex items-center gap-3">
                    SEQUENCE STRATEGIST
                    <span className="px-2 py-0.5 rounded text-[9px] font-black bg-red-600 text-white uppercase tracking-[0.2em]">Extreme Edition</span>
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">MISSION CONTROL • ORCHESTRATION LAYER 01</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                 <div className="text-right">
                    <span className="block text-[8px] uppercase tracking-widest text-slate-500 font-black mb-0.5">Orchestration Nodes</span>
                    <div className="text-lg font-black text-white font-mono">{tasks.length} Active</div>
                 </div>
                 <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Content Area */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-8 flex flex-col items-center relative z-10">
              <div className="w-full max-w-xl">
                {tasks.length === 0 ? (
                  <div className="h-[400px] flex flex-col items-center justify-center text-center opacity-40">
                     <div className="w-16 h-16 border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center mb-6">
                        <ArrowDown className="w-8 h-8 text-slate-700" />
                     </div>
                     <h3 className="text-lg font-bold text-white mb-2">No Sequence Detected</h3>
                     <p className="text-xs max-w-xs text-slate-400">Add tools to the registry from the main console to begin strategic orchestration.</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onReorder}
                  >
                    <SortableContext
                      items={tasks.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {tasks.map((task, idx) => (
                        <SortableMissionItem 
                          key={task.id} 
                          task={task} 
                          onRemove={onRemove}
                          onRun={onRun}
                          index={idx}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>

            {/* Footer Status Bar */}
            <footer className="shrink-0 h-10 bg-black/40 border-t border-white/5 flex items-center px-6 justify-between relative z-10">
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[9px] font-bold text-emerald-500 uppercase">Strategic Sync: Active</span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">ENCRYPTION: AES-256-GCM</div>
               </div>
               <div className="flex items-center gap-2">
                  <Shield className="w-2.5 h-2.5 text-cyan-500" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Ready for Deployment</span>
               </div>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

