#!/usr/bin/env python3
"""
Background removal script using rembg.
Reads base64-encoded image from stdin, outputs base64-encoded PNG to stdout.
Install: pip install rembg[new] pillow
"""
import sys
import base64
import io

from rembg import remove
from PIL import Image


def main():
    raw = sys.stdin.buffer.read().strip()
    img_bytes = base64.b64decode(raw)
    input_image = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    output_image = remove(input_image)
    buf = io.BytesIO()
    output_image.save(buf, format="PNG")
    result = base64.b64encode(buf.getvalue())
    sys.stdout.buffer.write(result)


if __name__ == "__main__":
    main()
