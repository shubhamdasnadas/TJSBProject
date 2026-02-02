
import React from 'react';
import { LifecycleEvent } from '../types';
import { 
  Activity, User, PlusCircle, Trash2, CheckCircle2, 
  ArrowRightLeft, Calendar, AlertTriangle, ArrowRight
} from 'lucide-react';

interface LifecycleViewProps {
  events: LifecycleEvent[];
  compact?: boolean;
}

export const LifecycleView: React.FC<LifecycleViewProps> = ({ events, compact = false }) => {
  
  const getConfig = (event: LifecycleEvent) => {
      const desc = event.description.toLowerCase();
      
      switch(event.eventType) {
          case 'CREATED': 
              return { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', dotBorder: 'border-green-500', icon: PlusCircle };
          case 'DELETED': 
              return { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dotBorder: 'border-red-500', icon: Trash2 };
          case 'ASSIGNED': 
              return { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', dotBorder: 'border-purple-500', icon: User };
          case 'WARNING': 
              return { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dotBorder: 'border-orange-500', icon: AlertTriangle };
          case 'STATUS_CHANGE':
              if (desc.includes('broken')) return { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dotBorder: 'border-red-500', icon: AlertTriangle };
              if (desc.includes('active')) return { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', dotBorder: 'border-green-500', icon: CheckCircle2 };
              return { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dotBorder: 'border-blue-500', icon: Activity };
          default: 
              return { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dotBorder: 'border-blue-500', icon: ArrowRightLeft };
      }
  };

  const parseChanges = (value: string | undefined): any[] | null => {
      if (!value) return null;
      try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].field) {
              return parsed;
          }
      } catch (e) {
          return null;
      }
      return null;
  };

  if (events.length === 0) {
      return (
          <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
              <Activity className="mx-auto mb-2 opacity-50" size={24} />
              <p className="text-sm">No history recorded for this asset yet.</p>
          </div>
      );
  }

  return (
    <div className={`relative border-l-2 border-slate-200 ml-3 space-y-6 ${compact ? 'py-2' : 'py-4'}`}>
        {events.map((event) => {
            const date = new Date(event.timestamp);
            const config = getConfig(event);
            const Icon = config.icon;
            
            // Try to parse detailed changes from newValue
            const detailedChanges = parseChanges(event.newValue);

            return (
                <div key={event.id} className="relative pl-6">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[9px] top-0 bg-white border-2 ${config.dotBorder} rounded-full p-1 shadow-sm`}>
                        <Icon size={14} className={config.color} />
                    </div>
                    
                    {/* Content Card */}
                    <div className={`${config.bg} p-3 rounded-lg border ${config.border} shadow-sm transition-all hover:shadow-md w-full`}>
                        {/* Header: Date Left, Type Next */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                             <div className="flex items-center gap-1 text-slate-500 text-[10px] font-medium whitespace-nowrap">
                                <Calendar size={10} />
                                {date.toLocaleDateString()} {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-white/60 border border-white/50 ${config.color} shrink-0`}>
                                {event.eventType.replace('_', ' ')}
                            </span>
                        </div>
                        
                        <p className="text-slate-800 text-sm leading-snug font-medium break-words whitespace-pre-wrap">
                            {event.description}
                        </p>
                        
                        {/* Value Change Visualization - Single Line Format */}
                        {detailedChanges ? (
                            <div className="mt-2 flex flex-col gap-1">
                                {detailedChanges.map((change, idx) => (
                                    <div key={idx} className="text-xs bg-white/60 px-2 py-1.5 rounded border border-white/50 flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span className="font-semibold text-slate-700 min-w-[60px]">{change.field}:</span>
                                        <span className="text-slate-500 line-through decoration-slate-400 opacity-80">{String(change.old || 'Empty')}</span>
                                        <ArrowRight size={10} className="text-slate-400" />
                                        <span className="text-slate-900 font-bold">{String(change.new || 'Empty')}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Fallback for simple changes
                            (event.previousValue || event.newValue) && (
                                <div className="mt-2 text-xs bg-white/60 px-2 py-1.5 rounded border border-white/50 flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="font-semibold text-slate-700">Change:</span>
                                    {event.previousValue && (
                                        <span className="text-slate-500 line-through decoration-slate-400 opacity-80">{event.previousValue}</span>
                                    )}
                                    {event.previousValue && event.newValue && <ArrowRight size={10} className="text-slate-400" />}
                                    {event.newValue && (
                                        <span className="text-slate-900 font-bold">{event.newValue}</span>
                                    )}
                                </div>
                            )
                        )}

                        {event.actor && (
                            <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                                <User size={10} /> {event.actor}
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
    </div>
  );
};
