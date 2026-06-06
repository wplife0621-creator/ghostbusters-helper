# Firebase + Cloudflare R2 이전 설정

이 사이트는 `config.js`의 `backendMode: "firebase"` 설정을 기준으로 Firebase Auth/Firestore와 Cloudflare R2 업로드를 사용하도록 준비되어 있습니다.

## 1. Firebase 설정

Firebase 콘솔에서 새 프로젝트를 만든 뒤 아래 항목을 설정합니다.

1. Authentication > Sign-in method > Google 활성화
2. Authentication > Settings > Authorized domains에 아래 도메인 추가
   - `busters.kr`
   - `www.busters.kr`
3. Firestore Database 생성
   - Production mode로 시작해도 됩니다.
   - 초기 테스트 중에는 관리자 계정에서 쓰기 테스트를 먼저 진행하세요.
4. Project settings > General > Web app 추가 후 Firebase config 값을 복사합니다.

복사한 값을 `config.js`의 `firebaseConfig`에 입력합니다.

```js
firebaseConfig: {
  apiKey: "발급값",
  authDomain: "프로젝트.firebaseapp.com",
  projectId: "프로젝트ID",
  appId: "발급값",
},
```

Firestore 컬렉션은 자동으로 아래 이름으로 생성됩니다.

- `dukhubusters_builds`
- `dukhubusters_monster_reports`
- `dukhubusters_guide_posts`
- `dukhubusters_site_visitors`
- `dukhubusters_daily_visitors`
- `dukhubusters_user_profiles`

## 2. Cloudflare R2 설정

1. Cloudflare Dashboard > R2 > Create bucket
2. 버킷 이름 예시: `dukhubusters-guide-media`
3. Public access 또는 Custom domain을 연결합니다.
   - 예시: `https://media.busters.kr`
4. Cloudflare Pages 프로젝트 > Settings > Functions > R2 bucket bindings
   - Variable name: `GUIDE_MEDIA_BUCKET`
   - R2 bucket: 위에서 만든 버킷
5. Cloudflare Pages 프로젝트 > Settings > Environment variables
   - `R2_PUBLIC_BASE_URL`: `https://media.busters.kr`

그 다음 `config.js`의 `r2PublicBaseUrl`에 같은 주소를 입력합니다.

```js
r2UploadEndpoint: "/api/r2-upload",
r2PublicBaseUrl: "https://media.busters.kr",
```

## 3. Firestore 보안 규칙 예시

Firebase Console > Firestore Database > Rules에 아래 규칙을 시작점으로 사용하세요.

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return signedIn() && request.auth.token.email == "wplife0621@gmail.com";
    }

    match /dukhubusters_builds/{docId} {
      allow read: if true;
      allow create: if signedIn();
      allow update, delete: if isAdmin();
    }

    match /dukhubusters_guide_posts/{docId} {
      allow read: if true;
      allow create: if signedIn();
      allow update, delete: if signedIn();
    }

    match /dukhubusters_monster_reports/{docId} {
      allow read: if true;
      allow create: if signedIn();
      allow update, delete: if isAdmin();
    }

    match /dukhubusters_user_profiles/{docId} {
      allow read: if true;
      allow create, update: if signedIn();
      allow delete: if isAdmin();
    }

    match /dukhubusters_site_visitors/{docId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if isAdmin();
    }

    match /dukhubusters_daily_visitors/{docId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if isAdmin();
    }
  }
}
```

## 4. 주의사항

- R2 비밀키는 사이트 코드에 넣지 않습니다.
- 업로드는 `functions/api/r2-upload.js`가 처리합니다.
- 동영상 직접 업로드는 무료 저장 용량을 빠르게 소모할 수 있으므로, 장기적으로는 유튜브/외부 영상 링크 삽입을 권장합니다.
- 기존 Supabase 데이터는 자동 이전되지 않습니다. 필요한 경우 Supabase 백업 JSON을 받아 Firestore로 옮기는 별도 마이그레이션이 필요합니다.
