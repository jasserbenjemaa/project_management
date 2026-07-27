"use client";

import dynamic from "next/dynamic";

const SheetTable = dynamic(() => import("@/components/sheet/sheet-table"), {
  ssr: false,
});

const ProgressSheet = () => {
  return <SheetTable sheetId="sheet-1" />;
};

export default ProgressSheet;
