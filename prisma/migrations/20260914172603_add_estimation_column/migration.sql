-- CreateTable
CREATE TABLE "SheetStatusChange" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "colId" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,
    "changedByName" TEXT NOT NULL,
    "complexityAtChange" TEXT,
    "authorLLRAtChange" TEXT,
    "authorLLTAtChange" TEXT,
    "functionNameAtChange" TEXT,

    CONSTRAINT "SheetStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SheetStatusChange_sheetId_rowId_idx" ON "SheetStatusChange"("sheetId", "rowId");

-- CreateIndex
CREATE INDEX "SheetStatusChange_authorLLTAtChange_idx" ON "SheetStatusChange"("authorLLTAtChange");

-- AddForeignKey
ALTER TABLE "SheetStatusChange" ADD CONSTRAINT "SheetStatusChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SheetStatusChange" ADD CONSTRAINT "SheetStatusChange_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "Sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
