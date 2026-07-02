import shutil
import os

src_html = "/Users/onkarbhople/nyvron/frontend/_recovered/recovered_page_1783030855.html"
dst_html = "/Users/onkarbhople/nyvron/frontend/index.html"

src_css = "/Users/onkarbhople/nyvron/frontend/_recovered/recovered_styles_1783030855.css"
dst_css = "/Users/onkarbhople/nyvron/frontend/styles.css"

try:
    shutil.copyfile(src_html, dst_html)
    print("Successfully copied index.html")
except Exception as e:
    print(f"Failed to copy index.html: {e}")

try:
    shutil.copyfile(src_css, dst_css)
    print("Successfully copied styles.css")
except Exception as e:
    print(f"Failed to copy styles.css: {e}")
