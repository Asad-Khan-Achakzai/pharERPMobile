/**
 * NativeWind v4 only auto-applies `className` to core React Native components.
 * Third-party components (like `expo-image`) ignore `className` unless they are
 * registered with `cssInterop`. Without this, every `expo-image` sized purely
 * via Tailwind classes (avatars, thumbnails, product/doctor/pharmacy images)
 * renders at 0×0 and appears invisible.
 *
 * Import this module once, before the app tree mounts (see `app/_layout.tsx`).
 */
import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';

cssInterop(Image, { className: 'style' });
