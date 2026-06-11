# compose-app-db-practice

Docker Compose로 App + DB 2-Tier 구성을 띄우며 **시작 순서 제어**와 **빌드 통합**을 배우는 실습입니다. 각 문제는 "함정을 먼저 체험하고 → 원리를 이해하고 → 해법을 적용"하는 흐름으로 구성되어 있습니다.

## 사전 요구사항

- Docker Engine + **Docker Compose v2** (플러그인)
  - 확인: `docker compose version` → `Docker Compose version v2.x` 이상
  - 이 실습의 모든 명령은 `docker-compose`(하이픈, v1)가 아니라 **`docker compose`**(공백, v2)를 사용합니다. v1은 EOL되었고 동작이 다를 수 있습니다.
- 3000번 포트가 비어 있을 것

## 구성

| 문제 | 주제 | 함정 체험 | 핵심 학습 |
|---|---|---|---|
| [01_startup_order](./01_startup_order/) | 시작 순서 문제 | `depends_on`이 있어도 app이 crash | 시작 순서 보장 ≠ 준비 완료 보장 |
| [02_healthcheck](./02_healthcheck/) | 순서 제어 해법 | — (01의 해결) | `healthcheck` + `condition: service_healthy` |
| [03_build](./03_build/) | compose가 빌드까지 | 코드 수정이 반영 안 됨 | `build:`, `--build`, 이미지 캐시 |

**반드시 01 → 02 → 03 순서로 진행하세요.** 각 문제는 이전 문제의 compose 파일에서 최소한의 diff만 가집니다.

공통 스택: Node.js(Express + mysql2) 앱 + MySQL 8. 앱 코드는 세 문제 모두 동일합니다 — 문제와 해법은 전부 **compose 파일(인프라 정의)** 안에 있습니다.

## 네트워크에 대하여

각 문제는 자신만의 네트워크(`problem1-net`, `problem2-net`, `problem3-net`)를 명시적으로 정의합니다.

사실 compose는 네트워크를 정의하지 않아도 프로젝트(디렉토리)마다 default 네트워크를 자동 생성하므로, 폴더가 다르면 어차피 격리됩니다. 그럼에도 이 실습에서 명시적으로 정의하는 이유는 **compose가 뒤에서 해주던 일을 코드로 드러내고, 직접 눈으로 확인**하기 위해서입니다. 같은 네트워크에 속한 서비스들은 **서비스 이름을 hostname으로** 서로 통신할 수 있습니다 (앱이 `localhost`가 아니라 `db:3306`으로 접속하는 이유).

## 네트워크 확인 명령어

각 문제의 `up` 직후 / `down` 직후에 아래 명령어로 네트워크의 생성과 삭제를 직접 확인해 보세요.

```bash
# 1. 네트워크 목록 — {프로젝트명}_{네트워크명} 형식으로 생성된다
docker network ls
# 예: 01_startup_order_problem1-net   bridge   local

# 2. 특정 네트워크 상세 — 연결된 컨테이너, 서브넷, 게이트웨이 확인
docker network inspect 01_startup_order_problem1-net

# 3. 연결된 컨테이너와 IP만 추려서 보기
docker network inspect 01_startup_order_problem1-net \
  --format '{{range .Containers}}{{.Name}} -> {{.IPv4Address}}{{println}}{{end}}'

# 4. 컨테이너 안에서 서비스 이름 DNS가 실제로 동작하는지 확인 (up 상태에서)
docker compose exec app getent hosts db
# 출력된 IP가 3번에서 본 db 컨테이너의 IP와 일치하는지 비교해 보자

# 5. compose 프로젝트 관점에서 보기
docker compose ps          # 실행 중인 서비스
docker compose ps -a       # 종료된 컨테이너 포함 (01에서 Exited 확인용)

# 6. down 후 네트워크가 함께 삭제되었는지 확인
docker compose down
docker network ls          # problem*-net이 사라졌는지 확인

# 7. 쓰지 않는 네트워크 일괄 정리 (실습 종료 후)
docker network prune
```

## 빠른 시작

```bash
git clone <this-repo>
cd compose-app-db-practice/01_startup_order
cat README.md   # 각 문제의 README를 따라 진행
```

## 정리(cleanup) 공통 규칙

각 문제를 마칠 때마다:

```bash
docker compose down    # 컨테이너 + 네트워크 삭제
```

다음 문제로 넘어가기 전에 반드시 이전 문제를 `down` 하세요. 세 문제 모두 호스트의 3000번 포트를 사용하므로 동시에 띄우면 충돌합니다.
