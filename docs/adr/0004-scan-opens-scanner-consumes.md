# A label's QR code opens the unit; only cooka's scanner consumes

A freezer label's QR code encodes a plain URL — the base URL plus the label number at the root, all uppercase (`HTTPS://COOKA.EXAMPLE.DE/A0402` — always `HTTPS://`, see ADR 0008) so it fits QR alphanumeric mode and leaves room for higher error correction. Opening it in any camera app shows the **unit page**, which never changes anything; taking the unit out is one tap there. Only cooka's own **scanner** consumes on scan (with Undo), and it recognises labels by host as well as number: every base URL the instance has ever printed with is recorded and accepted, nothing else.

We rejected consuming on `GET` (the idea note's `GET /c/:id`) because link previews, prefetchers and scanner apps fetch URLs on their own, and a curious scan would empty a box from stock. We rejected a JavaScript auto-submit page as too fragile for the same reason. We rejected a bare label number in the QR code because phone cameras could not open it, and host-independent recognition because a host check keeps foreign QR codes out. Printed labels outlive any change of mind, which is why this is recorded.

Amended by ADR 0011: a unit past best-before is no longer consumed on scan — the scanner asks "Use it / Discard / Put back" first.
