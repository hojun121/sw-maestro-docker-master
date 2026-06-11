# 01. 시작 순서 문제 — depends_on만으로는 부족하다

## 학습 목표

`docker compose up`으로 App + DB를 함께 띄웠을 때, **컨테이너 시작 순서와 서비스 준비 완료는 별개**라는 것을 직접 실패를 통해 체험한다.

## 사전 준비 — 앱 이미지 빌드

이번 문제와 02번에서는 앱 이미지를 직접 빌드해서 사용한다. (03번에서 이 수동 단계가 어떻게 사라지는지 비교하게 된다.)

```bash
docker build -t compose-practice-app ./app
```

## 실행

```bash
docker compose up
```

로그를 그대로 지켜보자. 잠시 후 다음과 같은 흐름이 보일 것이다.

```
app-1  | [app] DB 연결 시도 -> db:3306
app-1  | [app] DB 연결 실패: ECONNREFUSED
app-1  | [app] 프로세스를 종료합니다. (exit code 1)
app-1 exited with code 1
...
db-1   | ... ready for connections.    <- app이 죽은 "후에야" DB가 준비됨
```

다른 터미널에서 컨테이너 상태를 확인한다.

```bash
docker compose ps -a
```

```
NAME     ...   STATUS
app-1    ...   Exited (1)        <- 앱은 죽어 있다
db-1     ...   Up                <- DB는 멀쩡히 떠 있다
```

## 무슨 일이 일어났나

타임라인으로 보면 이렇다.

```
시간 →
db   : [컨테이너 시작]----[InnoDB 초기화중...(10~20초)]----[ready for connections]
app  : [컨테이너 시작][DB 연결 시도][ECONNREFUSED][exit 1]
                ↑
        depends_on이 보장하는 건 여기까지 (db "컨테이너"가 시작됨)
```

- `depends_on: [db]`는 **db 컨테이너가 먼저 시작되는 것**만 보장한다.
- 하지만 MySQL은 컨테이너가 시작된 후에도 InnoDB 초기화, 시스템 테이블 준비 등으로 **10~20초간 연결을 받지 못한다.**
- 앱은 그 사이에 시작되어 연결을 시도하고, `ECONNREFUSED`로 즉시 종료된다.

즉, **"시작 순서 보장" ≠ "준비 완료 보장"** 이다.

## 흔한 오해: restart policy로 우회하면 되지 않나?

`restart: always`를 붙이면 앱이 죽고-살아나기를 반복하다가 결국 DB가 준비된 시점에 연결에 성공하긴 한다. 하지만 이것은 **문제 해결이 아니라 은폐**다.

- 매 배포마다 불필요한 crash 로그가 쌓이고, 모니터링/알림에 노이즈가 생긴다.
- "몇 번 죽는 게 정상"인 시스템은 진짜 장애와 구분이 어려워진다.

이 문제의 올바른 해법(DB가 준비됐는지 확인하고 기다리기)은 **02번**에서 다룬다.

## 정리

```bash
docker compose down
```

`down`은 컨테이너와 함께 이 문제에서 만든 네트워크(`problem1-net`)도 삭제한다. 최상위 README의 [네트워크 확인 명령어](../README.md#네트워크-확인-명령어)로 생성/삭제를 직접 확인해 보자.

## 체크포인트

- [ ] `docker compose ps -a`에서 app이 `Exited (1)` 상태인 것을 확인했다
- [ ] `docker compose logs app`에서 `ECONNREFUSED`를 확인했다
- [ ] db 로그에서 `ready for connections`가 app의 종료 **이후에** 출력된 것을 확인했다
- [ ] depends_on이 보장하는 것과 보장하지 않는 것을 설명할 수 있다
