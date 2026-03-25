interface DateSeparatorProps {
  date: Date;
}

const DateSeparator = ({ date }: DateSeparatorProps) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  let label: string;
  if (isSameDay(date, today)) {
    label = "Today";
  } else if (isSameDay(date, yesterday)) {
    label = "Yesterday";
  } else {
    label = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="flex items-center justify-center py-3">
      <span className="px-3 py-1 rounded-md bg-secondary text-muted-foreground text-[11px] font-medium shadow-sm">
        {label}
      </span>
    </div>
  );
};

export default DateSeparator;
