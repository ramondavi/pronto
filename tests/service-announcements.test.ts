import assert from "node:assert/strict";
import test from "node:test";
import { isCurrentServiceAnnouncement } from "../src/lib/service-announcements.ts";

test("feriados e pontos facultativos só afetam o atendimento na própria data", () => {
  assert.equal(
    isCurrentServiceAnnouncement(
      { type: "optional_day", starts_at: "2026-06-05T03:00:00.000Z", ends_at: null },
      "2026-09-04T15:00:00.000Z",
    ),
    false,
  );
  assert.equal(
    isCurrentServiceAnnouncement(
      { type: "holiday", starts_at: "2026-09-07T03:00:00.000Z", ends_at: null },
      "2026-09-07T15:00:00.000Z",
    ),
    true,
  );
});

test("recessos e paralisações continuam ativos até a data final", () => {
  assert.equal(
    isCurrentServiceAnnouncement(
      { type: "recess", starts_at: "2026-08-01T03:00:00.000Z", ends_at: null },
      "2026-09-04T15:00:00.000Z",
    ),
    true,
  );
  assert.equal(
    isCurrentServiceAnnouncement(
      { type: "strike", starts_at: "2026-08-01T03:00:00.000Z", ends_at: "2026-09-03T23:59:59.999Z" },
      "2026-09-04T15:00:00.000Z",
    ),
    false,
  );
});
