"use client";
import {
  ScrollText,
  FolderOpen,
  User,
  Users,
  ChartColumnBig,
  LucideIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import SubCard from "@/components/sub-card";
import Image from "next/image";
import { useUser } from "@/context/user-context";
import { Role } from "../generated/prisma/enums";
const Home = () => {
  const { name, role } = useUser();

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
    allowedRoles?: ("UNIT_MANAGER" | "ENGAGEMENT_MANAGER" | "CONSULTANT")[];
  }
  const allCards: CardData[] = [
    {
      linkTo: "/projects/history",
      imageUrl: "/campgemini_values/boldness.svg",
      icon: ScrollText,
      name: "Projects history",
      color: "red",
      description: "Track project history",
      allowedRoles: ["ENGAGEMENT_MANAGER", "CONSULTANT"],
    },
    {
      linkTo: "/projects",
      imageUrl: "/campgemini_values/team_spirit.svg",
      icon: FolderOpen,
      name: "Projects",
      color: "blue",
      description: "Track project status and progress",
    },
    {
      linkTo: "/engagement-manager",
      imageUrl: "/campgemini_values/boldness.svg",
      icon: User,
      name: "Engagement Managers",
      color: "orange",
      description: "Browse and manage engagement managers",
      allowedRoles: ["UNIT_MANAGER"],
    },
    {
      linkTo: "/consultant",
      imageUrl: "/campgemini_values/trust.svg",
      icon: Users,
      name: "Consultants",
      color: "purple",
      description: "Browse, add, and manage consultants",
      allowedRoles: ["UNIT_MANAGER"],
    },
    {
      linkTo: "/kpi",
      imageUrl: "/campgemini_values/freedom.svg",
      icon: ChartColumnBig,
      name: "KPIs",
      color: "green",
      description: "View performance metrics and KPIs",
    },
  ];
  const cards = allCards.filter(
    (card) => !card.allowedRoles || card.allowedRoles.includes(role as Role),
  );
  return (
    <>
      <div className=" flex-1 overflow-y-auto p-6 flex flex-col gap-6">
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
              alt="capgemini symbol"
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
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default Home;
