# 02. 해법 — healthcheck로 "준비 완료"를 기다리기

## 학습 목표

`healthcheck`와 `depends_on`의 `condition`을 조합하여, DB가 **실제로 연결을 받을 준비가 된 후에** 앱을 시작하도록 만든다. 앱 코드는 01과 한 글자도 다르지 않다 — **인프라 정의만으로** 문제를 해결한다.

## 사전 준비

01에서 빌드한 이미지를 그대로 사용한다. (안 했다면: `docker build -t compose-practice-app ./app`)

01의 컨테이너가 떠 있다면 먼저 정리하자: `cd ../01_startup_order && docker compose down`

## 01과의 차이 (diff)

```yaml
   db:
     image: mysql:8
+    healthcheck:
+      test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "-uroot", "-prootpass"]
+      interval: 5s
+      timeout: 3s
+      retries: 10
+      start_period: 30s

   app:
     depends_on:
-      - db
+      db:
+        condition: service_healthy
```

## 실행 — "기다리는 모습"을 직접 관찰하자

성공하는 실습은 조용히 지나가기 쉽다. 이번에는 **compose가 일부러 기다리는 과정**이 핵심 관찰 포인트다. 터미널을 2개 띄우자.

**터미널 1** — 실행:

```bash
docker compose up
```

**터미널 2** — 상태를 1초마다 갱신하며 관찰:

```bash
watch -n 1 docker compose ps -a
```

터미널 2에서 다음 변화가 순서대로 보인다.

```
db-1    Up (health: starting)     app-1   Created   <- app이 시작을 "보류"당하고 있다!
db-1    Up (health: starting)     app-1   Created
...약 10~20초...
db-1    Up (healthy)              app-1   Up        <- healthy가 되자마자 app 시작
```

01에서는 app이 곧장 뛰어들었다가 죽었지만, 이번에는 `Created` 상태로 **db가 healthy가 될 때까지 대기**한다.

확인:

```bash
curl localhost:3000/health
# {"status":"ok","db":"connected"}
```

## 동작 원리

### healthcheck 옵션의 의미

| 옵션 | 의미 |
|---|---|
| `test` | 컨테이너 **안에서** 실행할 검사 명령. exit 0이면 통과 |
| `interval` | 검사 주기 |
| `timeout` | 검사 명령이 이 시간 안에 끝나지 않으면 실패 처리 |
| `retries` | 이 횟수만큼 연속 실패하면 `unhealthy` 판정 |
| `start_period` | 시작 직후 이 시간 동안의 실패는 retries에 **카운트하지 않음** |

`start_period`가 중요하다. MySQL처럼 초기화가 긴 서비스는 시작 직후 검사가 당연히 실패하는데, 이 유예 기간이 없으면 정상 초기화 중인데도 unhealthy로 찍힐 수 있다.

### depends_on condition 3종 비교

| condition | 의미 | 대기 시간 |
|---|---|---|
| `service_started` (기본값, 01의 동작) | 컨테이너가 시작만 되면 진행 | 거의 0초 |
| `service_healthy` (이번 해법) | healthcheck 통과까지 대기 | DB 준비될 때까지 |
| `service_completed_successfully` | 대상이 exit 0으로 **종료**될 때까지 대기 | 마이그레이션 등 one-shot 작업용 |

> **심화** — `mysqladmin ping`은 MySQL 초기화 중 임시 서버에도 응답하는 경우가 있어, 엄밀함이 필요한 실무에서는 `mysql -e 'SELECT 1'`처럼 실제 쿼리로 검사하기도 한다.

## 정리

```bash
docker compose down
```

## 체크포인트

- [ ] app이 `Created` 상태로 대기하는 것을 `watch`로 직접 봤다
- [ ] db가 `(health: starting)` → `(healthy)`로 바뀌는 순간 app이 시작되는 것을 확인했다
- [ ] `curl localhost:3000/health`가 성공했다
- [ ] `start_period`가 왜 필요한지 설명할 수 있다
- [ ] condition 3종의 차이를 설명할 수 있다
