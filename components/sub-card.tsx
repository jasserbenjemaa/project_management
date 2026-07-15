import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowRight, LucideIcon } from "lucide-react";

type AccentColor = "blue" | "purple" | "green" | "orange" | "rose";

// Tailwind needs full class strings at build time, so colors are mapped
// explicitly rather than built dynamically (e.g. `bg-${color}-100`).
const colorStyles: Record<
  AccentColor,
  { badgeBg: string; icon: string; hoverBg: string }
> = {
  blue: {
    badgeBg: "bg-blue-100",
    icon: "text-blue-600",
    hoverBg: "hover:bg-blue-100",
  },
  purple: {
    badgeBg: "bg-purple-100",
    icon: "text-purple-600",
    hoverBg: "hover:bg-purple-100",
  },
  green: {
    badgeBg: "bg-green-100",
    icon: "text-green-600",
    hoverBg: "hover:bg-green-100",
  },
  orange: {
    badgeBg: "bg-orange-100",
    icon: "text-orange-600",
    hoverBg: "hover:bg-orange-100",
  },
  rose: {
    badgeBg: "bg-rose-100",
    icon: "text-rose-600",
    hoverBg: "hover:bg-rose-100",
  },
};

const SubCard = (props: {
  linkTo: string;
  imageUrl: string;
  Icon: LucideIcon;
  name: string;
  color: AccentColor;
  stats?: { done: number; inProgress: number; blocked: number };
  description: string;
}) => {
  const {
    linkTo,
    imageUrl,
    Icon,
    name,
    color = "blue",
    stats = { done: 0, inProgress: 0, blocked: 0 },
    description,
  } = props;

  const styles = colorStyles[color];

  return (
    <Card
      className="relative flex flex-col  shadow-sm hover:cursor-pointer overflow-hidden p-10"
      onClick={() => redirect(linkTo)}
    >
      <Image
        src={imageUrl}
        alt=""
        aria-hidden="true"
        height={280}
        width={280}
        className="absolute bottom-0 right-0 translate-x-[30%] translate-y-[-20%] opacity-10 pointer-events-none select-none"
      />

      <div
        className={`absolute  top-10 left-10 -translate-x-1/2 -translate-y-1/2 inline-flex w-fit p-2 rounded-xl ${styles.badgeBg}`}
      >
        <Icon className={`h-5 w-5 ${styles.icon}`} />
      </div>

      <CardHeader className="absolute top-20 left-1  w-full">
        <CardTitle className="text-2xl font-bold">{name}</CardTitle>
      </CardHeader>

      <CardContent className="absolute top-30 left-1  w-full text-sm text-muted-foreground">
        {description}
      </CardContent>

      <button
        type="button"
        aria-label={`Go to ${name}`}
        onClick={(e) => {
          e.stopPropagation();
          redirect(linkTo);
        }}
        className={` absolute bottom-5 right-5 self-end flex items-center justify-center h-9 w-9 rounded-full text-slate-500 transition-colors ${styles.hoverBg} hover:text-slate-900`}
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </Card>
  );
};

export default SubCard;
