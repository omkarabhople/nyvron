import re

with open('index.html', 'r') as f:
    content = f.read()

# 1. Add ID to Google button
google_btn = '<button style="width:100%; padding:16px; background:#fff; color:#000; font-size:15px; font-weight:600; border-radius:12px; border:none; display:flex; align-items:center; justify-content:center; gap:12px; cursor:pointer; box-shadow:0 4px 12px rgba(255,255,255,0.1);">'
new_google_btn = '<button id="btn-google-login" style="width:100%; padding:16px; background:#fff; color:#000; font-size:15px; font-weight:600; border-radius:12px; border:none; display:flex; align-items:center; justify-content:center; gap:12px; cursor:pointer; box-shadow:0 4px 12px rgba(255,255,255,0.1);">'
content = content.replace(google_btn, new_google_btn)

# 2. Add IDs to Email input and button
email_input = '<input type="email" placeholder="Email address" style="width:100%; padding:16px; background:#111; border:1px solid #333; color:#fff; border-radius:12px; font-size:15px; outline:none;" />'
new_email_input = '<input id="login-email-input" type="email" placeholder="Email address" style="width:100%; padding:16px; background:#111; border:1px solid #333; color:#fff; border-radius:12px; font-size:15px; outline:none;" />'
content = content.replace(email_input, new_email_input)

email_btn = '<button style="width:100%; padding:16px; background:#222; color:#fff; font-size:15px; font-weight:600; border-radius:12px; border:1px solid #333; cursor:pointer;">\n           Continue with Email\n         </button>'
new_email_btn = '<button id="btn-email-login" style="width:100%; padding:16px; background:#222; color:#fff; font-size:15px; font-weight:600; border-radius:12px; border:1px solid #333; cursor:pointer; transition: background 0.2s;">\n           Continue with Email\n         </button>'
content = content.replace(email_btn, new_email_btn)

# 3. Add glow effect behind right card
right_card_start = '<!-- Right Area: The Login Panel -->'
new_right_card_bg = """    <!-- Right Area: The Login Panel -->
    <div style="flex:1; max-width:420px; display:flex; flex-direction:column; justify-content:center; position:relative;">
       
       <!-- Subtle glow behind the login panel -->
       <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:300px; height:300px; background:radial-gradient(circle, rgba(228,168,83,0.15) 0%, transparent 70%); filter:blur(40px); z-index:-1; pointer-events:none;"></div>
"""
content = content.replace(right_card_start + '\n    <div style="flex:1; max-width:420px; display:flex; flex-direction:column; justify-content:center;">', new_right_card_bg)

# 4. Enhance the glow behind left card
old_glow = '<div style="width:80%; height:80%; background:radial-gradient(circle, var(--cascara) 0%, transparent 60%); filter:blur(120px); opacity:0.04; animation: orbFloat1 20s infinite alternate ease-in-out;"></div>'
new_glow = """<div style="width:600px; height:600px; border-radius:50%; background:radial-gradient(circle, rgba(228,168,83,0.15) 0%, transparent 60%); filter:blur(80px); position:absolute; top:-10%; left:-10%; animation: orbFloat1 15s infinite alternate ease-in-out;"></div>
        <div style="width:500px; height:500px; border-radius:50%; background:radial-gradient(circle, rgba(46,204,113,0.1) 0%, transparent 60%); filter:blur(80px); position:absolute; bottom:-10%; right:-10%; animation: orbFloat1 20s infinite alternate-reverse ease-in-out;"></div>"""
content = content.replace(old_glow, new_glow)

with open('index.html', 'w') as f:
    f.write(content)

print("Updated index.html")
