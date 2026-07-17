"use client";
import {
  FolderOpen,
  User,
  Users,
  ChartColumnBig,
  LucideIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import SubCard from "@/components/sub-card";
import Image from "next/image";
const Home = () => {
  const name = "Jasser Ben Jomaa";

  const dateText = (): string => {
    const now = new Date();
    const day = now.getDate();
    const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
    const year = now.getFullYear();
    return `${day}, ${weekday}, ${year}`;
  };
  interface CardData {
    linkTo: string;
    imageUrl: string;
    icon: LucideIcon;
    name: string;
    color: string;
    description: string;
    stats?: { done: number; inProgress: number; blocked: number };
  }
  const cards: CardData[] = [
    {
      linkTo: "/projects",
      imageUrl: "/campgemini_values/team_spirit.svg",
      icon: FolderOpen,
      name: "Projects",
      stats: { done: 12, inProgress: 4, blocked: 1 },
      color: "blue",
      description: "projects status",
    },
    {
      linkTo: "/people-manager",
      imageUrl: "/campgemini_values/boldness.svg",
      icon: User,
      name: "People Manager",
      stats: { done: 8, inProgress: 3, blocked: 2 },
      color: "orange",
      description: "manage people",
    },
    {
      linkTo: "/consaltants",
      imageUrl: "/campgemini_values/trust.svg",
      icon: Users,
      name: "Consultants",
      stats: { done: 5, inProgress: 2, blocked: 0 },
      color: "purple",
      description: "Tasks status",
    },
    {
      linkTo: "/kpi",
      imageUrl: "/campgemini_values/freedom.svg",
      icon: ChartColumnBig,
      name: "KPIs",
      stats: { done: 0, inProgress: 0, blocked: 0 },
      color: "green",
      description: "KPIs status",
    },
  ];
  return (
    <>
      <div className="min-h-80 md:min-h-0 flex-1 flex">
        {/* The Card container: light neutral surface, hairline border, indigo accent */}
        <Card className="w-full flex flex-col justify-center-safe pl-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 rounded-3xl relative overflow-hidden bg-white">
          {/* Faint indigo wash in the corner, kept subtle for a working surface */}
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-indigo-100/50 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-indigo-50/60 blur-3xl pointer-events-none" />

          <CardHeader className="p-0 relative z-10 flex flex-col gap-4 max-w-4xl">
            {/* 1. Eyebrow, simple and plain */}
            <div className="inline-flex items-center gap-2 w-fit">
              <span className="text-base md:text-xl font-semibold text-blue-600">
                Hello
              </span>
            </div>

            {/* 2. Name, high-contrast slate with indigo accent */}
            <CardTitle className="text-4xl md:text-5xl font-black tracking-tight">
              <span className="text-slate-900">{name}</span>
              <span className="text-blue-600">.</span>
            </CardTitle>

            {/* 3. Date text, monospace badge */}
            <div className="w-fit bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg shadow-sm mt-5">
              <span className="text-sm md:text-base font-mono text-slate-600">
                {dateText()}
              </span>
            </div>
          </CardHeader>
          <Image
            src="capgemini_symbol.svg"
            alt=""
            aria-hidden="true"
            height={280}
            width={280}
            className="absolute top-1/2 -translate-y-1/2 right-13 opacity-10 pointer-events-none select-none"
          />
        </Card>
      </div>

      <div className="min-h-112.5 md:min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
        {cards.map((card: CardData, index: number) => (
          <SubCard
            key={index}
            linkTo={card.linkTo}
            imageUrl={card.imageUrl}
            Icon={card.icon}
            name={card.name}
            color={card.color}
            description={card.description}
            stats={card.stats}
          />
        ))}
      </div>
    </>
  );
};

export default Home;
