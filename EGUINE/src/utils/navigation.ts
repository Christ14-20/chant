import { router, type Href } from 'expo-router';

function goBack(fallback: Href) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}

export function goBackSafely() {
  goBack('/home');
}

export function goBackTo(fallback: Href) {
  goBack(fallback);
}
