#!/bin/sh
# Michirube launcher - local development build.
# Starts the browser from the obj-michishirube build tree.
PROJECT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
BINDIR="$PROJECT/obj-michishirube/dist/bin"

if [ -x "$BINDIR/michirube-bin" ]; then
    BIN="michirube-bin"
elif [ -x "$BINDIR/michirube" ]; then
    BIN="michirube"
else
    echo "Michirube build not found at $BINDIR" >&2
    exit 1
fi

cd "$BINDIR" || exit 1
exec "./$BIN" "$@"