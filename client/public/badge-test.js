// iOS 16 PWA 배지 테스트 스크립트
console.log('🔢 배지 테스트 시작');

// 배지 API 지원 확인
if ('setAppBadge' in navigator) {
  console.log('✅ 배지 API 지원됨');
  
  // 배지 설정 테스트
  navigator.setAppBadge(8).then(() => {
    console.log('✅ 배지 8로 설정 성공');
  }).catch(err => {
    console.error('❌ 배지 설정 실패:', err);
  });
} else {
  console.log('❌ 배지 API 미지원');
}

// Service Worker 상태 확인
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    console.log('✅ Service Worker 준비됨:', registration);
    
    // Service Worker에 배지 업데이트 요청
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_BADGE',
        count: 8
      });
      console.log('✅ Service Worker에 배지 업데이트 요청 전송');
    }
  });
}