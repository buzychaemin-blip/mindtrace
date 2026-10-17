# API 및 저장 계약

이 버전에는 별도 REST/FastAPI 서버가 없습니다. UI → `change(fn)` → 도메인 검증 → IndexedDB 트랜잭션이 기본 CRUD 계약입니다. 로컬이므로 로그인 없이 해당 브라우저 사용자가 접근합니다. 공개 인터넷 API가 있는 것처럼 표시하지 않습니다.

## 로컬 작업

| 작업 | 계약 |
|---|---|
| 과목 생성/수정/보관 | `saveSubject`, `removeSubject`; 1~20자, hex 색상, 진행 중 과목 보관 거부 |
| 타이머 | `startTimer`, `pauseTimer`, `resumeTimer`, `finishTimer`, `switchPhase`; 단일 active, 중복 id 종료 방지 |
| 계획 | `saveBlock`, `blockFromTimes`; 10분 단위, 최대 24시간, 자정 전환, 겹침 거부 |
| 할 일/일정/미션 | 모드별 트랜잭션; 필수 텍스트/날짜, 사용자 완료/수정/거절 |
| 사용 기록 | `saveUsage`; 활동 이름 1~30자, 1~720분, 미래 기록 거부, 이유 enum |
| 통계 | `dailyStudy`, `metrics`, `wellbeing`, `insights`; 조회만 수행 |
| 내보내기/삭제 | `csvExport` / 전체 JSON; reset은 선택 모드만 교체 |

`validateData`는 로컬 복구·온라인 복원 시 중첩 자료의 타입과 숫자 범위를 검사합니다. 저장 실패는 오류로 알리고 성공 토스트를 표시하지 않습니다. 브라우저 캐시는 원본 저장의 기준이 아닙니다.

## 선택 Supabase

- 인증: `auth.signInWithOtp({email, options:{emailRedirectTo}})`, `getUser`, `signOut`.
- 업로드: 인증 후 `user_workspaces.upsert({user_id, payload, updated_at})`.
- 다운로드: 인증 후 본인 user_id의 payload 한 행. 검증 후 로컬 복원은 별도 확인.
- 삭제: 인증 후 본인 user_id 행 삭제. 인증 계정 자체 삭제는 별도 관리자 절차.
- RLS: `auth.uid() = user_id`를 USING/WITH CHECK 모두에 적용; 익명 권한 없음.
- 서버 DB는 JSON 크기/기본 형태를 제한합니다. 상세 타이머 검증은 도메인 로직 및 정상화 테이블 제약이며, 스냅샷 안 모든 개별 이벤트를 서버에서 검증하는 API는 아직 없습니다.

실제 Supabase 연결·SMTP·로그인 리다이렉트·RLS 다중 계정 검사는 미실행입니다. API 키 없이 실행 가능한 경로는 로컬 모드입니다.
