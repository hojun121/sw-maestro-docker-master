# 03. compose가 빌드까지 — build: 지시어와 이미지 캐시의 함정

## 학습 목표

`build:` 지시어로 compose 파일을 **빌드 + 실행의 단일 진실 공급원(single source of truth)**으로 만들고, "코드를 고쳤는데 반영이 안 되는" 이미지 캐시 함정을 체험한다.

## 사전 준비

01/02의 컨테이너를 정리하고, 비교를 명확히 하기 위해 기존 이미지를 삭제하자.

```bash
docker compose down          # (01, 02 디렉토리에서 각각)
docker rmi compose-practice-app
```

## 02와의 차이 (diff)

```yaml
   app:
-    image: compose-practice-app
+    build:
+      context: ./app
+      dockerfile: Dockerfile
+    image: compose-practice-app:3.0
```

01/02에서는 두 단계였던 것이:

```bash
# Before (01/02 방식)
docker build -t compose-practice-app ./app
docker compose up
```

이제 한 단계가 된다:

```bash
# After (03 방식)
docker compose up
```

## 실습 1 — 자동 빌드 체험

```bash
docker compose up
```

이미지가 없으므로 **compose가 알아서 빌드한 후** 실행한다. 빌드 로그(`[+] Building ...`)가 올라가는 것을 확인하자.

```bash
curl localhost:3000/health
# {"status":"ok","db":"connected"}

docker images | grep compose-practice-app
# compose-practice-app   3.0   ...
```

> `image:`를 생략했다면 이미지 이름은 `{프로젝트명}-{서비스명}`(예: `03_build-app`)이 된다. 프로젝트명의 기본값은 디렉토리명이다.

## 실습 2 — 함정: 코드를 고쳤는데 반영이 안 된다?

`app/server.js`에서 health 응답을 수정해 보자.

```javascript
// 변경 전
res.json({ status: 'ok', db: 'connected' });
// 변경 후
res.json({ status: 'ok', db: 'connected', version: 'v2' });
```

그리고 재시작:

```bash
docker compose down
docker compose up
curl localhost:3000/health
# {"status":"ok","db":"connected"}   <- version이 없다?!
```

**변경이 반영되지 않았다.** 이번에는 빌드 로그도 올라오지 않았을 것이다.

### 왜?

`docker compose up`은 **이미지가 이미 존재하면 다시 빌드하지 않는다.** `build:`는 "이미지가 없을 때 어떻게 만들지"에 대한 정의일 뿐, 매번 빌드하라는 뜻이 아니다.

| 상황 | `docker compose up`의 동작 |
|---|---|
| `build:` 있음 + 이미지 **없음** | 빌드 → 실행 (실습 1) |
| `build:` 있음 + 이미지 **있음** | 기존 이미지 재사용, 빌드 스킵 (실습 2의 함정) |
| `build:` 있음 + `--build` 플래그 | 항상 다시 빌드 (레이어 캐시는 활용) |
| `image:`만 있음 + 로컬에 없음 | 레지스트리에서 pull → 실행 |

## 실습 3 — 해법: --build

```bash
docker compose up --build
curl localhost:3000/health
# {"status":"ok","db":"connected","version":"v2"}   <- 반영!
```

빌드 로그를 자세히 보면 `CACHED`라고 표시된 레이어들이 보인다. `--build`는 "다시 빌드하라"는 뜻이지 "캐시를 버리라"는 뜻이 아니다 — `server.js`만 바뀌었으므로 `npm install` 레이어는 캐시로 재사용된다. 제공된 `app/Dockerfile`을 열어 **왜 package.json을 먼저 COPY하는지** 확인해 보자. (Docker 기초 세션의 레이어 캐시 내용과 연결된다.)

> **심화** — Compose v2에는 `docker compose up --watch`(파일 변경 감지 시 자동 sync/rebuild)도 있다. 개발 루프를 더 줄이고 싶다면 찾아보자.

### build context 짚고 가기

`context: ./app`은 "Dockerfile의 위치"가 아니라 **빌드 컨텍스트** — Dockerfile의 `COPY`가 기준으로 삼는 경로이자, 빌드 시 데몬에게 전송되는 파일 묶음이다. 컨텍스트가 크면 빌드가 느려지므로 실무에서는 `.dockerignore`로 불필요한 파일(node_modules 등)을 제외한다.

## 정리

```bash
docker compose down
```

## 체크포인트

- [ ] 최초 `up`에서 자동 빌드가 일어나는 것을 확인했다
- [ ] 코드 수정 후 `up`만으로는 반영되지 않는 것을 체험했다
- [ ] `--build`로 반영했고, `CACHED` 레이어를 확인했다
- [ ] `up`의 4가지 동작 분기를 설명할 수 있다
- [ ] build context가 무엇인지 설명할 수 있다
