"""Builds the Plowbird launch materials: QR codes, print PDFs and preview images.

    python build.py            (needs `segno`: pip install segno)

Change the offer here, then rebuild. The HTML files read the QR codes from qr/.
Every QR code carries the promo code plus a utm_source, so analytics show which
piece of paper each visit came from.
"""

import shutil
import subprocess
import tempfile
import time
from pathlib import Path

import segno

HERE = Path(__file__).resolve().parent
SITE = 'https://plowbird.app/'
PROMO = 'FIRSTPLOW'

QR = {
    'poster': 'poster',  # the big code on the 8.5x11 poster
    'tab': 'tab',  # the small codes on its tear-off tabs
    'card': 'card',  # the 4-up handout cards
}

EDGE = next(
    (p for p in [
        Path(r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'),
        Path(r'C:\Program Files\Microsoft\Edge\Application\msedge.exe'),
        Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe'),
    ] if p.exists()),
    None,
)


def url_for(source):
    # Kept short on purpose: shorter link → fewer, bigger squares → the small tab codes scan easily.
    return f'{SITE}?promo={PROMO}&utm_source={source}'


def make_qr_codes():
    out = HERE / 'qr'
    out.mkdir(exist_ok=True)
    for name, source in QR.items():
        qr = segno.make(url_for(source), error='m', micro=False)
        # Viewbox only (no fixed size) so the HTML can scale it; quiet zone added in CSS.
        qr.save(out / f'{name}.svg', kind='svg', border=0, dark='#0B1B2E', omitsize=True, xmldecl=False)
        print(f'qr/{name}.svg  version {qr.version}  → {url_for(source)}')


def render(html, pdf=None, png=None, size=None):
    if not EDGE:
        print('No Edge/Chrome found, skipping', html)
        return
    src = (HERE / html).as_uri()
    for flag, out in ((f'--print-to-pdf={HERE / pdf}' if pdf else None, pdf), (f'--screenshot={HERE / png}' if png else None, png)):
        if not flag:
            continue
        # A throwaway profile, or the browser hands the job to an already-open window and returns early.
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as profile:
            args = [str(EDGE), '--headless=new', f'--user-data-dir={profile}', '--disable-gpu', '--hide-scrollbars',
                    '--no-pdf-header-footer', '--virtual-time-budget=4000', flag]
            if out == png:
                args.append(f'--window-size={size}')
            (HERE / out).unlink(missing_ok=True)
            subprocess.run([*args, src], check=True, capture_output=True, timeout=120)
            # The browser can return before the file is on disk; wait for it.
            for _ in range(120):
                if (HERE / out).exists() and (HERE / out).stat().st_size > 0:
                    break
                time.sleep(0.25)
            else:
                raise SystemExit(f'{out} was not written')
        print('wrote', out)


if __name__ == '__main__':
    make_qr_codes()
    (HERE / 'print').mkdir(exist_ok=True)
    (HERE / 'preview').mkdir(exist_ok=True)
    render('poster.html', pdf='print/plowbird-poster.pdf', png='preview/poster.png', size='816,1056')
    render('cards.html', pdf='print/plowbird-coupon-cards.pdf', png='preview/cards.png', size='816,1056')
    # The email's picture, as a PNG (email apps don't show SVG).
    (HERE / 'email' / 'images').mkdir(parents=True, exist_ok=True)
    render('assets/hero.html', png='email/images/hero.png', size='1200,750')
    render('email/email.html', png='preview/email.png', size='680,1900')
    shutil.make_archive(str(HERE / 'print' / 'plowbird-email'), 'zip', HERE / 'email')
    print('wrote print/plowbird-email.zip (upload to Mailchimp: Templates → Import → zip)')
