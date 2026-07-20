import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function issueDailyNumber(tx: Tx, series: "SP" | "DP", date: Date): Promise<string> {
  const stamp = date.toISOString().slice(2, 10).replaceAll("-", "");
  const key = `${series}-${stamp}`;
  const counter = await tx.runNumberCounter.upsert({
    where: { yearMonth: key },
    create: { yearMonth: key, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  if (counter.lastValue > 9999) throw new Error("Daily number capacity exceeded");
  return `${key}-${String(counter.lastValue).padStart(4, "0")}`;
}
