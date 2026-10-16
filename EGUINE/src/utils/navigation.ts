import { router } from 'expo-router';

export function goBackSafely() {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/home');
}
