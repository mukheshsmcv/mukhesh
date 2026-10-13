import { describe, it, expect } from "vitest";
import { buildSchedule } from "@/lib/schedule";

describe("schedule", () => {
  const rows = buildSchedule();
  const on = (d: string) => rows.find((r) => r.date === d)!;
  it("has 205 unique consecutive rows", () => {
    expect(rows.length).toBe(205);
    expect(new Set(rows.map((r) => r.id)).size).toBe(205);
    expect(rows[0].date).toBe("2026-10-12");
    expect(rows[204].date).toBe("2027-05-04");
  });
  it("phase boundaries", () => {
    expect(on("2026-10-19").label).toBe("OBG 8/8");
    expect(on("2026-10-20").phase).toBe("Exam Prep");
    expect(on("2026-11-01").phase).toBe("Exam Prep");
    expect(on("2026-11-02").label).toBe("Anatomy 1/7");
    expect(on("2027-01-24").label).toBe("GT 4");
    expect(on("2027-01-25").phase).toBe("Revision 1");
    expect(on("2027-03-09").label).toBe("GT 8");
    expect(on("2027-03-10").phase).toBe("Revision 2");
    expect(on("2027-04-10").label).toBe("GT 12");
    expect(on("2027-04-11").phase).toBe("Revision 3");
    expect(on("2027-05-04").label).toBe("GT 16");
  });
  it("counts", () => {
    const c = (p: string) => rows.filter((r) => r.phase === p && r.gt === null).length;
    expect(rows.filter((r) => r.gt !== null).map((r) => r.gt)).toEqual([...Array(16)].map((_, i) => i + 1));
    expect([c("OBG"), c("Exam Prep"), c("First Pass"), c("Revision 1"), c("Revision 2"), c("Revision 3")]).toEqual([8, 13, 80, 40, 28, 20]);
    expect(rows.every((r) => !r.completed && r.hours === 0 && r.attempted === 0)).toBe(true);
  });
});
