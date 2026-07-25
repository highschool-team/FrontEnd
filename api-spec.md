# FinOps Guard API 명세서

Base URL: `https://api.finops.io/api`  
인증: `Authorization: Bearer {access_token}` (모든 API 공통)

---

## 1. 인증 (Auth)

### POST /auth/login
로그인 및 토큰 발급

**Request**
```json
{
  "email": "admin@company.com",
  "password": "string"
}
```
**Response 200**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": "64a1...",
    "email": "admin@company.com",
    "role": "techlead",
    "team_id": null
  }
}
```

---

### POST /auth/refresh
액세스 토큰 재발급

**Request**
```json
{ "refresh_token": "eyJ..." }
```
**Response 200**
```json
{ "access_token": "eyJ..." }
```

---

### POST /auth/logout
로그아웃 (토큰 블랙리스트 등록)

**Response 204** No Content

---

## 2. 팀 (Teams)

### GET /teams
팀 목록 조회
- `techlead`: 전체 팀
- `partlead`, `member`: 본인 팀만

**Response 200**
```json
[
  {
    "id": "64a1...",
    "name": "프론트엔드팀",
    "budget": 50,
    "spent": 11.2,
    "providers": [
      {
        "name": "Anthropic",
        "color": "#d97757",
        "limit": 30,
        "spent": 7.1,
        "selected_model": "Claude Sonnet 4.6",
        "allowed_models": ["Claude Opus 4.7", "Claude Sonnet 4.6", "Claude Haiku 4.5"]
      }
    ],
    "status": "ACTIVE"
  }
]
```

---

### GET /teams/:id
팀 단건 조회

**Response 200** — 팀 객체 (위와 동일)

---

### PUT /teams/:id/budget
팀 예산 수정 (`techlead` 전용)

**Request**
```json
{ "budget": 80 }
```
**Response 200**
```json
{ "id": "64a1...", "budget": 80 }
```

---

### POST /teams/:id/providers
팀에 AI 프로바이더 추가 (`techlead` 전용)

**Request**
```json
{ "name": "OpenAI" }
```
**Response 201**
```json
{
  "name": "OpenAI",
  "color": "#10a37f",
  "limit": 10,
  "spent": 0,
  "selected_model": null,
  "allowed_models": ["GPT-4o", "GPT-4o-mini", "o3-mini"]
}
```

---

### DELETE /teams/:id/providers/:provider_name
팀에서 프로바이더 제거 (`techlead` 전용)

**Response 204** No Content

---

### PUT /teams/:id/providers/:provider_name/limit
프로바이더 예산 한도 수정 (`techlead`, `partlead`)

**Request**
```json
{ "limit": 25 }
```
**Response 200**
```json
{ "name": "OpenAI", "limit": 25 }
```
**Response 400** — 팀 예산 초과 시
```json
{ "error": "limit_exceeded", "message": "프로바이더 한도 합계가 팀 예산을 초과합니다" }
```

---

### PUT /teams/:id/providers/:provider_name/model
사용 모델 선택 (`techlead`, `partlead`)

**Request**
```json
{ "selected_model": "GPT-4o" }
```
**Response 200**
```json
{ "name": "OpenAI", "selected_model": "GPT-4o" }
```

---

## 3. AI API 프록시 (Proxy)

### POST /proxy/openai/*
OpenAI API 프록시 (모든 경로 포워딩)

**Request** — OpenAI 원본 요청 그대로
```json
{
  "model": "gpt-4o",
  "messages": [{ "role": "user", "content": "Hello" }]
}
```
**Response 200** — OpenAI 원본 응답 그대로  
**Response 429** — 한도 초과
```json
{
  "error": "quota_exceeded",
  "message": "OpenAI 프로바이더 한도($25)를 초과했습니다",
  "limit": 25,
  "spent": 25.1
}
```
**Response 403** — 모델 미허용
```json
{
  "error": "model_not_allowed",
  "message": "GPT-4o는 이 팀에서 허용되지 않는 모델입니다"
}
```

---

### POST /proxy/anthropic/*
Anthropic API 프록시

**Response 429**, **403** — 위와 동일 구조

---

### POST /proxy/gemini/*
Google Gemini API 프록시

**Response 429**, **403** — 위와 동일 구조

---

## 4. 사용량 (Usage)

### GET /dashboard/overview
전사 예산 현황 (`techlead` 전용)

**Response 200**
```json
{
  "company_budget": 500,
  "total_spent": 71.8,
  "total_allocated": 240,
  "blocked_teams": 0,
  "teams_summary": [
    { "team": "프론트엔드팀", "budget": 50, "spent": 11.2, "status": "ACTIVE" }
  ]
}
```

---

### GET /teams/:id/usage
팀 사용량 조회

**Query Params**
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| period | string | `day` | `day` / `week` / `month` |
| metric | string | `cost` | `cost` / `calls` |

**Response 200**
```json
{
  "team_id": "64a1...",
  "period": "week",
  "total_cost": 78.4,
  "total_calls": 12400,
  "by_provider": [
    { "name": "Anthropic", "cost": 49.7, "calls": 8200 },
    { "name": "Gemini",    "cost": 28.7, "calls": 4200 }
  ],
  "chart_data": [
    { "label": "Mon", "Anthropic": 8.2, "Gemini": 4.1 }
  ]
}
```

---

### GET /teams/:id/members/usage
팀원별 사용량 (`techlead`, `partlead`)

**Response 200**
```json
[
  {
    "user_id": "64b2...",
    "name": "박팀원",
    "used": 3.8,
    "limit": 12.5,
    "calls": 620,
    "contribution_pct": 33.9
  }
]
```

---

## 5. 보안 알림 (Security)

### GET /alerts
보안 알림 목록

**Query Params**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| status | string | `unread` / `read` / `all` |
| severity | string | `high` / `medium` / `low` |
| limit | integer | 기본 50 |

**Response 200**
```json
[
  {
    "id": "64c3...",
    "type": "quota_warning",
    "severity": "high",
    "team": "백엔드팀",
    "provider": "Anthropic",
    "message": "Anthropic 한도 92% 도달",
    "created_at": "2026-07-24T09:31:00Z",
    "read": false
  }
]
```

---

### PATCH /alerts/:id/read
알림 읽음 처리

**Response 200**
```json
{ "id": "64c3...", "read": true }
```

---

### GET /alerts/stream
SSE 실시간 알림 스트림

**Response** `text/event-stream`
```
data: {"type":"quota_warning","team":"백엔드팀","provider":"Anthropic","message":"한도 92% 도달"}

