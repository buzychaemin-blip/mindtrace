import { test, expect, type Page } from "@playwright/test";
async function open(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "나의 균형 시작하기", exact: true })
    .click();
}
async function nav(page: Page, name: string) {
  if (
    await page
      .getByRole("button", { name: "메뉴 열기", exact: true })
      .isVisible()
  )
    await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
  await page
    .getByRole("complementary")
    .getByRole("button", { name, exact: true })
    .click();
}
test("timer start, pause, restore, resume and single save", async ({
  page,
}) => {
  await open(page);
  await nav(page, "집중 타이머");
  await page.getByRole("button", { name: "시작", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "일시정지", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("timer-value")).not.toHaveText("00:00:00", {
    timeout: 5000,
  });
  await page.getByRole("button", { name: "일시정지", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "재개", exact: true }),
  ).toBeVisible();
  const paused = await page.getByTestId("timer-value").textContent();
  await page.reload();
  await nav(page, "집중 타이머");
  await expect(page.getByTestId("timer-value")).toHaveText(paused!);
  await page.getByRole("button", { name: "재개", exact: true }).click();
  await page.getByRole("button", { name: "종료 및 저장", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "시작", exact: true }),
  ).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mindtrace:v1:demo")!),
  );
  expect(state.sessions.filter((s: any) => s.source === "manual")).toHaveLength(
    1,
  );
  expect(state.active).toBeNull();
});
test("planner overnight create, edit, delete and tasks complete", async ({
  page,
}) => {
  await open(page);
  await nav(page, "10분 플래너");
  await page
    .getByRole("button", { name: "계획 추가", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("계획 이름").fill("자정 계획 테스트");
  await dialog.getByLabel("시작", { exact: true }).fill("23:50");
  await dialog.getByLabel("종료", { exact: true }).fill("00:10");
  await dialog.getByRole("button", { name: "저장하기" }).click();
  await expect(
    page.getByText("자정 계획 테스트", { exact: true }).last(),
  ).toBeVisible();
  await page.getByRole("button", { name: "자정 계획 테스트 수정" }).click();
  await page.getByRole("dialog").getByLabel("계획 이름").fill("수정한 계획");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "저장하기" })
    .click();
  await page.getByRole("button", { name: "수정한 계획 삭제" }).click();
  await expect(
    page.getByRole("button", { name: "수정한 계획 삭제" }),
  ).toHaveCount(0);
  await nav(page, "할 일 · D-Day");
  await page.getByRole("button", { name: "할 일 추가", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("할 일", { exact: true })
    .fill("완료 테스트");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "저장하기" })
    .click();
  await page
    .getByRole("button", { name: "완료 테스트 완료", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "완료 테스트 완료 취소", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("personal and demo isolation, usage to coach mission and deletion", async ({
  page,
}) => {
  await open(page);
  await nav(page, "설정 및 개인정보");
  await page
    .getByRole("button", { name: "개인 로컬 기록", exact: false })
    .click();
  await page
    .getByRole("button", { name: "나의 균형 시작하기", exact: true })
    .click();
  await nav(page, "마인드 코치");
  await expect(
    page.getByText("아직은 알아가는 중", { exact: true }),
  ).toBeVisible();
  await nav(page, "디지털 습관");
  await page
    .getByRole("button", { name: "사용 기록하기", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("앱 또는 활동").fill("SNS 테스트");
  await page.getByRole("dialog").getByLabel("사용 시간 (분)").fill("45");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "저장하기" })
    .click();
  await nav(page, "마인드 코치");
  await expect(
    page.getByText("한 번에 길어진 디지털 사용", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "작은 실천으로 담기", exact: true })
    .first()
    .click();
  await nav(page, "작은 실천");
  await page.getByRole("button", { name: "실천 완료", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "완료했어요 · 되돌리기" }),
  ).toBeVisible();
  await nav(page, "설정 및 개인정보");
  await page.getByRole("button", { name: "현재 모드 기록 삭제" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("확인을 위해 삭제를 입력해 주세요")
    .fill("삭제");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "기록 삭제", exact: true })
    .click();
  const state = await page.evaluate(() => ({
    personal: JSON.parse(localStorage.getItem("mindtrace:v1:personal")!),
    demo: JSON.parse(localStorage.getItem("mindtrace:v1:demo")!),
  }));
  expect(state.personal.usage).toHaveLength(0);
  expect(state.demo.usage.length).toBeGreaterThan(0);
});
test("all pages and mobile layout render without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await page.screenshot({ path: "docs/dashboard-desktop.png", fullPage: true });
  for (const name of [
    "집중 타이머",
    "10분 플래너",
    "할 일 · D-Day",
    "학습 통계",
    "디지털 습관",
    "마인드 코치",
    "작은 실천",
    "주간 리포트",
    "함께하는 공부",
    "설정 및 개인정보",
  ]) {
    await nav(page, name);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await nav(page, "오늘의 균형");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "docs/dashboard-mobile.png", fullPage: true });
  await nav(page, "10분 플래너");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("two tabs cannot start duplicate timers", async ({ page, context }) => {
  await open(page);
  const second = await context.newPage();
  await second.goto("/");
  await nav(page, "집중 타이머");
  await nav(second, "집중 타이머");
  await Promise.all([
    page.getByRole("button", { name: "시작", exact: true }).click(),
    second.getByRole("button", { name: "시작", exact: true }).click(),
  ]);
  const a = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mindtrace:v1:demo")!),
  );
  const b = await second.evaluate(() =>
    JSON.parse(localStorage.getItem("mindtrace:v1:demo")!),
  );
  expect(a.active.id).toBe(b.active.id);
  await expect(
    page.getByRole("button", { name: "종료 및 저장", exact: true }),
  ).toBeVisible();
});
test("pomodoro ends at configured duration while page time advances", async ({
  page,
}) => {
  await open(page);
  await page.clock.install();
  await nav(page, "집중 타이머");
  await page.getByRole("button", { name: "뽀모도로", exact: true }).click();
  await page.getByLabel("집중 (분)").fill("1");
  await page.getByRole("button", { name: "시작", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "일시정지", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(65000);
  await expect(page.getByTestId("timer-value")).toHaveText("00:00:00");
  await expect(
    page.getByRole("button", { name: "재개", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "휴식으로 전환", exact: true })
    .click();
  await expect(page.getByText("쉬는 중", { exact: true })).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mindtrace:v1:demo")!),
  );
  expect(
    state.sessions.filter((s: any) => s.source === "manual")[0].durationSec,
  ).toBe(60);
});
test("local group privacy, check-in, leave, theme and CSV download", async ({
  page,
}) => {
  await open(page);
  await nav(page, "함께하는 공부");
  await page
    .getByRole("button", { name: "가상 그룹 만들기", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("그룹 이름").fill("차분한 공부방");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "저장하기" })
    .click();
  await expect(page.getByText("차분한 공부방", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("내 공부 상태 공유 동의", { exact: false }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "자율 체크인", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "오늘 체크인 완료", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "나가기", exact: true }).click();
  await expect(page.getByText("차분한 공부방", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "화면 테마 변경", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await nav(page, "설정 및 개인정보");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "기록 CSV", exact: true }).click();
  expect((await dl).suggestedFilename()).toContain(".csv");
  await page.screenshot({ path: "docs/settings-dark.png", fullPage: true });
});
test("corrupt startup data is preserved until explicit deletion", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("mindtrace:mode", "personal");
    localStorage.setItem("mindtrace:v1:personal", '{"version":1,"usage":null}');
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "저장 데이터를 읽지 못했어요",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("mindtrace:v1:personal")),
  ).toBe('{"version":1,"usage":null}');
  await nav(page, "설정 및 개인정보");
  await page.getByRole("button", { name: "현재 모드 기록 삭제" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("확인을 위해 삭제를 입력해 주세요")
    .fill("삭제");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "기록 삭제", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("mindtrace:v1:personal")!).usage,
      ),
    )
    .toEqual([]);
});
