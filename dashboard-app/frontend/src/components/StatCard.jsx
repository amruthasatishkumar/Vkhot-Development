export default function StatCard({ label, value, unit, change, change_type }) {
  const isUp   = change_type === 'up';
  const isDown = change_type === 'down';

  const changeBadge = change ? (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full
        ${isUp   ? 'bg-green-100 text-green-700' : ''}
        ${isDown ? 'bg-red-100   text-red-600'   : ''}
        ${!isUp && !isDown ? 'bg-gray-100 text-gray-500' : ''}
      `}
    >
      {isUp && '↑'}{isDown && '↓'}
      {change}
    </span>
  ) : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-3xl font-bold text-gray-900 leading-none">
          {value}
          {unit && <span className="ml-1 text-base font-normal text-gray-400">{unit}</span>}
        </p>
        {changeBadge}
      </div>
    </div>
  );
}
