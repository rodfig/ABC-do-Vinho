export const config = {
  matcher: '/((?!en/|css/|js/|img/|fonts/|favicon\\.ico|.*\\..*).*)',
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function setCookie(response, lang) {
  response.headers.append(
    'Set-Cookie',
    `lang=${lang}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
  );
  return response;
}

export default function middleware(request) {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;

  // Static assets slip through even if the matcher lets them in (belt and suspenders).
  if (/^\/(en|css|js|img|fonts)\//.test(pathname) || /\.[a-z0-9]+$/i.test(pathname)) {
    return;
  }

  // Manual choice via the #lang-toggle link (?setlang=en|pt): honor it, persist it, strip it.
  const setlang = searchParams.get('setlang');
  if (setlang === 'en' || setlang === 'pt') {
    searchParams.delete('setlang');
    let target = pathname;
    if (setlang === 'en' && !pathname.startsWith('/en')) target = `/en${pathname}`;
    if (setlang === 'pt' && pathname.startsWith('/en')) target = pathname.replace(/^\/en/, '') || '/';
    const redirectUrl = new URL(target + (searchParams.toString() ? `?${searchParams}` : ''), url);
    return setCookie(Response.redirect(redirectUrl, 307), setlang);
  }

  const cookieLang = request.headers.get('cookie')?.match(/(?:^|;\s*)lang=(en|pt)/)?.[1];

  if (cookieLang) {
    if (cookieLang === 'en' && !pathname.startsWith('/en')) {
      return Response.redirect(new URL(`/en${pathname}`, url), 307);
    }
    if (cookieLang === 'pt' && pathname.startsWith('/en')) {
      return Response.redirect(new URL(pathname.replace(/^\/en/, '') || '/', url), 307);
    }
    return;
  }

  // First visit, no stored preference — geo-detect from Vercel's edge network header.
  if (!pathname.startsWith('/en')) {
    const country = request.headers.get('x-vercel-ip-country');
    if (country && country !== 'PT') {
      return setCookie(Response.redirect(new URL(`/en${pathname}`, url), 307), 'en');
    }
  }
}