data: {"type":"blocked","team":"QA팀","provider":"Anthropic","message":"한도 초과로 차단됨"}
```

---

## 6. 프로비저닝 (Provisioning)

### POST /provisioning/onboard
입사 프로세스 실행

**Request**
```json
{ "email": "newuser@company.com" }
```
**Response 202** — 비동기 처리 시작
```json
{
  "task_id": "task_abc123",
  "email": "newuser@company.com",
  "status": "processing"
}
```

---

### POST /provisioning/offboard
퇴사 프로세스 실행

**Request**
```json
{
  "email": "user@company.com",
  "figma_transfer_to": "manager@company.com"
}
```
**Response 202**
```json
{
  "task_id": "task_def456",
  "email": "user@company.com",
  "status": "processing"
}
```

---

### GET /provisioning/tasks/:task_id
프로비저닝 진행 상태 조회

**Response 200**
```json
{
  "task_id": "task_abc123",
  "status": "processing",
  "steps": [
    { "service": "Google Workspace", "status": "done" },
    { "service": "Slack",            "status": "done" },
    { "service": "Figma",            "status": "processing" },
    { "service": "GitHub",           "status": "pending" },
    { "service": "Notion",           "status": "pending" }
  ]
}
```

---

### GET /provisioning/tasks/:task_id/stream
SSE로 프로비저닝 단계별 진행 상황 수신

**Response** `text/event-stream`
```
data: {"service":"Slack","status":"done"}

data: {"service":"Figma","status":"processing"}
```

---

## 공통 에러 응답

| 상태 코드 | 의미 |
|---------|------|
| 400 | 잘못된 요청 파라미터 |
| 401 | 인증 토큰 없음 또는 만료 |
| 403 | 권한 없음 (role 불일치) |
| 404 | 리소스 없음 |
| 429 | AI API 한도 초과 |
| 500 | 서버 내부 오류 |

**에러 응답 형식**
```json
{
  "error": "error_code",
  "message": "사람이 읽을 수 있는 설명"
}
```

---

## 권한 매트릭스

| 엔드포인트 | techlead | partlead | member | devops |
|-----------|:--------:|:--------:|:------:|:------:|
| GET /teams (전체) | ✓ | — | — | — |
| GET /teams (본인) | ✓ | ✓ | ✓ | — |
| PUT /teams/:id/budget | ✓ | — | — | — |
| POST /teams/:id/providers | ✓ | — | — | — |
| PUT .../limit | ✓ | ✓ | — | — |
| PUT .../model | ✓ | ✓ | — | — |
| GET /dashboard/overview | ✓ | — | — | ✓ |
| GET /teams/:id/usage | ✓ | ✓ | — | ✓ |
| GET /alerts | ✓ | — | — | ✓ |
| GET /alerts/stream | ✓ | — | — | ✓ |
| POST /provisioning/* | ✓ | — | — | ✓ |
