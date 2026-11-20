This directory contains a third-party dependency, vendored so the page
makes no requests to a CDN.

qr-code-styling by Denys Kozak
https://github.com/kozakdenys/qr-code-styling
Licensed under the MIT License, included here as LICENSE.

One local patch: the corner dot drawer also accepts `extra-rounded`, a
square eye with corners rounded to a quarter of its size. Carry it over
when upgrading the library, or the Rounded eye option falls back to a dot.
