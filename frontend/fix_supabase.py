with open('index.html', 'r') as f:
    content = f.read()

supabase_script = '<script src="https://unpkg.com/@supabase/supabase-js@2"></script>'

if supabase_script not in content:
    content = content.replace('</head>', f'  {supabase_script}\n</head>')
    with open('index.html', 'w') as f:
        f.write(content)
    print("Added Supabase script to index.html")
else:
    print("Supabase script already present")
