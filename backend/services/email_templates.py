"""Unified email template system for Butlr"""

def get_base_template(content: str, footer_text: str = None) -> str:
    """Wrap content in the base Butlr email template"""
    
    if not footer_text:
        footer_text = "Questions? Just reply to this email or ask your Butlr!"
    
    return f'''
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {{
      .container {{ padding: 20px 10px !important; }}
      .content-table {{ padding: 20px 15px !important; }}
      h1 {{ font-size: 24px !important; }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #050508; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #050508; padding: 40px 20px;" class="container">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #22d3ee, #10b981); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="font-size: 28px; color: black; font-weight: bold;">B</span>
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td class="content-table" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 40px 30px;">
              {content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 40px; text-align: center;">
              <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 13px;">
                {footer_text}
              </p>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.3); font-size: 12px;">
                Butlr · An AI that actually does things
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
'''

def button_primary(text: str, href: str) -> str:
    """Generate primary CTA button"""
    return f'''<a href="{href}" style="display: inline-block; background: linear-gradient(90deg, #22d3ee, #10b981); color: black; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; text-align: center; margin: 10px 5px;">{text}</a>'''

def button_secondary(text: str, href: str) -> str:
    """Generate secondary button"""
    return f'''<a href="{href}" style="display: inline-block; background: rgba(255,255,255,0.1); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.2); margin: 10px 5px;">{text}</a>'''

def stat_card(value: str, label: str, color: str = "#22d3ee") -> str:
    """Generate a stat card for dashboards"""
    return f'''
<div style="background: linear-gradient(135deg, rgba(34,211,238,0.1), rgba(16,185,129,0.1)); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; text-align: center; margin: 8px;">
    <div style="font-size: 32px; font-weight: bold; color: {color}; margin-bottom: 8px;">
      {value}
    </div>
    <div style="color: rgba(255,255,255,0.6); font-size: 14px;">{label}</div>
</div>'''

def alert_box(content: str, color: str = "#f59e0b") -> str:
    """Generate an alert/info box"""
    color_rgb = {
        "#f59e0b": "245,158,11",  # warning/orange
        "#ef4444": "239,68,68",   # error/red
        "#10b981": "16,185,129",  # success/green
        "#3b82f6": "59,130,246"   # info/blue
    }.get(color, "245,158,11")
    
    return f'''
<div style="background: rgba({color_rgb},0.1); border: 1px solid rgba({color_rgb},0.2); border-radius: 12px; padding: 20px; margin: 20px 0;">
    {content}
</div>'''

def feature_list(features: list) -> str:
    """Generate a feature list grid"""
    items = []
    for feature in features:
        items.append(f'''
<td width="50%" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin: 4px;">
    <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px;">{feature}</p>
</td>''')
    
    # Group into rows of 2
    rows = []
    for i in range(0, len(items), 2):
        if i + 1 < len(items):
            rows.append(f'<tr>{items[i]}{items[i+1]}</tr>')
        else:
            rows.append(f'<tr>{items[i]}<td width="50%"></td></tr>')
    
    return f'''
<table width="100%" cellpadding="0" cellspacing="8">
    {''.join(rows)}
</table>'''