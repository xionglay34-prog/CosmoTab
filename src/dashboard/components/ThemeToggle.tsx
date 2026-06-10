import type { Theme } from '../../core/types';

interface Props {
  theme: Theme;
  onChange: (t: Theme) => void;
}

export default function ThemeToggle({ theme, onChange }: Props): JSX.Element {
  return (
    <button
      className="cosmo-theme-toggle"
      onClick={() => onChange(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? '☀ 明亮' : '✦ 深空'}
    </button>
  );
}
