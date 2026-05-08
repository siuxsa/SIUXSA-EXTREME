import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Settings2, Check, X } from "lucide-react";
import { Tool } from "../types";
import { cn } from "../lib/utils";

interface Props {
  key?: string;
  tool: Tool;
  onAdd: (tool: Tool) => void;
  onRemove: (id: string) => void;
  onUpdate: (updates: Partial<Tool>) => void;
}

export function SortableRegistryItem({ tool, onAdd, onRemove, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    name: tool.name,
    description: tool.description,
    command: tool.command
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tool.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  const handleSave = () => {
    onUpdate(editValues);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValues({
      name: tool.name,
      description: tool.description,
      command: tool.command
    });
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group w-full text-left rounded-xl border border-transparent flex items-stretch transition-all",
        isDragging ? "opacity-50 scale-105 border-cyan-500/50 shadow-2xl bg-slate-800" : "hover:bg-white/5 hover:border-white/5",
        isEditing && "bg-white/[0.03] border-white/10"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 px-3 text-slate-700 hover:text-slate-400 border-r border-white/5"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-grow p-3">
        {isEditing ? (
          <div className="space-y-2 animate-in fade-in duration-200">
            <input
              type="text"
              value={editValues.name}
              onChange={(e) => setEditValues(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Tool Name"
              className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-xs font-bold text-cyan-400 focus:outline-none focus:border-cyan-500/50"
            />
            <textarea
              value={editValues.description}
              onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description"
              rows={2}
              className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] text-slate-400 focus:outline-none focus:border-cyan-500/50 resize-none"
            />
            <input
              type="text"
              value={editValues.command}
              onChange={(e) => setEditValues(prev => ({ ...prev, command: e.target.value }))}
              placeholder="Base Command"
              className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-slate-400 focus:outline-none focus:border-cyan-500/50"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                className="flex-grow py-1 bg-cyan-500 hover:bg-cyan-400 text-black text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-colors"
              >
                <Check className="w-3 h-3" /> Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded flex items-center justify-center transition-colors border border-white/5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => onAdd(tool)}
            className="cursor-pointer group/content"
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-bold text-cyan-400 transition-colors font-mono tracking-tight">
                {tool.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug group-hover/content:text-slate-400 transition-colors">
              {tool.description}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col border-l border-white/5">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={cn(
            "flex-grow px-3 flex items-center justify-center transition-all",
            isEditing ? "bg-cyan-500/10 text-cyan-400" : "text-slate-600 hover:text-cyan-400 hover:bg-white/5"
          )}
        >
          <Settings2 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tool.id);
          }}
          className="flex-grow px-3 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all border-t border-white/5"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
