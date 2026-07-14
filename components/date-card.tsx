import { useState } from "react";
const DateCard = () => {
  const [dateText] = useState(() => {
    const now = new Date();
    const day = now.getDate();
    const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
    const year = now.getFullYear();
    return `${day}, ${weekday}, ${year}`;
  });
  return (
    <div className="w-fit bg-white/70 border border-slate-100 px-4 py-2 rounded-xl shadow-sm backdrop-blur-md mt-5">
      <span className="text-sm md:text-base font-semibold bg-linear-to-bl from-sky-500 to-blue-700 bg-clip-text text-transparent">
        {dateText}
      </span>
    </div>
  );
};
export default DateCard;
