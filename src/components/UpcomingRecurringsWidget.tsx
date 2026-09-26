// Fase 1.1 — Widget "Próximas N semanas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownCircle, ArrowUpCircle, CalendarRange } from "lucide-react";
import { brl, formatDateBR } from "@/lib/format";
import { upcomingOccurrences } from "@/store/projection";
import type { Category, Recurring } from "@/store/types";
import { useI18n } from "@/i18n/I18nProvider";

export function UpcomingRecurringsWidget({
  recurrings,
  categories,
  weeks = 4,
}: {
  recurrings: Recurring[];
  categories: Category[];
  weeks?: number;
}) {
  const { t } = useI18n();
  const items = upcomingOccurrences(recurrings, weeks).slice(0, 12);

  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)]">
      <CardHeader className="px-4 pb-3 sm:px-6">
        <CardTitle className="flex min-w-0 items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4 shrink-0 text-primary" />
          {t("upcoming.title", { n: weeks })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("upcoming.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {items.map((item, i) => {
              const cat = categories.find((c) => c.id === item.categoryId);
              const isIncome = item.type === "entrada";
              return (
                <li
                  key={`${item.recurringId}-${item.date}-${i}`}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-2.5 sm:gap-3"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      isIncome ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {isIncome ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.description}</p>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground sm:gap-2">
                      <span className="shrink-0">{formatDateBR(item.date)}</span>
                      {cat && (
                        <Badge variant="outline" className="min-w-0 gap-1 px-1.5 py-0 text-[10px]">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.color }} />
                          <span className="max-w-[100px] truncate">{cat.name}</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p
                    className={`max-w-[7.5rem] shrink-0 text-right text-xs font-semibold tabular-nums sm:max-w-none sm:text-sm ${
                      isIncome ? "text-success" : "text-destructive"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {brl(item.amount)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
