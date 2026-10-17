# MindTrace · 공부도, 쉼도, 나답게

한국코드페어를 위한 디지털 습관·자기주도 학습 웹 프로토타입입니다. 기록한 공부·휴식·디지털 사용 이유를 연결해 사용자가 스스로 실천을 고르도록 돕습니다. 외부 AI 키 없이 설명 가능한 규칙 코치가 동작합니다.

## 실행

Node.js 22 이상, npm이 필요합니다. Windows에서는 `start.cmd`를 실행하거나:

```powershell
cd C:\Users\SW\Desktop\dntmd\mindtrace
npm.cmd ci
npm.cmd run dev
```

브라우저에서 https://mindtrace-balance.edupro79618.chatgpt.site 을 여세요. 처음에는 `시연용 가상 데이터` 모드입니다. 닉네임과 목표를 정한 뒤 체험합니다. 설정 → `개인 로컬 기록`을 선택하면 별도 빈 저장 공간으로 시작합니다. 데모 계정이나 비밀번호는 필요 없습니다.

## 동작하는 기능

- 한국어 12개 화면, 모바일 반응형, 다크 모드, 키보드 탐색 및 대화상자
- 과목 추가/수정/보관과 기록 유지
- 스톱워치, 집중/휴식 뽀모도로, 일시정지/재개/종료, 새로고침 복구, 다중 탭 동시 시작 보호
- 10분 계획 추가/수정/삭제, 시간 겹침 검사, 자정 경계와 실제 공부 구간 표시
- 과목별 할 일·날짜·우선순위·완료, 시험 D-Day
- 일/주/월 공부 그래프·과목 합계·84일 히트맵
- 사용 이유/시간 수동 기록과 수정/삭제, 시간대별·이유별 통계
- 근거를 표시하는 규칙 코치, 수락/수정/완료/거절할 수 있는 미션
- 휴식·취침 목표 자기보고, 결측 제외 웰빙 점수와 공개 산식
- 이전 7일/최근 7일 비교, JSON/CSV 내보내기, 현재 모드 삭제
- 로컬 그룹 시뮬레이션: 그룹 만들기, 코드 확인, 공동 목표, 공유 OFF 기본값, 자율 체크인, 나가기

**그룹은 실제 다중 사용자 서비스가 아닙니다.** 기기 전체 사용량 자동 수집·다른 앱 차단·Android 앱·캠스터디는 구현하지 않았습니다. 결과는 건강 상태나 임상 효과를 의미하지 않습니다.

## 데이터 보관

IndexedDB가 기록의 기준 저장소이며 readwrite 트랜잭션으로 여러 탭의 변경을 직렬화합니다. localStorage는 빠른 시작 캐시 및 탭 간 변경 알림에 사용합니다. 가상/개인 모드는 독립 키를 사용합니다. 초기 가상 데이터의 출처는 `demo`, 직접 추가한 데이터는 어느 모드에서든 `manual`입니다. 주소(오리진)별로 저장 공간이 다르므로 로컬 주소와 배포 주소의 기록은 자동으로 공유되지 않습니다. 공유 기기와 브라우저 삭제에 주의하고 필요한 기록은 내보내세요.

브라우저에서 로컬 서버가 실행 중이면 핵심 기능에 인터넷이 필요 없습니다. 웹폰트 다운로드가 불가능하면 시스템 폰트를 사용합니다. 설치형 PWA 또는 서버 없이 파일을 더블클릭하는 앱은 아닙니다.

## 선택 온라인 계정

1. Supabase 프로젝트에서 `supabase/migrations/001_private_workspace.sql`을 검토하고 실행합니다.
2. `.env.example`을 `.env.local`로 복사해 프로젝트 URL과 anon/publishable 키를 넣습니다. **service_role 키를 넣지 마세요.**
3. Supabase Auth의 Redirect URL에 로컬/배포 주소를 등록하고 웹을 다시 시작/빌드합니다.
4. 설정 → 이메일 로그인 후 **개인 모드**에서 수동 백업/복원/온라인 기록 삭제를 사용합니다.

선택 어댑터는 구현했으나 실제 Supabase 프로젝트/두 계정으로 검증하지 않았습니다. 자동 동기화와 실시간 그룹은 제공하지 않습니다. 정상화 테이블은 후속 서버 작업을 위한 스키마이며 현재 앱은 `user_workspaces` 스냅샷만 사용합니다.

## 검증 명령

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e
```

Windows E2E는 기본 Chrome 설치 경로를 사용합니다. 다른 브라우저 경로는 `$env:PLAYWRIGHT_EXECUTABLE_PATH='경로'`로 지정합니다. Linux/macOS는 `npx playwright install chromium` 후 실행할 수 있습니다. 실제 검증 범위는 [TEST_REPORT](docs/TEST_REPORT.md)를 보세요.

## 문서

- [구현 계획과 완료 상태](docs/IMPLEMENTATION_PLAN.md)
- [아키텍처](docs/ARCHITECTURE.md), [API/저장 계약](docs/API_SPEC.md)
- [AI 지표와 한계](docs/AI_DESIGN.md), [개인정보와 데이터 경계](docs/PRIVACY_AND_SAFETY.md)
- [3분 시연 대본](docs/KCF_DEMO_SCRIPT.md), [미구현·미검증 범위](docs/KNOWN_LIMITATIONS.md)

기존 REA 리포와 별도로 만든 독자적 구현이며, 열품타의 이름·화면·소스·에셋을 복제하지 않았습니다.
