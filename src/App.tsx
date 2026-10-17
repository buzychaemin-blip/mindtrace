import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Flower2,
  Focus,
  Home,
  Leaf,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  Pause,
  Pencil,
  Play,
  Plus,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Square,
  Sun,
  Timer,
  Trash2,
  TrendingUp,
  Users,
  Wind,
  X,
} from "lucide-react";
import { useStore } from "./store";
import {
  addDays,
  assertNumber,
  assertText,
  atTime,
  blockFromTimes,
  csvExport,
  dailyStudy,
  dayKey,
  daysEnding,
  finishTimer,
  insights,
  metrics,
  minutesText,
  pauseTimer,
  removeSubject,
  resumeTimer,
  saveBlock,
  saveSubject,
  saveUsage,
  secondsText,
  startTimer,
  switchPhase,
  timerElapsed,
  uid,
  wellbeing,
  weeklyCsv,
  type AppData,
  type Task,
} from "./domain";
import {
  cloud,
  deleteCloudData,
  downloadSnapshot,
  signIn,
  uploadSnapshot,
} from "./cloud";
type Page =
  | "home"
  | "timer"
  | "planner"
  | "tasks"
  | "stats"
  | "digital"
  | "coach"
  | "missions"
  | "report"
  | "groups"
  | "settings";
const nav = [
  { id: "home", name: "오늘의 균형", icon: Home },
  { id: "timer", name: "집중 타이머", icon: Timer },
  { id: "planner", name: "10분 플래너", icon: CalendarDays },
  { id: "tasks", name: "할 일 · D-Day", icon: ListChecks },
  { id: "stats", name: "학습 통계", icon: BarChart3 },
  { id: "digital", name: "디지털 습관", icon: Smartphone },
  { id: "coach", name: "마인드 코치", icon: Sparkles },
  { id: "missions", name: "작은 실천", icon: Flower2 },
  { id: "report", name: "주간 리포트", icon: TrendingUp },
  { id: "groups", name: "함께하는 공부", icon: Users },
] as const;
const palette = [
  "#619e89",
  "#b7a1d8",
  "#e9b775",
  "#7fa9d6",
  "#d690a3",
  "#85aa64",
];
const time = (n: number) =>
  new Date(n).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
