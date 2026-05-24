# 고스트버스터즈 플레이 도우미

게임 플레이 중 정수, 넘버스, 빌드, 공략글과 미궁 시간/컨디션 정보를 빠르게 찾고 공유하기 위한 정적 웹 도구입니다.

## 배포 방식

GitHub Pages에 그대로 올릴 수 있는 정적 웹사이트입니다.

배포에 필요한 파일:

- `index.html`
- `essences.html`
- `numbers.html`
- `builds.html`
- `guides.html`
- `maze-time.html`
- `report.html`
- `styles.css`
- `app.js`
- `guides.js`
- `ghost-data.js`
- `config.js`
- `.nojekyll`

## GitHub Pages 설정

1. GitHub에서 새 저장소를 만듭니다.
2. 위 파일들을 저장소에 올립니다.
3. 저장소의 `Settings` > `Pages`로 이동합니다.
4. Source를 `Deploy from a branch`로 설정합니다.
5. Branch는 `main`, Folder는 `/root`로 설정합니다.
6. 저장하면 잠시 뒤 무료 웹 주소가 생성됩니다.

## 데이터 갱신

엑셀 원본을 수정했다면 `ghost-data.js`를 다시 생성해야 사이트 내용이 바뀝니다.
현재 버전은 `고스트버스터즈.xlsx` 기준으로 생성되어 있습니다.

넘버스의 `착용부위`, `획득처`는 정보 제보/수정 페이지에서 등록할 수 있으며 승인 후 넘버스 목록에 표시됩니다.
정수 정보 수정에서는 기존 몬스터를 선택한 뒤 몬스터명까지 변경할 수 있습니다.

## 공개 저장 기능

빌드, 제보, 방문자, 공략 게시판을 Supabase와 연결하려면 `config.js`에 연결 값을 지정하고 Supabase SQL Editor에서 `supabase-all.sql`을 실행합니다. 기존 제보 테이블이 있는 사이트에서도 최신 파일을 다시 실행하면 몬스터명 변경용 `original_monster` 열이 추가됩니다.

공략 게시판만 추가 적용하는 경우에는 `supabase-guides.sql`을 실행하면 됩니다. 공략 게시판은 요청한 운영 방식에 따라 누구나 글 작성, 수정, 삭제와 이미지/동영상 업로드가 가능하도록 설정됩니다.
