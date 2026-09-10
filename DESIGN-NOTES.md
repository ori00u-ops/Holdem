# 개선 기록

## 살펴본 버전

- 사용자가 지정한 `Downloads/Index (16).html`: 4인 훈련판. GitHub의 대문자 `Index.html`과 동일한 이전 버전.
- `https://holdem-brown.vercel.app/`: 더 발전된 6인 게임. GitHub의 소문자 `index.html`이 실제 서비스 진입 파일.
- `https://github.com/ori00u-ops/Holdem`: 기존 PWA·공유 기능과 제작자 연락처 확인.

## 우선 해결한 문제

1. 지정 파일에서는 히어로가 항상 먼저 행동하고, 폴드 즉시 첫 AI에 팟을 지급했습니다. 새 엔진은 실제 순서로 모든 생존 플레이어의 베팅을 끝냅니다.
2. 공개 버전에는 사이드팟이 있었지만 히어로 폴드/올인 이후 남은 베팅을 건너뛰었습니다. 새 엔진에서는 히어로 상태와 무관하게 모든 스트리트를 동일한 흐름으로 진행합니다.
3. 최소 레이즈, 재레이즈 권리, 짧은 빅블라인드 올인, 미매칭 칩 반환과 홀수 칩을 명시적으로 처리했습니다.
4. 시작 패 추천을 모든 스트리트에 반복하던 코칭을 보드·팟·위치·가격에 따라 바꾸고, 근사 모델이라는 범위를 표시했습니다.
5. 승리/패배와 학습의 질을 분리했습니다. 판 완료, 새 문제 숙달, 학습 과정 완료, 복기 완료에 보상합니다.
6. 긴 단일 화면을 플레이·배우기·훈련·복기·성장으로 나누고, 모바일에서 행동 버튼과 코치의 핵심 설명을 가깝게 배치했습니다.
7. 불필요한 광고·공유 강제·연습 대기 시간을 없애고, 제작자 정보를 명확한 독립 메뉴에 유지했습니다.

## 제품 방향

핵심 흐름: 한 판 플레이 → 그 순간의 결정 복기 → 필요한 원리 학습/오답 재학습 → 다시 도전.

메시지: ‘한 판마다, 한 수 더.’ 첫 화면은 게임이 중심이며, 가입 없이 시작합니다. 학습 목표는 칩을 빨리 불리는 것이 아니라 선택에 이유를 붙일 수 있게 하는 것입니다.

디자인: 짙은 녹색 `#0b1715`, 따뜻한 아이보리 `#f4f0e5`, 금색 `#d8b879`. 카드와 팟의 위계, 실제 테이블 좌석, 절제된 소리와 표시를 사용합니다. 외부 광고/분석 SDK는 포함하지 않았습니다.

제작자: 나상균 · 010-7529-5945. 데스크톱 사이드바의 ‘도장 이야기 · 제작자’와 모바일 상단 정보 버튼에서 확인할 수 있습니다.

## 공유 이미지 프롬프트

Built-in image generation tool. Final project asset: `public/og-v3.png`.

> Create a complete refined landscape social preview card, approximately 1.91:1, for Korean free educational poker game ‘홀덤 도장’. Premium editorial game brand: very dark pine green #0b1715 background, warm ivory typography #f4f0e5, muted champagne gold #d8b879. Subtle fine grain, elegant physical green felt poker table in lower right with two beautiful ivory playing cards A spades and K spades and a small stack of gold and forest green chips; studio lighting, tactile materials, restrained and sophisticated. Left half large beautifully typeset Korean exact title ‘홀덤 도장’, exact subtitle ‘한 판마다, 한 수 더.’ and tiny English ‘PLAY · LEARN · GROW’. Deliberate negative space, polished layout. Render all typography as part of the final image. No other text, no people, no money symbols, no watermark. A social sharing graphic, not a screenshot of a UI.

## 현재 한계와 다음 개발

AI와 코칭을 솔버 수준으로 홍보하지 않습니다. 실제 판단 학습의 다음 확장은 베팅 범위 모델, 저장한 핸드 재생, 상황별 반복 실전 훈련입니다. 계정 동기화와 온라인 멀티플레이, 네이티브 앱 프로젝트·스토어 제출은 이번 버전에 포함하지 않았습니다.
