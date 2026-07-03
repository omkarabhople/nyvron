import re

with open('frontend/app.js', 'r') as f:
    js = f.read()

def inject_view_transition(func_str, func_name):
    # Find the function definition
    pattern = re.compile(rf'function {func_name}\s*\([^)]*\)\s*\{{')
    match = pattern.search(func_str)
    if not match:
        return func_str

    # We want to replace the body. First, find where it ends
    start_idx = match.end()
    open_braces = 1
    end_idx = start_idx
    while open_braces > 0 and end_idx < len(func_str):
        if func_str[end_idx] == '{':
            open_braces += 1
        elif func_str[end_idx] == '}':
            open_braces -= 1
        end_idx += 1

    body = func_str[start_idx:end_idx-1]

    new_body = f"""
  if (!document.startViewTransition) {{
{body}
    return;
  }}
  document.startViewTransition(() => {{
{body}
  }});
"""

    return func_str[:start_idx] + new_body + func_str[end_idx-1:]


js = inject_view_transition(js, 'applyManualTheme')
js = inject_view_transition(js, 'applyAutoTheme')


# Also update the cr-theme-select event listener
theme_select_pattern = re.compile(r"\$\('cr-theme-select'\)\.onchange = function\(\) \{(.*?)\};", re.DOTALL)

def theme_select_replace(match):
    inner = match.group(1)
    new_inner = f"""
  if (!document.startViewTransition) {{
    {inner.strip()}
    return;
  }}
  document.startViewTransition(() => {{
    {inner.strip()}
  }});
"""
    return f"$('cr-theme-select').onchange = function() {{{new_inner}}};"

js = theme_select_pattern.sub(theme_select_replace, js)


with open('frontend/app.js', 'w') as f:
    f.write(js)
