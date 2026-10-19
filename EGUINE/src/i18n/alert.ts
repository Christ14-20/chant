import { Alert, type AlertButton, type AlertOptions } from 'react-native';
import { translate } from '@/i18n/translations';
import { useAppStore } from '@/store/useAppStore';

export function showLocalizedAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
) {
  const language = useAppStore.getState().interfaceLanguage;
  Alert.alert(
    translate(title, language),
    message === undefined ? undefined : translate(message, language),
    buttons?.map((button) => ({
      ...button,
      text: button.text ? translate(button.text, language) : button.text,
    })),
    options,
  );
}
