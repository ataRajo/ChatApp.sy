// small snippet (not a new file if you prefer to inline)
// Use in Chat.jsx header: <OnlineBadge count={users.length} />

export function OnlineBadge({ count }) {
  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span>{count} online</span>
    </div>
  );
}