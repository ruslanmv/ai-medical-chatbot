import { FileText, Paperclip, ChevronRight } from "lucide-react";

const MOCK_RECORDS = [
  {
    id: 1,
    title: "Blood Work Results",
    date: "Oct 24, 2023",
    type: "Lab Report",
  },
  {
    id: 2,
    title: "Cardiology Consultation",
    date: "Sep 12, 2023",
    type: "Clinical Note",
  },
  {
    id: 3,
    title: "Vaccination Record",
    date: "Jan 15, 2023",
    type: "Certificate",
  },
];

export function RecordsView() {
  return (
    <div className="p-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Health Records</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm shadow-blue-200 transition-all flex items-center gap-2">
          <Paperclip size={16} /> Upload New
        </button>
      </div>

      <div className="grid gap-4">
        {MOCK_RECORDS.map((record) => (
          <div
            key={record.id}
            className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-100 transition-colors">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">
                  {record.title}
                </h3>
                <p className="text-sm text-slate-500">
                  {record.type} • {record.date}
                </p>
              </div>
            </div>
            <ChevronRight
              size={20}
              className="text-slate-300 group-hover:text-blue-500 transition-colors"
            />
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-sm text-slate-500">
        <p>
          Records are encrypted end-to-end. Only you and your authorized
          providers have access.
        </p>
      </div>
    </div>
  );
}
