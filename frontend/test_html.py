import html.parser
class MyHTMLParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
    def handle_starttag(self, tag, attrs):
        if tag not in ['img', 'br', 'hr', 'input', 'meta', 'link', 'circle', 'line', 'path', 'polygon', 'g', 'svg']:
            self.tags.append(tag)
    def handle_endtag(self, tag):
        if tag not in ['img', 'br', 'hr', 'input', 'meta', 'link', 'circle', 'line', 'path', 'polygon', 'g', 'svg']:
            if len(self.tags) == 0:
                print(f"Extra closing tag: {tag}")
            elif self.tags[-1] == tag:
                self.tags.pop()
            else:
                print(f"Mismatch: expected {self.tags[-1]}, got {tag}")
                self.tags.pop()
parser = MyHTMLParser()
with open('index.html') as f:
    parser.feed(f.read())
print("Remaining unclosed tags:", parser.tags)