const dateLabel = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Button({
  children,
  onClick,
  variant = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  return (
    <button className={`btn ${variant}`} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
function Tag({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
function Modal({
  title,
  children,
  close,
  onSubmit,
  submit = "저장하기",
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  onSubmit: (data: FormData) => Promise<void> | void;
  submit?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      aria-label={title}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <form
        onSubmit={async (e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          try {
            await onSubmit(f);
            close();
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "입력을 확인해 주세요.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="닫기"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        {children}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button type="button" variant="light" onClick={close}>
            취소
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "저장 중…" : submit}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export default function App() {
  const {
    data: d,
    mode,
    change,
    switchMode,
    reset,
    error,
    clearError,
  } = useStore();
  const [page, setPage] = useState<Page>("home");
  const [mobile, setMobile] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState("");
  const [dialog, setDialog] = useState<{ kind: string; item?: unknown } | null>(
    null,
  );
  const [selectedDay, setSelectedDay] = useState(dayKey());
  const [period, setPeriod] = useState(7);
  const [focus, setFocus] = useState(false);
  const [timerSubject, setTimerSubject] = useState(d.subjects[0]?.id ?? "");
  const [timerMode, setTimerMode] = useState<"stopwatch" | "pomodoro">(
    "stopwatch",
  );
  const [focusM, setFocusM] = useState(25);
  const [restM, setRestM] = useState(5);
  const [cloudUser, setCloudUser] = useState<string | null>(null);
  const today = dayKey(now);
  const subjects = d.subjects.filter((s) => !s.archived);
  const source = "manual" as const;
  const score = wellbeing(d, today);
  const patterns = insights(d, today);
  const todayM = metrics(d, [today]);
  const todayTasks = d.tasks.filter((t) => t.day === today);
  const currentSubject = d.subjects.find((s) => s.id === d.active?.subjectId);
  const elapsed = d.active ? timerElapsed(d.active, now) : 0;
  const target = d.active
    ? (d.active.phase === "study"
        ? d.active.focusMinutes
        : d.active.restMinutes) * 60
    : focusM * 60;
  const pomodoroDone =
    !!d.active && d.active.mode === "pomodoro" && elapsed >= target;
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = d.preferences.dark
      ? "dark"
      : "light";
  }, [d.preferences.dark]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    if (!cloud) return;
    cloud.auth
      .getUser()
      .then(({ data }) => setCloudUser(data.user?.email ?? null));
    const { data } = cloud.auth.onAuthStateChange((_e, s) =>
      setCloudUser(s?.user.email ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  const notify = async (task: () => Promise<unknown>, message?: string) => {
    try {
      await task();
      if (message) setToast(message);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "작업을 완료하지 못했어요.");
    }
  };
  const mutate = (fn: (data: AppData) => void, message?: string) =>
    notify(() => change(fn), message);
  useEffect(() => {
    if (pomodoroDone && d.active?.runningSince !== null) {
      void mutate((v) => {
        if (
          v.active &&
          v.active.mode === "pomodoro" &&
          timerElapsed(v.active, Date.now()) >= target
        )
          pauseTimer(v);
      });
      if (
        d.preferences.reminders &&
        "Notification" in window &&
        Notification.permission === "granted"
      )
        new Notification("MindTrace", {
          body: "정한 시간이 끝났어요. 다음 단계로 넘어가 볼까요?",
        });
    }
  }, [pomodoroDone]);
  const go = (p: Page) => {
    setPage(p);
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const subjectName = (id: string) =>
    d.subjects.find((s) => s.id === id)?.name ?? "보관된 과목";
  const subjectColor = (id: string) =>
    d.subjects.find((s) => s.id === id)?.color ?? "#91a398";
  const acceptInsight = (id: string, title: string, reason: string) =>
    mutate((v) => {
      if (v.missions.some((m) => m.id === id && m.status !== "dismissed"))
        throw new Error("이미 작은 실천에 추가했어요.");
      v.missions = v.missions.filter((m) => m.id !== id);
      v.missions.push({ id, title, reason, status: "accepted", source });
    }, "작은 실천에 담았어요");
  const progress = Math.min(100, (todayM.study / d.profile.goal) * 100);
  const activeLabel = d.active
    ? d.active.phase === "rest"
      ? "쉬는 중"
      : d.active.runningSince === null
        ? "잠시 멈춤"
        : "집중하는 중"
    : "오늘도 나의 속도로";
  const start = () =>
    mutate(
      (v) =>
        startTimer(
          v,
          timerSubject || subjects[0]?.id,
          timerMode,
          focusM,
          restM,
        ),
      "타이머를 시작했어요",
    );
  const taskList = (items: Task[], compact = false) => (
    <div className="task-list">
      {!items.length && (
        <Empty
          icon={<ListChecks />}
          title="가볍게, 하나부터"
          description="지금 할 수 있는 작은 계획을 추가해 보세요."
        />
      )}
      {items.map((t) => (
        <div className={`task-row ${t.done ? "completed" : ""}`} key={t.id}>
          <button
            className="check"
            aria-label={`${t.title} ${t.done ? "완료 취소" : "완료"}`}
            aria-pressed={t.done}
            onClick={() =>
              mutate((v) => {
                const item = v.tasks.find((x) => x.id === t.id);
                if (item) item.done = !item.done;
              })
            }
          >
            {t.done && <Check size={14} />}
          </button>
          <div className="task-text">
            <strong>{t.title}</strong>
            <span>
              <i style={{ background: subjectColor(t.subjectId) }} />
              {subjectName(t.subjectId)}
              {!compact && ` · ${t.day}`}
              {t.priority === "높음" && " · 우선순위 높음"}
            </span>
          </div>
          <Tag tone={t.source === "demo" ? "muted" : "green"}>
            {t.source === "demo" ? "가상" : "직접 입력"}
          </Tag>
          <button
            className="icon-btn"
            aria-label={`${t.title} 수정`}
            onClick={() => setDialog({ kind: "task", item: t })}
          >
            <Pencil size={15} />
          </button>
          {!compact && (
            <button
              className="icon-btn"
              aria-label={`${t.title} 삭제`}
              onClick={() =>
                mutate((v) => {
                  v.tasks = v.tasks.filter((x) => x.id !== t.id);
                }, "할 일을 삭제했어요")
              }
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
  const chart = (count: number, end = today) => {
    const days = daysEnding(end, count);
    const max = Math.max(
      d.profile.goal,
      ...days.map((day) => dailyStudy(d, day)),
      1,
    );
    return (
      <div
        className="bar-chart"
        role="img"
        aria-label={`${count}일간 공부 시간 그래프. 아래 날짜별 분을 확인하세요.`}
      >
        {days.map((day) => {
          const value = dailyStudy(d, day);
          return (
            <div
              className={`bar-col ${day === today ? "is-today" : ""}`}
              key={day}
            >
              <span className="bar-value">{Math.round(value)}</span>
              <div className="bar-track">
                <div
                  className="bar"
                  style={{
                    height: `${Math.max(value ? 3 : 0, (value / max) * 100)}%`,
                  }}
                />
              </div>
              <span>
                {count > 10
                  ? day.slice(8)
                  : ["일", "월", "화", "수", "목", "금", "토"][
                      new Date(`${day}T12:00:00`).getDay()
                    ]}
              </span>
            </div>
          );
        })}
      </div>
    );
  };
  const insightCards = (full = false) => (
    <>
      {patterns.length === 0 ? (
        <Empty
          icon={<Sparkles />}
          title="아직은 알아가는 중"
          description="사용 기록을 남기면 관찰한 패턴과 실천 제안을 보여드려요. 기록 없이 결론을 만들지 않아요."
        />
      ) : (
        patterns.slice(0, full ? 99 : 1).map((p) => (
          <div className="insight" key={p.id}>
            <div className="eyebrow">
              <Sparkles size={14} /> 규칙 기반 마인드 코치
            </div>
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <div className="evidence">
              <Activity size={14} />
              <span>{p.evidence}</span>
            </div>
            {full && (
              <small>{p.confidence} · 진단이나 치료 목적이 아닙니다.</small>
            )}
            <Button
              variant="outline"
              onClick={() => acceptInsight(p.id, p.recommendation, p.evidence)}
              disabled={d.missions.some(
                (m) => m.id === p.id && m.status !== "dismissed",
              )}
            >
              {d.missions.some((m) => m.id === p.id && m.status !== "dismissed")
                ? "실천에 담았어요"
                : "작은 실천으로 담기"}
              <ArrowRight size={15} />
            </Button>
          </div>
        ))
      )}
    </>
  );
  return (
    <div className={`app ${focus ? "focus-mode" : ""}`}>
      <a className="skip" href="#main">
        본문 바로가기
      </a>
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
        >
          <span className="brand-mark">
            <Activity size={25} />
          </span>
          <span>
            mindtrace<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="workspace-label">나를 위한 작은 변화</div>
        <nav aria-label="주요 메뉴">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              className={`nav-link ${page === n.id ? "active" : ""}`}
              aria-current={page === n.id ? "page" : undefined}
            >
              <n.icon size={18} />
              {n.name}
              {n.id === "coach" && <span className="new-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="little-note">
            <Leaf size={21} />
            <p>
              많이 하는 것보다,
              <br />
              <strong>균형 있게 하는 것.</strong>
            </p>
            <span>오늘의 나를 응원해요.</span>
          </div>
          <button
            className={`nav-link ${page === "settings" ? "active" : ""}`}
            onClick={() => go("settings")}
          >
            <Settings size={18} />
            설정 및 개인정보
          </button>
          <div className="profile">
            <span className="avatar">{d.profile.nickname.slice(0, 1)}</span>
            <div>
              <strong>{d.profile.nickname}</strong>
              <small>
                {mode === "demo"
                  ? "가상 데이터 체험 중"
                  : "이 브라우저에만 저장"}
              </small>
            </div>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          aria-label="메뉴 닫기"
          className="scrim"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="content">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              aria-label="메뉴 열기"
              className="icon-btn mobile-toggle"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span>나의 공간</span>
            <ChevronRight size={13} />
            <strong>{nav.find((n) => n.id === page)?.name ?? "설정"}</strong>
          </div>
          <div className="top-actions">
            <span
              className={`data-badge ${mode === "personal" ? "personal" : ""}`}
            >
              <span />
              {mode === "demo" ? "시연용 가상 데이터" : "개인 로컬 데이터"}
            </span>
            <button
              className="icon-btn"
              aria-label="화면 테마 변경"
              onClick={() =>
                mutate((v) => {
                  v.preferences.dark = !v.preferences.dark;
                })
              }
            >
              {d.preferences.dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-btn"
              aria-label="알림 설정"
              onClick={() => go("settings")}
            >
              <Bell size={18} />
            </button>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow page-date">{dateLabel(today)}</div>
              <h1>
                {page === "home" ? (
                  <>
                    안녕하세요, {d.profile.nickname}님{" "}
                    <span className="greeting-sun">☀</span>
                  </>
                ) : page === "settings" ? (
                  "내가 정하는 나의 공간"
                ) : (
                  nav.find((n) => n.id === page)?.name
                )}
              </h1>
              <p>
                {
                  (
                    {
                      home: "공부도, 쉼도, 나답게. 오늘의 균형을 함께 찾아볼까요?",
                      timer: "지금 이 시간, 한 가지에만 마음을 두어 보세요.",
                      planner: "하루를 빽빽하게 채우기보다, 나만의 리듬으로.",
                      tasks: "해야 할 일은 가볍게 정리하고, 하나씩 해내요.",
                      stats: "조금씩 쌓인 시간이 나의 발자취가 돼요.",
                      digital: "몇 분을 썼는지보다, 왜 사용했는지 돌아봐요.",
                      coach: "내 기록에서 발견한 패턴, 내가 고르는 다음 행동.",
                      missions: "작고 가벼운 실천이 일상의 균형을 만들어요.",
                      report: "다른 사람 대신, 지난주의 나와 비교해요.",
                      groups: "경쟁보다 응원. 같은 방향으로 함께 걸어요.",
                      settings: "내 정보와 공개 범위는 언제나 내가 선택해요.",
                    } as Record<Page, string>
                  )[page]
                }
              </p>
            </div>
            <div className="heading-actions">
              {page === "home" && (
                <Button variant="outline" onClick={() => go("report")}>
                  <CalendarDays size={16} />
                  주간 리포트
                </Button>
              )}
              {page === "digital" && (
                <Button onClick={() => setDialog({ kind: "usage" })}>
                  <Plus size={17} />
                  사용 기록하기
                </Button>
              )}
              {page === "tasks" && (
                <Button onClick={() => setDialog({ kind: "task" })}>
                  <Plus size={17} />할 일 추가
                </Button>
              )}
              {page === "planner" && (
                <Button onClick={() => setDialog({ kind: "block" })}>
                  <Plus size={17} />
                  계획 추가
                </Button>
              )}
            </div>
          </div>
          {error && (
            <div role="alert" className="error-banner">
              {error}
              <button
                aria-label="오류 알림 닫기"
                className="icon-btn"
                onClick={clearError}
              >
                <X size={18} />
              </button>
            </div>
          )}
          {page === "home" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-label">
                    <span /> 오늘의 작은 방향
                  </span>
                  <h2>
                    더 오래보다,
                    <br />
                    <em>더 나답게 집중하기.</em>
                  </h2>
                  <p>
                    몰입하는 시간과 쉬어가는 시간 사이,
                    <br />
                    나에게 맞는 균형을 찾아가요.
                  </p>
                  <Button onClick={() => go("timer")}>
                    나의 집중 시작하기
                    <ArrowRight size={16} />
                  </Button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="leaf leaf-a" />
                  <div className="leaf leaf-b" />
                  <div className="leaf leaf-c" />
                  <div className="leaf-stem" />
                  <div className="art-spark spark-one">✦</div>
                  <div className="art-spark spark-two">✦</div>
                  <div className="art-note">
                    <Wind size={15} /> take a little breath
                  </div>
                </div>
                <div className="hero-corner">MY PACE, MY BALANCE</div>
              </section>
              <section className="metric-grid">
                <Metric
                  icon={<Clock3 />}
                  label="오늘의 집중 시간"
                  value={minutesText(todayM.study)}
                  detail={`내 목표 ${minutesText(d.profile.goal)}`}
                  tone="mint"
                >
                  <div className="progress">
                    <i style={{ width: `${progress}%` }} />
                  </div>
                </Metric>
                <Metric
                  icon={<CheckCheck />}
                  label="오늘의 할 일"
                  value={
                    <>
                      {todayTasks.filter((t) => t.done).length}
                      <span className="metric-unit">
                        {" "}
                        / {todayTasks.length}
                      </span>
                    </>
                  }
                  detail={
                    todayTasks.length
                      ? "작은 성취가 쌓이고 있어요"
                      : "나만의 할 일을 더해 보세요"
                  }
                  tone="purple"
                />
                <Metric
                  icon={<Smartphone />}
                  label="직접 기록한 디지털 사용"
                  value={
                    <>
                      {todayM.usage}
                      <span className="metric-unit"> 분</span>
                    </>
                  }
                  detail={`${todayM.entries.length}개 기록 · 기기 전체 사용량 아님`}
                  tone="peach"
                />
                <Metric
                  icon={<Leaf />}
                  label="나의 웰빙 지표"
                  value={
                    <>
                      {score.score ?? "—"}
                      <span className="metric-unit">
                        {score.score !== null ? " / 100" : ""}
                      </span>
                    </>
                  }
                  detail={`측정 범위 ${score.coverage}% · 계산법 보기`}
                  tone="yellow"
                  onClick={() => go("coach")}
                />
              </section>
              <div className="dashboard-grid">
                <Card>
                  <SectionTitle
                    icon={<Timer size={18} />}
                    title="지금, 집중해 볼까요?"
                    aside={<Tag tone="green">{activeLabel}</Tag>}
                  />
                  <div className="mini-timer">
                    <div className="subject-pill">
                      <i
                        style={{
                          background:
                            currentSubject?.color ?? subjectColor(timerSubject),
                        }}
                      />
                      {currentSubject?.name ?? subjectName(timerSubject)}
                    </div>
                    <div className="clock-digits">{secondsText(elapsed)}</div>
                    <p>
                      {d.active
                        ? "쌓이는 시간만큼, 나에게 집중해요."
                        : "오늘의 작은 시작이 내일의 습관으로."}
                    </p>
                    <div className="timer-actions">
                      {d.active ? (
                        <>
                          <Button
                            disabled={
                              pomodoroDone && d.active.runningSince === null
                            }
                            onClick={() =>
                              mutate((v) =>
                                v.active?.runningSince === null
                                  ? resumeTimer(v)
                                  : pauseTimer(v),
                              )
                            }
                          >
                            {d.active.runningSince === null ? (
                              <Play size={16} />
                            ) : (
                              <Pause size={16} />
                            )}{" "}
                            {d.active.runningSince === null
                              ? "다시 시작"
                              : "일시정지"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              mutate(
                                (v) => finishTimer(v, source),
                                "집중 기록을 저장했어요",
                              )
                            }
                          >
                            <Square size={14} />
                            종료
                          </Button>
                        </>
                      ) : (
                        <Button onClick={start}>
                          <Play size={16} fill="currentColor" />
                          집중 시작
                        </Button>
                      )}
                      <button className="text-btn" onClick={() => go("timer")}>
                        과목 선택
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
                <Card>
                  <SectionTitle
                    icon={<ListChecks size={18} />}
                    title="오늘의 작은 계획"
                    aside={
                      <button
                        className="icon-btn"
                        aria-label="할 일 추가"
                        onClick={() => setDialog({ kind: "task" })}
                      >
                        <Plus size={18} />
                      </button>
                    }
                  />
                  {taskList(todayTasks, true)}
                  <button className="card-link" onClick={() => go("planner")}>
                    나의 플래너 펼치기
                    <ArrowRight size={15} />
                  </button>
                </Card>
                <Card className="coach-card">
                  <SectionTitle
                    icon={<Sparkles size={18} />}
                    title="내 기록이 건네는 이야기"
                    aside={<Tag tone="green">설명 가능한 코치</Tag>}
                  />
                  {insightCards()}
                  <button className="card-link" onClick={() => go("coach")}>
                    모든 패턴 살펴보기
                    <ArrowRight size={15} />
                  </button>
                </Card>
                <Card>
                  <SectionTitle
                    icon={<BarChart3 size={18} />}
                    title="한 주의 집중 리듬"
                    aside={<span className="small muted">최근 7일 · 분</span>}
                  />
                  {chart(7)}
                  <div className="chart-footer">
                    <span>
                      <i className="legend-dot" />
                      공부 시간
                    </span>
                    <span>
                      총 <strong>{minutesText(score.current.study)}</strong>
                    </span>
                  </div>
                </Card>
              </div>
              <div className="gentle-footer">
                <Flower2 size={17} />
                완벽한 하루가 아니어도 괜찮아요. 나의 속도로, 한 걸음씩.
              </div>
            </>
          )}
          {page === "timer" && (
            <div className="two-col">
              <Card className="big-timer">
                <SectionTitle
                  title="나만의 집중 공간"
                  aside={
                    <button
                      className="text-btn"
                      onClick={() => setFocus(!focus)}
                    >
                      <Focus size={15} />
                      {focus ? "전체 화면 돌아가기" : "집중 화면"}
                    </button>
                  }
                />
                <div className="segmented">
                  {(["stopwatch", "pomodoro"] as const).map((m) => (
                    <button
                      disabled={!!d.active}
                      className={timerMode === m ? "selected" : ""}
                      key={m}
                      onClick={() => setTimerMode(m)}
                    >
                      {m === "stopwatch" ? "스톱워치" : "뽀모도로"}
                    </button>
                  ))}
                </div>
                <Field label="집중할 과목">
                  <select
                    value={d.active?.subjectId ?? timerSubject}
                    disabled={!!d.active}
                    onChange={(e) => setTimerSubject(e.target.value)}
                  >
                    {subjects.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {timerMode === "pomodoro" && !d.active && (
                  <div className="form-grid">
                    <Field label="집중 (분)">
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={focusM}
                        onChange={(e) => setFocusM(+e.target.value)}
                      />
                    </Field>
                    <Field label="휴식 (분)">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={restM}
                        onChange={(e) => setRestM(+e.target.value)}
                      />
                    </Field>
                  </div>
                )}
                <div
                  className={`timer-ring ${d.active?.phase === "rest" ? "resting" : ""}`}
                  style={
                    {
                      "--progress": `${d.active?.mode === "pomodoro" ? Math.min(100, (elapsed / target) * 100) : 0}%`,
                    } as React.CSSProperties
                  }
                >
                  <span className="eyebrow">{activeLabel}</span>
                  <div className="clock-digits" data-testid="timer-value">
                    {secondsText(
                      d.active?.mode === "pomodoro"
                        ? Math.max(0, target - elapsed)
                        : elapsed,
                    )}
                  </div>
                  <span className="muted small">
                    {currentSubject?.name ?? subjectName(timerSubject)}
                  </span>
                </div>
                <div className="timer-actions">
                  {d.active ? (
                    <>
                      <Button
                        disabled={
                          pomodoroDone && d.active.runningSince === null
                        }
                        onClick={() =>
                          mutate((v) =>
                            v.active?.runningSince === null
                              ? resumeTimer(v)
                              : pauseTimer(v),
                          )
                        }
                      >
                        {d.active.runningSince === null ? (
                          <Play size={17} />
                        ) : (
                          <Pause size={17} />
                        )}{" "}
                        {d.active.runningSince === null ? "재개" : "일시정지"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          mutate(
                            (v) => finishTimer(v, source),
                            "기록을 저장했어요",
                          )
                        }
                      >
                        <Square size={15} />
                        종료 및 저장
                      </Button>
                      {d.active.mode === "pomodoro" && (
                        <Button
                          variant="light"
                          onClick={() => mutate((v) => switchPhase(v, source))}
                        >
                          {d.active.phase === "study"
                            ? "휴식으로 전환"
                            : "집중으로 전환"}
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button onClick={start}>
                      <Play size={18} />
                      시작
                    </Button>
                  )}
                </div>
                {pomodoroDone && (
                  <div role="status" className="notice">
                    정한 시간이 끝났어요. 다음 단계로 전환하거나 종료해 주세요.
                  </div>
                )}
                <p className="muted small center">
                  다른 화면으로 이동하거나 새로고침해도 기록이 이어집니다.
                  <br />
                  뽀모도로는 정한 시간이 끝나면 멈추고, 내가 다음 단계를
                  선택해요.
                </p>
              </Card>
              <div className="stack">
                <Card>
                  <SectionTitle
                    title="나의 과목"
                    aside={
                      <button
                        className="icon-btn"
                        aria-label="과목 추가"
                        onClick={() => setDialog({ kind: "subject" })}
                      >
                        <Plus size={18} />
                      </button>
                    }
                  />
                  {subjects.map((s) => (
                    <div className="simple-row" key={s.id}>
                      <span
                        className="subject-dot"
                        style={{ background: s.color }}
                      />
                      <strong>{s.name}</strong>
                      <span className="row-grow muted small">
                        {minutesText(dailyStudy(d, today, s.id))}
                      </span>
                      <button
                        className="icon-btn"
                        aria-label={`${s.name} 과목 수정`}
                        onClick={() => setDialog({ kind: "subject", item: s })}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={`${s.name} 과목 삭제`}
                        onClick={() =>
                          mutate(
                            (v) => removeSubject(v, s.id),
                            "과거 기록은 유지하고 과목을 보관했어요",
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </Card>
                <Card>
                  <SectionTitle title="오늘의 집중 기록" />
                  {!d.sessions.some((s) => dayKey(s.startedAt) === today) && (
                    <p className="muted">첫 집중 기록을 남겨 보세요.</p>
                  )}
                  {d.sessions
                    .filter((s) => dayKey(s.startedAt) === today)
                    .slice()
                    .reverse()
                    .map((s) => (
                      <div className="simple-row" key={s.id}>
                        <span
                          className="subject-dot"
                          style={{ background: subjectColor(s.subjectId) }}
                        />
                        <div className="row-grow">
                          <strong>
                            {subjectName(s.subjectId)}{" "}
                            {s.kind === "rest" && "· 휴식"}
                          </strong>
                          <small>
                            {time(s.startedAt)} – {time(s.endedAt)} ·{" "}
                            {s.source === "demo" ? "가상 기록" : "직접 기록"}
                          </small>
                        </div>
                        <strong>{secondsText(s.durationSec)}</strong>
                      </div>
                    ))}
                </Card>
              </div>
            </div>
          )}
          {page === "planner" && (
            <>
              <div className="toolbar">
                <Button
                  variant="light"
                  aria-label="전날"
                  onClick={() => setSelectedDay(addDays(selectedDay, -1))}
                >
                  <ChevronLeft size={16} />
                </Button>
                <input
                  aria-label="계획 날짜"
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                />
                <Button
                  variant="light"
                  aria-label="다음 날"
                  onClick={() => setSelectedDay(addDays(selectedDay, 1))}
                >
                  <ChevronRight size={16} />
                </Button>
                <Button variant="outline" onClick={() => setSelectedDay(today)}>
                  오늘
                </Button>
                <span className="muted small">
                  10분 단위 · 자정을 넘는 계획도 기록해요
                </span>
              </div>
              <div className="two-col">
                <Card>
                  <SectionTitle
                    title={dateLabel(selectedDay)}
                    aside={
                      <Tag>
                        실제 공부 {minutesText(dailyStudy(d, selectedDay))}
                      </Tag>
                    }
                  />
                  <div className="timeline">
                    {Array.from({ length: 24 }, (_, h) => (
                      <div className="hour-row" key={h}>
                        <span className="hour-label">
                          {String(h).padStart(2, "0")}:00
                        </span>
                        <div className="hour-slots">
                          {Array.from({ length: 6 }, (_, slot) => {
                            const stamp = atTime(
                              selectedDay,
                              `${String(h).padStart(2, "0")}:${String(slot * 10).padStart(2, "0")}`,
                            );
                            const b = d.blocks.find(
                              (b) => stamp >= b.start && stamp < b.end,
                            );
                            const actual = d.sessions.some(
                              (s) =>
                                s.kind === "study" &&
                                s.segments.some(
                                  (p) =>
                                    p.start < stamp + 600000 && p.end > stamp,
                                ),
                            );
                            return (
                              <button
                                key={slot}
                                title={`${time(stamp)} ${b?.title ?? "빈 계획"}${actual ? " · 실제 공부 기록 있음" : ""}`}
                                aria-label={`${time(stamp)} ${b?.title ?? "계획 추가"}`}
                                className={`time-slot ${b ? "filled" : ""} ${actual ? "actual" : ""}`}
                                style={
                                  b
                                    ? { background: subjectColor(b.subjectId) }
                                    : {}
                                }
                                onClick={() =>
                                  setDialog({
                                    kind: "block",
                                    item: b ?? {
                                      start: stamp,
                                      end: stamp + 600000,
                                      subjectId: subjects[0]?.id,
                                      title: "",
                                    },
                                  })
                                }
                              >
                                {b && stamp === b.start ? (
                                  <span>{b.title}</span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="small muted">
                    색 칸: 계획 · 아래 진한 선: 실제 공부 · 각 칸 10분
                  </p>
                </Card>
                <Card>
                  <SectionTitle title="이날의 계획" />
                  {d.blocks
                    .filter(
                      (b) =>
                        b.start < atTime(addDays(selectedDay, 1), "00:00") &&
                        b.end > atTime(selectedDay, "00:00"),
                    )
                    .sort((a, b) => a.start - b.start)
                    .map((b) => (
                      <div className="plan-item" key={b.id}>
                        <div
                          className="plan-time"
                          style={{ color: subjectColor(b.subjectId) }}
                        >
                          {time(b.start)}
                          <span>
                            {time(b.end)}
                            {dayKey(b.start) !== dayKey(b.end) ? " (+1일)" : ""}
                          </span>
                        </div>
                        <div className="row-grow">
                          <strong>{b.title}</strong>
                          <small>
                            {subjectName(b.subjectId)} ·{" "}
                            {(b.end - b.start) / 60000}분 ·{" "}
                            {b.source === "demo" ? "가상" : "직접 입력"}
                          </small>
                        </div>
                        <button
                          aria-label={`${b.title} 수정`}
                          className="icon-btn"
                          onClick={() => setDialog({ kind: "block", item: b })}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          aria-label={`${b.title} 삭제`}
                          className="icon-btn"
                          onClick={() =>
                            mutate((v) => {
                              v.blocks = v.blocks.filter((x) => x.id !== b.id);
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  {!d.blocks.some((b) => dayKey(b.start) === selectedDay) && (
                    <Empty
                      icon={<CalendarDays />}
                      title="여백이 있는 하루"
                      description="시간 칸을 누르거나 계획 추가를 눌러 시작해요."
                    />
                  )}
                  <Button
                    variant="outline full"
                    onClick={() => setDialog({ kind: "block" })}
                  >
                    <Plus size={16} />
                    계획 추가
                  </Button>
                </Card>
              </div>
            </>
          )}
          {page === "tasks" && (
            <div className="two-col">
              <Card>
                <SectionTitle
                  title="나의 할 일"
                  aside={
                    <input
                      aria-label="할 일 날짜"
                      type="date"
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                    />
                  }
                />
                {taskList(
                  d.tasks
                    .filter((t) => t.day === selectedDay)
                    .sort((a, b) => Number(a.done) - Number(b.done)),
                )}
              </Card>
              <Card>
                <SectionTitle
                  title="다가오는 일정"
                  aside={
                    <button
                      className="icon-btn"
                      aria-label="일정 추가"
                      onClick={() => setDialog({ kind: "event" })}
                    >
                      <Plus size={18} />
                    </button>
                  }
                />
                {d.events.map((e) => {
                  const diff = Math.round(
                    (atTime(e.day, "12:00") - atTime(today, "12:00")) /
                      86400000,
                  );
                  return (
                    <div className="event-row" key={e.id}>
                      <span className="d-day">
                        {diff === 0
                          ? "D-Day"
                          : diff > 0
                            ? `D-${diff}`
                            : `D+${-diff}`}
                      </span>
                      <div className="row-grow">
                        <strong>{e.title}</strong>
                        <small>{e.day}</small>
                      </div>
                      <button
                        className="icon-btn"
                        aria-label={`${e.title} 일정 수정`}
                        onClick={() => setDialog({ kind: "event", item: e })}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={`${e.title} 일정 삭제`}
                        onClick={() =>
                          mutate((v) => {
                            v.events = v.events.filter((x) => x.id !== e.id);
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
                {!d.events.length && (
                  <Empty
                    icon={<CalendarDays />}
                    title="다가오는 목표가 있나요?"
                    description="시험이나 과제 날짜를 적어 두세요."
                  />
                )}
              </Card>
            </div>
          )}
          {page === "stats" && (
            <>
              <div className="toolbar">
                <div className="segmented">
                  {[
                    [1, "일"],
                    [7, "주"],
                    [30, "월"],
                  ].map(([n, l]) => (
                    <button
                      className={period === n ? "selected" : ""}
                      key={n}
                      onClick={() => setPeriod(+n)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <span className="muted">
                  {addDays(today, 1 - period)} ~ {today}
                </span>
              </div>
              <div className="two-col">
                <Card>
                  <SectionTitle
                    title="공부 시간의 흐름"
                    aside={<Tag>단위: 분</Tag>}
                  />
                  {chart(period)}
                  <div className="chart-footer">
                    총 집중 시간{" "}
                    <strong>
                      {minutesText(metrics(d, daysEnding(today, period)).study)}
                    </strong>
                  </div>
                </Card>
                <Card>
                  <SectionTitle title="과목별 쌓인 시간" />
                  {d.subjects
                    .filter(
                      (s) =>
                        !s.archived ||
                        daysEnding(today, period).some(
                          (day) => dailyStudy(d, day, s.id) > 0,
                        ),
                    )
                    .map((s) => {
                      const val = daysEnding(today, period).reduce(
                        (n, day) => n + dailyStudy(d, day, s.id),
                        0,
                      );
                      const total = metrics(d, daysEnding(today, period)).study;
                      return (
                        <div className="subject-stat" key={s.id}>
                          <div>
                            <span>
                              <i style={{ background: s.color }} />
                              {s.name}
                              {s.archived ? " (보관)" : ""}
                            </span>
                            <strong>{minutesText(val)}</strong>
                          </div>
                          <div className="progress">
                            <i
                              style={{
                                width: `${total ? (val / total) * 100 : 0}%`,
                                background: s.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </Card>
                <Card className="span-two">
                  <SectionTitle
                    title="나의 집중 캘린더"
                    aside={
                      <span className="small muted">
                        최근 84일 · 누르면 날짜별 기록
                      </span>
                    }
                  />
                  <div className="heatmap">
                    {daysEnding(today, 84).map((day) => {
                      const n = dailyStudy(d, day);
                      return (
                        <button
                          key={day}
                          style={{
                            background: n
                              ? `color-mix(in srgb, var(--green) ${Math.min(95, 25 + n / 5)}%, var(--mint))`
                              : undefined,
                          }}
                          title={`${day}: ${Math.round(n)}분`}
                          aria-label={`${day} ${Math.round(n)}분`}
                          onClick={() => {
                            setSelectedDay(day);
                            go("planner");
                          }}
                        />
                      );
                    })}
                  </div>
                  <p className="small muted">
                    기록이 없는 날짜는 빈칸입니다. 공부 시간을 늘리기 위한 경쟁
                    지표가 아니에요.
                  </p>
                </Card>
              </div>
            </>
          )}
          {page === "digital" && (
            <>
              <div className="notice">
                <ShieldCheck size={18} />이 화면은 직접 입력한 기록만 보여줘요.
                기기의 전체 앱 사용량을 자동 수집하지 않습니다.
              </div>
              <div className="metric-grid three">
                <Metric
                  icon={<Smartphone />}
                  label="최근 7일 기록한 사용"
                  value={`${score.current.usage}분`}
                  detail={`${score.current.entries.length}개 사용 기록`}
                  tone="mint"
                />
                <Metric
                  icon={<Activity />}
                  label="무목적 사용 기록"
                  value={`${score.current.unplanned}회`}
                  detail="목적 있는 사용을 제외한 직접 기록"
                  tone="purple"
                />
                <Metric
                  icon={<Clock3 />}
                  label="길게 이어진 사용"
                  value={`${score.current.entries.filter((u) => u.minutes >= 30).length}회`}
                  detail="30분 이상인 개별 기록 기준"
                  tone="peach"
                />
              </div>
              <div className="two-col">
                <Card>
                  <SectionTitle
                    title="어떤 시간에 사용했을까요?"
                    aside={<span className="small muted">최근 7일 · 분</span>}
                  />
                  <div className="hour-chart">
                    {Array.from({ length: 8 }, (_, i) => {
                      const amount = score.current.entries
                        .filter(
                          (u) =>
                            Math.floor(new Date(u.at).getHours() / 3) === i,
                        )
                        .reduce((n, u) => n + u.minutes, 0);
                      const max = Math.max(
                        1,
                        ...Array.from({ length: 8 }, (_, j) =>
                          score.current.entries
                            .filter(
                              (u) =>
                                Math.floor(new Date(u.at).getHours() / 3) === j,
                            )
                            .reduce((n, u) => n + u.minutes, 0),
                        ),
                      );
                      return (
                        <div key={i}>
                          <span>{amount}</span>
                          <div className="hour-track">
                            <i style={{ height: `${(amount / max) * 100}%` }} />
                          </div>
                          <small>{i * 3}시</small>
                        </div>
                      );
                    })}
                  </div>
                </Card>
                <Card>
                  <SectionTitle title="기록한 사용 이유" />
                  {[
                    "심심해서",
                    "습관적으로",
                    "알림 때문에",
                    "불안해서",
                    "목적 있는 사용",
                    "기타",
                  ].map((reason) => (
                    <div className="simple-row" key={reason}>
                      <span className="row-grow">{reason}</span>
                      <strong>
                        {
                          score.current.entries.filter(
                            (u) => u.reason === reason,
                          ).length
                        }
                        회
                      </strong>
                    </div>
                  ))}
                </Card>
                <Card className="span-two">
                  <SectionTitle
                    title="나의 사용 기록"
                    aside={
                      <Button
                        variant="outline"
                        onClick={() => setDialog({ kind: "usage" })}
                      >
                        <Plus size={15} />
                        직접 기록
                      </Button>
                    }
                  />
                  {!d.usage.length && (
                    <Empty
                      icon={<Smartphone />}
                      title="나를 알아가는 첫 기록"
                      description="앱 이름, 사용 시간, 이유를 간단히 적어 보세요."
                    />
                  )}
                  <div className="usage-list">
                    {d.usage
                      .slice()
                      .sort((a, b) => b.at - a.at)
                      .slice(0, 60)
                      .map((u) => (
                        <div className="usage-row" key={u.id}>
                          <span className="usage-icon">
                            <Smartphone size={18} />
                          </span>
                          <div className="row-grow">
                            <strong>{u.app}</strong>
                            <small>
                              {dayKey(u.at)} {time(u.at)} · {u.reason}
                            </small>
                          </div>
                          <Tag tone={u.source === "demo" ? "muted" : "green"}>
                            {u.source === "demo" ? "가상 데이터" : "직접 입력"}
                          </Tag>
                          <strong>{u.minutes}분</strong>
                          <button
                            className="icon-btn"
                            aria-label={`${u.app} 사용 기록 수정`}
                            onClick={() =>
                              setDialog({ kind: "usage", item: u })
                            }
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={`${u.app} 사용 기록 삭제`}
                            onClick={() =>
                              mutate((v) => {
                                v.usage = v.usage.filter((x) => x.id !== u.id);
                              })
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                  </div>
                  {d.usage.length > 60 && (
                    <p className="muted small">
                      최신 60개 표시 중 · 전체 기록은 설정에서 내보낼 수 있어요.
                    </p>
                  )}
                </Card>
              </div>
            </>
          )}
          {page === "coach" && (
            <>
              <div className="notice">
                <Sparkles size={18} />
                현재 코치는 외부 AI에 데이터를 보내지 않는 규칙 기반 분석입니다.
                사용자를 진단하거나 효과를 보장하지 않아요.
              </div>
              <div className="two-col">
                <div className="stack">{insightCards(true)}</div>
                <Card>
                  <SectionTitle
                    icon={<Leaf size={18} />}
                    title="나의 웰빙 지표"
                    aside={<Tag>{score.version}</Tag>}
                  />
                  <div className="score-large">
                    {score.score ?? "—"}
                    <span>/ 100</span>
                  </div>
                  <p>
                    측정 범위 <strong>{score.coverage}%</strong> ·{" "}
                    {score.parts.length}/4개 항목
                  </p>
                  <p className="muted small">
                    기록하지 않은 항목은 0점으로 취급하지 않아요. 입력한 항목의
                    가중치만 다시 나눠 계산합니다.
                  </p>
                  {score.parts.map((p) => (
                    <div className="score-part" key={p.label}>
                      <div>
                        <strong>{p.label}</strong>
                        <span>{Math.round(p.value)}점</span>
                      </div>
                      <div className="progress">
                        <i style={{ width: `${p.value}%` }} />
                      </div>
                      <small>
                        {p.basis} · 기본 가중치 {Math.round(p.weight * 100)}%
                      </small>
                    </div>
                  ))}
                  <details>
                    <summary>점수는 어떻게 계산하나요?</summary>
                    <p>
                      무목적 사용 변화 35%, 휴식 실천 25%, 할 일 이행 20%, 취침
                      목표 20%. 사용 변화는 이전 7일 대비 분 비율 r에 대해
                      clamp(100−50r, 0, 100), 휴식은 기록한 날의 min(횟수/3, 1)
                      평균, 할 일·수면은 실천 비율입니다.
                    </p>
                    <p>
                      최종 점수 = Σ(존재하는 항목 점수 × 가중치) / Σ(존재하는
                      항목 가중치). 공부 시간이 많다는 이유로 추가 점수를 주지
                      않습니다. 자기보고의 누락·오차가 있으므로 건강 상태를
                      의미하지 않습니다.
                    </p>
                  </details>
                </Card>
              </div>
              <Card className="section-gap">
                <SectionTitle title="오늘의 학습 계획 제안" />
                <p>
                  목표 {d.profile.goal}분 중 앞으로{" "}
                  {Math.max(0, Math.round(d.profile.goal - todayM.study))}분.{" "}
                  {d.events.length
                    ? `가까운 일정: ${d.events.slice().sort((a, b) => a.day.localeCompare(b.day))[0].title}.`
                    : "과목별 균형과 휴식을 함께 생각해요."}
                </p>
                <p className="muted">
                  남은 목표를 최대 25분 집중 단위로 나누고, 사이에 5분 쉬어
                  보세요. 이 제안은 개인의 실제 집중도를 측정한 결과가 아닙니다.
                </p>
                <Button variant="outline" onClick={() => go("planner")}>
                  플래너에서 직접 계획하기
                  <ArrowRight size={16} />
                </Button>
              </Card>
            </>
          )}
          {page === "missions" && (
            <div className="two-col">
              <Card>
                <SectionTitle
                  title="내가 고른 작은 실천"
                  aside={
                    <Button
                      variant="outline"
                      onClick={() => setDialog({ kind: "mission" })}
                    >
                      <Plus size={15} />
                      직접 만들기
                    </Button>
                  }
                />
                {!d.missions.filter((m) => m.status !== "dismissed").length && (
                  <Empty
                    icon={<Flower2 />}
                    title="작게 시작해도 좋아요"
                    description="코치의 제안을 담거나 나만의 실천을 만들어 보세요."
                  />
                )}
                {d.missions
                  .filter((m) => m.status !== "dismissed")
                  .map((m) => (
                    <div
                      className={`mission-item ${m.status === "done" ? "done" : ""}`}
                      key={m.id}
                    >
                      <div className="mission-icon">
                        <Leaf size={20} />
                      </div>
                      <div className="row-grow">
                        <strong>{m.title}</strong>
                        <small>{m.reason}</small>
                        <div className="inline-actions">
                          <button
                            className="text-btn"
                            onClick={() =>
                              mutate((v) => {
                                const item = v.missions.find(
                                  (x) => x.id === m.id,
                                );
                                if (item)
                                  item.status =
                                    item.status === "done"
                                      ? "accepted"
                                      : "done";
                              })
                            }
                          >
                            {m.status === "done" ? (
                              <>
                                <Check size={14} />
                                완료했어요 · 되돌리기
                              </>
                            ) : (
                              "실천 완료"
                            )}
                          </button>
                          <button
                            className="text-btn"
                            onClick={() =>
                              setDialog({ kind: "mission", item: m })
                            }
                          >
                            수정
                          </button>
                          <button
                            className="text-btn muted"
                            onClick={() =>
                              mutate((v) => {
                                const item = v.missions.find(
                                  (x) => x.id === m.id,
                                );
                                if (item) item.status = "dismissed";
                              })
                            }
                          >
                            이번엔 건너뛰기
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </Card>
              <Card>
                <SectionTitle title="오늘의 생활 루틴" />
                <p className="muted">
                  선택 사항이에요. 기록하지 않은 날을 실패로 계산하지 않아요.
                </p>
                <div className="routine-box">
                  <Wind size={26} />
                  <div className="row-grow">
                    <strong>잠깐, 쉬어가기</strong>
                    <small>
                      오늘 기록한 휴식{" "}
                      {d.routines.find((r) => r.day === today)?.restCount ??
                        "—"}
                      회
                    </small>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() =>
                      mutate((v) => {
                        let r = v.routines.find((r) => r.day === today);
                        if (!r) {
                          r = { day: today, restCount: 0, sleepMet: null };
                          v.routines.push(r);
                        }
                        r.restCount = (r.restCount ?? 0) + 1;
                      }, "쉼도 나를 위한 소중한 시간이에요")
                    }
                  >
                    휴식 +1
                  </Button>
                </div>
                <div className="routine-box">
                  <Moon size={26} />
                  <div>
                    <strong>취침 목표 {d.profile.sleepTime}</strong>
                    <small>오늘의 자기보고 · 언제든 바꿀 수 있어요</small>
                  </div>
                </div>
                <div className="inline-actions">
                  {[
                    ["지켰어요", true],
                    ["못 지켰어요", false],
                    ["기록 안 함", null],
                  ].map(([label, value]) => (
                    <Button
                      variant={
                        d.routines.find((r) => r.day === today)?.sleepMet ===
                        value
                          ? ""
                          : "outline"
                      }
                      key={String(label)}
                      onClick={() =>
                        mutate((v) => {
                          let r = v.routines.find((r) => r.day === today);
                          if (!r) {
                            r = { day: today, restCount: null, sleepMet: null };
                            v.routines.push(r);
                          }
                          r.sleepMet = value as boolean | null;
                        })
                      }
                    >
                      {String(label)}
                    </Button>
                  ))}
                </div>
              </Card>
            </div>
          )}
          {page === "report" && (
            <>
              <div className="report-banner">
                <span className="report-icon">
                  <Leaf size={32} />
                </span>
                <div>
                  <div className="eyebrow">MY WEEKLY BALANCE</div>
                  <h2>이번 주, 나의 리듬은 어땠을까요?</h2>
                  <p>
                    {addDays(today, -6)} ~ {today} · 이전 7일과 비교
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    download(
                      `mindtrace-${today}.csv`,
                      weeklyCsv(d, today),
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  <Download size={16} />
                  CSV 내보내기
                </Button>
              </div>
              <div className="metric-grid three">
                <Comparison
                  label="집중한 시간"
                  current={score.current.study}
                  previous={score.previous.study}
                  unit="분"
                />
                <Comparison
                  label="무목적 사용"
                  current={score.current.unplannedMinutes}
                  previous={score.previous.unplannedMinutes}
                  unit="분"
                  lower
                />
                <Comparison
                  label="기록한 휴식"
                  current={score.current.rests}
                  previous={score.previous.rests}
                  unit="회"
                />
              </div>
              <div className="two-col">
                <Card>
                  <SectionTitle title="일주일의 집중 시간" />
                  {chart(7)}
                </Card>
                <Card>
                  <SectionTitle title="변화를 읽는 방법" />
                  <p>
                    가상 데이터 또는 직접 입력한 기록의 기간 비교예요. 기록이
                    적으면 사용 습관의 실제 변화를 판단하기 어렵습니다.
                  </p>
                  <div className="report-note">
                    <ShieldCheck size={20} />
                    <span>
                      이전 기간에 기록이 없거나 0인 경우 변화율을 계산하지
                      않습니다. 단순 전후 비교는 인과관계나 효과 검증이
                      아닙니다.
                    </span>
                  </div>
                  <div className="simple-row">
                    <span className="row-grow">웰빙 측정 범위</span>
                    <strong>{score.coverage}%</strong>
                  </div>
                  <div className="simple-row">
                    <span className="row-grow">완료한 작은 실천 (전체)</span>
                    <strong>
                      {d.missions.filter((m) => m.status === "done").length}개
                    </strong>
                  </div>
                  <p className="muted small">
                    생성 알고리즘 {score.version} ·{" "}
                    {mode === "demo"
                      ? "가상 시연 기록과 체험 입력"
                      : "직접 입력한 로컬 기록"}
                  </p>
                </Card>
              </div>
            </>
          )}
          {page === "groups" && (
            <>
              <div className="notice">
                <Users size={18} />
                그룹 기능은 이 브라우저의 가상 시연입니다. 초대 코드는 다른
                기기에서 공유되지 않으며 실제 다른 사용자의 상태를 표시하지
                않습니다.
              </div>
              <div className="toolbar">
                <Button
                  disabled={mode !== "demo"}
                  onClick={() => setDialog({ kind: "group" })}
                >
                  <Plus size={16} />
                  가상 그룹 만들기
                </Button>
                <Button
                  variant="outline"
                  disabled={mode !== "demo"}
                  onClick={() => setDialog({ kind: "join" })}
                >
                  시연 코드로 가입
                </Button>
                {mode !== "demo" && (
                  <span className="muted">
                    그룹 체험은 설정에서 가상 데이터 모드로 전환해 주세요.
                  </span>
                )}
              </div>
              <div className="two-col">
                {!d.groups.length && (
                  <Card>
                    <Empty
                      icon={<Users />}
                      title="함께, 하지만 비교하지 않기"
                      description="가상 그룹을 만들어 공동 목표와 공개 동의 흐름을 체험할 수 있어요."
                    />
                  </Card>
                )}
                {d.groups.map((g) => (
                  <Card key={g.id}>
                    <SectionTitle
                      title={g.name}
                      aside={<Tag>로컬 시뮬레이션</Tag>}
                    />
                    <p className="muted">
                      이번 주 공동 목표 {minutesText(g.goal)}
                    </p>
                    <div className="progress">
                      <i
                        style={{
                          width: `${Math.min(100, (score.current.study / g.goal) * 100)}%`,
                        }}
                      />
                    </div>
                    <p>
                      {minutesText(score.current.study)} / {minutesText(g.goal)}{" "}
                      · 현재 브라우저의 나만 반영
                    </p>
                    <p>
                      시연 초대 코드 <code>{g.code}</code>
                    </p>
                    <label className="toggle-row">
                      <span>
                        내 공부 상태 공유 동의
                        <small>
                          기본 비공개 · 외부로 전송되지 않는 시연 설정
                        </small>
                      </span>
                      <input
                        type="checkbox"
                        checked={g.share}
                        onChange={(e) =>
                          mutate((v) => {
                            const item = v.groups.find((x) => x.id === g.id);
                            if (item) item.share = e.target.checked;
                          })
                        }
                      />
                    </label>
                    <div className="simple-row">
                      <span className="avatar">{d.profile.nickname[0]}</span>
                      <span className="row-grow">{d.profile.nickname}</span>
                      <Tag>{g.share ? activeLabel : "비공개"}</Tag>
                    </div>
                    <div className="inline-actions">
                      <Button
                        variant="outline"
                        disabled={g.checkedInDay === today}
                        onClick={() =>
                          mutate((v) => {
                            const item = v.groups.find((x) => x.id === g.id);
                            if (item) item.checkedInDay = today;
                          })
                        }
                      >
                        {g.checkedInDay === today
                          ? "오늘 체크인 완료"
                          : "자율 체크인"}
                      </Button>
                      <Button
                        variant="light"
                        onClick={() =>
                          mutate((v) => {
                            v.groups = v.groups.filter((x) => x.id !== g.id);
                          }, "가상 그룹에서 나왔어요")
                        }
                      >
                        <LogOut size={15} />
                        나가기
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
          {page === "settings" && (
            <div className="two-col">
              <div className="stack">
                <Card>
                  <SectionTitle title="나의 기본 설정" />
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void mutate((v) => {
                        v.profile.nickname = assertText(
                          String(f.get("nickname")),
                          "닉네임",
                          16,
                        );
                        v.profile.goal = assertNumber(
                          Number(f.get("goal")),
                          10,
                          720,
                          "하루 목표",
                        );
                        v.profile.sleepTime = String(f.get("sleep"));
                      }, "설정을 저장했어요");
                    }}
                  >
                    <Field label="닉네임">
                      <input
                        name="nickname"
                        defaultValue={d.profile.nickname}
                        maxLength={16}
                        required
                      />
                    </Field>
                    <div className="form-grid">
                      <Field label="하루 공부 목표 (분)">
                        <input
                          type="number"
                          name="goal"
                          defaultValue={d.profile.goal}
                          min={10}
                          max={720}
                          required
                        />
                      </Field>
                      <Field label="취침 목표">
                        <input
                          type="time"
                          name="sleep"
                          defaultValue={d.profile.sleepTime}
                          required
                        />
                      </Field>
                    </div>
                    <Button type="submit">설정 저장</Button>
                  </form>
                  <label className="toggle-row">
                    <span>다크 모드</span>
                    <input
                      type="checkbox"
                      checked={d.preferences.dark}
                      onChange={(e) =>
                        mutate((v) => {
                          v.preferences.dark = e.target.checked;
                        })
                      }
                    />
                  </label>
                  <label className="toggle-row">
                    <span>
                      집중 종료 알림
                      <small>뽀모도로 종료 시 · 브라우저가 열린 동안</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={d.preferences.reminders}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        void notify(async () => {
                          if (checked) {
                            if (!("Notification" in window))
                              throw new Error(
                                "이 브라우저는 알림을 지원하지 않아요.",
                              );
                            const p = await Notification.requestPermission();
                            if (p !== "granted")
                              throw new Error("알림 권한이 허용되지 않았어요.");
                          }
                          await change((v) => {
                            v.preferences.reminders = checked;
                          });
                        });
                      }}
                    />
                  </label>
                </Card>
                <Card>
                  <SectionTitle title="데이터 모드" />
                  <p className="muted">
                    가상 체험 기록과 개인 기록은 별도의 저장 공간을 사용합니다.
                  </p>
                  <div className="mode-options">
                    <button
                      className={mode === "demo" ? "selected" : ""}
                      onClick={() => switchMode("demo")}
                    >
                      <Sparkles size={20} />
                      <strong>가상 데이터 체험</strong>
                      <small>14일 예시 + 내가 체험한 입력</small>
                    </button>
                    <button
                      className={mode === "personal" ? "selected" : ""}
                      onClick={() => switchMode("personal")}
                    >
                      <ShieldCheck size={20} />
                      <strong>개인 로컬 기록</strong>
                      <small>빈 기록부터, 이 브라우저에만</small>
                    </button>
                  </div>
                </Card>
                <Card>
                  <SectionTitle title="온라인 계정 · 선택 사항" />
                  <Tag tone={cloud ? "green" : "muted"}>
                    {cloud ? "Supabase 연결 설정 있음" : "클라우드 미연결"}
                  </Tag>
                  <p className="muted">
                    온라인 기능은 이메일 인증 후 수동 백업/복원 방식입니다. 가상
                    데이터 업로드는 제공하지 않아요. 자동 동기화·실시간 그룹은
                    아직 지원하지 않습니다.
                  </p>
                  {!cloud ? (
                    <p className="small">
                      개발자가 .env의 Supabase 설정과 SQL 마이그레이션을 적용한
                      뒤 사용할 수 있어요.
                    </p>
                  ) : cloudUser ? (
                    <>
                      <p>로그인: {cloudUser}</p>
                      <div className="inline-actions">
                        <Button
                          disabled={mode === "demo"}
                          onClick={() =>
                            notify(
                              () => uploadSnapshot(d),
                              "개인 기록을 온라인에 백업했어요",
                            )
                          }
                        >
                          개인 기록 백업
                        </Button>
                        <Button
                          variant="outline"
                          disabled={mode === "demo"}
                          onClick={() => setDialog({ kind: "restore" })}
                        >
                          온라인 기록 복원
                        </Button>
                        <Button
                          variant="light"
                          onClick={() =>
                            notify(
                              () => cloud!.auth.signOut(),
                              "로그아웃했어요",
                            )
                          }
                        >
                          로그아웃
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setDialog({ kind: "cloudDelete" })}
                        >
                          온라인 기록 삭제
                        </Button>
                      </div>
                    </>
                  ) : (
                    <form
                      className="inline-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        void notify(
                          () => signIn(String(f.get("email"))),
                          "로그인 링크를 이메일로 보냈어요",
                        );
                      }}
                    >
                      <input
                        name="email"
                        type="email"
                        aria-label="로그인 이메일"
                        placeholder="이메일 주소"
                        required
                      />
                      <Button type="submit">로그인 링크 받기</Button>
                    </form>
                  )}
                </Card>
              </div>
              <div className="stack">
                <Card>
                  <SectionTitle
                    icon={<ShieldCheck size={18} />}
                    title="내 정보는 내 손으로"
                  />
                  <div className="privacy-item">
                    <Check size={16} />
                    <span>별명 외 실명·학교·위치 정보 수집 없음</span>
                  </div>
                  <div className="privacy-item">
                    <Check size={16} />
                    <span>수동 기록과 규칙 분석은 브라우저 안에서</span>
                  </div>
                  <div className="privacy-item">
                    <Check size={16} />
                    <span>외부 AI 전송·광고 추적·기기 감시 없음</span>
                  </div>
                  <label className="toggle-row">
                    <span>
                      연구용 내보내기 준비
                      <small>
                        켜도 자동 전송하지 않아요. 닉네임 없는 CSV를 직접
                        다운로드합니다.
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      checked={d.preferences.research}
                      onChange={(e) =>
                        mutate((v) => {
                          v.preferences.research = e.target.checked;
                        })
                      }
                    />
                  </label>
                  <div className="inline-actions">
                    <Button
                      variant="outline"
                      onClick={() =>
                        download(
                          `mindtrace-${mode}-${today}.json`,
                          JSON.stringify(d, null, 2),
                          "application/json",
                        )
                      }
                    >
                      <Download size={15} />
                      전체 JSON
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        download(
                          `mindtrace-${mode}-${today}.csv`,
                          csvExport(d),
                          "text/csv;charset=utf-8",
                        )
                      }
                    >
                      <Download size={15} />
                      기록 CSV
                    </Button>
                  </div>
                  <p className="muted small">
                    로컬 기록은 브라우저 데이터를 지우면 사라질 수 있어요.
                    필요한 기록은 직접 백업해 주세요. 공동 기기에서는 삭제 후
                    종료하는 것이 좋아요.
                  </p>
                  <Button
                    variant="danger"
                    onClick={() => setDialog({ kind: "delete" })}
                  >
                    <Trash2 size={15} />
                    현재 모드 기록 삭제
                  </Button>
                </Card>
                <Card>
                  <SectionTitle title="지원 범위" />
                  <p>웹앱: 수동 기록 · 타이머 · 플래너 · 규칙 코치</p>
                  <p className="muted small">
                    Android UsageStats, 다른 앱 차단, 카메라, 웨어러블, 실시간
                    그룹은 현재 연결되어 있지 않습니다. 이 웹앱은 의학적 진단
                    도구가 아닙니다.
                  </p>
                </Card>
              </div>
            </div>
          )}
          <footer className="page-footer">
            <span>
              mindtrace. <span className="muted">나의 속도로, 균형 있게.</span>
            </span>
            <span>
              <ShieldCheck size={13} />
              {mode === "demo"
                ? "가상 예시 + 체험 입력"
                : "브라우저 로컬 저장"}{" "}
              · 외부 AI 전송 없음
            </span>
          </footer>
        </main>
        {d.active && page !== "timer" && page !== "home" && (
          <div className="floating-timer">
            <span className="pulse" />
            <strong>
              {currentSubject?.name} · {secondsText(elapsed)}
            </strong>
            <button className="text-btn" onClick={() => go("timer")}>
              타이머로 이동
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {!d.profile.onboarded && (
        <Modal
          title="공부도, 쉼도, 나답게."
          close={() =>
            void mutate((v) => {
              v.profile.onboarded = true;
            })
          }
          submit="나의 균형 시작하기"
          onSubmit={(f) =>
            change((v) => {
              v.profile.nickname = assertText(
                String(f.get("nickname")),
                "닉네임",
                16,
              );
              v.profile.goal = assertNumber(
                Number(f.get("goal")),
                10,
                720,
                "목표",
              );
              v.profile.sleepTime = String(f.get("sleep"));
              v.profile.onboarded = true;
            })
          }
        >
          <div className="onboarding-art">
            <Flower2 size={45} />
            <Sparkles size={23} />
          </div>
          <p>MindTrace는 나의 공부와 디지털 습관을 함께 돌아보는 공간이에요.</p>
          <div className="notice">
            {mode === "demo"
              ? "지금은 시연용 가상 데이터 모드예요. 개인 기록은 설정에서 별도로 시작할 수 있어요."
              : "지금은 빈 개인 로컬 모드예요. 모든 기록은 이 브라우저에만 저장해요."}
          </div>
          <Field label="어떻게 불러드릴까요?">
            <input
              autoFocus
              name="nickname"
              defaultValue={d.profile.nickname}
              maxLength={16}
              required
            />
          </Field>
          <div className="form-grid">
            <Field label="하루 공부 목표 (분)">
              <input
                name="goal"
                type="number"
                min={10}
                max={720}
                defaultValue={d.profile.goal}
                required
              />
            </Field>
            <Field label="취침 목표">
              <input
                name="sleep"
                type="time"
                defaultValue={d.profile.sleepTime}
                required
              />
            </Field>
          </div>
          <p className="muted small">
            사용 이유·생활 기록은 선택이에요. 웹에서는 다른 앱을 감시하거나
            차단하지 않아요. 외부 AI 전송 없이 로컬에서 분석합니다.
          </p>
        </Modal>
      )}
      {dialog &&
        (() => {
          const close = () => setDialog(null);
          const item = dialog.item as any;
          const SubjectSelect = ({ value }: { value?: string }) => (
            <Field label="과목">
              <select
                name="subjectId"
                defaultValue={value ?? subjects[0]?.id}
                required
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          );
          if (dialog.kind === "subject")
            return (
              <Modal
                title={item ? "과목 수정" : "나의 과목 추가"}
                close={close}
                onSubmit={(f) =>
                  change((v) =>
                    saveSubject(v, {
                      id: item?.id ?? uid(),
                      name: String(f.get("name")),
                      color: String(f.get("color")),
                    }),
                  )
                }
              >
                <Field label="과목 이름">
                  <input
                    name="name"
                    defaultValue={item?.name}
                    required
                    maxLength={20}
                  />
                </Field>
                <Field label="과목 색상">
                  <input
                    name="color"
                    type="color"
                    defaultValue={
                      item?.color ?? palette[subjects.length % palette.length]
                    }
                  />
                </Field>
              </Modal>
            );
          if (dialog.kind === "task")
            return (
              <Modal
                title={item ? "할 일 수정" : "작은 계획 추가"}
                close={close}
                onSubmit={(f) =>
                  change((v) => {
                    const task: Task = {
                      id: item?.id ?? uid(),
                      title: assertText(String(f.get("title")), "할 일"),
                      subjectId: String(f.get("subjectId")),
                      day: String(f.get("day")),
                      priority: String(f.get("priority")) as Task["priority"],
                      done: item?.done ?? false,
                      source: item?.source ?? source,
                    };
                    if (
                      !v.subjects.some(
                        (s) => s.id === task.subjectId && !s.archived,
                      )
                    )
                      throw new Error("과목을 먼저 추가해 주세요.");
                    const idx = v.tasks.findIndex((x) => x.id === task.id);
                    if (idx < 0) v.tasks.push(task);
                    else v.tasks[idx] = task;
                  })
                }
              >
                <Field label="할 일">
                  <input
                    name="title"
                    required
                    maxLength={80}
                    defaultValue={item?.title}
                  />
                </Field>
                <SubjectSelect value={item?.subjectId} />
                <div className="form-grid">
                  <Field label="목표 날짜">
                    <input
                      name="day"
                      type="date"
                      required
                      defaultValue={item?.day ?? selectedDay}
                    />
                  </Field>
                  <Field label="우선순위">
                    <select
                      name="priority"
                      defaultValue={item?.priority ?? "보통"}
                    >
                      {["높음", "보통", "낮음"].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                {item && (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      void mutate((v) => {
                        v.tasks = v.tasks.filter((x) => x.id !== item.id);
                      });
                      close();
                    }}
                  >
                    이 할 일 삭제
                  </Button>
                )}
              </Modal>
            );
          if (dialog.kind === "block")
            return (
              <Modal
                title={item?.id ? "계획 수정" : "10분 계획 추가"}
                close={close}
                onSubmit={(f) =>
                  change((v) =>
                    saveBlock(v, {
                      id: item?.id ?? uid(),
                      title: assertText(String(f.get("title")), "계획"),
                      subjectId: String(f.get("subjectId")),
                      ...blockFromTimes(
                        String(f.get("day")),
                        String(f.get("start")),
                        String(f.get("end")),
                      ),
                      source: item?.source ?? source,
                    }),
                  )
                }
              >
                <Field label="계획 이름">
                  <input
                    name="title"
                    defaultValue={item?.title}
                    required
                    maxLength={80}
                  />
                </Field>
                <SubjectSelect value={item?.subjectId} />
                <Field label="날짜">
                  <input
                    name="day"
                    type="date"
                    defaultValue={
                      item?.start ? dayKey(item.start) : selectedDay
                    }
                    required
                  />
                </Field>
                <div className="form-grid">
                  <Field label="시작">
                    <input
                      name="start"
                      type="time"
                      step={600}
                      defaultValue={item?.start ? time(item.start) : "09:00"}
                      required
                    />
                  </Field>
                  <Field label="종료">
                    <input
                      name="end"
                      type="time"
                      step={600}
                      defaultValue={item?.end ? time(item.end) : "09:50"}
                      required
                    />
                  </Field>
                </div>
                <p className="small muted">
                  종료가 시작보다 이르면 다음 날로 기록해요. 시간은 10분
                  단위이며 다른 계획과 겹칠 수 없어요.
                </p>
              </Modal>
            );
          if (dialog.kind === "usage")
            return (
              <Modal
                title={item ? "사용 기록 수정" : "잠깐, 왜 사용했을까요?"}
                close={close}
                onSubmit={(f) =>
                  change((v) =>
                    saveUsage(v, {
                      id: item?.id ?? uid(),
                      app: String(f.get("app")),
                      at: new Date(String(f.get("at"))).getTime(),
                      minutes: Number(f.get("minutes")),
                      reason: String(f.get("reason")),
                      source: item?.source ?? source,
                    }),
                  )
                }
              >
                <Field label="앱 또는 활동">
                  <input
                    name="app"
                    placeholder="예: SNS, 동영상"
                    defaultValue={item?.app}
                    required
                    maxLength={30}
                  />
                </Field>
                <div className="form-grid">
                  <Field label="사용 시작 시각">
                    <input
                      name="at"
                      type="datetime-local"
                      defaultValue={`${dayKey(item?.at ?? now)}T${time(item?.at ?? now)}`}
                      required
                    />
                  </Field>
                  <Field label="사용 시간 (분)">
                    <input
                      name="minutes"
                      type="number"
                      min={1}
                      max={720}
                      defaultValue={item?.minutes ?? 10}
                      required
                    />
                  </Field>
                </div>
                <Field label="사용 이유">
                  <select name="reason" defaultValue={item?.reason ?? "기타"}>
                    {[
                      "심심해서",
                      "습관적으로",
                      "알림 때문에",
                      "불안해서",
                      "목적 있는 사용",
                      "기타",
                    ].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
                <p className="muted small">
                  이 기록은{" "}
                  {mode === "demo" ? "가상 데이터 체험 공간" : "개인 로컬 공간"}
                  에만 저장해요. 이유를 밝히고 싶지 않으면 ‘기타’를 골라도
                  괜찮아요.
                </p>
              </Modal>
            );
          if (dialog.kind === "event")
            return (
              <Modal
                title={item ? "일정 수정" : "다가오는 목표 추가"}
                close={close}
                onSubmit={(f) =>
                  change((v) => {
                    const ev = {
                      id: item?.id ?? uid(),
                      title: assertText(String(f.get("title")), "일정 이름"),
                      day: String(f.get("day")),
                    };
                    const idx = v.events.findIndex((x) => x.id === ev.id);
                    if (idx < 0) v.events.push(ev);
                    else v.events[idx] = ev;
                  })
                }
              >
                <Field label="일정 이름">
                  <input name="title" required defaultValue={item?.title} />
                </Field>
                <Field label="날짜">
                  <input
                    name="day"
                    type="date"
                    defaultValue={item?.day ?? addDays(today, 7)}
                    required
                  />
                </Field>
              </Modal>
            );
          if (dialog.kind === "mission")
            return (
              <Modal
                title={item ? "나에게 맞게 실천 수정" : "나만의 작은 실천"}
                close={close}
                onSubmit={(f) =>
                  change((v) => {
                    const m = {
                      id: item?.id ?? uid(),
                      title: assertText(String(f.get("title")), "실천 이름"),
                      reason: assertText(String(f.get("reason")), "이유", 200),
                      status: item?.status ?? "accepted",
                      source: item?.source ?? source,
                    };
                    const idx = v.missions.findIndex((x) => x.id === m.id);
                    if (idx < 0) v.missions.push(m);
                    else v.missions[idx] = m;
                  })
                }
              >
                <Field label="무엇을 해볼까요?">
                  <input name="title" required defaultValue={item?.title} />
                </Field>
                <Field label="나에게 필요한 이유">
                  <textarea
                    name="reason"
                    required
                    maxLength={200}
                    defaultValue={item?.reason ?? "나만의 생활 균형을 위해"}
                  />
                </Field>
              </Modal>
            );
          if (dialog.kind === "group")
            return (
              <Modal
                title="가상 스터디 그룹 만들기"
                close={close}
                onSubmit={(f) =>
                  change((v) => {
                    if (mode !== "demo")
                      throw new Error("가상 체험 모드에서만 만들 수 있어요.");
                    v.groups.push({
                      id: uid(),
                      name: assertText(String(f.get("name")), "그룹 이름", 30),
                      goal: assertNumber(
                        Number(f.get("goal")),
                        10,
                        10080,
                        "공동 목표",
                      ),
                      code: uid().slice(0, 8).toUpperCase(),
                      share: false,
                      checkedInDay: null,
                    });
                  })
                }
              >
                <Field label="그룹 이름">
                  <input name="name" required maxLength={30} />
                </Field>
                <Field label="주간 공동 목표 (분)">
                  <input
                    name="goal"
                    type="number"
                    defaultValue={600}
                    min={10}
                    max={10080}
                    required
                  />
                </Field>
                <p className="muted small">
                  현재 브라우저 안에서만 만드는 가상 그룹입니다. 실제 다른
                  사용자가 참여하지 않습니다.
                </p>
              </Modal>
            );
          if (dialog.kind === "join")
            return (
              <Modal
                title="시연 코드로 가입"
                close={close}
                submit="코드 확인"
                onSubmit={(f) => {
                  const code = String(f.get("code")).trim().toUpperCase();
                  if (!d.groups.some((g) => g.code === code))
                    throw new Error(
                      "이 브라우저에 해당 가상 그룹이 없어요. 그룹을 먼저 만들어 주세요.",
                    );
                  setToast("이 브라우저에서 이미 참여 중인 가상 그룹이에요.");
                }}
              >
                <Field label="현재 브라우저의 가상 그룹 코드">
                  <input name="code" required />
                </Field>
                <p className="muted small">
                  기기 간 가입 기능은 아직 연결되지 않았습니다.
                </p>
              </Modal>
            );
          if (dialog.kind === "delete")
            return (
              <Modal
                title="현재 모드 기록을 지울까요?"
                close={close}
                submit="기록 삭제"
                onSubmit={async (f) => {
                  if (f.get("confirm") !== "삭제")
                    throw new Error("‘삭제’를 정확히 입력해 주세요.");
                  await reset();
                  setToast("현재 모드 기록을 삭제했어요.");
                }}
              >
                <p>
                  {mode === "demo" ? "가상 체험" : "개인 로컬"} 모드의
                  공부·사용·생활 기록과 설정을 삭제합니다. 다른 모드 및 온라인
                  백업은 그대로 남아요.
                </p>
                <Field label="확인을 위해 삭제를 입력해 주세요">
                  <input name="confirm" required autoComplete="off" />
                </Field>
              </Modal>
            );
          if (dialog.kind === "cloudDelete")
            return (
              <Modal
                title="온라인 백업을 삭제할까요?"
                close={close}
                submit="온라인 기록 삭제"
                onSubmit={async (f) => {
                  if (f.get("confirm") !== "삭제")
                    throw new Error("‘삭제’를 입력해 주세요.");
                  await deleteCloudData();
                  setToast(
                    "온라인 백업을 삭제했어요. 로컬 기록은 남아 있어요.",
                  );
                }}
              >
                <p>
                  로그인 계정의 백업만 삭제합니다. Supabase 인증 계정 자체의
                  탈퇴는 관리자 설정이 필요합니다.
                </p>
                <Field label="삭제 입력">
                  <input name="confirm" required />
                </Field>
              </Modal>
            );
          if (dialog.kind === "restore")
            return (
              <Modal
                title="온라인 백업으로 복원할까요?"
                close={close}
                submit="덮어쓰고 복원"
                onSubmit={async () => {
                  if (mode !== "personal")
                    throw new Error("개인 로컬 모드에서만 복원할 수 있어요.");
                  const incoming = await downloadSnapshot();
                  await change((v) => {
                    Object.assign(v, incoming);
                    v.active = null;
                  });
                  setToast(
                    "백업을 개인 로컬 모드로 복원했어요. 진행 중 타이머는 복원하지 않아요.",
                  );
                }}
              >
                <p>
                  현재 개인 로컬 기록을 온라인 백업으로 덮어씁니다. 먼저
                  JSON으로 내보내기를 권합니다. 가상 모드의 기록은 유지돼요.
                </p>
              </Modal>
            );
          return null;
        })()}
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
  detail,
  tone,
  children,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
  tone: string;
  children?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <section
      className={`metric card ${onClick ? "clickable" : ""}`}
      onClick={onClick}
    >
      <div className="metric-top">
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}>{icon}</span>
      </div>
      <div className="metric-value">{value}</div>
      <p>{detail}</p>
      {children}
      {onClick && (
        <button
          className="cover-btn"
          aria-label="웰빙 지표 계산법 보기"
          onClick={onClick}
        />
      )}
    </section>
  );
}
function SectionTitle({
  icon,
  title,
  aside,
}: {
  icon?: ReactNode;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="section-title">
      <h2>
        {icon}
        {title}
      </h2>
      {aside}
    </div>
  );
}
function Empty({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="empty">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
function Comparison({
  label,
  current,
  previous,
  unit,
  lower = false,
}: {
  label: string;
  current: number;
  previous: number;
  unit: string;
  lower?: boolean;
}) {
  const delta = previous
    ? Math.round(((current - previous) / previous) * 100)
    : null;
  return (
    <Card>
      <span className="muted small">{label}</span>
      <div className="metric-value">
        {Math.round(current)}
        <span className="metric-unit"> {unit}</span>
      </div>
      <div
        className={`comparison ${delta !== null && (lower ? delta <= 0 : delta >= 0) ? "positive" : ""}`}
      >
        {delta === null ? (
          <span>이전 기간 기준 없음 · 변화율 미산출</span>
        ) : (
          <>
            {delta <= 0 ? (
              <ArrowDownRight size={15} />
            ) : (
              <ArrowUpRight size={15} />
            )}{" "}
            {Math.abs(delta)}% {delta <= 0 ? "감소" : "증가"}{" "}
            <span className="muted">
              · 이전 {Math.round(previous)}
              {unit}
            </span>
          </>
        )}
      </div>
    </Card>
  );
}
