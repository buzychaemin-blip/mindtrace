export type Source = "demo" | "manual";
export type Subject = {
  id: string;
  name: string;
  color: string;
  archived?: boolean;
};
export type Segment = { start: number; end: number };
export type ActiveTimer = {
  id: string;
  subjectId: string;
  mode: "stopwatch" | "pomodoro";
  phase: "study" | "rest";
  startedAt: number;
  runningSince: number | null;
  segments: Segment[];
  focusMinutes: number;
  restMinutes: number;
};
export type StudySession = {
  id: string;
  subjectId: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  segments: Segment[];
  mode: string;
  kind: "study" | "rest";
  source: Source;
};
export type Task = {
  id: string;
  title: string;
  subjectId: string;
  day: string;
  priority: "높음" | "보통" | "낮음";
  done: boolean;
  source: Source;
};
export type Block = {
  id: string;
  title: string;
  subjectId: string;
  start: number;
  end: number;
  source: Source;
};
export type Usage = {
  id: string;
  app: string;
  at: number;
  minutes: number;
  reason: string;
  source: Source;
};
export type Mission = {
  id: string;
  title: string;
  reason: string;
  status: "suggested" | "accepted" | "done" | "dismissed";
  source: Source;
};
export type Routine = {
  day: string;
  restCount: number | null;
  sleepMet: boolean | null;
};
export type Event = { id: string; title: string; day: string };
export type Group = {
  id: string;
  name: string;
  code: string;
  goal: number;
  checkedInDay: string | null;
  share: boolean;
};
export type AppData = {
  version: 1;
  revision: number;
  profile: {
    nickname: string;
    goal: number;
    sleepTime: string;
    onboarded: boolean;
  };
  subjects: Subject[];
  sessions: StudySession[];
  active: ActiveTimer | null;
  tasks: Task[];
  blocks: Block[];
  usage: Usage[];
  missions: Mission[];
  routines: Routine[];
  events: Event[];
  groups: Group[];
  preferences: {
    dark: boolean;
    reminders: boolean;
    research: boolean;
    sharing: boolean;
  };
};
export const uid = () => crypto.randomUUID();
export const dayKey = (n: number | Date = Date.now()) => {
  const d = new Date(n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};
export const atTime = (day: string, time: string) =>
  new Date(`${day}T${time}:00`).getTime();
export const secondsText = (s: number) =>
  `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const minutesText = (m: number) =>
  m >= 60
    ? `${Math.floor(m / 60)}시간 ${Math.round(m % 60)}분`
    : `${Math.round(m)}분`;
export function assertText(value: string, label: string, max = 80) {
  const v = value.trim();
  if (!v || v.length > max)
    throw new Error(`${label}은(는) 1~${max}자로 입력해 주세요.`);
  return v;
}
export function assertNumber(
  value: number,
  min: number,
  max: number,
  label: string,
) {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error(`${label}은(는) ${min}~${max} 범위로 입력해 주세요.`);
  return value;
}
export function makeEmpty(): AppData {
  return {
    version: 1,
    revision: 0,
    profile: {
      nickname: "나",
      goal: 180,
      sleepTime: "23:00",
      onboarded: false,
    },
    subjects: [
      { id: "math", name: "수학", color: "#619e89" },
      { id: "english", name: "영어", color: "#b7a1d8" },
      { id: "science", name: "과학", color: "#e9b775" },
    ],
    sessions: [],
    active: null,
    tasks: [],
    blocks: [],
    usage: [],
    missions: [],
    routines: [],
    events: [],
    groups: [],
    preferences: {
      dark: false,
      reminders: false,
      research: false,
      sharing: false,
    },
  };
}
export function makeDemo(now = Date.now()): AppData {
  const d = makeEmpty(),
    today = dayKey(now);
  d.profile.nickname = "하루";
  for (let i = 13; i >= 0; i--) {
    const day = addDays(today, -i);
    const mins = i > 6 ? 140 + ((i * 11) % 65) : 175 + ((i * 13) % 65);
    ["math", "english", "science"].forEach((subjectId, j) => {
      const start = atTime(day, `${String(8 + j * 2).padStart(2, "0")}:00`);
      const durationSec = Math.round(mins * [0.44, 0.33, 0.23][j]) * 60;
      d.sessions.push({
        id: `demo-s-${i}-${j}`,
        subjectId,
        startedAt: start,
        endedAt: start + durationSec * 1000,
        durationSec,
        segments: [{ start, end: start + durationSec * 1000 }],
        mode: "stopwatch",
        kind: "study",
        source: "demo",
      });
    });
    const count = i > 6 ? 4 : 2;
    for (let j = 0; j < count; j++)
      d.usage.push({
        id: `demo-u-${i}-${j}`,
        app: j % 2 ? "동영상" : "SNS",
        at: atTime(day, `${17 + j}:20`),
        minutes: i > 6 ? 16 + j * 3 : 10 + j * 2,
        reason: j % 2 ? "습관적으로" : "심심해서",
        source: "demo",
      });
    d.routines.push({ day, restCount: 3 + (i % 2), sleepMet: i % 4 !== 0 });
  }
  d.tasks = [
    {
      id: "demo-t1",
      title: "수학 오답노트 정리",
      subjectId: "math",
      day: today,
      priority: "높음",
      done: false,
      source: "demo",
    },
    {
      id: "demo-t2",
      title: "영어 단어 30개 복습",
      subjectId: "english",
      day: today,
      priority: "보통",
      done: true,
      source: "demo",
    },
    {
      id: "demo-t3",
      title: "과학 탐구 보고서 개요",
      subjectId: "science",
      day: today,
      priority: "보통",
      done: false,
      source: "demo",
    },
  ];
  d.blocks = [
    {
      id: "demo-b1",
      title: "함수 개념 복습",
      subjectId: "math",
      start: atTime(today, "16:00"),
      end: atTime(today, "16:50"),
      source: "demo",
    },
    {
      id: "demo-b2",
      title: "영어 지문 읽기",
      subjectId: "english",
      start: atTime(today, "17:10"),
      end: atTime(today, "17:40"),
      source: "demo",
    },
  ];
  d.events = [{ id: "demo-e1", title: "중간고사", day: addDays(today, 18) }];
  return d;
}
export function timerElapsed(t: ActiveTimer, now = Date.now()) {
  const elapsed = Math.floor(
    (t.segments.reduce((s, v) => s + Math.max(0, v.end - v.start), 0) +
      (t.runningSince === null ? 0 : Math.max(0, now - t.runningSince))) /
      1000,
  );
  return t.mode === "pomodoro"
    ? Math.min(
        elapsed,
        (t.phase === "study" ? t.focusMinutes : t.restMinutes) * 60,
      )
    : elapsed;
}
export function startTimer(
  d: AppData,
  subjectId: string,
  mode: "stopwatch" | "pomodoro",
  focusMinutes = 25,
  restMinutes = 5,
  now = Date.now(),
) {
  if (d.active)
    throw new Error("이미 진행 중인 타이머가 있어요. 먼저 종료해 주세요.");
  if (!d.subjects.some((s) => s.id === subjectId && !s.archived))
    throw new Error("공부할 과목을 선택해 주세요.");
  assertNumber(focusMinutes, 1, 120, "집중 시간");
  assertNumber(restMinutes, 1, 60, "휴식 시간");
  d.active = {
    id: uid(),
    subjectId,
    mode,
    phase: "study",
    startedAt: now,
    runningSince: now,
    segments: [],
    focusMinutes,
    restMinutes,
  };
}
export function pauseTimer(d: AppData, now = Date.now()) {
  const t = d.active;
  if (!t || t.runningSince === null) return;
  if (now < t.runningSince)
    throw new Error("기기 시각이 이전으로 변경됐어요. 시계를 확인해 주세요.");
  let end = now;
  if (t.mode === "pomodoro") {
    const recorded = t.segments.reduce((s, p) => s + p.end - p.start, 0);
    const limit =
      (t.phase === "study" ? t.focusMinutes : t.restMinutes) * 60000;
    end = Math.min(now, t.runningSince + Math.max(0, limit - recorded));
  }
  t.segments.push({ start: t.runningSince, end });
  t.runningSince = null;
}
export function resumeTimer(d: AppData, now = Date.now()) {
  const t = d.active;
  if (!t || t.runningSince !== null) return;
  if (
    t.mode === "pomodoro" &&
    timerElapsed(t, now) >=
      (t.phase === "study" ? t.focusMinutes : t.restMinutes) * 60
  )
    throw new Error(
      "정한 시간이 끝났어요. 다음 단계로 전환하거나 종료해 주세요.",
    );
  const last = t.segments.at(-1)?.end ?? t.startedAt;
  if (now < last) throw new Error("기기 시각을 확인해 주세요.");
  t.runningSince = now;
}
export function finishTimer(d: AppData, source: Source, now = Date.now()) {
  const t = d.active;
  if (!t) return;
  pauseTimer(d, now);
  const sec = timerElapsed(t, now);
  if (!d.sessions.some((s) => s.id === t.id) && sec > 0)
    d.sessions.push({
      id: t.id,
      subjectId: t.subjectId,
      startedAt: t.startedAt,
      endedAt: now,
      durationSec: sec,
      segments: structuredClone(t.segments),
      mode: t.mode,
      kind: t.phase,
      source,
    });
  d.active = null;
}
export function switchPhase(d: AppData, source: Source, now = Date.now()) {
  const t = d.active;
  if (!t || t.mode !== "pomodoro")
    throw new Error("뽀모도로 타이머를 먼저 시작해 주세요.");
  const next = t.phase === "study" ? "rest" : "study";
  const old = structuredClone(t);
  finishTimer(d, source, now);
  d.active = {
    ...old,
    id: uid(),
    phase: next,
    startedAt: now,
    runningSince: now,
    segments: [],
  };
}
export function saveSubject(d: AppData, input: Subject) {
  const name = assertText(input.name, "과목 이름", 20);
  if (!/^#[0-9a-f]{6}$/i.test(input.color))
    throw new Error("과목 색상을 확인해 주세요.");
  const idx = d.subjects.findIndex((s) => s.id === input.id);
  const s = { ...input, name };
  if (idx < 0) d.subjects.push(s);
  else d.subjects[idx] = s;
}
export function removeSubject(d: AppData, id: string) {
  if (d.active?.subjectId === id)
    throw new Error("진행 중인 과목은 종료 후 삭제할 수 있어요.");
  const s = d.subjects.find((s) => s.id === id);
  if (s) s.archived = true;
}
export function saveBlock(d: AppData, input: Block) {
  assertText(input.title, "계획 이름");
  if (
    !Number.isFinite(input.start) ||
    !Number.isFinite(input.end) ||
    input.end <= input.start ||
    input.end - input.start > 86400000
  )
    throw new Error("계획은 10분 이상 24시간 이내로 설정해 주세요.");
  if (
    (input.end - input.start) % 600000 !== 0 ||
    new Date(input.start).getMinutes() % 10 !== 0
  )
    throw new Error("계획은 10분 단위로 입력해 주세요.");
  if (!d.subjects.some((s) => s.id === input.subjectId && !s.archived))
    throw new Error("과목을 선택해 주세요.");
  if (
    d.blocks.some(
      (b) => b.id !== input.id && input.start < b.end && input.end > b.start,
    )
  )
    throw new Error("이미 등록한 계획과 시간이 겹쳐요.");
  const idx = d.blocks.findIndex((x) => x.id === input.id);
  if (idx < 0) d.blocks.push(input);
  else d.blocks[idx] = input;
}
export function blockFromTimes(day: string, start: string, end: string) {
  const s = atTime(day, start);
  let e = atTime(day, end);
  if (e <= s) e = atTime(addDays(day, 1), end);
  return { start: s, end: e };
}
export function saveUsage(d: AppData, u: Usage) {
  u.app = assertText(u.app, "앱/활동 이름", 30);
  assertNumber(u.minutes, 1, 720, "사용 시간");
  if (!Number.isFinite(u.at) || u.at > Date.now() + 60000)
    throw new Error("미래 사용 기록은 입력할 수 없어요.");
  if (
    ![
      "심심해서",
      "습관적으로",
      "알림 때문에",
      "불안해서",
      "목적 있는 사용",
      "기타",
    ].includes(u.reason)
  )
    throw new Error("사용 이유를 선택해 주세요.");
  const idx = d.usage.findIndex((x) => x.id === u.id);
  if (idx < 0) d.usage.push(u);
  else d.usage[idx] = u;
}
export function sessionMinutesOn(s: StudySession, day: string) {
  const start = atTime(day, "00:00"),
    end = atTime(addDays(day, 1), "00:00");
  return (
    s.segments.reduce(
      (n, p) =>
        n + Math.max(0, Math.min(p.end, end) - Math.max(p.start, start)),
      0,
    ) / 60000
  );
}
export function dailyStudy(d: AppData, day: string, subjectId?: string) {
  return d.sessions
    .filter(
      (s) => s.kind === "study" && (!subjectId || s.subjectId === subjectId),
    )
    .reduce((n, s) => n + sessionMinutesOn(s, day), 0);
}
export function daysEnding(day: string, count: number) {
  return Array.from({ length: count }, (_, i) => addDays(day, i - count + 1));
}
export function metrics(d: AppData, days: string[]) {
  const set = new Set(days);
  const use = d.usage.filter((u) => set.has(dayKey(u.at)));
  const unplanned = use.filter(
    (u) => u.reason !== "目的" && u.reason !== "목적 있는 사용",
  );
  const tasks = d.tasks.filter((t) => set.has(t.day));
  const routines = d.routines.filter((r) => set.has(r.day));
  return {
    study: days.reduce((s, day) => s + dailyStudy(d, day), 0),
    usage: use.reduce((s, u) => s + u.minutes, 0),
    unplanned: unplanned.length,
    unplannedMinutes: unplanned.reduce((s, u) => s + u.minutes, 0),
    tasks: tasks.length,
    done: tasks.filter((t) => t.done).length,
    rests: routines.reduce((s, r) => s + (r.restCount ?? 0), 0),
    sleep: routines.filter((r) => r.sleepMet !== null),
    entries: use,
  };
}
export type ScorePart = {
  label: string;
  value: number;
  weight: number;
  basis: string;
};
export function wellbeing(d: AppData, today = dayKey()) {
  const current = metrics(d, daysEnding(today, 7)),
    previous = metrics(d, daysEnding(addDays(today, -7), 7));
  const parts: ScorePart[] = [];
  if (current.entries.length && previous.entries.length) {
    const ratio =
      previous.unplannedMinutes > 0
        ? current.unplannedMinutes / previous.unplannedMinutes
        : current.unplannedMinutes === 0
          ? 0
          : 2;
    parts.push({
      label: "무목적 사용 변화",
      value: Math.max(0, Math.min(100, 100 - ratio * 50)),
      weight: 0.35,
      basis: `이전 7일 ${previous.unplannedMinutes}분 → 최근 7일 ${current.unplannedMinutes}분`,
    });
  }
  const reported = d.routines.filter(
    (r) => daysEnding(today, 7).includes(r.day) && r.restCount !== null,
  );
  if (reported.length)
    parts.push({
      label: "휴식 실천",
      value:
        (reported.reduce((s, r) => s + Math.min(1, (r.restCount ?? 0) / 3), 0) /
          reported.length) *
        100,
      weight: 0.25,
      basis: `기록한 ${reported.length}일 / 하루 3회 기준`,
    });
  if (current.tasks)
    parts.push({
      label: "내 계획 실천",
      value: (current.done / current.tasks) * 100,
      weight: 0.2,
      basis: `할 일 ${current.tasks}개 중 ${current.done}개 완료`,
    });
  if (current.sleep.length)
    parts.push({
      label: "취침 목표 실천",
      value:
        (current.sleep.filter((r) => r.sleepMet).length /
          current.sleep.length) *
        100,
      weight: 0.2,
      basis: `자기보고 ${current.sleep.length}일`,
    });
  const weight = parts.reduce((s, p) => s + p.weight, 0);
  return {
    score: weight
      ? Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0) / weight)
      : null,
    coverage: Math.round(weight * 100),
    parts,
    version: "rule-v1.0",
    current,
    previous,
  };
}
export type Insight = {
  id: string;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  confidence: string;
};
export function insights(d: AppData, today = dayKey()): Insight[] {
  const m = metrics(d, daysEnding(today, 7)),
    out: Insight[] = [];
  const evening = m.entries.filter(
    (u) => new Date(u.at).getHours() >= 18 && u.reason !== "목적 있는 사용",
  );
  if (evening.length >= 3)
    out.push({
      id: "evening",
      title: "저녁에 손이 가는 스마트폰",
      description: "쉬고 싶을 때 스마트폰 대신 다른 짧은 휴식을 골라 보세요.",
      evidence: `최근 7일 18시 이후 무목적 사용 ${evening.length}회, ${evening.reduce((n, u) => n + u.minutes, 0)}분`,
      recommendation: "저녁에 스마트폰 없이 10분 산책하기",
      confidence: "직접 입력한 기록에 기반한 패턴",
    });
  const long = m.entries.filter((u) => u.minutes >= 30);
  if (long.length)
    out.push({
      id: "long-use",
      title: "한 번에 길어진 디지털 사용",
      description: "다음에는 시작 전에 끝낼 시간을 정해 보는 건 어때요?",
      evidence: `30분 이상 사용 기록 ${long.length}회`,
      recommendation: "디지털 사용 전 15분 종료 알림 정하기",
      confidence: "자기보고 사용 시간 기준",
    });
  const longStudy = d.sessions.filter(
    (s) =>
      s.kind === "study" &&
      daysEnding(today, 7).includes(dayKey(s.startedAt)) &&
      s.durationSec >= 3000,
  );
  if (longStudy.length)
    out.push({
      id: "rest",
      title: "집중한 만큼, 쉬는 시간도",
      description: "긴 공부 뒤에는 몸을 움직이는 짧은 휴식을 권해요.",
      evidence: `최근 7일 50분 이상 공부 세션 ${longStudy.length}개. 중간 휴식 여부는 이 자료만으로 판단하지 않아요.`,
      recommendation: "다음 공부 뒤 5분 스트레칭하기",
      confidence: "기록한 공부 시간 기준",
    });
  if (!out.length && m.entries.length)
    out.push({
      id: "observe",
      title: "내 습관을 알아가는 중이에요",
      description: "지금 기록만으로 특정 패턴을 단정하지 않아요.",
      evidence: `최근 7일 사용 기록 ${m.entries.length}개`,
      recommendation: "오늘 한 번 사용 이유를 적어보기",
      confidence: "기록이 쌓이면 다시 분석해요",
    });
  return out;
}
export function validateData(value: unknown): AppData {
  if (!value || typeof value !== "object")
    throw new Error("저장 데이터 형식을 읽을 수 없어요.");
  const d = value as AppData;
  if (
    d.version !== 1 ||
    !d.profile ||
    typeof d.profile.nickname !== "string" ||
    !d.preferences
  )
    throw new Error("지원하지 않는 저장 데이터예요.");
  for (const key of [
    "subjects",
    "sessions",
    "tasks",
    "blocks",
    "usage",
    "missions",
    "routines",
    "events",
    "groups",
  ] as const)
    if (!Array.isArray(d[key]) || d[key].length > 50000)
      throw new Error("저장 데이터 항목이 누락됐거나 너무 커요.");
  if (!Number.isInteger(d.revision) || d.revision < 0)
    throw new Error("저장 버전을 확인해 주세요.");
  const text = (v: unknown, max = 200) =>
    typeof v === "string" && v.length > 0 && v.length <= max;
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0;
  const date = (v: unknown) =>
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(new Date(`${v}T12:00:00`).getTime());
  const origin = (v: unknown) => v === "manual" || v === "demo";
  const segments = (v: unknown) =>
    Array.isArray(v) &&
    v.length <= 50000 &&
    v.every((p) => p && num(p.start) && num(p.end) && p.end >= p.start);
  const fail = () => {
    throw new Error(
      "저장 데이터에 올바르지 않은 값이 있어요. 원본은 덮어쓰지 않습니다.",
    );
  };
  if (
    !text(d.profile.nickname, 16) ||
    !num(d.profile.goal) ||
    d.profile.goal < 10 ||
    d.profile.goal > 720 ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.profile.sleepTime) ||
    typeof d.profile.onboarded !== "boolean"
  )
    fail();
  if (
    !Object.values(d.preferences).every((v) => typeof v === "boolean") ||
    !["dark", "reminders", "research", "sharing"].every(
      (k) => k in d.preferences,
    )
  )
    fail();
  if (
    !d.subjects.every(
      (s) =>
        s &&
        text(s.id) &&
        text(s.name, 20) &&
        /^#[0-9a-f]{6}$/i.test(s.color) &&
        (s.archived === undefined || typeof s.archived === "boolean"),
    )
  )
    fail();
  if (
    !d.sessions.every(
      (s) =>
        s &&
        text(s.id) &&
        text(s.subjectId) &&
        num(s.startedAt) &&
        num(s.endedAt) &&
        s.endedAt >= s.startedAt &&
        num(s.durationSec) &&
        segments(s.segments) &&
        origin(s.source) &&
        ["study", "rest"].includes(s.kind) &&
        ["stopwatch", "pomodoro"].includes(s.mode),
    )
  )
    fail();
  if (d.active) {
    const t = d.active;
    if (
      !text(t.id) ||
      !text(t.subjectId) ||
      !num(t.startedAt) ||
      !(t.runningSince === null || num(t.runningSince)) ||
      !segments(t.segments) ||
      !["study", "rest"].includes(t.phase) ||
      !["stopwatch", "pomodoro"].includes(t.mode) ||
      !num(t.focusMinutes) ||
      t.focusMinutes < 1 ||
      t.focusMinutes > 120 ||
      !num(t.restMinutes) ||
      t.restMinutes < 1 ||
      t.restMinutes > 60
    )
      fail();
  } else if (d.active !== null) fail();
  if (
    !d.tasks.every(
      (t) =>
        t &&
        text(t.id) &&
        text(t.title, 80) &&
        text(t.subjectId) &&
        date(t.day) &&
        typeof t.done === "boolean" &&
        ["높음", "보통", "낮음"].includes(t.priority) &&
        origin(t.source),
    )
  )
    fail();
  if (
    !d.blocks.every(
      (b) =>
        b &&
        text(b.id) &&
        text(b.title, 80) &&
        text(b.subjectId) &&
        num(b.start) &&
        num(b.end) &&
        b.end > b.start &&
        origin(b.source),
    )
  )
    fail();
  if (
    !d.usage.every(
      (u) =>
        u &&
        text(u.id) &&
        text(u.app, 30) &&
        num(u.at) &&
        num(u.minutes) &&
        u.minutes >= 1 &&
        u.minutes <= 720 &&
        text(u.reason) &&
        origin(u.source),
    )
  )
    fail();
  if (
    !d.missions.every(
      (m) =>
        m &&
        text(m.id) &&
        text(m.title, 80) &&
        text(m.reason, 500) &&
        origin(m.source) &&
        ["suggested", "accepted", "done", "dismissed"].includes(m.status),
    )
  )
    fail();
  if (
    !d.routines.every(
      (r) =>
        r &&
        date(r.day) &&
        (r.restCount === null || num(r.restCount)) &&
        (r.sleepMet === null || typeof r.sleepMet === "boolean"),
    )
  )
    fail();
  if (
    !d.events.every((e) => e && text(e.id) && text(e.title, 80) && date(e.day))
  )
    fail();
  if (
    !d.groups.every(
      (g) =>
        g &&
        text(g.id) &&
        text(g.name, 30) &&
        text(g.code, 30) &&
        num(g.goal) &&
        g.goal > 0 &&
        typeof g.share === "boolean" &&
        (g.checkedInDay === null || date(g.checkedInDay)),
    )
  )
    fail();
  return d;
}
function csvRows(rows: unknown[][]) {
  const safe = (s: unknown) => {
    let v = String(s ?? "");
    if (/^[=+@\-\t\r]/.test(v)) v = "'" + v;
    return '"' + v.replaceAll('"', '""') + '"';
  };
  return "\uFEFF" + rows.map((r) => r.map(safe).join(",")).join("\r\n");
}
export function csvExport(d: AppData) {
  const rows: unknown[][] = [["유형", "일시", "항목", "분", "출처"]];
  d.sessions.forEach((s) =>
    rows.push([
      "공부 기록",
      new Date(s.startedAt).toISOString(),
      d.subjects.find((x) => x.id === s.subjectId)?.name ?? "보관된 과목",
      Math.round(s.durationSec / 60),
      s.source,
    ]),
  );
  d.usage.forEach((u) =>
    rows.push([
      "사용 기록",
      new Date(u.at).toISOString(),
      `${u.app} / ${u.reason}`,
      u.minutes,
      u.source,
    ]),
  );
  return csvRows(rows);
}
export function weeklyCsv(d: AppData, today = dayKey()) {
  const w = wellbeing(d, today);
  const rows: unknown[][] = [
    ["MindTrace 주간 리포트", addDays(today, -6), today],
    ["계산 버전", w.version],
    ["자료 출처", "demo=가상 예시 / manual=직접 입력"],
    ["주의", "자기보고 자료 비교이며 효과나 인과관계를 입증하지 않음"],
    [],
    ["지표", "최근 7일", "이전 7일", "단위"],
    [
      "공부 시간",
      Math.round(w.current.study),
      Math.round(w.previous.study),
      "분",
    ],
    [
      "무목적 사용 시간",
      w.current.unplannedMinutes,
      w.previous.unplannedMinutes,
      "분",
    ],
    ["무목적 사용 기록", w.current.unplanned, w.previous.unplanned, "회"],
    ["휴식 자기보고", w.current.rests, w.previous.rests, "회"],
    ["웰빙 참고 점수", w.score ?? "자료 없음", "", "100점 기준"],
    ["측정 범위", w.coverage, "", "%"],
    [],
    ["날짜", "공부 시간(분)", "사용 기록 시간(분)", "자료 출처"],
  ];
  daysEnding(today, 14).forEach((day) => {
    const m = metrics(d, [day]);
    const sources = [
      ...new Set([
        ...d.sessions
          .filter((s) => sessionMinutesOn(s, day) > 0)
          .map((s) => s.source),
        ...m.entries.map((u) => u.source),
      ]),
    ].join("/");
    rows.push([day, Math.round(m.study), m.usage, sources || "기록 없음"]);
  });
  return csvRows(rows);
}
