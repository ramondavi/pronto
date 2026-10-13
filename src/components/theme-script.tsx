const script = `
(() => {
  const saved = localStorage.getItem('pronto-theme') || 'system';
  const dark = saved === 'dark' || (saved === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  const scale = localStorage.getItem('pronto-text-scale');
  document.documentElement.dataset.textScale = scale === 'large' || scale === 'larger' ? scale : 'normal';
  document.documentElement.dataset.contrast = localStorage.getItem('pronto-high-contrast') === 'true' ? 'high' : 'normal';
})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
