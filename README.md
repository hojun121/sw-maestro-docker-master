# Docker 실습 15선 — 방문 카운터로 배우는 컨테이너

[1. Docker 개요 - Linux Kernel & UnionFS PPT Link](https://docs.google.com/presentation/d/1ARTknok8VZFPt-EZl-39twW4jAqSPe5o/edit?usp=drive_link&ouid=106914655275977610500&rtpof=true&sd=true) 

[2. Docker 활용 - 네트워크 및 Volume PPT Link](https://docs.google.com/presentation/d/1lOg2LuNjbiXeg0uVQlAzYt6w78iIxKdw/edit?usp=drive_link&ouid=106914655275977610500&rtpof=true&sd=true)

하나의 앱(**Go 방문 카운터**)을 1번부터 15번까지 한 단계씩 고도화하며 Docker 전반을 익히는 실습 시리즈입니다. 각 문제는 직전 단계의 불편함을 해결하는 방식으로 이어집니다.

저는 여러분들께 이 실습을 AI 없이 최소 1번 해보라고 권장드립니다. 각 문제는 문제지와 해설지를 포함해놨습니다. 문제 풀면서 막히거나 어려우면 해설지를 보면서 진행해보세요.

해설지를 보는 경우, 왜 이렇게 구성하는지 설정하는지 나름대로 비판적으로 연구하고 찾아보면서 학습하시길 바랍니다.

Container 기술이 손에 익으면서 어떤 이슈가 발생해도 능숙하게 다룰수 있는 경지로 올라가고 싶다면 해설지 없이 풀 정도로 외우더라도 반복해서 진행해보시면 됩니다.

처음엔 암기처럼 느껴지겠지만, 이 과정은 Container 기술과 명령어들이 손에 익히는 최고의 훈련 과정이라고 생각합니다.

결코 쉬운 문제들이 아닙니다. 하지만 욕심내어 도전하고 정복하시길 바랍니다. 여러분 화이팅!!

아, 그리고 Container 실습 진행 환경은 Docker Container가 설치되어있는 Linux 환경이면 다 됩니다.

> 환경: Ubuntu 24.04 / Docker 28.x 이상

## 폴더 구조

각 문제는 아래 두 디렉터리로 구성됩니다.

```
NN-제목/
├── Provocatio/      # 문제 — 먼저 직접 풀어보세요
│   ├── README.md    #   상황 · 요구사항 · 검증
│   └── app/         #   주어지는 소스 (수정 금지)
└── Solutio/         # 해설 — 풀어본 뒤 열어보세요
    └── README.md    #   정답 · 빌드/실행 · 개념 설명
```

> 폴더명은 호환성을 위해 ASCII(`01-first-container` 등)로 두고, 한글 제목은 각 폴더의 README 안에 있습니다.

문서 안의 `{{ }}`는 **여러분이 직접 정해서 채우는 값**입니다. 예: `{{my-container}}` → `web`

## 학습 로드맵

두 개의 큰 서사가 시리즈를 관통합니다.
- **무거운 이미지 → 경량화** (1번 → 5번)
- **휘발성 → 영속성** (1번 → 10번 → 15번)

| 국면 | 문제 | 한 줄 |
|------|------|-------|
| 패키징 기초 | 1–2 | 컨테이너로 띄우기 |
| 빌드 최적화 | 3–5 | 이미지 가볍게 |
| 운영·공유 | 6–7 | 디버깅과 배포 |
| 네트워크 | 8–9 | 컨테이너 간 통신 |
| 데이터 영속성 | 10–13 | 카운터 살리기 |
| 리소스·캡스톤 | 14–15 | 한계와 종합 |

## 문제 목록

| # | 폴더 | 주제 |
|---|------|------|
| 1 | `01-first-container` | 첫 컨테이너 만들기 — 이미지 빌드, 포트 매핑, `exec -it` |
| 2 | `02-cmd-entrypoint` | CMD vs ENTRYPOINT — 실행 인자 설계 |
| 3 | `03-layer-cache` | 레이어 캐시 최적화 — `COPY` 순서로 빌드 단축 |
| 4 | `04-dockerignore-run` | .dockerignore & RUN 통합 — 컨텍스트 정리, 용량 절감 |
| 5 | `05-multi-stage` | Multi-stage build — distroless로 이미지 폭락 |
| 6 | `06-debugging` | 컨테이너 디버깅 — logs · exec · inspect · cp |
| 7 | `07-registry` | 레지스트리 push/pull — 이미지 naming과 공유 |
| 8 | `08-bridge-network` | user-defined bridge — 이름으로 컨테이너 연결 |
| 9 | `09-port-binding` | 포트 매핑 & 바인딩 보안 — `-p`의 동작과 오해 |
| 10 | `10-named-volume` | named volume 영속화 — 카운터 숫자 살려두기 |
| 11 | `11-bind-mount` | bind mount 설정 주입 — 호스트 파일로 설정 교체 |
| 12 | `12-volume-backup` | 볼륨 백업/복원 — tar로 데이터 이관 |
| 13 | `13-permissions` | 권한(UID/GID) 트러블슈팅 — permission denied |
| 14 | `14-resource-limits` | 리소스 제한(cgroups) — `--memory`/`--cpus`와 OOM |
| 15 | `15-capstone-3tier` | 캡스톤 — 3-tier 스택 수동 조립 |

> 1번부터 15번까지 모두 포함되어 있습니다. 번호 순서대로 풀어보세요 — 각 문제는 앞 문제의 결과 위에서 이어집니다.
