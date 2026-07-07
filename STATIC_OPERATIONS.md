# 정적 파일 운영 기준

Firestore 할당량 문제와 무관하게 사이트를 안정적으로 운영하기 위해, 기본 운영은 정적 파일 기준으로 진행합니다.

## 기본 원칙

- 사이트 공개 페이지는 Firestore를 읽지 않습니다.
- 정수/넘버스/미궁일지처럼 즉시 반영이 필요한 정보는 로컬 파일 수정 후 배포합니다.
- Firestore 백업, 관리자 Custom Claim, 데이터 이전은 별도 지시가 있기 전까지 진행하지 않습니다.
- GitHub Actions의 자동 Firestore 갱신은 꺼둡니다.

## 주로 수정하는 파일

- 정수/넘버스 원본: `ghost-data.js`
- 검토 완료 제보 정적 목록: `data/reports-index.json`
- 빌드 정적 목록: `data/builds-index.json`
- 공략 정적 목록: `data/guides-index.json`
- 미궁일지: `maze-log.js`, `maze-log.html`
- 사이트 동작 설정: `config.js`

## 배포 흐름

1. 로컬 파일을 직접 수정합니다.
2. 문법 검사를 합니다.
3. 관련 HTML의 캐시 버전을 올립니다.
4. 커밋 후 `main`에 푸시합니다.
5. GitHub Pages 배포 완료 후 `busters.kr`에서 확인합니다.

## Firestore를 다시 읽어야 할 때

정말 필요한 경우에만 수동으로 `Refresh static public data` 워크플로를 실행하고, 입력값에 `FIRESTORE_READ`를 넣습니다. 평소에는 실행하지 않습니다.
