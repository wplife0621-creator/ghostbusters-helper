# 고스트버스터즈 플레이 도우미

게임 플레이 중 정수, 넘버스, 미샤, 균열, 스탯, 각인, 시간 계산 정보를 빠르게 찾기 위한 정적 웹 도구입니다.

## 배포 방식

GitHub Pages에 그대로 올릴 수 있는 정적 웹사이트입니다.

배포에 필요한 파일:

- `index.html`
- `styles.css`
- `app.js`
- `ghost-data.js`
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
