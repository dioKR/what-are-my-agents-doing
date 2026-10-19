# Changesets

PR마다 "무엇이 바뀌었는지"를 한 줄 남기는 곳입니다. `npx changeset`을 실행해 고침(patch) / 새 기능(minor)을 고르고 설명을 쓰면 여기에 파일이 생깁니다.
main에 쌓인 파일들은 GitHub Action이 모아 "새 버전 준비" PR을 만들고(버전 번호와 CHANGELOG 자동 갱신), 그 PR을 머지하면 태그가 붙어 데스크톱 앱과 npm 공개가 진행됩니다.

Add a changeset to your PR with `npx changeset` (patch for fixes, minor for features). The release workflow turns them into a version PR.
