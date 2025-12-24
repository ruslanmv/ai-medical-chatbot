import { Plus, CheckCircle, Pill, Video, Check } from "lucide-react";

const MOCK_SCHEDULE = [
  {
    id: 1,
    time: "08:00",
    title: "Morning Meds (Lisinopril)",
    type: "medication",
    status: "completed",
    duration: "5m",
  },
  {
    id: 2,
    time: "09:00",
    title: "Log Blood Pressure",
    type: "task",
    status: "pending",
    duration: "5m",
  },
  {
    id: 3,
    time: "10:00",
    title: "Drink Water (500ml)",
    type: "habit",
    status: "pending",
    duration: "5m",
  },
  {
    id: 4,
    time: "14:30",
    title: "Dr. Reynolds (Cardiology)",
    type: "appointment",
    status: "upcoming",
    duration: "30m",
  },
  {
    id: 5,
    time: "20:00",
    title: "Evening Meds (Metformin)",
    type: "medication",
    status: "pending",
    duration: "5m",
  },
];

export function ScheduleView() {
  const timeSlots = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

  const renderEvent = (hour: number) => {
    const event = MOCK_SCHEDULE.find(
      (e) => parseInt(e.time.split(":")[0]) === hour
    );
    if (!event) return null;

    const isCompleted = event.status === "completed";

    let icon = <CheckCircle size={16} />;
    let bgColor = "bg-blue-50 border-blue-100";
    let textColor = "text-blue-700";

    if (event.type === "medication") {
      icon = <Pill size={16} />;
      bgColor = isCompleted
        ? "bg-emerald-50 border-emerald-100 opacity-60"
        : "bg-rose-50 border-rose-100";
      textColor = isCompleted ? "text-emerald-700" : "text-rose-700";
    } else if (event.type === "appointment") {
      icon = <Video size={16} />;
      bgColor = "bg-purple-50 border-purple-100";
      textColor = "text-purple-700";
    }

    return (
      <div
        className={`absolute top-2 left-20 right-4 p-3 rounded-lg border flex items-center justify-between shadow-sm transition-all hover:shadow-md ${bgColor} ${textColor}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-md bg-white/50`}>{icon}</div>
          <div>
            <div
              className={`font-semibold text-sm ${
                isCompleted ? "line-through" : ""
              }`}
            >
              {event.title}
            </div>
            <div className="text-xs opacity-80">
              {event.time} • {event.duration}
            </div>
          </div>
        </div>
        {!isCompleted && (
          <button className="px-3 py-1 bg-white rounded-md text-xs font-bold border border-current opacity-70 hover:opacity-100">
            {event.type === "appointment" ? "Join" : "Mark Done"}
          </button>
        )}
        {isCompleted && (
          <div className="px-2 py-0.5 rounded text-xs font-bold bg-white/50 flex items-center gap-1">
            <Check size={12} /> Done
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Schedule & Routine
          </h2>
          <p className="text-slate-500 text-sm">Wednesday, October 24</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={16} /> Add Task
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 relative">
        <div className="space-y-0 relative min-h-[800px]">
          {/* Current time indicator */}
          <div className="absolute top-[320px] left-16 right-0 border-t-2 border-red-400 z-10 flex items-center">
            <div className="w-2 h-2 bg-red-400 rounded-full -ml-1"></div>
            <span className="text-[10px] text-red-500 bg-white px-1 font-bold ml-1">
              10:41 AM (Now)
            </span>
          </div>

          {timeSlots.map((hour) => (
            <div
              key={hour}
              className="flex h-24 group border-b border-slate-50 relative"
            >
              <div className="w-16 flex-shrink-0 text-right pr-4 pt-2 text-xs font-medium text-slate-400 group-hover:text-slate-600">
                {hour > 12 ? `${hour - 12} PM` : `${hour} ${hour === 12 ? "PM" : "AM"}`}
              </div>
              <div className="flex-1 border-l border-slate-100 relative bg-slate-50/20 group-hover:bg-slate-50/50 transition-colors">
                <div className="absolute top-1/2 left-0 w-full border-t border-slate-100 border-dashed" />
                {renderEvent(hour)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
