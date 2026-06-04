import { getClientEnvDefaultResolvedTheme, THEME_COOKIE_NAME } from '~/lib/theme/config'

/**
 * Runs before paint to align `<html class="dark">` with cookie + `prefers-color-scheme`.
 * Reduces flash when server guess differs from the client (e.g. `system` preference).
 */
export function ThemeScript() {
  const envDefault = getClientEnvDefaultResolvedTheme()

  // eslint-disable-next-line max-len
  const script = `(function(){try{var k='${THEME_COOKIE_NAME}';var m=document.cookie.match(new RegExp('(?:^|; )'+k+'=([^;]*)'));var p=m?decodeURIComponent(m[1]):'';var d='${envDefault}';var r=d;if(p==='light'||p==='dark'){r=p;}else if(p==='system'||!p){r=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var el=document.documentElement;if(r==='dark'){el.classList.add('dark');}else{el.classList.remove('dark');}}catch(e){}})();`

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
