import * as React from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Height of the on-screen keyboard (0 when hidden). Use to pad scroll content so
 * focused fields stay visible above the keyboard and any sticky footer.
 */
export function useKeyboardInset() {
  const [inset, setInset] = React.useState(0);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setInset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return inset;
}
